import { TipoMovimiento } from 'src/modules/catalogos_basicos/tipos-movimiento/entities/tipo-movimiento.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Venta } from '../../../gestion_producto/ventas/entities/venta.entity';
import { Compra } from '../../../gestion_producto/compras/entities/compra.entity';

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

    @Column({ name: 'venta_id', nullable: true })
    ventaId: number | null;

    @Column({ name: 'compra_id', nullable: true })
    compraId: number | null;

    @ManyToOne(() => TipoMovimiento)
    @JoinColumn({ name: 'tipo_movimiento_id' })
    tipoMovimiento: TipoMovimiento;

    @ManyToOne(() => Venta, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'venta_id' })
    venta: Venta;

    @ManyToOne(() => Compra, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'compra_id' })
    compra: Compra;
}