import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PedidoOnline } from './entities/pedido-online.entity';
import { DetallePedidoOnline } from './entities/detalle-pedido-online.entity';
import { CreatePedidoOnlineDto } from './dtos/create-pedido-online.dto';

@Injectable()
export class PedidosOnlineService {
  constructor(
    @InjectRepository(PedidoOnline)
    private readonly pedidoRepo: Repository<PedidoOnline>,
    @InjectRepository(DetallePedidoOnline)
    private readonly detalleRepo: Repository<DetallePedidoOnline>,
  ) {}

  async crearPedido(dto: CreatePedidoOnlineDto) {
    try {
      // 1. Mapear los detalles y calcular subtotales internamente
      const detalles = dto.detalles.map((d) => {
        const detalle = new DetallePedidoOnline();
        detalle.producto_id = d.producto_id;
        detalle.cantidad = d.cantidad;
        detalle.precio_unitario = d.precio_unitario;
        detalle.subtotal = d.cantidad * d.precio_unitario;
        return detalle;
      });

      // 2. Crear la instancia del pedido
      const nuevoPedido = this.pedidoRepo.create({
        total: dto.total,
        estado: 'PENDIENTE',
        detalles: detalles,
      });

      // 3. Guardar (TypeORM manejará el @BeforeInsert para el código y hash)
      const pedidoGuardado = await this.pedidoRepo.save(nuevoPedido);

      return {
        mensaje: 'Pedido registrado en sistema',
        codigo_pedido: pedidoGuardado.codigo_pedido,
        hash_verificacion: pedidoGuardado.hash_verificacion,
        total: pedidoGuardado.total,
        fecha: pedidoGuardado.fecha,
      };
    } catch (error) {
      console.error('Error al crear pedido online:', error);
      throw new InternalServerErrorException('No se pudo registrar el pedido online');
    }
  }

  async listarPedidos() {
    return await this.pedidoRepo.find({
      relations: ['detalles'],
      order: { fecha: 'DESC' },
    });
  }
}