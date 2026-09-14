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

    // VALIDACIÓN: Número de factura único
    if (dto.numero_factura) {
      const existeFactura = await this.repo.findOne({ where: { numero_factura: dto.numero_factura } });
      if (existeFactura) {
        throw new BadRequestException(`Ya existe un crédito registrado con el número de factura ${dto.numero_factura}`);
      }
    }

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
    }

    // Guardar el crédito en la BD PRIMERO. 
    let savedCredito;
    try {
      savedCredito = await this.repo.save(credito);
    } catch (error: any) {
      if (error.code === 'ER_NO_REFERENCED_ROW_2' || (error.message && error.message.includes('foreign key constraint fails'))) {
        throw new BadRequestException('El cliente seleccionado no existe o no es válido. Por favor, asegúrese de seleccionar un nombre válido de la lista.');
      }
      throw error; // Relanzar cualquier otro error inesperado
    }

    // ACTUALIZAR STOCK DESPUÉS DE GUARDAR EXITOSAMENTE
    if (detalles && Array.isArray(detalles)) {
      for (const det of detalles) {
        if (!det.producto_id) continue;
        // En lugar de cálculos manuales propensos a errores, le pedimos al sistema que recalcule usando los datos reales
        await this.inventarioService.sincronizarStock(det.producto_id);
      }
    }

    return savedCredito;
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

    // VALIDACIÓN: Número de factura único (si cambió)
    if (dto.numero_factura && dto.numero_factura !== credito.numero_factura) {
      const existeFactura = await this.repo.findOne({ where: { numero_factura: dto.numero_factura } });
      if (existeFactura) {
        throw new BadRequestException(`Ya existe otro crédito registrado con el número de factura ${dto.numero_factura}`);
      }
    }

    // Variables para saber qué productos sincronizar al final
    let oldProductIds: number[] = [];
    let newProductIds: number[] = [];
    let requiresSync = false;

    // Si se actualizan detalles, tenemos que reemplazarlos
    if (dto.detalles) {
      requiresSync = true;
      
      // 0. VALIDACIÓN PREVIA (Simulando devolución)
      // Mapa para sumar cantidades que se liberarían del crédito actual
      const devolucionPorProducto: Record<number, number> = {};
      if (credito.detalles) {
        for (const det of credito.detalles) {
          if (det.producto_id) {
            devolucionPorProducto[det.producto_id] = (devolucionPorProducto[det.producto_id] || 0) + Number(det.cantidad);
            oldProductIds.push(det.producto_id);
          }
        }
      }

      // Verificar si el stock actual + lo liberado alcanza para lo nuevo
      for (const det of dto.detalles) {
        if (!det.producto_id) continue;
        newProductIds.push(det.producto_id);
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

      // 1. Eliminar detalles anteriores
      await this.detalleRepo.delete({
        credito: { id },
      });

      // 2. Asignar nuevos detalles (serán creados por TypeORM al guardar)
      credito.detalles = dto.detalles.map((d) =>
        this.detalleRepo.create(d),
      );
    }

    Object.assign(credito, dto);

    // 3. GUARDAR CAMBIOS PRIMERO. 
    let savedCredito;
    try {
      savedCredito = await this.repo.save(credito);
    } catch (error: any) {
      if (error.code === 'ER_NO_REFERENCED_ROW_2' || (error.message && error.message.includes('foreign key constraint fails'))) {
        throw new BadRequestException('El cliente seleccionado no existe o no es válido. Por favor, asegúrese de seleccionar un nombre válido de la lista.');
      }
      throw error;
    }

    // 4. ACTUALIZAR STOCK DESPUÉS DE GUARDAR
    if (requiresSync) {
      // Sincronizar todos los productos involucrados (los que salieron y los que entraron)
      const allProductsToSync = Array.from(new Set([...oldProductIds, ...newProductIds]));
      for (const prodId of allProductsToSync) {
        await this.inventarioService.sincronizarStock(prodId);
      }
    }

    return savedCredito;
  }

  async eliminarCredito(id: number) {
    const credito = await this.repo.findOne({
      where: { id },
      relations: ['detalles'], // Necesitamos detalles para saber qué productos sincronizar
    });

    if (!credito) {
      throw new Error('Crédito no encontrado');
    }

    // 1. Eliminar los detalles del crédito manualmente para asegurar que no queden huérfanos
    await this.detalleRepo.delete({ credito: { id } });

    // 2. Eliminar el crédito principal
    await this.repo.remove(credito);

    // 3. Sincronizar el inventario de cada producto involucrado
    if (credito.detalles) {
      for (const det of credito.detalles) {
        if (!det.producto_id) continue;
        await this.inventarioService.sincronizarStock(det.producto_id);
      }
    }

    return { success: true };
  }
}
