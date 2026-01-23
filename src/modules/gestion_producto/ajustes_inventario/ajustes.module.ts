import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AjustesService } from './ajustes.service';
import { AjustesController } from './ajustes.controller';
import { AjusteInventario } from './entities/ajuste-inventario.entity';
import { Inventario } from '../inventario/entities/inventario.entity'; // Asegúrate de que la ruta sea correcta según tu estructura

@Module({
    imports: [
        // Importamos las entidades necesarias para que el Repositorio funcione en el Servicio
        TypeOrmModule.forFeature([AjusteInventario, Inventario]),
    ],
    controllers: [AjustesController],
    providers: [AjustesService],
    // Exportamos el servicio por si necesitas usar la lógica de ajustes en otros módulos en el futuro
    exports: [AjustesService],
})
export class AjustesModule { }