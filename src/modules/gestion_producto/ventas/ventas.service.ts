// src/ventas/ventas.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Venta } from './entities/venta.entity';
import { VentaDetalle } from './entities/venta-detalle.entity';
import { CreateVentaDto } from './dto/CreateVentaDto';
import { UpdateVentaDto } from './dto/UpdateVentaDto';
import { Producto } from '../productos/entities/producto.entity';
import { Inventario } from '../inventario/entities/inventario.entity';
import { MovimientoCaja } from '../../facturacion/caja/entities/movimiento-caja.entity';
import { InventarioService } from '../inventario/inventario.service'; // Import
import { CajaService } from '../../facturacion/caja/caja.service';

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    @InjectRepository(VentaDetalle)
    private readonly detalleRepository: Repository<VentaDetalle>,
    @InjectRepository(Inventario)
    private readonly inventarioRepository: Repository<Inventario>,
    @InjectRepository(MovimientoCaja)
    private readonly cajaRepository: Repository<MovimientoCaja>,
    private readonly cajaService: CajaService,
    private readonly inventarioService: InventarioService, // Injected
    private readonly dataSource: DataSource, // Requerido para transacciones seguras
  ) { }

  async create(dto: CreateVentaDto): Promise<Venta> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Calcular total global y preparar la cabecera
      const totalVenta = dto.items.reduce((acc, item) => acc + (item.cantidad * item.precio_venta), 0);

      const nuevaCabecera = this.ventaRepository.create({
        fecha: dto.fecha,
        clienteId: dto.clienteId,
        total: totalVenta
      });
      const cabeceraGuardada = await queryRunner.manager.save(nuevaCabecera);

      // 2. Procesar cada producto
      for (const item of dto.items) {
        // Validar Stock
        // Validar Stock y Obtener Producto (incluyendo precio_costo)
        const inv = await queryRunner.manager.findOne(Inventario, {
          where: { productoId: item.productoId },
          relations: ['producto'] // Necesitamos el producto para el precio_costo
        });

        if (!inv || inv.stock < item.cantidad) {
          throw new BadRequestException(`Stock insuficiente para el producto ID ${item.productoId}`);
        }

        const precioCostoSnapshot = Number(inv.producto.precio_costo || 0);

        // Crear Detalle
        const detalle = this.detalleRepository.create({
          ventaId: cabeceraGuardada.id,
          productoId: item.productoId,
          cantidad: item.cantidad,
          costo_unitario: precioCostoSnapshot, // GUARDAR HISTORICO
          precio_venta: item.precio_venta,
          subtotal: item.cantidad * item.precio_venta
        });
        await queryRunner.manager.save(detalle);

        // Actualizar Inventario (MANUAL REMOVED - SYNC WILL HANDLE)
        // Solo para validar stock usamos la consulta arriba, pero la actualización real 
        // la hará el SYNC post-commit para asegurar consistencia. 
        // PERO: Si validamos "inv.stock < item.cantidad", usamos el stock del sistema.
        // ¿Y si hacemos el descuento temporal por seguridad?
        // En este paso, el sync corregirá, pero si no descontamos aquí, el sync post-commit lo verá igual.
        // Espera: VentaDetalle YA está guardado en transacción.
        // Sync usa `Sum(VentasDetail)`. Si VentaDetalle está guardado, Sync lo verá (después del commit).
        // Así que NO necesitamos tocar Inventario aquí manualmente.
      }

      // 3. Registrar Ingreso en Caja (ID 4 = Venta) - Transaccional
      const cajaMov = queryRunner.manager.create(MovimientoCaja, {
        tipoMovimientoId: 4,
        fecha: dto.fecha,
        monto: totalVenta,
        concepto: `Venta Factura #${cabeceraGuardada.id}`,
        ventaId: cabeceraGuardada.id,
      });
      await queryRunner.manager.save(cajaMov);

      await queryRunner.commitTransaction();

      // === POST COMMIT SYNC ===
      const prods = [...new Set(dto.items.map(i => i.productoId))];
      for (const pid of prods) {
        try { await this.inventarioService.sincronizarStock(pid); } catch (e) { }
      }

      return this.findOne(cabeceraGuardada.id);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  findAll(): Promise<Venta[]> {
    return this.ventaRepository.find({
      relations: ['cliente', 'detalles', 'detalles.producto'],
      order: { id: 'DESC' }
    });
  }

  async findOne(id: number): Promise<Venta> {
    const venta = await this.ventaRepository.findOne({
      where: { id },
      relations: ['cliente', 'detalles', 'detalles.producto']
    });
    if (!venta) throw new NotFoundException(`Venta #${id} no encontrada.`);
    return venta;
  }

  async update(id: number, dto: UpdateVentaDto): Promise<Venta> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Obtener venta actual con detalles
      // findOne usa this.ventaRepository.findOne, pero necesitamos que sea parte de la transacción si queremos consistencia absoluta?
      // Usaremos queryRunner.manager.findOne para estar seguros, o reusamos findOne si confiamos.
      // Mejor reusar logica manual para asegurar relations.
      const ventaActual = await queryRunner.manager.findOne(Venta, {
        where: { id },
        relations: ['detalles', 'detalles.producto']
      });

      if (!ventaActual) throw new NotFoundException(`Venta #${id} no encontrada`);

      let nuevoTotal = Number(ventaActual.total);
      let fechaFinal = dto.fecha || ventaActual.fecha;

      await queryRunner.commitTransaction();

      // === POST COMMIT SYNC ===
      const productosAfectados = new Set<number>();
      if (ventaActual.detalles) ventaActual.detalles.forEach(d => productosAfectados.add(d.productoId));
      if (dto.items) dto.items.forEach(i => productosAfectados.add(i.productoId));

      for (const pid of productosAfectados) {
        try { await this.inventarioService.sincronizarStock(pid); } catch (e) { }
      }

      return this.findOne(id);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Obtener la venta con detalles antes de borrar para saber qué productos sincronizar
      // Usamos el manager para asegurar que lea lo último si hubiera conflictos, aunque aquí findOne del servicio sirve.
      const venta = await this.ventaRepository.findOne({
        where: { id },
        relations: ['detalles'],
      });

      if (!venta) {
        throw new NotFoundException(`Venta #${id} no encontrada`);
      }

      // 2. Eliminar Movimiento de Caja asociado (si existe)
      await queryRunner.manager.delete(MovimientoCaja, { ventaId: id });

      // 3. Eliminar la Venta (Cascade borrará detalles)
      await queryRunner.manager.remove(venta);

      await queryRunner.commitTransaction();

      // === POST COMMIT SYNC ===
      // Sincronizar stock de productos que estaban en la venta
      if (venta.detalles) {
        for (const det of venta.detalles) {
          try {
            await this.inventarioService.sincronizarStock(det.productoId);
          } catch (e) {
            console.error(`Error syncing stock for product ${det.productoId} after sale delete`, e);
          }
        }
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async fixHistoricalCosts(): Promise<string> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // Actualizar todos los detalles que tengan costo 0 usando el costo actual del producto
      await queryRunner.manager.query(`
        UPDATE ventas_detalle vd
        JOIN productos p ON p.id = vd.producto_id
        SET vd.costo_unitario = p.precio_costo
        WHERE vd.costo_unitario = 0
      `);

      await queryRunner.commitTransaction();
      return "Costos históricos corregidos correctamente.";
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}