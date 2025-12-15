import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { Credito } from './creditos.entity';

@Entity('detalle_creditos')
export class DetalleCredito {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Credito, (credito) => credito.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'credito_id' })
  credito: Credito;

  @Column({ type: 'varchar', length: 255 })
  articulo_nombre: string;
}
