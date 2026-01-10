// src/clientes/entities/cliente.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { TipoDocumento } from '../../tipos-documento/entities/tipos-documento.entity';
import { TipoContactoCliente } from '../../tipo-contacto-cliente/entities/tipo-contacto-cliente.entity';
import { Compra } from 'src/modules/gestion_producto/compras/entities/compra.entity';
import { Venta } from 'src/modules/gestion_producto/ventas/entities/venta.entity';
import { TipoPersona } from '../../tipo-persona/entities/tipo-persona.entity';

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

  @Column({ name: 'numero_documento', length: 30, unique: false })
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

  // Relación con Ventas (Un cliente tiene muchas ventas registradas)
  // Apunta a la nueva entidad 'Venta' (Cabecera)
  @OneToMany(() => Venta, (venta) => venta.cliente)
  ventas: Venta[];

  @Column({ name: 'tipo_persona_id', nullable: true })
  tipo_persona_id: number;

  @ManyToOne(() => TipoPersona, (tipo) => tipo.clientes)
  @JoinColumn({ name: 'tipo_persona_id' })
  tipoPersona: TipoPersona;

}