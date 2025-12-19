import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  BeforeInsert,
} from 'typeorm';
import * as crypto from 'crypto';
import { DetallePedidoOnline } from './detalle-pedido-online.entity';

@Entity('pedidos_online')
export class PedidoOnline {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  codigo_pedido: string;

  @CreateDateColumn({ type: 'datetime' })
  fecha: Date;

  @Column('decimal', { precision: 12, scale: 2 })
  total: number;

  @Column({ length: 20, default: 'PENDIENTE' })
  estado: string;

  @Column({ length: 64 })
  hash_verificacion: string;

  @OneToMany(() => DetallePedidoOnline, (detalle) => detalle.pedido, {
    cascade: true,
  })
  detalles: DetallePedidoOnline[];

  @BeforeInsert()
  generateCodes() {
    // Generar código: VTA-YYMMDD-Random
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.codigo_pedido = `VTA-${dateStr}-${randomSuffix}`;

    // Generar Hash de validación (sha256 corto)
    this.hash_verificacion = crypto
      .createHash('sha256')
      .update(`${this.codigo_pedido}${this.total}${Date.now()}`)
      .digest('hex')
      .substring(0, 10)
      .toUpperCase();
  }
}