import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Credito } from './entities/creditos.entity';
import { DetalleCredito } from './entities/detalle-credito.entity';
import {
  CreateCreditoDto,
  CreateDetalleCreditoDto,
} from './dtos/create-credito.dto';
import { UpdateCreditoDto } from './dtos/update-credito.dto';

@Injectable()
export class CreditosService {
  constructor(
    @InjectRepository(Credito)
    private readonly repo: Repository<Credito>,

    @InjectRepository(DetalleCredito)
    private readonly detalleRepo: Repository<DetalleCredito>,
  ) {}

  async crearCredito(dto: CreateCreditoDto) {
    const { detalles, ...rest } = dto;

    const credito = this.repo.create({
      ...rest,
      estado: dto.estado || 'PENDIENTE',
    });

    if (detalles && Array.isArray(detalles)) {
      credito.detalles = detalles.map((d) =>
        this.detalleRepo.create(d),
      );
    }

    return this.repo.save(credito);
  }

  async listar() {
    return this.repo.find({
      order: { id: 'DESC' },
      relations: ['detalles'],
    });
  }

  async buscar(id: number) {
    return this.repo.findOne({
      where: { id },
      relations: ['detalles'],
    });
  }

  async actualizarCredito(
    id: number,
    dto: Partial<UpdateCreditoDto>,
  ) {
    const credito = await this.repo.findOne({
      where: { id },
      relations: ['detalles'],
    });

    if (!credito) {
      throw new Error('Crédito no encontrado');
    }

    Object.assign(credito, dto);

    if (dto.detalles) {
      // eliminar detalles anteriores
      await this.detalleRepo.delete({
        credito: { id },
      });

      // crear nuevos detalles
      credito.detalles = dto.detalles.map((d) =>
        this.detalleRepo.create(d),
      );
    }

    return this.repo.save(credito);
  }

  async eliminarCredito(id: number) {
    const credito = await this.repo.findOne({
      where: { id },
    });

    if (!credito) {
      throw new Error('Crédito no encontrado');
    }

    await this.repo.remove(credito);
    return { success: true };
  }
}
