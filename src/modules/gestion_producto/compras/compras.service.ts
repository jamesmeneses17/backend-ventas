import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { CreateCompraDto } from './dto/create-compra.dto';
import { UpdateCompraDto } from './dto/update-compra.dto';

import { Compra } from './entities/compra.entity';
import { CompraDetalle } from './entities/compra-detalle.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Inventario } from '../inventario/entities/inventario.entity';
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

        // 4. Actualizar Inventario y Precio de Costo
        const producto = await this.productoRepo.findOne({
          where: { id: item.producto_id },
          relations: ['inventario'],
        });

        if (!producto) throw new NotFoundException(`Producto ID ${item.producto_id} no encontrado`);
        nombresProductos.push(`${producto.codigo} - ${producto.nombre} (Cant: ${item.cantidad})`);

        // Actualizar Stock y Contador de Compras
        const stockActual = producto.inventario?.stock ?? 0;
        const comprasActual = producto.inventario?.compras ?? 0;

        await queryRunner.manager.update(Inventario, { productoId: producto.id }, {
          stock: stockActual + item.cantidad,
          compras: comprasActual + item.cantidad,
        });

        // Actualizar precio_costo en el producto (Promedio Simple)
        const historialCompras = await this.detalleRepo.find({ where: { producto_id: producto.id } });
        const sumaCostos = historialCompras.reduce((sum, det) => sum + Number(det.costo_unitario), Number(item.costo_unitario));
        const nuevoPrecioCosto = sumaCostos / (historialCompras.length + 1);

        await queryRunner.manager.update(Producto, producto.id, {
          precio_costo: nuevoPrecioCosto,
        });
      }

      // 5. Registrar Egreso en Caja (ID 5 = Egreso por Compra)
      await this.cajaService.create({
        tipo_movimiento_id: 5,
        fecha: nuevaCompra.fecha,
        monto: totalGeneral,
        concepto: `Compra ID: ${compraGuardada.id} - Productos: ${nombresProductos.join(', ')}`,
      });

      await queryRunner.commitTransaction();
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
      // 1. Obtener la compra actual con sus detalles para revertir inventario
      const compraActual = await this.compraRepo.findOne({
        where: { id },
        relations: ['detalles', 'detalles.producto', 'detalles.producto.inventario'],
      });

      if (!compraActual) throw new NotFoundException(`Compra #${id} no encontrada`);

      // 2. Revertir Inventario de los items viejos
      if (compraActual.detalles && compraActual.detalles.length > 0) {
        for (const detalle of compraActual.detalles) {
          const producto = detalle.producto;
          if (producto && producto.inventario) {
            const stockActual = producto.inventario.stock;
            const comprasActual = producto.inventario.compras;
            // Restar lo que se había sumado
            await queryRunner.manager.update(Inventario, { productoId: producto.id }, {
              stock: stockActual - detalle.cantidad,
              compras: Math.max(0, comprasActual - detalle.cantidad),
            });
          }
        }
        // Eliminar detalles anteriores
        await queryRunner.manager.delete(CompraDetalle, { compra_id: id });
      }

      // 3. Procesar Nuevos Items (Si el DTO tiene items)
      // Si el DTO no trae items, asumimos que no se quieren cambiar (aunque en este caso 'items' es array en el DTO, si viene vacío borraría todo)
      // Asumiremos que el frontend siempre manda el carrito completo.
      let nuevoTotal = 0;
      let nuevosItemsCount = 0;
      const nombresProductos: string[] = [];

      if (dto.items && dto.items.length > 0) {
        nuevoTotal = dto.items.reduce((acc, item) => acc + (Number(item.cantidad) * Number(item.costo_unitario)), 0);
        nuevosItemsCount = dto.items.length;

        for (const item of dto.items) {
          const subtotal = Number(item.cantidad) * Number(item.costo_unitario);

          // Insertar nuevo detalle
          const nuevoDetalle = this.detalleRepo.create({
            compra_id: id,
            producto_id: item.producto_id,
            cantidad: item.cantidad,
            costo_unitario: item.costo_unitario,
            subtotal: subtotal
          });
          await queryRunner.manager.save(nuevoDetalle);

          // Actualizar Inventario (Sumar nueva cantidad)
          const producto = await this.productoRepo.findOne({ where: { id: item.producto_id }, relations: ['inventario'] });
          if (producto) {
            const stockActual = producto.inventario?.stock ?? 0;
            const comprasActual = producto.inventario?.compras ?? 0;

            await queryRunner.manager.update(Inventario, { productoId: producto.id }, {
              stock: stockActual + item.cantidad,
              compras: comprasActual + item.cantidad
            });
            nombresProductos.push(`${producto.codigo} - ${producto.nombre} (Cant: ${item.cantidad})`);

            // Recalcular Precio Costo
            await queryRunner.manager.update(Producto, producto.id, {
              precio_costo: item.costo_unitario
            });
          }
        }
      } else {
        // Si items viene vacío, el nuevo total es 0
        nuevoTotal = 0;
      }

      // 4. Actualizar Cabecera
      const fechaFinal = dto.fecha ? String(dto.fecha).split('T')[0] : compraActual.fecha;
      await queryRunner.manager.update(Compra, id, {
        fecha: fechaFinal,
        clienteId: dto.cliente_id ?? compraActual.clienteId,
        total: nuevoTotal
      });

      // 5. Actualizar Movimiento de Caja asociado
      const movimiento = await this.cajaRepo.createQueryBuilder('caja')
        .where("concepto LIKE :ref", { ref: `%Compra Ref: ${id}%` })
        .andWhere("tipo_movimiento_id = 5")
        .getOne();

      if (movimiento) {
        await queryRunner.manager.update(MovimientoCaja, movimiento.id, {
          monto: nuevoTotal,
          fecha: fechaFinal,
          concepto: `Compra ID: ${id} - Productos: ${nombresProductos.length > 0 ? nombresProductos.join(', ') : ''}`
        });
      }

      await queryRunner.commitTransaction();
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
      const compra = await this.findOne(id);

      // 1. Revertir Inventario
      if (compra.detalles) {
        for (const detalle of compra.detalles) {
          const producto = detalle.producto;
          // Necesitamos cargar inventario si no vino en el findOne (findOne trae producto pero a veces no inventario deep)
          // Hacemos un fetch rápido si es necesario, o confiamos en que TypeORM cargue si está en relations.
          // El findOne actual trae 'detalles.producto', pero no 'detalles.producto.inventario'.
          const prodWithInv = await this.productoRepo.findOne({ where: { id: producto.id }, relations: ['inventario'] });

          if (prodWithInv && prodWithInv.inventario) {
            await queryRunner.manager.update(Inventario, { productoId: producto.id }, {
              stock: prodWithInv.inventario.stock - detalle.cantidad,
              compras: Math.max(0, prodWithInv.inventario.compras - detalle.cantidad)
            });
          }
        }
      }

      // 2. Eliminar Movimiento de Caja
      const movimiento = await this.cajaRepo.createQueryBuilder('caja')
        .where("concepto LIKE :ref", { ref: `%Compra Ref: ${id}%` })
        .andWhere("tipo_movimiento_id = 5")
        .getOne();

      if (movimiento) {
        await queryRunner.manager.remove(movimiento);
      }

      // 3. Eliminar Compra (Cascade borrará detalles)
      await queryRunner.manager.remove(compra);

      await queryRunner.commitTransaction();
      return { message: `Compra #${id} eliminada correctamente` };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Error al eliminar compra: ' + error.message);
    } finally {
      await queryRunner.release();
    }
  }
}