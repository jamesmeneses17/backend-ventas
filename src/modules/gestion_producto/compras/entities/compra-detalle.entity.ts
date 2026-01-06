import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Compra } from './compra.entity';
import { Producto } from '../../productos/entities/producto.entity';

@Entity('compras_detalle')
export class CompraDetalle {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    compra_id: number;

    @ManyToOne(() => Compra, (compra) => compra.detalles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'compra_id' })
    compra: Compra;

    @Column()
    producto_id: number;

    @ManyToOne(() => Producto)
    @JoinColumn({ name: 'producto_id' })
    producto: Producto;

    @Column()
    cantidad: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    costo_unitario: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    subtotal: number;
}