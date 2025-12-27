import { TipoMovimiento } from 'src/modules/catalogos_basicos/tipos-movimiento/entities/tipo-movimiento.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

@Entity('movimientos_caja')
export class MovimientoCaja {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'tipo_movimiento_id' })
    tipoMovimientoId: number;

    @Column({ type: 'date' })
    fecha: string;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    monto: number;

    @Column({ length: 255 })
    concepto: string;

    @ManyToOne(() => TipoMovimiento)
    @JoinColumn({ name: 'tipo_movimiento_id' })
    tipoMovimiento: TipoMovimiento;
}