import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PedidosOnlineController } from './pedidos-online.controller';
import { PedidosOnlineService } from './pedidos-online.service';
import { PedidoOnline } from './entities/pedido-online.entity';
import { DetallePedidoOnline } from './entities/detalle-pedido-online.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PedidoOnline, DetallePedidoOnline]),
  ],
  controllers: [PedidosOnlineController],
  providers: [PedidosOnlineService],
  exports: [PedidosOnlineService],
})
export class PedidosOnlineModule {}