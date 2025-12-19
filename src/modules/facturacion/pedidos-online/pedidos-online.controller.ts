import { Controller, Post, Body, Get } from '@nestjs/common';
import { PedidosOnlineService } from './pedidos-online.service';
import { CreatePedidoOnlineDto } from './dtos/create-pedido-online.dto';

@Controller('pedidos-online')
export class PedidosOnlineController {
  constructor(private readonly service: PedidosOnlineService) {}

  @Post()
  async crear(@Body() dto: CreatePedidoOnlineDto) {
    return await this.service.crearPedido(dto);
  }

  @Get()
  async listar() {
    return await this.service.listarPedidos();
  }
}