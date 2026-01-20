// src/creditos/entities/creditos.entity.ts

import { Column, Entity, PrimaryGeneratedColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { DetalleCredito } from './detalle-credito.entity';
import { PagoCredito } from '../../pagos-creditos/entities/pago-credito.entity';
import { Cliente } from '../../../cliente-administracion/clientes/entities/cliente.entity';

@Entity('creditos')
export class Credito {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  numero_factura: string;

  @Column({ type: 'int' })
  cliente_id: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  saldo_pendiente: number;

  @Column({ type: 'date' })
  fecha_inicial: Date;

  @Column({ type: 'date', nullable: true })
  fecha_final: Date;

  @Column({ type: 'varchar', length: 20, default: 'PENDIENTE' })
  estado: string;

  @OneToMany(() => DetalleCredito, (detalle) => detalle.credito, { cascade: true })
  detalles: DetalleCredito[];

  @OneToMany(() => PagoCredito, (pago) => pago.credito)
  pagos: PagoCredito[];

  @ManyToOne(() => Cliente)
  @JoinColumn({ name: 'cliente_id' })
  cliente: Cliente;
}

