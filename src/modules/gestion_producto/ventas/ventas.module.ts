// src/ventas/ventas.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { Venta } from './entities/venta.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Inventario } from '../inventario/entities/inventario.entity';
import { CajaModule } from '../../facturacion/caja/caja.module';

@Module({
  imports: [
    // Registra la entidad Venta para que TypeORM pueda inyectar el repositorio
    TypeOrmModule.forFeature([Venta, Producto, Inventario]),
    CajaModule,
  ],
  controllers: [VentasController],
  providers: [VentasService],
  exports: [VentasService] // Exporta el servicio si necesitas usarlo en otros módulos
})
export class VentasModule { }