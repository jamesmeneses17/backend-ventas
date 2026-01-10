import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Cliente } from '../../clientes/entities/cliente.entity';

@Entity('tipo_persona')
export class TipoPersona {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 50 })
    nombre: string;

    // Relación con clientes
    @OneToMany(() => Cliente, (cliente) => cliente.tipoPersona)
    clientes: Cliente[];
}
