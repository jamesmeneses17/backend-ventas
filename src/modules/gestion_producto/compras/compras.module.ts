import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ComprasService } from './compras.service';
import { ComprasController } from './compras.controller';

import { Compra } from './entities/compra.entity';
import { Inventario } from '../inventario/entities/inventario.entity';
import { Producto } from '../productos/entities/producto.entity';
import { CajaModule } from '../../facturacion/caja/caja.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Compra, Inventario, Producto]),
    CajaModule,
  ],
  controllers: [ComprasController],
  providers: [ComprasService],
})
export class ComprasModule { }
