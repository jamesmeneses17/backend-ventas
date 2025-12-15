// src/creditos/entities/creditos.entity.ts
import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { DetalleCredito } from './detalle-credito.entity';
import { CreditoEstado } from '../credito-estado.enum';
import { PagosCredito } from '../../pago-credito/entities/pago-credito.entity';

@Entity('creditos')
export class Credito {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  cliente_id: number;

  @Column({ type: 'varchar', length: 150 })
  articulo: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  valor_credito: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  saldo_pendiente: number;

  @Column({ type: 'date' })
  fecha_inicial: Date;

  @Column({ type: 'date' })
  fecha_final: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  num_factura: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: CreditoEstado.PENDIENTE,
  })
  estado: CreditoEstado;

  @OneToMany(() => PagosCredito, (p) => p.credito)
  pagos: PagosCredito[];

  @OneToMany(() => DetalleCredito, (detalle) => detalle.credito, { cascade: true })
  detalles: DetalleCredito[];
}
export { CreditoEstado };

