// src/clientes/entities/cliente.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TipoDocumento } from '../../tipos-documento/entities/tipos-documento.entity';
import { TipoContactoCliente } from '../../tipo-contacto-cliente/entities/tipo-contacto-cliente.entity';

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nombre: string;

  // 1. COLUMNA FÍSICA: Usada para guardar y actualizar (Merge del DTO)
  @Column({ name: 'tipo_contacto_id', nullable: true })
  tipo_contacto_id: number; //

  // 2. PROPIEDAD DE RELACIÓN: Usada para traer los datos con JOIN
  @ManyToOne(() => TipoContactoCliente, (tipo) => tipo.clientes)
  @JoinColumn({ name: 'tipo_contacto_id' }) // Vincula esta relación con la columna de arriba
  tipoContacto: TipoContactoCliente; //

  @Column({ name: 'tipo_documento_id' })
  tipo_documento_id: number;

  @ManyToOne(() => TipoDocumento, (tipoDocumento) => tipoDocumento.clientes)
  @JoinColumn({ name: 'tipo_documento_id' })
  tipoDocumento: TipoDocumento;

  @Column({ length: 30, unique: true })
  numero_documento: string;

  @Column({ length: 200, nullable: true })
  direccion: string;

  @Column({ length: 100, nullable: true })
  correo: string;

  @Column({ length: 20, nullable: true })
  telefono: string;
}