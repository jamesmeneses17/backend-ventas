// src/creditos/creditos.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Credito, CreditoEstado } from './entities/creditos.entity';
import { DetalleCredito } from './entities/detalle-credito.entity';
import { CreateCreditoDto, CreateDetalleCreditoDto } from './dtos/create-credito.dto';

@Injectable()
export class CreditosService {
    constructor(
        @InjectRepository(Credito)
        private readonly repo: Repository<Credito>,
        @InjectRepository(DetalleCredito)
        private readonly detalleRepo: Repository<DetalleCredito>,
    ) { }

    async crearCredito(dto: CreateCreditoDto) {
        const { detalles, ...rest } = dto;
        const credito = this.repo.create({
            ...rest,
            saldo_pendiente: dto.valor_credito,
            estado: CreditoEstado.PENDIENTE,
        });
        if (detalles && Array.isArray(detalles)) {
            credito.detalles = detalles.map((d) => this.detalleRepo.create(d));
        }
        return this.repo.save(credito);
    }

    async listar() {
        return this.repo.find({ order: { id: 'DESC' }, relations: ['detalles'] });
    }

    async buscar(id: number) {
        return this.repo.findOne({ where: { id }, relations: ['detalles'] });
    }
}
