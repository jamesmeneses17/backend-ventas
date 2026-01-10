import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Venta } from './venta.entity';
import { Producto } from '../../productos/entities/producto.entity';

@Entity('ventas_detalle')
export class VentaDetalle {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'venta_id' })
    ventaId: number;

    @ManyToOne(() => Venta, (venta) => venta.detalles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'venta_id' })
    venta: Venta;

    @Column({ name: 'producto_id' })
    productoId: number;

    @ManyToOne(() => Producto)
    @JoinColumn({ name: 'producto_id' })
    producto: Producto;

    @Column({ type: 'int' })
    cantidad: number;



    @Column({ type: 'decimal', precision: 12, scale: 2 })
    precio_venta: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    subtotal: number;
}