import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ComprasService } from './compras.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { UpdateCompraDto } from './dto/update-compra.dto';

@Controller('compras')
export class ComprasController {
  constructor(private readonly comprasService: ComprasService) { }

  @Post()
  create(@Body() dto: CreateCompraDto) {
    // Recibe el JSON con cliente_id e items[]
    return this.comprasService.create(dto);
  }

  @Post('sync-caja')
  syncCaja() {
    return this.comprasService.syncCajaMovements();
  }

  @Get()
  findAll() {
    // Retornará la cabecera con sus detalles y cliente vinculados
    return this.comprasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.comprasService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCompraDto) {
    return this.comprasService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.comprasService.remove(+id);
  }
}