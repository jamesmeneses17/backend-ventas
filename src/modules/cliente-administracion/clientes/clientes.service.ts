// src/clientes/clientes.service.ts (Actualizado)

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Cliente } from './entities/cliente.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
  ) { }

  async create(createClienteDto: CreateClienteDto): Promise<Cliente> {
    const cliente = this.clienteRepository.create(createClienteDto);
    return this.clienteRepository.save(cliente);
  }

  // OBTENER TODOS (findAll) - CON RELACIÓN
  async findAll(search?: string): Promise<Cliente[]> {
    const whereCondition = search
      ? [
        { nombre: Like(`%${search}%`) },
        { numero_documento: Like(`%${search}%`) },
      ]
      : {};

    // Usamos 'relations' para incluir los datos de la entidad relacionada
    return this.clienteRepository.find({
      where: whereCondition,
      relations: ['tipoDocumento', 'tipoContacto', 'tipoPersona'], // Carga la entidad TipoDocumento y TipoContacto
      order: { id: 'DESC' }, // Ordenar por ID descendente (nuevos primero)
      take: 20, // Limit results for performance if searching
    });
  }

  // OBTENER UNO (findOne) - CON RELACIÓN
  async findOne(id: number): Promise<Cliente> {
    const cliente = await this.clienteRepository.findOne({
      where: { id },
      relations: ['tipoDocumento', 'tipoContacto', 'tipoPersona'] // Carga la entidad TipoDocumento y TipoContacto
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }
    return cliente;
  }

  async update(id: number, updateClienteDto: UpdateClienteDto): Promise<Cliente> {
    // 1. Buscamos el cliente sin relaciones para evitar conflictos de objetos
    const cliente = await this.clienteRepository.findOne({ where: { id } });

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    // 2. Aplicamos los cambios del DTO al objeto cliente
    // Al no tener la relación cargada como objeto, el ID se actualizará sin problemas
    this.clienteRepository.merge(cliente, updateClienteDto);

    // 3. Guardamos y retornamos el cliente con sus relaciones actualizadas
    await this.clienteRepository.save(cliente);

    return this.findOne(id); // Retornamos el cliente refrescado con sus nombres de tipos
  }

  async remove(id: number): Promise<void> {
    const result = await this.clienteRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }
  }
}