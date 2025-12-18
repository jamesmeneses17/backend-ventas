// src/creditos/creditos.controller.ts

import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { CreditosService } from './creditos.service';
import { CreateCreditoDto } from './dtos/create-credito.dto';
import { UpdateCreditoDto } from './dtos/update-credito.dto';

@Controller('creditos')
export class CreditosController {
  constructor(private readonly service: CreditosService) {}


  @Post()
  crear(@Body() dto: CreateCreditoDto) {
    console.log('--- [BACKEND] DTO recibido en /creditos ---');
    console.dir(dto, { depth: 10 });
    return this.service.crearCredito(dto);
  }

  @Put(':id')
  actualizar(@Param('id') id: number, @Body() dto: UpdateCreditoDto) {
    return this.service.actualizarCredito(id, dto);
  }

  @Delete(':id')
  eliminar(@Param('id') id: number) {
    return this.service.eliminarCredito(id);
  }

  @Get()
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  buscar(@Param('id') id: number) {
    return this.service.buscar(id);
  }
}
