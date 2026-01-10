import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoPersonaService } from './tipo-persona.service';
import { TipoPersonaController } from './tipo-persona.controller';
import { TipoPersona } from './entities/tipo-persona.entity';

@Module({
    imports: [TypeOrmModule.forFeature([TipoPersona])],
    controllers: [TipoPersonaController],
    providers: [TipoPersonaService],
    exports: [TypeOrmModule], // útil para otros módulos (clientes)
})
export class TipoPersonaModule { }
