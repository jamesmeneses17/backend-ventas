// src/modulos/gestion_producto/productos/entities/producto.entity.ts

import { Column, Entity, OneToOne, OneToMany, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Inventario } from '../../inventario/entities/inventario.entity';
import { Estado } from '../../../catalogos_basicos/estados/entities/estado.entity';
import { Categoria } from '../../../catalogos_basicos/categorias/entities/categoria.entity';
import { Precio } from '../../precios/entities/precio.entity';
import { CompraDetalle } from '../../compras/entities/compra-detalle.entity';
import { VentaDetalle } from '../../ventas/entities/venta-detalle.entity'; // ✅ NUEVA IMPORTACIÓN
import { Subcategoria } from '../../../catalogos_basicos/subcategorias/entities/subcategoria.entity';
import { ProductoImagen } from './producto-imagen.entity';

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nombre: string;

  @Column({ length: 50, unique: true })
  codigo: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  precio_costo: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0, name: 'precio_venta' })
  precio_venta: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  promocion_porcentaje: number;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  activo: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ficha_tecnica_url?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  pdf_url?: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  // ESTADO
  @Column({ name: 'estado_id', type: 'int', default: 1 })
  estadoId: number;

  @ManyToOne(() => Estado, { eager: true })
  @JoinColumn({ name: 'estado_id' })
  estado: Estado;

  @Column({ name: 'categoria_id', type: 'int', nullable: true })
  categoriaId: number | null;

  @ManyToOne(() => Categoria, { eager: false, nullable: true })
  @JoinColumn({ name: 'categoria_id' })
  categoria: Categoria | null;

  @Column({ name: 'subcategoria_id', type: 'int', nullable: true })
  subcategoriaId: number | null;

  @ManyToOne(() => Subcategoria, { eager: false, nullable: true })
  @JoinColumn({ name: 'subcategoria_id' })
  subcategoria: Subcategoria | null;

  // ==========================================
  // RELACIONES ACTUALIZADAS
  // ==========================================

  @OneToOne(() => Inventario, (inv) => inv.producto)
  inventario: Inventario;

  @OneToMany(() => Precio, (precio) => precio.producto)
  precios: Precio[];

  // ✅ Relación con los DETALLES de compras
  @OneToMany(() => CompraDetalle, (detalle) => detalle.producto)
  compras: CompraDetalle[];

  // ✅ Relación con los DETALLES de ventas
  @OneToMany(() => VentaDetalle, (detalle) => detalle.producto)
  ventas: VentaDetalle[];

  @OneToMany(() => ProductoImagen, (imagen) => imagen.producto, { cascade: true })
  imagenes: ProductoImagen[];
}