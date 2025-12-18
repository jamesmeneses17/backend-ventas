// src/modulos/gestion_producto/productos/entities/producto.entity.ts

import { Column, Entity, OneToOne, OneToMany, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Inventario } from '../../inventario/entities/inventario.entity';
import { Estado } from '../../../catalogos_basicos/estados/entities/estado.entity';
import { Categoria } from '../../../catalogos_basicos/categorias/entities/categoria.entity';
import { Precio } from '../../precios/entities/precio.entity';
import { Compra } from '../../compras/entities/compra.entity';
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

  // ✅ Costo de compra
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  precio_costo: number; 

  // ✅ Precio de venta (expuesto al frontend)
  @Column('decimal', { precision: 10, scale: 2, default: 0, name: 'precio_venta' })
  precio_venta: number;


  // ✅ Porcentaje de promoción (0-100%)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  promocion_porcentaje: number;

  // Campo activo (visible en frontend)
  @Column({ type: 'tinyint', width: 1, default: 1 })
  activo: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ficha_tecnica_url?: string;

  // URL opcional para PDF adicional
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

  // Relación con categoría (nivel 2) — opcional
  @Column({ name: 'categoria_id', type: 'int', nullable: true })
  categoriaId: number | null;

  @ManyToOne(() => Categoria, { eager: false, nullable: true })
  @JoinColumn({ name: 'categoria_id' })
  categoria: Categoria | null;

  // 🛑 CAMBIO CRÍTICO: RELACIÓN CON SUBCATEGORÍA (Nivel 3)
  // -----------------------------------------------------
  // La columna fue renombrada a `subcategoria_id` en la base de datos (paso anterior).
  @Column({ name: 'subcategoria_id', type: 'int', nullable: true })
  subcategoriaId: number | null; 

  // Apunta a la entidad Subcategoria - eager FALSE para evitar cargas automáticas
  @ManyToOne(() => Subcategoria, { eager: false, nullable: true })
  @JoinColumn({ name: 'subcategoria_id' }) // Debe coincidir con el nombre de la columna en la BD
  subcategoria: Subcategoria | null; // El nombre de la propiedad cambia a 'subcategoria'

  
  // -----------------------------------------------------

  // RELACIONES
  // Un producto tiene un único registro de inventario (one-to-one).
  @OneToOne(() => Inventario, (inv) => inv.producto)
  inventario: Inventario;

  @OneToMany(() => Precio, (precio) => precio.producto)
  precios: Precio[];

  // Relación con compras (un producto puede tener muchas compras)
  @OneToMany(() => Compra, (compra) => compra.producto)
  compras: Compra[];

  // Relación uno a muchos con imágenes
  @OneToMany(() => ProductoImagen, (imagen) => imagen.producto, { cascade: true })
  imagenes: ProductoImagen[];
}