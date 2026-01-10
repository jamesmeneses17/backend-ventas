import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { Venta } from './entities/venta.entity';
import { VentaDetalle } from './entities/venta-detalle.entity'; // Nueva entidad de detalle
import { Producto } from '../productos/entities/producto.entity';
import { Inventario } from '../inventario/entities/inventario.entity';
import { CajaModule } from '../../facturacion/caja/caja.module';

@Module({
  imports: [
    // Registramos VentaDetalle para que el Service pueda usar su repositorio
    TypeOrmModule.forFeature([Venta, VentaDetalle, Producto, Inventario]),
    CajaModule,
  ],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule { }