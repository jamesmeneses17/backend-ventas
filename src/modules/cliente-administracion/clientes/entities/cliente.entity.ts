// src/clientes/entities/cliente.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { TipoDocumento } from '../../tipos-documento/entities/tipos-documento.entity';
import { TipoContactoCliente } from '../../tipo-contacto-cliente/entities/tipo-contacto-cliente.entity';
import { Venta } from 'src/modules/gestion_producto/ventas/entities/venta.entity';
import { Compra } from 'src/modules/gestion_producto/compras/entities/compra.entity';

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nombre: string;

  // 1. COLUMNA FÍSICA: Usada para guardar y actualizar
  @Column({ name: 'tipo_contacto_id', nullable: true })
  tipo_contacto_id: number;

  // 2. PROPIEDAD DE RELACIÓN
  @ManyToOne(() => TipoContactoCliente, (tipo) => tipo.clientes)
  @JoinColumn({ name: 'tipo_contacto_id' })
  tipoContacto: TipoContactoCliente;

  @Column({ name: 'tipo_documento_id' })
  tipo_documento_id: number;

  @ManyToOne(() => TipoDocumento, (tipoDocumento) => tipoDocumento.clientes)
  @JoinColumn({ name: 'tipo_documento_id' })
  tipoDocumento: TipoDocumento;

  @Column({ name: 'numero_documento', length: 30, unique: true })
  numero_documento: string;

  @Column({ length: 200, nullable: true })
  direccion: string;

  @Column({ length: 100, nullable: true })
  correo: string;

  @Column({ length: 20, nullable: true })
  telefono: string;

  // ==========================================
  // NUEVAS RELACIONES PARA COMPRAS Y VENTAS
  // ==========================================

  // Relación con Compras (Un cliente/proveedor tiene muchas compras)
  @OneToMany(() => Compra, (compra) => compra.cliente)
  compras: Compra[];

}