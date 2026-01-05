import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Cliente } from '../../clientes/entities/cliente.entity'; // Nombre según tu SQL

@Entity('tipos_contacto')
export class TipoContactoCliente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  nombre: string;

  // Cambiamos 'contactos' por 'clientes' para que coincida con tu tabla 'railway.clientes'
  @OneToMany(() => Cliente, (cliente) => cliente.tipoContacto)
  clientes: Cliente[];
}