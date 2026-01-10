import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoPersona } from './entities/tipo-persona.entity';
import { CreateTipoPersonaDto } from './dtos/create-tipo-persona.dto';
import { UpdateTipoPersonaDto } from './dtos/update-tipo-persona.dto';

@Injectable()
export class TipoPersonaService {
    constructor(
        @InjectRepository(TipoPersona)
        private readonly tipoPersonaRepository: Repository<TipoPersona>,
    ) { }

    create(dto: CreateTipoPersonaDto) {
        const tipoPersona = this.tipoPersonaRepository.create(dto);
        return this.tipoPersonaRepository.save(tipoPersona);
    }

    findAll() {
        return this.tipoPersonaRepository.find({
            order: { id: 'ASC' },
        });
    }

    async findOne(id: number) {
        const tipoPersona = await this.tipoPersonaRepository.findOne({
            where: { id },
        });

        if (!tipoPersona) {
            throw new NotFoundException(`Tipo de persona con ID ${id} no existe`);
        }

        return tipoPersona;
    }

    async update(id: number, dto: UpdateTipoPersonaDto) {
        const tipoPersona = await this.findOne(id);
        Object.assign(tipoPersona, dto);
        return this.tipoPersonaRepository.save(tipoPersona);
    }

    async remove(id: number) {
        const tipoPersona = await this.findOne(id);
        return this.tipoPersonaRepository.remove(tipoPersona);
    }
}
