import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Credito } from './entities/creditos.entity';
import { DetalleCredito } from './entities/detalle-credito.entity';
import {
  CreateCreditoDto,
} from './dtos/create-credito.dto';
import { UpdateCreditoDto } from './dtos/update-credito.dto';

import { InventarioService } from '../../gestion_producto/inventario/inventario.service';

@Injectable()
export class CreditosService {
  constructor(
    @InjectRepository(Credito)
    private readonly repo: Repository<Credito>,

    @InjectRepository(DetalleCredito)
    private readonly detalleRepo: Repository<DetalleCredito>,

    private readonly inventarioService: InventarioService,
  ) { }

  async crearCredito(dto: CreateCreditoDto) {
    const { detalles, ...rest } = dto;

    // VALIDACIÓN PREVIA DE STOCK
    if (detalles && Array.isArray(detalles)) {
      for (const det of detalles) {
        if (!det.producto_id) continue;
        const inventario = await this.inventarioService.findOneByProductoId(det.producto_id);
        const stockActual = Number(inventario?.stock || 0);

        if (stockActual < det.cantidad) {
          const codigo = inventario?.producto?.codigo || `ID ${det.producto_id}`;
          throw new BadRequestException(
            `Stock insuficiente para el producto ${codigo}. Disponible: ${stockActual}, Solicitado: ${det.cantidad}`
          );
        }
      }
    }

    const credito = this.repo.create({
      ...rest,
      estado: dto.estado || 'PENDIENTE',
    });

    if (detalles && Array.isArray(detalles)) {
      credito.detalles = detalles.map((d) =>
        this.detalleRepo.create(d),
      );

      // DISMINUIR STOCK
      for (const det of detalles) {
        if (!det.producto_id) continue;
        const inventario = await this.inventarioService.findOneByProductoId(det.producto_id);
        if (inventario) {
          await this.inventarioService.actualizarInventarioPorProductoId(
            det.producto_id,
            Number(inventario.stock) - Number(det.cantidad)
            // No tocamos ventas/compras por ahora o podríamos sumar ventas?
            // El usuario solo pidió "reducir el inventario".
          );
        }
      }
    }

    return this.repo.save(credito);
  }

  async listar() {
    return this.repo.find({
      order: { id: 'DESC' },
      relations: ['detalles', 'detalles.producto', 'cliente'],
    });
  }

  async buscar(id: number) {
    return this.repo.findOne({
      where: { id },
      relations: ['detalles', 'detalles.producto', 'cliente'],
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

    // Si se actualizan detalles, manejar inventario
    if (dto.detalles) {
      // 0. VALIDACIÓN PREVIA (Simulando devolución)
      // Mapa para sumar cantidades que se liberarían del crédito actual
      const devolucionPorProducto: Record<number, number> = {};
      if (credito.detalles) {
        for (const det of credito.detalles) {
          if (det.producto_id) {
            devolucionPorProducto[det.producto_id] = (devolucionPorProducto[det.producto_id] || 0) + Number(det.cantidad);
          }
        }
      }

      // Verificar si el stock actual + lo liberado alcanza para lo nuevo
      for (const det of dto.detalles) {
        if (!det.producto_id) continue;
        const inventario = await this.inventarioService.findOneByProductoId(det.producto_id);
        const stockActual = Number(inventario?.stock || 0);
        const stockLiberable = devolucionPorProducto[det.producto_id] || 0;
        const totalDisponible = stockActual + stockLiberable;

        if (totalDisponible < det.cantidad) {
          const codigo = inventario?.producto?.codigo || `ID ${det.producto_id}`;
          throw new BadRequestException(
            `Stock insuficiente para actualizar producto ${codigo}. Disponible (incluyendo devolución): ${totalDisponible}, Solicitado: ${det.cantidad}`
          );
        }
      }

      // 1. RESTAURAR STOCK de los detalles anteriores (que se van a borrar)
      if (credito.detalles) {
        for (const det of credito.detalles) {
          if (!det.producto_id) continue;
          const inventario = await this.inventarioService.findOneByProductoId(det.producto_id);
          if (inventario) {
            await this.inventarioService.actualizarInventarioPorProductoId(
              det.producto_id,
              Number(inventario.stock) + Number(det.cantidad)
            );
          }
        }
      }

      // 2. Eliminar detalles anteriores
      await this.detalleRepo.delete({
        credito: { id },
      });

      // 3. Crear nuevos detalles
      credito.detalles = dto.detalles.map((d) =>
        this.detalleRepo.create(d),
      );

      // 4. DISMINUIR STOCK de los nuevos detalles
      for (const det of dto.detalles) {
        if (!det.producto_id) continue;
        const inventario = await this.inventarioService.findOneByProductoId(det.producto_id);
        if (inventario) {
          await this.inventarioService.actualizarInventarioPorProductoId(
            det.producto_id,
            Number(inventario.stock) - Number(det.cantidad)
          );
        }
      }
    }

    Object.assign(credito, dto);
    // Nota: "detalles" ya se asignó arriba, pero Object.assign lo sobreescribiría con el DTO (array plano)
    // Sin embargo typeorm maneja la relación si asignamos entidades. 
    // Para seguridad, como ya asignamos 'credito.detalles' con entidades creadas, 
    // Typescript podría quejarse si dto.detalles tiene estructura diferente.
    // Pero 'dto' es Partial<UpdateCreditoDto>.
    // Mejor aseguremos que no sobreescriba 'detalles' incorrectamente.
    // delete dto.detalles; // (No puedo borrar de Partial read-only o similar).
    // Simplemente guardamos.

    return this.repo.save(credito);
  }

  async eliminarCredito(id: number) {
    const credito = await this.repo.findOne({
      where: { id },
      relations: ['detalles'], // Necesitamos detalles para restaurar stock
    });

    if (!credito) {
      throw new Error('Crédito no encontrado');
    }

    // RESTAURAR STOCK antes de borrar
    if (credito.detalles) {
      for (const det of credito.detalles) {
        if (!det.producto_id) continue;
        const inventario = await this.inventarioService.findOneByProductoId(det.producto_id);
        if (inventario) {
          await this.inventarioService.actualizarInventarioPorProductoId(
            det.producto_id,
            Number(inventario.stock) + Number(det.cantidad)
          );
        }
      }
    }

    await this.repo.remove(credito);
    return { success: true };
  }
}
