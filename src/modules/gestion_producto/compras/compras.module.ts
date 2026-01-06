import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ComprasService } from './compras.service';
import { ComprasController } from './compras.controller';

import { Compra } from './entities/compra.entity';
import { CompraDetalle } from './entities/compra-detalle.entity'; // Nueva entidad
import { Inventario } from '../inventario/entities/inventario.entity';
import { Producto } from '../productos/entities/producto.entity';
import { CajaModule } from '../../facturacion/caja/caja.module';
import { MovimientoCaja } from '../../facturacion/caja/entities/movimiento-caja.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Compra, CompraDetalle, Inventario, Producto, MovimientoCaja]),
    CajaModule,
  ],
  controllers: [ComprasController],
  providers: [ComprasService],
})
export class ComprasModule { }