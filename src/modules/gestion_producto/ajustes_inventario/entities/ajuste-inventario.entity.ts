import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Producto } from '../../productos/entities/producto.entity';

@Entity('ajustes_inventario')
export class AjusteInventario {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    producto_id: number;

    @Column()
    stock_sistema: number;

    @Column()
    stock_fisico: number;

    @Column()
    diferencia: number;

    @Column({ default: 'Ajuste Manual / Auditoría fin de año' })
    motivo: string;

    @CreateDateColumn({ type: 'timestamp' })
    fecha: Date;

    @ManyToOne(() => Producto, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    @JoinColumn({ name: 'producto_id' })
    producto: Producto;
}