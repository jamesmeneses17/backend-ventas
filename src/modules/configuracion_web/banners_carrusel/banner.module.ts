// src/modules/configuracion_web/banners/banner.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Banner } from './entities/banner.entity'; 
import { BannerController } from './banner.controller';
import { BannerService } from './banner.service';
import { R2Module } from '../../../common/r2.module';
import { BannerImagen } from './entities/banner-imagen.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Banner, BannerImagen]),
    R2Module,
  ],
  controllers: [BannerController],
  providers: [BannerService],
  exports: [BannerService], 
})
export class BannerModule {}