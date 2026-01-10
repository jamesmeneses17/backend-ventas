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

      // 3. Registrar Ingreso en Caja (ID 4 = Venta)
      await this.cajaService.create({
        tipo_movimiento_id: 4,
        fecha: dto.fecha,
        monto: totalVenta,
        concepto: `Venta Factura #${cabeceraGuardada.id} - Items: ${dto.items.length}`,
      });

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
    return this.ventaRepository.find({ relations: ['cliente', 'detalles'] });
  }

  async findOne(id: number): Promise<Venta> {
    const venta = await this.ventaRepository.findOne({
      where: { id },
      relations: ['cliente', 'detalles', 'detalles.producto']
    });
    if (!venta) throw new NotFoundException(`Venta #${id} no encontrada.`);
    return venta;
  }

  async update(id: number, updateVentaDto: UpdateVentaDto): Promise<Venta> {
    const venta = await this.findOne(id);
    this.ventaRepository.merge(venta, updateVentaDto);
    return this.ventaRepository.save(venta);
  }

  async remove(id: number): Promise<void> {
    const venta = await this.findOne(id);
    await this.ventaRepository.remove(venta); // Cascade borrará detalles en DB
  }
}