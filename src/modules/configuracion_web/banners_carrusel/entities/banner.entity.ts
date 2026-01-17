// src/modules/configuracion_web/banners/entities/banner.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BannerImagen } from './banner-imagen.entity';

/**
 * Entidad que almacena la información de cada Banner o diapositiva del carrusel.
 */
@Entity('banners')
export class Banner {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    nombre?: string;

    @Column({ type: 'boolean', default: true })
    activo: boolean;

    @OneToMany(() => BannerImagen, (bannerImagen: BannerImagen) => bannerImagen.banner, { cascade: true })
    imagenes: BannerImagen[];
}