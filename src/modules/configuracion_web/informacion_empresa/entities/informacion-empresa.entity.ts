import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('configuracion_empresa')
export class InformacionEmpresa {
    @PrimaryGeneratedColumn()
    id: number;

    // DATOS IDENTIFICATIVOS
    @Column({ name: 'nombre_empresa', type: 'varchar', length: 150, nullable: false })
    nombreEmpresa: string;

    @Column({ name: 'nit', type: 'varchar', length: 30, nullable: true })
    nit?: string;

    @Column({ name: 'direccion_fiscal', type: 'varchar', length: 255, nullable: true })
    direccionPrincipal?: string;

    @Column({ name: 'telefono_principal', type: 'varchar', length: 20, nullable: true })
    telefonoFijo?: string;

    @Column({ name: 'whatsapp', type: 'varchar', length: 20, nullable: true })
    whatsapp?: string;

    @Column({ name: 'correo_contacto', type: 'varchar', length: 100, nullable: true })
    emailInfo?: string;

    @Column({ name: 'url_web', type: 'varchar', length: 255, nullable: true })
    urlWeb?: string;

    @Column({ name: 'url_facebook', type: 'varchar', length: 255, nullable: true })
    urlFacebook?: string;

    @Column({ name: 'url_instagram', type: 'varchar', length: 255, nullable: true })
    urlInstagram?: string;

    @Column({ name: 'url_linkedin', type: 'varchar', length: 255, nullable: true })
    urlLinkedIn?: string;

    @Column({ name: 'logo_url', type: 'varchar', length: 255, nullable: true })
    urlLogo?: string;

    @Column({ name: 'horario_lun_vie', type: 'varchar', length: 50, nullable: true })
    horarioLunesViernes?: string;

    @Column({ name: 'horario_sabado', type: 'varchar', length: 50, nullable: true })
    horarioSabados?: string;

    @Column({ name: 'horario_domingo', type: 'varchar', length: 50, nullable: true })
    horarioDomingos?: string;

    @Column({ name: 'nosotros', type: 'text', nullable: true })
    nosotros?: string;

    @Column({ name: 'fecha_ultima_actualizacion', type: 'timestamp', nullable: false })
    updatedAt: Date;
}