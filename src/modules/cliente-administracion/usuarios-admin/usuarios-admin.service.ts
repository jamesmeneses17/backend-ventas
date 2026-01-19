// usuarios-admin.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUsuariosAdminDto } from './dto/create-usuarios-admin.dto';
import { UpdateUsuariosAdminDto } from './dto/update-usuarios-admin.dto';
import { UsuarioAdmin } from './entities/usuarios-admin.entity';

@Injectable()
export class UsuariosAdminService {
  constructor(
    @InjectRepository(UsuarioAdmin)
    private readonly usuarioAdminRepository: Repository<UsuarioAdmin>,
  ) { }

  async create(createUsuariosAdminDto: CreateUsuariosAdminDto) {
    const nuevoUsuario = this.usuarioAdminRepository.create(createUsuariosAdminDto);
    return await this.usuarioAdminRepository.save(nuevoUsuario);
  }

  async findAll() {
    console.log('📋 Obteniendo todos los usuarios admin...');
    try {
      const usuarios = await this.usuarioAdminRepository.find({
        select: ['id', 'nombre', 'correo', 'rol', 'fecha_creacion', 'ultimo_login', 'en_linea']
      });
      console.log(`✅ Encontrados ${usuarios.length} usuarios admin`);
      return usuarios;
    } catch (error) {
      console.error('❌ Error al obtener usuarios admin:', error);
      throw error;
    }
  }

  async findOne(id: number) {
    console.log(`🔍 Buscando usuario admin con ID: ${id}`);
    try {
      const usuario = await this.usuarioAdminRepository.findOne({
        where: { id },
        select: ['id', 'nombre', 'correo', 'rol', 'fecha_creacion']
      });

      if (!usuario) {
        console.log(`❌ Usuario admin con ID ${id} no encontrado`);
        return null;
      }

      console.log(`✅ Usuario admin encontrado: ${usuario.nombre}`);
      return usuario;
    } catch (error) {
      console.error(`❌ Error al buscar usuario admin ${id}:`, error);
      throw error;
    }
  }

  async update(id: number, updateUsuariosAdminDto: UpdateUsuariosAdminDto) {
    console.log(`📝 Actualizando usuario admin ID: ${id}`);
    try {
      await this.usuarioAdminRepository.update(id, updateUsuariosAdminDto);
      return await this.findOne(id);
    } catch (error) {
      console.error(`❌ Error al actualizar usuario admin ${id}:`, error);
      throw error;
    }
  }

  async remove(id: number) {
    console.log(`🗑️ Eliminando usuario admin ID: ${id}`);
    try {
      const resultado = await this.usuarioAdminRepository.delete(id);
      return resultado;
    } catch (error) {
      console.error(`❌ Error al eliminar usuario admin ${id}:`, error);
      throw error;
    }
  }

  /**
   * Buscar un usuario por ID (solo datos públicos para el perfil)
   */
  async findById(id: number) {
    return await this.usuarioAdminRepository.findOne({
      where: { id },
      select: ['id', 'nombre', 'correo', 'rol'], // 👈 solo los campos públicos
    });
  }

  async setOnlineStatus(userId: number, status: number) {
    console.log(`🔌 Actualizando estado online usuario ${userId} a: ${status}`);
    await this.usuarioAdminRepository.update(userId, {
      en_linea: status,
      ultimo_login: status === 1 ? new Date() : undefined // Actualizar fecha solo al conectar
    });
  }
}
