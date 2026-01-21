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
        const inv = await queryRunner.manager.findOne(Inventario, { where: { productoId: item.productoId } });
        if (!inv || inv.stock < item.cantidad) {
          throw new BadRequestException(`Stock insuficiente para el producto ID ${item.productoId}`);
        }

        // Crear Detalle
        const detalle = this.detalleRepository.create({
          ventaId: cabeceraGuardada.id,
          productoId: item.productoId,
          cantidad: item.cantidad,

          precio_venta: item.precio_venta,
          subtotal: item.cantidad * item.precio_venta
        });
        await queryRunner.manager.save(detalle);

        // Actualizar Inventario
        inv.stock -= item.cantidad;
        inv.ventas = (inv.ventas || 0) + item.cantidad;
        await queryRunner.manager.save(inv);
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

      // 2. Si hay nuevos items, rehacer inventario
      if (dto.items) {
        // A. REVERTIR Inventario (Devolver stock de lo que se vendió antes)
        if (ventaActual.detalles) {
          for (const det of ventaActual.detalles) {
            const inv = await queryRunner.manager.findOne(Inventario, { where: { productoId: det.productoId } });
            if (inv) {
              inv.stock += det.cantidad;
              inv.ventas = Math.max(0, (inv.ventas || 0) - det.cantidad);
              await queryRunner.manager.save(inv);
            }
          }
          // Eliminar detalles anteriores
          await queryRunner.manager.delete(VentaDetalle, { ventaId: id });
        }

        // B. PROCESAR NUEVOS ITEMS
        nuevoTotal = 0;
        for (const item of dto.items) {
          // Validar Stock, considerando que acabamos de "devolver" lo viejo.
          const inv = await queryRunner.manager.findOne(Inventario, { where: { productoId: item.productoId } });

          if (!inv || inv.stock < item.cantidad) {
            throw new BadRequestException(`Stock insuficiente para el producto ID ${item.productoId} (Disponible: ${inv?.stock || 0})`);
          }

          const detalle = this.detalleRepository.create({
            ventaId: id,
            productoId: item.productoId,
            cantidad: item.cantidad,
            precio_venta: item.precio_venta,
            subtotal: item.cantidad * item.precio_venta
          });
          await queryRunner.manager.save(detalle);

          nuevoTotal += detalle.subtotal;

          // Restar Inventario
          inv.stock -= item.cantidad;
          inv.ventas = (inv.ventas || 0) + item.cantidad;
          await queryRunner.manager.save(inv);
        }
      }

      // 3. Actualizar Cabecera de Venta
      await queryRunner.manager.update(Venta, id, {
        fecha: fechaFinal,
        clienteId: dto.clienteId || ventaActual.clienteId,
        total: nuevoTotal
      });

      // 4. Actualizar Caja (Sincronizar movimiento financiero)
      // 4. Actualizar Caja (Sincronizar movimiento financiero)
      // Buscar por ventaId usando queryRunner
      const movimientoCaja = await queryRunner.manager.findOne(MovimientoCaja, { where: { ventaId: id } });

      if (movimientoCaja) {
        await queryRunner.manager.update(MovimientoCaja, movimientoCaja.id, {
          monto: nuevoTotal,
          fecha: fechaFinal,
          concepto: `Venta Factura #${id} - Items: ${dto.items ? dto.items.length : ventaActual.detalles.length}`
        });
      }

      await queryRunner.commitTransaction();
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
      const venta = await this.findOne(id);

      // 1. Restaurar Stock
      if (venta.detalles) {
        for (const det of venta.detalles) {
          const inv = await queryRunner.manager.findOne(Inventario, { where: { productoId: det.productoId } });
          if (inv) {
            inv.stock += det.cantidad;
            // Restar del contador de ventas si se desea mantener coherencia
            inv.ventas = Math.max(0, (inv.ventas || 0) - det.cantidad);
            await queryRunner.manager.save(inv);
          }
        }
      }

      // 2. Eliminar registro de Caja asociado
      // El concepto guardado es: `Venta Factura #${id} ...`
      const movimientoCaja = await this.cajaRepository
        .createQueryBuilder('caja')
        .where("concepto LIKE :ref", { ref: `%Venta Factura #${id}%` })
        .andWhere("tipo_movimiento_id = 4") // 4 = Venta
        .getOne();

      if (movimientoCaja) {
        await queryRunner.manager.remove(movimientoCaja);
      }

      // 3. Eliminar Venta
      await queryRunner.manager.remove(venta);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}