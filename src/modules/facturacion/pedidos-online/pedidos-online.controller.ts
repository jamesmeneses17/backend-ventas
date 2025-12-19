import { Controller, Post, Body, Get, Patch, Param } from '@nestjs/common'; // Se añade Patch y Param
import { PedidosOnlineService } from './pedidos-online.service';
import { CreatePedidoOnlineDto } from './dtos/create-pedido-online.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Pedidos Online')
@Controller('pedidos-online')
export class PedidosOnlineController {
  constructor(private readonly service: PedidosOnlineService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar un nuevo pedido desde el carrito web' })
  async crear(@Body() dto: CreatePedidoOnlineDto) {
    return await this.service.crearPedido(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los pedidos online registrados' })
  async listar() {
    return await this.service.listarPedidos();
  }

  /**
   * Endpoint para actualizar el estado del pedido.
   * Usado para confirmar el pedido tras validar el HASH.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar el estado de un pedido (Confirmar/Cancelar)' })
  async actualizarEstado(
    @Param('id') id: number, 
    @Body('estado') estado: 'CONFIRMADO' | 'CANCELADO'
  ) {
    return await this.service.actualizarEstado(id, estado);
  }
}