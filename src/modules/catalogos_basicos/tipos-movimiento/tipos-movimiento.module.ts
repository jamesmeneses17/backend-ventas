import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoMovimiento } from './entities/tipo-movimiento.entity';
import { TiposMovimientoService } from './tipos-movimiento.service';
import { TiposMovimientoController } from './tipos-movimiento.controller';

@Module({
    imports: [TypeOrmModule.forFeature([TipoMovimiento])],
    controllers: [TiposMovimientoController],
    providers: [TiposMovimientoService],
    exports: [TiposMovimientoService, TypeOrmModule],
})
export class TiposMovimientoModule { }