import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Credito } from '../../creditos/entities/creditos.entity';

@Entity('pagos_credito')
export class PagoCredito {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Credito, (credito) => credito.pagos)
  @JoinColumn({ name: 'credito_id' })
  credito: Credito;

  @Column({ name: 'credito_id' })
  credito_id: number;

  @Column('decimal', { name: 'monto_pago', precision: 15, scale: 2 })
  monto_pago: number;

  @CreateDateColumn({ name: 'fecha_pago' })
  fecha_pago: Date;
}