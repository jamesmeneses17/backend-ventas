import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoContactoCliente } from './entities/tipo-contacto-cliente.entity';
import { CreateTipoContactoClienteDto } from './dto/create-tipo-contacto-cliente.dto';
import { UpdateTipoContactoClienteDto } from './dto/update-tipo-contacto-cliente.dto';

@Injectable()
export class TipoContactoClienteService {
    constructor(
        @InjectRepository(TipoContactoCliente)
        private readonly tipoRepo: Repository<TipoContactoCliente>,
    ) { }

    // POST: Crear un nuevo tipo
    async create(createDto: CreateTipoContactoClienteDto) {
        try {
            const nuevoTipo = this.tipoRepo.create(createDto);
            return await this.tipoRepo.save(nuevoTipo);
        } catch (error) {
            throw new BadRequestException('Error al crear el tipo de contacto. Asegúrese de que el nombre no esté duplicado.');
        }
    }

    // GET ALL: Obtener todos
    async findAll() {
        return await this.tipoRepo.find({
            order: { id: 'ASC' }
        });
    }

    // GET ONE: Obtener por ID
    async findOne(id: number) {
        const tipo = await this.tipoRepo.findOneBy({ id });
        if (!tipo) throw new NotFoundException(`Tipo de contacto #${id} no encontrado`);
        return tipo;
    }

    // PATCH: Editar/Actualizar
    async update(id: number, updateDto: UpdateTipoContactoClienteDto) {
        const tipo = await this.tipoRepo.preload({
            id: id,
            ...updateDto,
        });

        if (!tipo) throw new NotFoundException(`No se encontró el tipo con ID #${id} para actualizar`);

        return await this.tipoRepo.save(tipo);
    }

    // DELETE: Eliminar
    async remove(id: number) {
        const tipo = await this.findOne(id);
        try {
            return await this.tipoRepo.remove(tipo);
        } catch (error) {
            throw new BadRequestException('No se puede eliminar el tipo porque tiene clientes asociados.');
        }
    }
}