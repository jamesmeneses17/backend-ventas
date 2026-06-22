import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as zlib from 'zlib';
import * as cron from 'node-cron';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  // os.tmpdir() devuelve la carpeta temporal correcta en cada SO:
  // Linux/Docker: /tmp  |  Windows: C:\Users\...\AppData\Local\Temp
  private readonly tmpDir = os.tmpdir();

  constructor(private readonly configService: ConfigService) {}

  // ─────────────────────────────────────────────
  // Programar cron job: todos los días a las 3 AM
  // ─────────────────────────────────────────────
  scheduleDailyBackup(): void {
    cron.schedule(
      '0 3 * * *',
      async () => {
        this.logger.log('⏰ Cron job iniciado: ejecutando backup programado...');
        try {
          await this.runFullBackup();
        } catch (err) {
          this.logger.error(`❌ Backup programado falló: ${String(err)}`);
        }
      },
      { timezone: 'America/Bogota' },
    );
    this.logger.log(
      '✅ Backup cron job programado: todos los días a las 3:00 AM (America/Bogota)',
    );
  }

  // ─────────────────────────────────────────────
  // Proceso completo de backup
  // ─────────────────────────────────────────────
  async runFullBackup(): Promise<{ success: boolean; message: string; fileName?: string }> {
    const fileName = this.buildFileName();
    const localPath = path.join(this.tmpDir, fileName);

    try {
      // 1. Dump + compresión (sin dependencia de shell gzip)
      await this.dumpDatabase(localPath);

      // 2. Subir a Google Drive
      const driveFileId = await this.uploadToDrive(localPath, fileName);

      // 3. Borrar archivo local
      this.deleteLocalFile(localPath);

      // 4. Rotar backups antiguos en Drive (>30 días)
      await this.rotateOldBackups();

      const msg = `Backup completado exitosamente: ${fileName} → Drive ID: ${driveFileId}`;
      this.logger.log(`✅ ${msg}`);
      return { success: true, message: msg, fileName };
    } catch (error) {
      // Limpiar archivo local si quedó a medias
      if (fs.existsSync(localPath)) {
        this.deleteLocalFile(localPath);
      }
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error en el proceso de backup: ${errMsg}`);
      throw error;
    }
  }

  // ─────────────────────────────────────────────
  // Paso 1: mysqldump + compresión con zlib de Node.js
  // No depende de gzip del sistema operativo
  // ─────────────────────────────────────────────
  private dumpDatabase(localPath: string): Promise<void> {
    const host = this.configService.get<string>('DB_HOST', 'localhost');
    const port = this.configService.get<string>('DB_PORT', '3306');
    const user = this.configService.get<string>('DB_USER');
    const pass = this.configService.get<string>('DB_PASS');
    const dbName = this.configService.get<string>('DB_NAME');

    if (!user || !pass || !dbName) {
      return Promise.reject(
        new Error('Faltan variables de entorno DB_USER, DB_PASS o DB_NAME para el backup.'),
      );
    }

    this.logger.log(
      `📦 Ejecutando mysqldump para la base de datos "${dbName}" en ${host}:${port}...`,
    );

    return new Promise((resolve, reject) => {
      // Dokploy usa MariaDB internamente → usamos mariadb-dump
      // --skip-ssl evita el error de certificado autofirmado en la red interna de Docker
      const args = [
        '--skip-ssl',
        `-h${host}`,
        `-P${port}`,
        `-u${user}`,
        `-p${pass}`,
        '--single-transaction',
        '--routines',
        '--triggers',
        dbName,
      ];

      // mariadb-dump en Dokploy/Alpine; fallback a mysqldump en otros entornos
      const dumpCmd = process.env.DUMP_CMD ?? 'mariadb-dump';
      const mysqldump = spawn(dumpCmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      const gzip = zlib.createGzip();
      const output = fs.createWriteStream(localPath);

      // Pipeline: mysqldump stdout → gzip → archivo .sql.gz
      mysqldump.stdout.pipe(gzip).pipe(output);

      let stderrOutput = '';
      mysqldump.stderr.on('data', (data: Buffer) => {
        const msg = data.toString();
        // mysqldump imprime advertencias en stderr que no son errores fatales
        if (!msg.includes('[Warning]') && !msg.includes('Using a password')) {
          stderrOutput += msg;
        }
      });

      mysqldump.on('error', (err) => {
        reject(
          new Error(
            `No se encontró el ejecutable "mysqldump". ` +
              `Asegúrate de que MySQL Client esté instalado y en el PATH del sistema. Error: ${err.message}`,
          ),
        );
      });

      output.on('finish', () => {
        if (mysqldump.exitCode !== null && mysqldump.exitCode !== 0) {
          reject(new Error(`mysqldump terminó con código ${mysqldump.exitCode}: ${stderrOutput}`));
        } else {
          this.logger.log(`📦 Dump completado y comprimido: ${localPath}`);
          resolve();
        }
      });

      output.on('error', (err) => reject(new Error(`Error escribiendo archivo temporal: ${err.message}`)));
      gzip.on('error', (err) => reject(new Error(`Error comprimiendo backup: ${err.message}`)));

      mysqldump.on('close', (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`mysqldump terminó con código ${code}: ${stderrOutput}`));
        }
      });
    });
  }

  // ─────────────────────────────────────────────
  // Paso 2: Subir archivo a Google Drive
  // ─────────────────────────────────────────────
  private async uploadToDrive(localPath: string, fileName: string): Promise<string> {
    const drive = this.getDriveClient();
    const folderId = this.configService.get<string>('GOOGLE_DRIVE_FOLDER_ID');

    if (!folderId) {
      throw new Error('Variable de entorno GOOGLE_DRIVE_FOLDER_ID no definida.');
    }

    this.logger.log(`☁️  Subiendo "${fileName}" a Google Drive (folder: ${folderId})...`);

    try {
      const response = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
          mimeType: 'application/gzip',
        },
        media: {
          mimeType: 'application/gzip',
          body: fs.createReadStream(localPath),
        },
        fields: 'id, name, size',
      });

      const fileId = response.data.id!;
      this.logger.log(`☁️  Archivo subido exitosamente. Drive ID: ${fileId}`);
      return fileId;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error al subir a Google Drive: ${errMsg}`);
      throw new Error(`Subida a Drive falló: ${errMsg}`);
    }
  }

  // ─────────────────────────────────────────────
  // Paso 3: Borrar archivo local temporal
  // ─────────────────────────────────────────────
  private deleteLocalFile(localPath: string): void {
    try {
      fs.unlinkSync(localPath);
      this.logger.log(`🗑️  Archivo local temporal eliminado: ${localPath}`);
    } catch (error) {
      this.logger.warn(`⚠️  No se pudo eliminar el archivo local ${localPath}: ${String(error)}`);
    }
  }

  // ─────────────────────────────────────────────
  // Paso 4: Rotar backups con más de 30 días en Drive
  // ─────────────────────────────────────────────
  async rotateOldBackups(): Promise<void> {
    const drive = this.getDriveClient();
    const folderId = this.configService.get<string>('GOOGLE_DRIVE_FOLDER_ID');

    if (!folderId) {
      this.logger.warn('⚠️  GOOGLE_DRIVE_FOLDER_ID no definido, omitiendo rotación.');
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffISO = cutoffDate.toISOString();

    this.logger.log(`🔄 Rotando backups anteriores a ${cutoffDate.toLocaleDateString()}...`);

    try {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and name contains 'backup_' and createdTime < '${cutoffISO}' and trashed = false`,
        fields: 'files(id, name, createdTime)',
        pageSize: 100,
      });

      const files = response.data.files ?? [];

      if (files.length === 0) {
        this.logger.log('🔄 No hay backups antiguos para eliminar.');
        return;
      }

      for (const file of files) {
        await drive.files.delete({ fileId: file.id! });
        this.logger.log(
          `🗑️  Backup antiguo eliminado de Drive: ${file.name} (${file.createdTime})`,
        );
      }

      this.logger.log(`🔄 Rotación completada: ${files.length} archivo(s) eliminado(s).`);
    } catch (error) {
      this.logger.warn(`⚠️  Error durante la rotación de backups: ${String(error)}`);
    }
  }

  // ─────────────────────────────────────────────
  // Helper: construir nombre del archivo
  // ─────────────────────────────────────────────
  private buildFileName(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    return `backup_${date}_${time}.sql.gz`;
  }

  // ─────────────────────────────────────────────
  // Helper: cliente Google Drive con OAuth2
  // ─────────────────────────────────────────────
  private getDriveClient() {
    const clientId = this.configService.get<string>('GOOGLE_DRIVE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_DRIVE_CLIENT_SECRET');
    const refreshToken = this.configService.get<string>('GOOGLE_DRIVE_REFRESH_TOKEN');

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error(
        'Faltan variables de entorno de Google Drive: GOOGLE_DRIVE_CLIENT_ID, ' +
          'GOOGLE_DRIVE_CLIENT_SECRET o GOOGLE_DRIVE_REFRESH_TOKEN.',
      );
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    return google.drive({ version: 'v3', auth: oauth2Client });
  }
}
