// src/creditos/creditos.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Credito } from './entities/creditos.entity';
import { DetalleCredito } from './entities/detalle-credito.entity';
import { CreditosService } from './creditos.service';
import { CreditosController } from './creditos.controller';

import { InventarioModule } from '../../gestion_producto/inventario/inventario.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Credito, DetalleCredito]),
    InventarioModule,
  ],
  controllers: [CreditosController],
  providers: [CreditosService],
  exports: [CreditosService],
})
export class CreditosModule { }
