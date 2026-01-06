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
    private readonly cajaService: CajaService,
    private readonly dataSource: DataSource, // Inyectado para manejar transacciones
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

        // Actualizar Stock y Contador de Compras
        const stockActual = producto.inventario?.stock ?? 0;
        const comprasActual = producto.inventario?.compras ?? 0;

        await queryRunner.manager.update(Inventario, { producto_id: producto.id }, {
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
        concepto: `Compra Ref: ${compraGuardada.id} - Proveedor ID: ${dto.cliente_id} - Items: ${dto.items.length}`,
      });

      await queryRunner.commitTransaction();
      return this.findOne(compraGuardada.id); // Retorna la compra con todas sus relaciones

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
      relations: ['cliente', 'detalles', 'detalles.producto'], // Trae toda la jerarquía
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

  // ===== ACTUALIZAR (SOLO CABECERA) =====
  async update(id: number, dto: UpdateCompraDto) {
    const compra = await this.findOne(id);

    // Solo actualizamos datos de cabecera como fecha o cliente
    const dataActualizada = {
      ...compra,
      ...dto,
      fecha: dto.fecha ? String(dto.fecha).split('T')[0] : compra.fecha,
    };

    return this.compraRepo.save(dataActualizada);
  }

  // ===== ELIMINAR COMPRA =====
  async remove(id: number) {
    const compra = await this.findOne(id);
    // Nota: El ON DELETE CASCADE en la BD borrará automáticamente los detalles
    return this.compraRepo.remove(compra);
  }
}