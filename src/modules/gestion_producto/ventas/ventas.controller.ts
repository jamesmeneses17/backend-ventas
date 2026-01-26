// src/ventas/ventas.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/CreateVentaDto';
import { UpdateVentaDto } from './dto/UpdateVentaDto';
import { Venta } from './entities/venta.entity';

@ApiTags('Ventas')
@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) { }

  @Post()
  @ApiOperation({ summary: 'Crea una nueva factura de venta con múltiples productos' })
  @ApiResponse({ status: 201, type: Venta })
  @ApiBody({ type: CreateVentaDto })
  create(@Body() createVentaDto: CreateVentaDto): Promise<Venta> {
    return this.ventasService.create(createVentaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista todas las cabeceras de ventas' })
  findAll(): Promise<Venta[]> {
    return this.ventasService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtén una venta con todos sus detalles' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Venta> {
    return this.ventasService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateVentaDto: UpdateVentaDto) {
    return this.ventasService.update(id, updateVentaDto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.ventasService.remove(id);
  }
  @Get('fix-historical-costs')
  fixHistoricalCosts() {
    return this.ventasService.fixHistoricalCosts();
  }
}