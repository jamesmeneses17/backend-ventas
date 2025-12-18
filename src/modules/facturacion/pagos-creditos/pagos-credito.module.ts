import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagosCreditoService } from './pagos-credito.service';
import { PagosCreditoController } from './pagos-credito.controller';
  import { PagoCredito } from './entities/pago-credito.entity';
import { Credito } from '../creditos/entities/creditos.entity';

@Module({
  imports: [
    // Registramos ambas entidades para que el Service pueda usarlas
    TypeOrmModule.forFeature([PagoCredito, Credito])
  ],
  controllers: [PagosCreditoController],
  providers: [PagosCreditoService],
  exports: [PagosCreditoService] // Por si necesitas usarlo en otro módulo
})
export class PagosCreditoModule {}