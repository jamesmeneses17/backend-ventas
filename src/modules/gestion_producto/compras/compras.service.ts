import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { CreateCompraDto } from './dto/create-compra.dto';
import { UpdateCompraDto } from './dto/update-compra.dto';

import { Compra } from './entities/compra.entity';
import { CompraDetalle } from './entities/compra-detalle.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Inventario } from '../inventario/entities/inventario.entity';
import { InventarioService } from '../inventario/inventario.service'; // Added Import
import { CajaService } from '../../facturacion/caja/caja.service';
import { MovimientoCaja } from '../../facturacion/caja/entities/movimiento-caja.entity';

@Injectable()
export class ComprasService {
  constructor(
    @InjectRepository(Compra)
    private readonly compraRepo: Repository<Compra>,
    @InjectRepository(CompraDetalle)
    private readonly detalleRepo: Repository<CompraDetalle>,
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    @InjectRepository(Inventario)
    private readonly inventarioRepo: Repository<Inventario>,
    @InjectRepository(MovimientoCaja) // Inyectar repo para buscar movimiento específico
    private readonly cajaRepo: Repository<MovimientoCaja>,
    private readonly cajaService: CajaService,
    private readonly inventarioService: InventarioService, // Injected Service
    private readonly dataSource: DataSource,
  ) { }

  // ===== CREAR COMPRA (CABECERA + DETALLES) =====
  async create(dto: CreateCompraDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Calcular el total general de la compra desde los items del DTO
      const totalGeneral = dto.items.reduce((acc, item) => {
        return acc + Number(item.cantidad) * Number(item.costo_unitario);
      }, 0);

      // 2. Crear y guardar la Cabecera vinculada al cliente_id
      const nuevaCompra = this.compraRepo.create({
        clienteId: dto.cliente_id,
        fecha: dto.fecha ? String(dto.fecha).split('T')[0] : new Date().toISOString().split('T')[0],
        total: totalGeneral,
      });
      const compraGuardada = await queryRunner.manager.save(nuevaCompra);

      const nombresProductos: string[] = [];
      // 3. Procesar cada item del detalle
      for (const item of dto.items) {
        const subtotal = Number(item.cantidad) * Number(item.costo_unitario);

        // Crear registro en compras_detalle
        const detalle = this.detalleRepo.create({
          compra_id: compraGuardada.id,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          costo_unitario: item.costo_unitario,
          subtotal: subtotal,
        });
        await queryRunner.manager.save(detalle);

        // 4. Actualizar Inventario (AUTOMÁTICO vía Sync)
        // Ya no actualizamos manualmente, llamaremos a sincronizar al final o aquí.
        // Pero sincronizar usa consultas RAW que podrían no ver la transacción si no están en ella.
        // InventarioService.sincronizarStock usa `this.repo.manager.query` o `this.repo.query`.
        // Si usa `this.repo.query`, usa una conexión nueva fuera de transacción. INVALIDO para leer lo que acabamos de insertar en transacción.

        // CRITICAL: Para que funcione dentro de la transacción, tendríamos que pasar el manager a sincronizarStock,
        // O confiar en que sincronizarStock se ejecute AFTER commit.
        // Ejecutaremos la sincronización DESPUÉS del commitTransaction.

        // Guardamos ID para sincronizar después
        nombresProductos.push(String(item.producto_id));

        // Actualizar precio_costo en el producto (Promedio Global) - Esto sí requiere transacción actual
        await this.recalculateCostPrice(queryRunner, item.producto_id);
      }

      // 5. Registrar Egreso en Caja (ID 5 = Egreso por Compra) DIRECTAMENTE con queryRunner para evitar DEADLOCKS
      // No usar this.cajaService.create porque usa otra conexión/transacción y no ve la Compra aún (fk error o lock wait)
      const cajaMov = queryRunner.manager.create(MovimientoCaja, {
        tipoMovimientoId: 5,
        fecha: nuevaCompra.fecha,
        monto: totalGeneral,
        concepto: `Compra ID: ${compraGuardada.id}`,
        compraId: compraGuardada.id, // Relación directa
      });
      await queryRunner.manager.save(cajaMov);

      await queryRunner.commitTransaction();

      // === FASE POST-COMMIT (SINCRONIZACIÓN AUTOMÁTICA) ===
      // Iteramos los productos únicos afectados y forzamos re-calculo
      const productosUnicos = [...new Set(dto.items.map(i => i.producto_id))];
      for (const pid of productosUnicos) {
        try {
          await this.inventarioService.sincronizarStock(Number(pid));
        } catch (e) { console.error(`Error sync stock producto ${pid}`, e); }
      }

      return this.findOne(compraGuardada.id);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Error al procesar la compra: ' + error.message);
    } finally {
      await queryRunner.release();
    }
  }

  // ===== LISTAR TODAS LAS COMPRAS =====
  findAll() {
    return this.compraRepo.find({
      relations: ['cliente', 'detalles', 'detalles.producto'],
      order: { id: 'DESC' },
    });
  }

  // ===== BUSCAR UNA COMPRA ESPECÍFICA =====
  async findOne(id: number) {
    const compra = await this.compraRepo.findOne({
      where: { id },
      relations: ['cliente', 'detalles', 'detalles.producto'],
    });

    if (!compra) throw new NotFoundException('Compra no encontrada');
    return compra;
  }

  // ===== ACTUALIZAR COMPRA (CABECERA + DETALLES + INVENTARIO + CAJA) =====
  async update(id: number, dto: UpdateCompraDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Obtener la compra actual con sus detalles
      const compraActual = await queryRunner.manager.findOne(Compra, {
        where: { id },
        relations: ['detalles', 'detalles.producto']
      });

      if (!compraActual) throw new NotFoundException(`Compra #${id} no encontrada`);

      // 2. Identificar productos afectados ANTES de cambios (para sync posterior)
      const productosAfectados = new Set<number>();
      if (compraActual.detalles) {
        compraActual.detalles.forEach(d => productosAfectados.add(d.producto_id));
      }
      if (dto.items) {
        dto.items.forEach(i => productosAfectados.add(i.producto_id));
      }

      console.log(`[ComprasService] Start updating compra ${id}`);

      // 3. Borrar detalles anteriores
      console.log(`[ComprasService] Deleting details for compra_id: ${id}`);
      const deleteResult = await queryRunner.manager.delete(CompraDetalle, { compra_id: id });
      console.log(`[ComprasService] Delete result:`, deleteResult);

      // 4. Calcular nuevos valores y preparar nuevos detalles
      let nuevoTotal = 0;
      const nuevosDetalles: CompraDetalle[] = [];

      if (dto.items && dto.items.length > 0) {
        console.log(`[ComprasService] Processing ${dto.items.length} new items`);
        for (const item of dto.items) {
          const subtotal = Number(item.cantidad) * Number(item.costo_unitario);
          nuevoTotal += subtotal;

          const detalle = this.detalleRepo.create({
            compra_id: id,
            producto_id: item.producto_id,
            cantidad: item.cantidad,
            costo_unitario: item.costo_unitario,
            subtotal: subtotal
          });
          nuevosDetalles.push(detalle);
        }
      } else {
        console.log(`[ComprasService] No items provided in DTO`);
      }

      // 5. Actualizar Cabecera de Compra
      compraActual.fecha = dto.fecha ? String(dto.fecha).split('T')[0] : compraActual.fecha;
      compraActual.clienteId = dto.cliente_id ?? compraActual.clienteId;
      compraActual.total = nuevoTotal;

      // CRITICAL FIX: Limpiar detalles en memoria para evitar que Cascade los re-inserte
      compraActual.detalles = [];

      console.log(`[ComprasService] Saving compra header`);
      await queryRunner.manager.save(Compra, compraActual);

      console.log(`[ComprasService] Saving ${nuevosDetalles.length} new details`);
      await queryRunner.manager.save(CompraDetalle, nuevosDetalles);

      // 6. Actualizar Movimiento de Caja (Egreso)
      // Buscamos el movimiento asociado
      const movimientoCaja = await queryRunner.manager.findOne(MovimientoCaja, {
        where: { compraId: id, tipoMovimientoId: 5 }
      });

      if (movimientoCaja) {
        movimientoCaja.monto = nuevoTotal;
        movimientoCaja.fecha = compraActual.fecha;
        await queryRunner.manager.save(MovimientoCaja, movimientoCaja);
      } else {
        // Si no existía (raro), lo creamos
        const nuevoMov = queryRunner.manager.create(MovimientoCaja, {
          tipoMovimientoId: 5,
          fecha: compraActual.fecha,
          monto: nuevoTotal,
          concepto: `Compra ID: ${id}`,
          compraId: id,
        });
        await queryRunner.manager.save(MovimientoCaja, nuevoMov);
      }

      // 7. Recalcular precio costo promedio de los productos involucrados (en nueva lista)
      if (dto.items) {
        for (const item of dto.items) {
          // Necesitamos que el calculo vea los datos recien insertados. 
          // Como estamos en transaction, queryRunner.manager los ve.
          await this.recalculateCostPrice(queryRunner, item.producto_id);
        }
      }

      await queryRunner.commitTransaction();

      // === FASE POST-COMMIT (SINCRONIZACIÓN AUTOMÁTICA) ===
      for (const pid of productosAfectados) {
        try {
          await this.inventarioService.sincronizarStock(Number(pid));
        } catch (e) { console.error(`Error sync stock update compra prod ${pid}`, e); }
      }

      return this.findOne(id);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("Error updating compra:", error);
      throw new BadRequestException('Error al actualizar la compra: ' + error.message);
    } finally {
      await queryRunner.release();
    }
  }

  // ===== ELIMINAR COMPRA =====
  async remove(id: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Obtener la compra con detalles
      const compra = await this.compraRepo.findOne({
        where: { id },
        relations: ['detalles']
      });

      if (!compra) throw new NotFoundException(`Compra #${id} no encontrada`);

      // 2. Guardar IDs de productos para sync posterior
      const productosAfectados = new Set<number>();
      if (compra.detalles) {
        compra.detalles.forEach(d => productosAfectados.add(d.producto_id));
      }

      // 3. Eliminar Movimiento de Caja asociado
      await queryRunner.manager.delete(MovimientoCaja, { compraId: id });

      // 4. Eliminar Compra (cascade elimina detalles)
      await queryRunner.manager.remove(compra);

      // 5. Recalcular precio costo promedio (Simple Average) de los productos afectados
      // Al borrar la compra, sus detalles también se borran (cascade).
      // El recálculo tomará solo las compras restantes.
      for (const prodId of productosAfectados) {
        await this.recalculateCostPrice(queryRunner, prodId);
      }

      await queryRunner.commitTransaction();

      // === FASE POST-COMMIT ===
      // Sincronizar stock de productos afectados
      for (const prodId of productosAfectados) {
        try {
          await this.inventarioService.sincronizarStock(Number(prodId));
        } catch (e) { console.error("Error sincronizando despues de borrar compra", e); }
      }

      return { message: `Compra #${id} eliminada correctamente` };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Error al eliminar compra: ' + error.message);
    } finally {
      await queryRunner.release();
    }
  }

  // ===== MÉTODO PRIVADO PARA RECALCULAR PRECIO COSTO (PROMEDIO) =====
  private async recalculateCostPrice(queryRunner: any, productoId: number) {
    // Usar QueryBuilder para calcular el promedio directamente en BD
    const result = await queryRunner.manager
      .createQueryBuilder(CompraDetalle, 'detalle')
      .select('AVG(COALESCE(detalle.costo_unitario, 0))', 'promedio')
      .where('detalle.producto_id = :id', { id: productoId })
      .getRawOne();

    const nuevoCosto = Number(result?.promedio || 0);

    await queryRunner.manager.update(Producto, productoId, {
      precio_costo: nuevoCosto,
    });
  }

  // ===== SYNC CAJA MOVEMENTS =====
  async syncCajaMovements() {
    const compras = await this.compraRepo.find();
    let createdCount = 0;
    const errors: any[] = []; // Typed explicitly

    for (const compra of compras) {
      try {
        // Verificar si ya existe movimiento tipo 5 (Egreso Compra) para esta compra
        const exists = await this.cajaRepo.findOne({
          where: {
            compraId: compra.id,
            tipoMovimientoId: 5
          }
        });

        if (!exists) {
          // Crear movimiento
          const nuevoMov = this.cajaRepo.create({
            tipoMovimientoId: 5, // Egreso por Compra
            fecha: compra.fecha, // Fecha de la compra
            monto: Number(compra.total),
            concepto: `Compra ID: ${compra.id}`,
            compraId: compra.id,
          });
          await this.cajaRepo.save(nuevoMov);
          createdCount++;
        }
      } catch (err) {
        console.error(`Error syncing compra ${compra.id}`, err);
        errors.push({ id: compra.id, error: err.message });
      }
    }

    return {
      total_compras: compras.length,
      created_movements: createdCount,
      errors
    };
  }
}