// src/modules/configuracion_web/banners/banner.controller.ts

import {
  Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe,
  UsePipes, ValidationPipe, HttpCode, HttpStatus, UploadedFile, UseInterceptors, BadRequestException, NotFoundException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { R2Service } from '../../../common/services/r2.service';

import { BannerService } from './banner.service';
import { Banner } from './entities/banner.entity';
import { CreateBannerDto } from './dtos/create-banner.dto';
import { UpdateBannerDto } from './dtos/update-banner.dto';

@Controller('configuracion/banners') // Ruta base: /api/configuracion/banners
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class BannerController {
  constructor(
    private readonly bannerService: BannerService,
    private readonly r2: R2Service,
  ) { }

  /**
   * RUTA GET: /api/configuracion/banners
   * Obtiene todos los banners.
   */
  @Get()
  findAll(): Promise<Banner[]> {
    return this.bannerService.findAll();
  }

  /**
   * RUTA GET: /api/configuracion/banners/:id
   * Obtiene un banner por ID.
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Banner> {
    return this.bannerService.findOne(id);
  }

  /**
   * RUTA POST: /api/configuracion/banners
   * Crea un nuevo banner.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateBannerDto): Promise<Banner> {
    return this.bannerService.create(createDto);
  }

  /**
   * RUTA PUT: /api/configuracion/banners/:id
   * Actualiza un banner.
   */
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateBannerDto,
  ): Promise<Banner> {
    return this.bannerService.update(id, updateDto);
  }

  /**
   * RUTA DELETE: /api/configuracion/banners/:id
   * Elimina un banner.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // 204 No Content para éxito en eliminación
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.bannerService.remove(id);
  }

  /**
   * Sube una imagen para el banner y actualiza el campo imagenDesktopUrl
   */
  /**
   * Sube una imagen y la asocia al banner (nuevo flujo multi-imagen)
   */
  @Post(':id/imagenes')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadImagen(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const imagen = await this.bannerService.addImagen(id, file.buffer, file.originalname, file.mimetype);
    return { imagen };
  }

  /**
   * RUTA DELETE: /api/configuracion/banners/imagenes/:bannerId
   * Elimina la imagen del banner en el storage y limpia el campo imagenDesktopUrl
   */
  @Delete('imagenes/:bannerId')
  async deleteImagen(@Param('bannerId', ParseIntPipe) bannerId: number): Promise<{ success: boolean }> {
    return this.bannerService.deleteImagen(bannerId);
  }

  /**
   * RUTA DELETE: /api/configuracion/banners/:id/imagen
   * Elimina la imagen de un banner específico.
   */
  /**
   * Elimina una imagen específica de un banner (multi-imagen)
   */
  @Delete('imagenes/:imagenId')
  async eliminarImagenBanner(@Param('imagenId', ParseIntPipe) imagenId: number) {
    return this.bannerService.removeImagen(imagenId);
  }

  /**
   * Actualiza el estado de una imagen (activo/inactivo)
   */
  @Put('imagenes/:imagenId')
  async updateImagenStatus(
    @Param('imagenId', ParseIntPipe) imagenId: number,
    @Body() body: { activo: boolean }
  ) {
    return this.bannerService.updateImagen(imagenId, body);
  }
}