import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { Credito } from './creditos.entity';

import { Producto } from '../../../gestion_producto/productos/entities/producto.entity';

@Entity('detalles_creditos')
export class DetalleCredito {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Credito, (credito) => credito.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'credito_id' })
  credito: Credito;

  @Column({ type: 'int', nullable: true })
  producto_id: number | null;

  @Column({ type: 'varchar', nullable: true })
  descripcion_manual: string;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  precio_unitario: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  subtotal: number;
}
