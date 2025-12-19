import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PedidoOnline } from './pedido-online.entity';

@Entity('detalles_pedidos_online')
export class DetallePedidoOnline {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PedidoOnline, (pedido) => pedido.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pedido_id' })
  pedido: PedidoOnline;

  @Column()
  producto_id: number;

  @Column()
  cantidad: number;

  @Column('decimal', { precision: 12, scale: 2 })
  precio_unitario: number;

  @Column('decimal', { precision: 12, scale: 2 })
  subtotal: number;
}