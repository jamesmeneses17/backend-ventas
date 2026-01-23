import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AjusteInventario } from './entities/ajuste-inventario.entity';
import { Inventario } from '../inventario/entities/inventario.entity'; // Ajusta la ruta
import { CreateAjusteDto } from './dtos/create-ajuste.dto';


@Injectable()
export class AjustesService {
    constructor(
        @InjectRepository(AjusteInventario)
        private ajusteRepo: Repository<AjusteInventario>,
        @InjectRepository(Inventario)
        private inventarioRepo: Repository<Inventario>,
        private dataSource: DataSource,
    ) { }

    async crearAjuste(dto: CreateAjusteDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Obtener stock actual del sistema
            const itemInventario = await this.inventarioRepo.findOneBy({ productoId: dto.producto_id });
            if (!itemInventario) throw new NotFoundException('Producto no encontrado en inventario');

            const stockAnterior = itemInventario.stock;
            const diferencia = dto.stock_fisico - stockAnterior;

            // 2. Registrar el historial del ajuste
            const nuevoAjuste = this.ajusteRepo.create({
                ...dto,
                stock_sistema: stockAnterior,
                diferencia: diferencia,
            });
            await queryRunner.manager.save(nuevoAjuste);

            // 3. Actualizar la tabla inventario con la realidad física
            itemInventario.stock = dto.stock_fisico;
            await queryRunner.manager.save(itemInventario);

            await queryRunner.commitTransaction();
            return { message: 'Ajuste realizado con éxito', nuevoStock: dto.stock_fisico };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    // Lógica de Reversión (Rollback manual al eliminar un ajuste mal hecho)
    async eliminarAjuste(id: number) {
        const ajuste = await this.ajusteRepo.findOneBy({ id });
        if (!ajuste) throw new NotFoundException('Ajuste no encontrado');

        // Devolvemos el stock al valor original del sistema
        await this.inventarioRepo.update(
            { productoId: ajuste.producto_id },
            { stock: ajuste.stock_sistema }
        );

        return this.ajusteRepo.delete(id);
    }
    async findRecent(page: number = 1, limit: number = 10) {
        const [data, total] = await this.ajusteRepo.findAndCount({
            take: limit,
            skip: (page - 1) * limit,
            order: { id: 'DESC' },
            relations: ['producto']
        });

        return { data, total };
    }
}