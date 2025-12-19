import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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
      const detalles = dto.detalles.map((d) => {
        const detalle = new DetallePedidoOnline();
        detalle.producto_id = d.producto_id;
        detalle.cantidad = d.cantidad;
        detalle.precio_unitario = d.precio_unitario;
        detalle.subtotal = d.cantidad * d.precio_unitario;
        return detalle;
      });

      const nuevoPedido = this.pedidoRepo.create({
        total: dto.total,
        estado: 'PENDIENTE',
        detalles: detalles,
      });

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

  /**
   * ✅ NUEVO MÉTODO: Actualiza el estado del pedido
   * Esto es lo que hace que desaparezca de la campana de pendientes
   */
  async actualizarEstado(id: number, estado: string) {
    try {
      const pedido = await this.pedidoRepo.findOne({ where: { id } });
      
      if (!pedido) {
        throw new NotFoundException(`El pedido con ID ${id} no existe`);
      }

      // Actualizamos el estado (PENDIENTE -> CONFIRMADO / CANCELADO)
      pedido.estado = estado as any;
      await this.pedidoRepo.save(pedido);

      return { 
        mensaje: `Estado del pedido actualizado a ${estado}`,
        id: pedido.id,
        nuevoEstado: pedido.estado 
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error al actualizar estado:', error);
      throw new InternalServerErrorException('Error interno al actualizar el estado del pedido');
    }
  }
}