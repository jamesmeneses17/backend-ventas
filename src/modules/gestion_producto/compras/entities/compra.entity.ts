import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { CompraDetalle } from './compra-detalle.entity';
import { Cliente } from 'src/modules/cliente-administracion/clientes/entities/cliente.entity';

@Entity('compras_cabecera') //
export class Compra {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date', nullable: true })
    fecha: string;

    // ========================
    //    RELACIÓN CON CONTACTO (PROVEEDOR)
    // ========================
    @Column({ name: 'cliente_id' }) //
    clienteId: number;

    @ManyToOne(() => Cliente) //
    @JoinColumn({ name: 'cliente_id' })
    cliente: Cliente;

    // ========================
    //    CAMPOS TOTALES
    // ========================
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    total: number; //

    // ========================
    //    RELACIÓN CON LOS DETALLES (PRODUCTOS)
    // ========================
    // Esta relación permite acceder a todos los productos de esta compra
    @OneToMany(() => CompraDetalle, (detalle) => detalle.compra, {
        cascade: true // Permite guardar cabecera y detalles al mismo tiempo
    })
    detalles: CompraDetalle[];
}