import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as zlib from 'zlib';
import * as cron from 'node-cron';
// mysqldump npm usa mysql2 internamente → soporta caching_sha2_password (MySQL 8)
// No requiere ningún binario del sistema operativo
import mysqldump from 'mysqldump';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  // os.tmpdir() funciona en Linux (/tmp) y Windows (AppData\Local\Temp)
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
      // 1. Dump de BD + comprimir con zlib (puro Node.js, sin binarios del SO)
      await this.dumpDatabase(localPath);

      // 2. Subir a Google Drive
      const driveFileId = await this.uploadToDrive(localPath, fileName);

      // 3. Borrar archivo local temporal
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
  // Paso 1: Dump con paquete npm "mysqldump"
  // Usa mysql2 internamente → soporta MySQL 8 (caching_sha2_password)
  // Sin dependencias de binarios del SO (no necesita mysqldump/mariadb-dump)
  // ─────────────────────────────────────────────
  private async dumpDatabase(localPath: string): Promise<void> {
    const host = this.configService.get<string>('DB_HOST', 'localhost');
    const port = Number(this.configService.get<string>('DB_PORT', '3306'));
    const user = this.configService.get<string>('DB_USER');
    const password = this.configService.get<string>('DB_PASS');
    const database = this.configService.get<string>('DB_NAME');

    if (!user || !password || !database) {
      throw new Error('Faltan variables DB_USER, DB_PASS o DB_NAME para el backup.');
    }

    this.logger.log(
      `📦 Generando dump de "${database}" en ${host}:${port} (puro Node.js)...`,
    );

    try {
      // El paquete "mysqldump" usa mysql2 y devuelve el SQL como string
      const result = await mysqldump({
        connection: { host, port, user, password, database },
        dump: {
          schema: {
            table: { dropIfExist: true },
          },
          data: {
            verbose: false,
            maxRowsPerInsertStatement: 100,
          },
        },
      });

      // Unir schema + datos + triggers en un único string SQL
      const sqlContent = [
        '-- Backup generado por DISEM S.A.S sistema de ventas\n',
        `-- Fecha: ${new Date().toISOString()}\n\n`,
        result.dump.schema ?? '',
        result.dump.data ?? '',
        result.dump.trigger ?? '',
      ].join('');

      // Comprimir con zlib de Node.js y escribir al archivo .sql.gz
      await this.writeGzipped(localPath, sqlContent);
      this.logger.log(`📦 Dump completado y comprimido: ${localPath}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error generando dump: ${errMsg}`);
      throw new Error(`Dump de base de datos falló: ${errMsg}`);
    }
  }

  // ─────────────────────────────────────────────
  // Helper: comprimir string SQL y escribir a disco
  // ─────────────────────────────────────────────
  private writeGzipped(filePath: string, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const gzip = zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });
      const output = fs.createWriteStream(filePath);

      gzip.pipe(output);
      output.on('finish', resolve);
      output.on('error', reject);
      gzip.on('error', reject);

      gzip.write(content, 'utf8');
      gzip.end();
    });
  }

  // ─────────────────────────────────────────────
  // Paso 2: Subir archivo a Google Drive (OAuth2)
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
      this.logger.log(`☁️  Archivo subido a Drive. ID: ${fileId}`);
      return fileId;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error subiendo a Google Drive: ${errMsg}`);
      throw new Error(`Subida a Drive falló: ${errMsg}`);
    }
  }

  // ─────────────────────────────────────────────
  // Paso 3: Borrar archivo local temporal
  // ─────────────────────────────────────────────
  private deleteLocalFile(localPath: string): void {
    try {
      fs.unlinkSync(localPath);
      this.logger.log(`🗑️  Archivo temporal eliminado: ${localPath}`);
    } catch (error) {
      this.logger.warn(`⚠️  No se pudo eliminar ${localPath}: ${String(error)}`);
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
        this.logger.log(`🗑️  Backup eliminado de Drive: ${file.name} (${file.createdTime})`);
      }

      this.logger.log(`🔄 Rotación completada: ${files.length} archivo(s) eliminado(s).`);
    } catch (error) {
      this.logger.warn(`⚠️  Error en rotación de backups: ${String(error)}`);
    }
  }

  // ─────────────────────────────────────────────
  // Helper: nombre del archivo con fecha y hora
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
        'Faltan variables de Google Drive: GOOGLE_DRIVE_CLIENT_ID, ' +
          'GOOGLE_DRIVE_CLIENT_SECRET o GOOGLE_DRIVE_REFRESH_TOKEN.',
      );
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: 'v3', auth: oauth2Client });
  }
}
