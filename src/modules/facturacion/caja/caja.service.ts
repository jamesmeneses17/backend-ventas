import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovimientoCaja } from './entities/movimiento-caja.entity';
import { CreateMovimientoCajaDto } from './dtos/create-movimiento-caja.dto';
import { UpdateMovimientoCajaDto } from './dtos/update-movimiento-caja.dto';

@Injectable()
export class CajaService {
    constructor(
        @InjectRepository(MovimientoCaja)
        private readonly repository: Repository<MovimientoCaja>,
    ) { }

    create(dto: CreateMovimientoCajaDto) {
        // Mapeo manual de DTO (snake_case) a Entity (camelCase)
        const data = {
            ...dto,
            tipoMovimientoId: dto.tipo_movimiento_id,
        };
        const nuevo = this.repository.create(data);
        return this.repository.save(nuevo);
    }

    findAll() {
        return this.repository.find({
            relations: ['tipoMovimiento'], // Para traer el nombre del tipo (Ingreso/Egreso)
            order: { fecha: 'DESC' },
        });
    }

    async findOne(id: number) {
        const registro = await this.repository.findOneBy({ id });
        if (!registro) throw new NotFoundException(`Movimiento con ID ${id} no encontrado`);
        return registro;
    }

    async update(id: number, dto: UpdateMovimientoCajaDto) {
        const registro = await this.findOne(id);

        // Mapeo manual para update
        const data: any = { ...dto };
        if (dto.tipo_movimiento_id) {
            data.tipoMovimientoId = dto.tipo_movimiento_id;
        }

        const actualizado = this.repository.merge(registro, data);
        return this.repository.save(actualizado);
    }

    async remove(id: number) {
        const registro = await this.findOne(id);
        return this.repository.remove(registro);
    }

    async getStats() {
        // Obtener fecha actual en formato YYYY-MM-DD
        const today = new Date().toISOString().split('T')[0];

        // 1. Saldo Actual: (Ingresos) - (Egresos + Gastos)
        // Asumimos ID 1 = Ingreso, ID 2 = Egreso, ID 3 = Gasto
        const saldoQuery = await this.repository
            .createQueryBuilder('caja')
            .select("SUM(CASE WHEN caja.tipoMovimientoId = 1 THEN caja.monto ELSE -caja.monto END)", "saldo")
            .getRawOne();

        // 2. Ingresos de Hoy
        const ingresosQuery = await this.repository
            .createQueryBuilder('caja')
            .select("SUM(caja.monto)", "total")
            .where("caja.tipoMovimientoId = 1")
            .andWhere("caja.fecha = :today", { today })
            .getRawOne();

        // 3. Egresos y Gastos de Hoy
        const egresosQuery = await this.repository
            .createQueryBuilder('caja')
            .select("SUM(caja.monto)", "total")
            .where("caja.tipoMovimientoId IN (2, 3)")
            .andWhere("caja.fecha = :today", { today })
            .getRawOne();

        return {
            saldoActual: Number(saldoQuery.saldo || 0),
            totalIngresosHoy: Number(ingresosQuery.total || 0),
            totalEgresosHoy: Number(egresosQuery.total || 0),
        };
    }
}