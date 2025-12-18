import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Banner } from './banner.entity';

/**
 * Entidad que almacena las imágenes asociadas a un banner.
 */
@Entity('banner_imagenes')
export class BannerImagen {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Banner, (banner) => banner.imagenes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'banner_id' })
    banner: Banner;

    @Column({ name: 'url_imagen', type: 'varchar', length: 255, nullable: false })
    urlImagen: string;

    @Column({ type: 'int', default: 0 })
    orden: number;
}
