import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('tipos_movimiento')
export class TipoMovimiento {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true, length: 50 })
    nombre: string; // Aquí irán 'Ingreso', 'Egreso', 'Gasto'
}