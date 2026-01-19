import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosAdminService } from './usuarios-admin.service';
import { UsuariosAdminController } from './usuarios-admin.controller';
import { UsuarioAdmin } from './entities/usuarios-admin.entity';

import { UsuariosGateway } from './usuarios.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([UsuarioAdmin])],
  controllers: [UsuariosAdminController],
  providers: [UsuariosAdminService, UsuariosGateway],
  exports: [UsuariosAdminService, TypeOrmModule], // Exportar para uso en otros módulos
})
export class UsuariosAdminModule { }
