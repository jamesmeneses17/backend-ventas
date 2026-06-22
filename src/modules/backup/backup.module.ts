import { Module, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';

@Module({
  imports: [ConfigModule],
  providers: [BackupService],
  controllers: [BackupController],
  exports: [BackupService],
})
export class BackupModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(BackupModule.name);

  constructor(private readonly backupService: BackupService) {}

  /**
   * Se ejecuta automáticamente cuando la app NestJS termina de inicializarse.
   * Registra el cron job de backup diario.
   */
  onApplicationBootstrap(): void {
    this.logger.log('🚀 BackupModule iniciado — registrando cron job de backup...');
    this.backupService.scheduleDailyBackup();
  }
}
