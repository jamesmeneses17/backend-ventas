import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoContactoClienteService } from './tipo-contacto-cliente.service';
import { TipoContactoClienteController } from './tipo-contacto-cliente.controller';
import { TipoContactoCliente } from './entities/tipo-contacto-cliente.entity';

@Module({
    imports: [
        // Registra la entidad para que TypeORM cree la conexión con la tabla 'tipos_contacto'
        TypeOrmModule.forFeature([TipoContactoCliente]),
    ],
    controllers: [TipoContactoClienteController],
    providers: [TipoContactoClienteService],
    exports: [TipoContactoClienteService], // Exportamos por si el módulo de Contactos lo necesita
})
export class TipoContactoClienteModule { }