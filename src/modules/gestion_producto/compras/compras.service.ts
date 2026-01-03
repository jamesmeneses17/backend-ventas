import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateCompraDto } from './dto/create-compra.dto';
import { UpdateCompraDto } from './dto/update-compra.dto';

import { Compra } from './entities/compra.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Inventario } from '../inventario/entities/inventario.entity';
import { CajaService } from '../../facturacion/caja/caja.service';

@Injectable()
export class ComprasService {
  constructor(
    @InjectRepository(Compra)
    private readonly compraRepo: Repository<Compra>,
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    @InjectRepository(Inventario)
    private readonly inventarioRepo: Repository<Inventario>,
    private readonly cajaService: CajaService, // Inject CajaService
  ) { }

  // ===== CREAR =====
  async create(dto: CreateCompraDto) {

    // Normalizar fecha: si no viene, usar undefined (NO null)
    const fechaNormalizada =
      dto.fecha ? String(dto.fecha).split('T')[0] : undefined;

    // Mapeo manual ANTES de crear "data"
    let productoId: number | undefined = undefined;

    if ((dto as any).producto_id !== undefined) {
      productoId = (dto as any).producto_id;
    }

    const data: Partial<Compra> = {
      ...dto,
      fecha: fechaNormalizada,
      productoId,
    };

    // Cargar producto si viene productoId
    let producto: Producto | null = null;
    if (productoId) {
      producto = await this.productoRepo.findOne({
        where: { id: productoId },
        relations: ['inventario', 'subcategoria'],
      });
      if (!producto) throw new NotFoundException('Producto no encontrado');

      // Garantizar registro de inventario asociado
      if (!producto.inventario) {
        const inventarioCreado = this.inventarioRepo.create({
          productoId: producto.id,
          stock: 0,
          compras: 0,
          ventas: 0,
        });
        const inventarioGuardado = await this.inventarioRepo.save(inventarioCreado);
        producto.inventario = inventarioGuardado;
      }

      data.categoriaId =
        (producto.subcategoria as any)?.categoriaId ?? undefined;
    }

    const compra = this.compraRepo.create(data);
    const compraGuardada = await this.compraRepo.save(compra);

    // ===== REGISTRAR EGRESO EN CAJA (ID 2) =====
    try {
      // Usamos el DTO original porque 'data' está tipado como Partial<Compra> y podría no tener campos extra
      const dtoAny = dto as any;
      if (dtoAny.monto_total || (data.cantidad && data.costo_unitario)) {
        const monto = dtoAny.monto_total
          ? Number(dtoAny.monto_total)
          : Number(data.cantidad) * Number(data.costo_unitario);

        // Limit concept to 255 chars to match database column constraint
        let concepto = `Cod: ${producto?.codigo || 'SN'} - ${producto?.nombre || 'Producto sin nombre'}\nCant: ${data.cantidad}`;
        if (concepto.length > 255) {
          concepto = concepto.substring(0, 255);
        }

        await this.cajaService.create({
          tipo_movimiento_id: 5, // ID 5 = Egreso por Compra
          fecha: data.fecha || new Date().toISOString().split('T')[0],
          monto: monto,
          concepto: concepto,
        });
      }
    } catch (error) {
      console.error("Error al registrar egreso en caja para la compra:", error);
      // No bloqueamos la compra si falla el registro en caja, pero logueamos
    }

    // ===== ACTUALIZAR INVENTARIO Y PRECIO DE COSTO =====
    if (producto && data.costo_unitario && data.cantidad) {
      const costoUnitario = Number(data.costo_unitario);
      const cantidad = Number(data.cantidad);

      const stockAnterior = producto.inventario?.stock ?? 0;

      const todasLasCompras = await this.compraRepo.find({
        where: { productoId: producto.id },
        order: { id: 'ASC' }
      });

      let sumaCostos = costoUnitario; // La compra actual
      let numeroCompras = 1;

      // Sumar las compras anteriores
      for (const compraAnterior of todasLasCompras) {
        if (compraAnterior.id !== compraGuardada.id) {
          sumaCostos += Number(compraAnterior.costo_unitario);
          numeroCompras++;
        }
      }

      // Promedio simple: suma de costos / número de compras
      const precioCostoNuevo = sumaCostos / numeroCompras;

      console.log(`✅ Precio costo actualizado para producto ${producto.id}:`, {
        numeroCompras,
        sumaCostos: sumaCostos.toFixed(2),
        precioCostoNuevo: precioCostoNuevo.toFixed(2),
        metodo: 'Promedio Simple'
      });

      await this.productoRepo.update(producto.id, {
        precio_costo: precioCostoNuevo,
      });

      if (producto.inventario) {
        await this.inventarioRepo.update(producto.inventario.id, {
          stock: stockAnterior + cantidad,
          compras: (producto.inventario.compras ?? 0) + cantidad,
        });
      } else {
        // Crear registro de inventario si no existía
        const nuevoInventario = this.inventarioRepo.create({
          productoId: producto.id,
          stock: stockAnterior + cantidad,
          compras: cantidad,
          ventas: 0,
        });
        await this.inventarioRepo.save(nuevoInventario);
      }

      const productoActualizado = await this.productoRepo.findOne({
        where: { id: producto.id },
        relations: ['inventario'],
      });

      if (productoActualizado) {
        compraGuardada.producto = productoActualizado;
      }
    }

    return compraGuardada;
  }

  // ===== LISTAR =====
  findAll() {
    return this.compraRepo.find({
      relations: ['producto', 'producto.inventario'],
      order: { id: 'DESC' },
    });
  }

  // ===== BUSCAR UNA =====
  async findOne(id: number) {
    const compra = await this.compraRepo.findOne({
      where: { id },
      relations: ['producto', 'producto.inventario'],
    });

    if (!compra) throw new NotFoundException('Compra no encontrada');

    return compra;
  }

  // ===== ACTUALIZAR =====
  async update(id: number, dto: UpdateCompraDto) {
    const data: any = { id, ...dto };

    if ((dto as any).fecha) {
      data.fecha = String(dto.fecha).split('T')[0];
    }

    if ((dto as any).producto_id !== undefined) {
      const productoId = (dto as any).producto_id;

      data.productoId = productoId;

      const producto = await this.productoRepo.findOne({
        where: { id: productoId },
        relations: ['subcategoria'],
      });

      if (!producto) throw new NotFoundException('Producto no encontrado');

      data.categoriaId =
        (producto.subcategoria as any)?.categoriaId ?? undefined;
    }

    const compra = await this.compraRepo.preload(data);

    if (!compra) throw new NotFoundException('Compra no encontrada');

    return this.compraRepo.save(compra);
  }

  // ===== ELIMINAR =====
  async remove(id: number) {
    const compra = await this.findOne(id);

    // 1. Eliminar movimiento de caja asociado (Heurística: buscar por fecha, monto, concepto y tipo)
    // Reconstruir el concepto como se hace en create
    let concepto = `Cod: ${compra.producto?.codigo || 'SN'} - ${compra.producto?.nombre || 'Producto sin nombre'}\nCant: ${compra.cantidad}`;
    if (concepto.length > 255) {
      concepto = concepto.substring(0, 255);
    }

    const monto = Number(compra.cantidad) * Number(compra.costo_unitario);

    // Buscar movimiento similar
    const fechaCompra = typeof compra.fecha === 'string'
      ? compra.fecha
      : (compra.fecha as Date).toISOString().split('T')[0];

    try {
      // Debemos buscar manualmente porque 'cajaService' no expone método específico 'deleteByCriteria'
      // Pero idealmente cajaService debería tener un delete o findOne para esto.
      // Dado que no puedo modificar facilmente cajaService sin ver su archivo, intentaré usar 'cajaService.repository' si es público o llamar un método.
      // Asumiendo que cajaService es un wrapper standard, veré si puedo acceder al repositorio o si necesito agregar un método en CajaService.
      // Por ahora, como 'cajaService' se inyecta y probablemente usa TypeORM, verificamos si tiene un método expuesto.
      // Al ver `caja.service.ts` importado, asumiré que necesito un método 'deleteByCriteria' o similar en CajaService.
      // Pero primero voy a implementar la logica aqui si tengo acceso al repositorio de MovimientoCaja, pero NO LO TENGO inyectado aqui.
      // Tengo 'cajaService'.

      // Mejor enfoque: Agregar método `deleteByCompraDetails` en CajaService y llamarlo aquí.
      await this.cajaService.deleteByCompraDetails({
        fecha: fechaCompra,
        monto: monto,
        concepto: concepto,
        tipo_movimiento_id: 5
      });

    } catch (error) {
      console.warn('No se pudo eliminar el movimiento de caja asociado a la compra:', error);
    }

    // 2. Eliminar la compra
    return this.compraRepo.remove(compra);
  }
}
