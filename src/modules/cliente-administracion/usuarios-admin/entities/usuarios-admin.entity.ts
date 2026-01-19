import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('usuarios_admin')
export class UsuarioAdmin {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    nombre: string;

    // ❌ quitamos unique:true
    // ✔ permitimos NULL para evitar problemas
    @Column({ nullable: true })
    correo: string;

    @Column()
    contrasena: string;

    @Column()
    rol: string;

    @CreateDateColumn()
    fecha_creacion: Date;

    @Column({ nullable: true })
    reset_password_token: string;

    @Column({ type: 'datetime', nullable: true })
    reset_password_expires: Date;

    @Column({ type: 'datetime', nullable: true })
    ultimo_login: Date;

    @Column({ type: 'tinyint', default: 0 })
    en_linea: number;
}
