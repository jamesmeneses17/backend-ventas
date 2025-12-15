// src/ventas/ventas.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venta } from './entities/venta.entity';
import { CreateVentaDto } from './dto/CreateVentaDto';
import { UpdateVentaDto } from './dto/UpdateVentaDto';
import { Producto } from '../productos/entities/producto.entity';
import { Inventario } from '../inventario/entities/inventario.entity';
@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    @InjectRepository(Inventario)
    private readonly inventarioRepository: Repository<Inventario>,
  ) {}

  // Crear una nueva venta
  async create(createVentaDto: CreateVentaDto): Promise<Venta> {
    // Crear la nueva venta
    const nuevaVenta = this.ventaRepository.create(createVentaDto);
    const ventaGuardada = await this.ventaRepository.save(nuevaVenta);

    // ACTUALIZAR STOCK Y VENTAS EN INVENTARIO
    const inventario = await this.inventarioRepository.findOne({ where: { productoId: createVentaDto.productoId } });
    if (inventario) {
      inventario.stock = (inventario.stock || 0) - createVentaDto.cantidad;
      inventario.ventas = (inventario.ventas || 0) + createVentaDto.cantidad;
      await this.inventarioRepository.save(inventario);
    }

    // Retornar la venta con la relación producto
    const ventaConProducto = await this.ventaRepository.findOne({
      where: { id: ventaGuardada.id },
      relations: ['producto'],
    });
    if (!ventaConProducto) {
      throw new NotFoundException(`Venta con ID ${ventaGuardada.id} no encontrada después de crearla.`);
    }
    return ventaConProducto;
  }

  // Encontrar todas las ventas
  findAll(): Promise<Venta[]> {
    return this.ventaRepository.find();
  }

  // Encontrar una venta por ID
  async findOne(id: number): Promise<Venta> {
    const venta = await this.ventaRepository.findOne({ where: { id } });
    if (!venta) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada.`);
    }
    return venta;
  }

  // Actualizar una venta
  async update(id: number, updateVentaDto: UpdateVentaDto): Promise<Venta> {
    const venta = await this.findOne(id); // Reutiliza findOne para verificar existencia
    
    // Aplica los cambios y guarda
    this.ventaRepository.merge(venta, updateVentaDto);
    return this.ventaRepository.save(venta);
  }

  // Eliminar una venta
  async remove(id: number): Promise<void> {
    const result = await this.ventaRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada.`);
    }
  }
}