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
        console.log('Creating MovimientoCaja:', JSON.stringify(dto));
        const data = {
            ...dto,
            tipoMovimientoId: dto.tipo_movimiento_id,
        };
        const nuevo = this.repository.create(data);
        return this.repository.save(nuevo);
    }

    findAll(tipoMovimiento?: string) {
        console.log('Finding MovimientosCaja with filter:', tipoMovimiento);

        const query = this.repository.createQueryBuilder('caja')
            .leftJoinAndSelect('caja.tipoMovimiento', 'tipoMovimiento')
            .orderBy('caja.fecha', 'DESC');

        if (tipoMovimiento) {
            // Trim and lower case comparison for robustness
            query.where('LOWER(TRIM(tipoMovimiento.nombre)) = LOWER(TRIM(:tipo))', { tipo: tipoMovimiento });
        }

        return query.getMany();
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

        // 1. Saldo Actual: (Ingresos + Ventas) - (Egresos + Gastos)
        // ID 1 = Ingreso, ID 4 = Venta  => Sumar
        // ID 2 = Egreso, ID 3 = Gasto   => Restar
        const saldoQuery = await this.repository
            .createQueryBuilder('caja')
            .select("SUM(CASE WHEN caja.tipoMovimientoId IN (1, 4) THEN caja.monto ELSE -caja.monto END)", "saldo")
            .getRawOne();

        // 2. Ingresos de Hoy (Ingresos + Ventas)
        const ingresosQuery = await this.repository
            .createQueryBuilder('caja')
            .select("SUM(caja.monto)", "total")
            .where("caja.tipoMovimientoId IN (1, 4)")
            .andWhere("caja.fecha = :today", { today })
            .getRawOne();

        // 3. Egresos y Gastos de Hoy
        const egresosQuery = await this.repository
            .createQueryBuilder('caja')
            .select("SUM(caja.monto)", "total")
            .where("caja.tipoMovimientoId IN (2, 3, 5)")
            .andWhere("caja.fecha = :today", { today })
            .getRawOne();

        return {
            saldoActual: Number(saldoQuery.saldo || 0),
            totalIngresosHoy: Number(ingresosQuery.total || 0),
            totalEgresosHoy: Number(egresosQuery.total || 0),
        };
    }
    async getResumenAnual(anio: number) {
        // Agrupar por mes
        // MySQL: MONTH(fecha) devuelve 1..12
        const result = await this.repository.createQueryBuilder('caja')
            .select("MONTH(caja.fecha)", "mesNum")
            .addSelect("SUM(CASE WHEN caja.tipoMovimientoId IN (1, 4) THEN caja.monto ELSE 0 END)", "ingresos")
            .addSelect("SUM(CASE WHEN caja.tipoMovimientoId IN (2, 5) THEN caja.monto ELSE 0 END)", "egresos")
            .addSelect("SUM(CASE WHEN caja.tipoMovimientoId = 3 THEN caja.monto ELSE 0 END)", "gastos")
            .where("YEAR(caja.fecha) = :anio", { anio })
            .groupBy("MONTH(caja.fecha)")
            .orderBy("MONTH(caja.fecha)", "ASC")
            .getRawMany();

        // Mapear resultado para formato frontend (mes nombre, etc)
        const mesesNombres = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];

        // Crear array con todos los meses inicializados en 0 o solo los que tienen datos?
        // El usuario pide "tomar los valores de movimientos aparecer esas fechas nomas que le al bde"
        // Pero para el anual generalmente se muestran todos los meses.
        // Sin embargo, para cumplir "aparecer esas fechas nomas", devolveré solo lo que haya en BD o haré full fill en frontend.
        // Viendo el requerimiento "aparecer esas fechas nomas que le al bde" -> sugiere solo mostrar lo que hay.
        // Pero el FinancialSummary tiene una tabla consolidada anual que suele tener los 12 meses.
        // Voy a devolver la data procesada combinada con el array de meses para devolver estructura completa,
        // O devolver raw y que el front decida.
        // HARÉ UN MAPEO para devolver objetos MonthlyData completos para los meses que existen.

        return result.map(r => {
            const index = Number(r.mesNum) - 1;
            const ingresos = Number(r.ingresos);
            const egresos = Number(r.egresos);
            const gastos = Number(r.gastos);
            return {
                mes: mesesNombres[index],
                ingresos: ingresos,
                egresos: egresos,
                gastos: gastos,
                saldo: ingresos - (egresos + gastos)
            };
        });
    }

    async getResumenDiario(anio: number, mes: number) {
        // Agrupar por día
        const result = await this.repository.createQueryBuilder('caja')
            .select("caja.fecha", "fecha") // Fecha completa
            .addSelect("SUM(CASE WHEN caja.tipoMovimientoId IN (1, 4) THEN caja.monto ELSE 0 END)", "ingreso")
            .addSelect("SUM(CASE WHEN caja.tipoMovimientoId IN (2, 5) THEN caja.monto ELSE 0 END)", "egreso")
            .addSelect("SUM(CASE WHEN caja.tipoMovimientoId = 3 THEN caja.monto ELSE 0 END)", "gasto")
            .where("YEAR(caja.fecha) = :anio AND MONTH(caja.fecha) = :mes", { anio, mes })
            .groupBy("caja.fecha")
            .orderBy("caja.fecha", "ASC")
            .getRawMany();

        return result.map(r => {
            const ingreso = Number(r.ingreso);
            const egreso = Number(r.egreso);
            const gasto = Number(r.gasto);
            return {
                fecha: r.fecha, // string YYYY-MM-DD o Date
                mes: "", // Se puede llenar en el front o aquí
                ingreso: ingreso,
                egreso: egreso,
                gasto: gasto,
                saldo: ingreso - (egreso + gasto)
            };
        });
    }

    async getAvailableYears() {
        const result = await this.repository.createQueryBuilder('caja')
            .select("DISTINCT YEAR(caja.fecha)", "year")
            .orderBy("year", "DESC")
            .getRawMany();

        return result.map(r => Number(r.year));
    }
}