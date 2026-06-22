import {
  Controller,
  Post,
  Headers,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { BackupService } from './backup.service';

@ApiTags('Admin - Backup')
@Controller('api/admin/backup')
export class BackupController {
  private readonly logger = new Logger(BackupController.name);

  constructor(
    private readonly backupService: BackupService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * POST /api/admin/backup/run
   * Dispara el backup manualmente. Protegido por header x-backup-secret.
   */
  @Post('run')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Ejecutar backup manual de la base de datos',
    description:
      'Dispara un backup completo de MySQL, lo comprime en .gz y lo sube a Google Drive. ' +
      'Requiere el header x-backup-secret con la clave configurada en BACKUP_SECRET_KEY.',
  })
  @ApiHeader({
    name: 'x-backup-secret',
    description: 'Clave secreta para proteger el endpoint (BACKUP_SECRET_KEY)',
    required: true,
  })
  @ApiResponse({ status: 202, description: 'Backup iniciado exitosamente.' })
  @ApiResponse({ status: 401, description: 'Clave secreta incorrecta o ausente.' })
  @ApiResponse({ status: 500, description: 'Error durante el proceso de backup.' })
  async runManualBackup(
    @Headers('x-backup-secret') secret: string,
  ): Promise<{ success: boolean; message: string; fileName?: string }> {
    const expectedSecret = this.configService.get<string>('BACKUP_SECRET_KEY');

    if (!expectedSecret) {
      this.logger.error('❌ BACKUP_SECRET_KEY no está definida en las variables de entorno.');
      throw new UnauthorizedException('El endpoint de backup no está configurado correctamente.');
    }

    if (secret !== expectedSecret) {
      this.logger.warn('⚠️  Intento de acceso al endpoint de backup con clave incorrecta.');
      throw new UnauthorizedException('Clave secreta incorrecta.');
    }

    this.logger.log('🔧 Backup manual iniciado desde endpoint HTTP...');
    return this.backupService.runFullBackup();
  }
}
