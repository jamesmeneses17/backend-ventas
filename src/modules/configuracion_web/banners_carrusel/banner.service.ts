// src/modules/configuracion_web/banners/banner.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Express } from 'express';

import { Banner } from './entities/banner.entity';
import { BannerImagen } from './entities/banner-imagen.entity';
import { CreateBannerDto } from './dtos/create-banner.dto';
import { UpdateBannerDto } from './dtos/update-banner.dto';
import { R2Service } from '../../../common/services/r2.service';

@Injectable()
export class BannerService {
  constructor(
    @InjectRepository(Banner)
    private readonly bannerRepository: Repository<Banner>,
    @InjectRepository(BannerImagen)
    private readonly bannerImagenRepository: Repository<BannerImagen>,
    private readonly r2Service: R2Service,
  ) {}

  /**
   * Obtiene todos los banners, ordenados por el campo 'orden'.
   */
  async findAll(): Promise<Banner[]> {
    return this.bannerRepository.find({
      relations: ['imagenes'],
      order: { id: 'ASC' },
    });
  }

  /**
   * Obtiene un banner por ID.
   */
  async findOne(id: number): Promise<Banner> {
    const banner = await this.bannerRepository.findOne({ where: { id }, relations: ['imagenes'] });
    if (!banner) {
      throw new NotFoundException(`Banner con ID ${id} no encontrado.`);
    }
    return banner;
  }

  /**
   * Crea un nuevo banner.
   */
  async create(createDto: CreateBannerDto): Promise<Banner> {
    // Ajustar según los campos realmente existentes en el DTO
    const newBanner = this.bannerRepository.create({});
    return await this.bannerRepository.save(newBanner);
  }


  /**
   * Actualiza un banner existente.
   */
  async update(id: number, updateDto: UpdateBannerDto): Promise<Banner> {
    // No hay campos editables en la entidad Banner, pero puedes agregar lógica aquí si se agregan campos
    return this.findOne(id);
  }

  /**
   * Elimina un banner.
   */
  async remove(id: number): Promise<void> {
    const result = await this.bannerRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Banner con ID ${id} no encontrado para eliminar.`);
    }
  }

  /**
   * Sube una imagen para el banner y actualiza el campo imagenDesktopUrl
   */
  // El método real de subida de imagen está en el controlador usando r2.uploadBuffer

  /**
   * Elimina la imagen del banner en el storage y limpia el campo imagenDesktopUrl
   */

  /**
   * Sube una imagen y la asocia al banner
   */
  async addImagen(bannerId: number, fileBuffer: Buffer, originalName: string, mimeType: string): Promise<BannerImagen> {
    const banner = await this.findOne(bannerId);
    const { url } = await this.r2Service.uploadBuffer(fileBuffer, originalName, mimeType);
    const imagen = this.bannerImagenRepository.create({
      banner,
      urlImagen: url,
      orden: (banner.imagenes?.length ?? 0),
    });
    return this.bannerImagenRepository.save(imagen);
  }

  /**
   * Elimina una imagen específica de un banner
   */
  async removeImagen(imagenId: number): Promise<{ success: boolean }> {
    const imagen = await this.bannerImagenRepository.findOne({ where: { id: imagenId }, relations: ['banner'] });
    if (!imagen) throw new NotFoundException('Imagen no encontrada');
    // Extraer el key del url para borrar en R2
      const key = imagen.urlImagen.split('/').pop() || '';
      await this.r2Service.deleteFile(String(key));
    await this.bannerImagenRepository.delete(imagenId);
    return { success: true };
  }

  /**
   * Actualiza la URL de la imagen de escritorio del banner
   */

  /**
   * Elimina todas las imágenes de un banner (compatibilidad con deleteImagen antiguo)
   */
  async deleteImagen(bannerId: number): Promise<{ success: boolean }> {
    const banner = await this.findOne(bannerId);
    if (!banner.imagenes || banner.imagenes.length === 0) {
      return { success: true };
    }
    for (const imagen of banner.imagenes) {
      const url = imagen.urlImagen;
      if (url) {
        const key: string = url.split('/').pop() || '';
        await this.r2Service.deleteFile(key);
      }
      await this.bannerImagenRepository.delete(imagen.id);
    }
    return { success: true };
  }

  // Métodos simulados eliminados, toda la lógica real está en el controlador usando r2Service
}