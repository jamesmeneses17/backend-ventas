import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoMovimiento } from './entities/tipo-movimiento.entity';
import { TipoMovimientoDto } from './dtos/tipo-movimiento.dto';

@Injectable()
export class TiposMovimientoService {
    constructor(
        @InjectRepository(TipoMovimiento)
        private readonly repository: Repository<TipoMovimiento>,
    ) { }

    // Listar todos para el selector del formulario
    findAll() {
        return this.repository.find({ order: { nombre: 'ASC' } });
    }

    // Obtener uno solo
    async findOne(id: number) {
        const tipo = await this.repository.findOneBy({ id });
        if (!tipo) throw new NotFoundException(`Tipo de movimiento con ID ${id} no existe`);
        return tipo;
    }

    // Crear un nuevo tipo (opcional)
    create(dto: TipoMovimientoDto) {
        const nuevo = this.repository.create(dto);
        return this.repository.save(nuevo);
    }

    // Actualizar (opcional)
    async update(id: number, dto: TipoMovimientoDto) {
        const tipo = await this.findOne(id);
        this.repository.merge(tipo, dto);
        return this.repository.save(tipo);
    }

    // Eliminar (opcional)
    async remove(id: number) {
        const tipo = await this.findOne(id);
        return this.repository.remove(tipo);
    }
}