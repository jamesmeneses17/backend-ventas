import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CreateMovimientoCajaDto } from './dtos/create-movimiento-caja.dto';
import { UpdateMovimientoCajaDto } from './dtos/update-movimiento-caja.dto';
import { CajaService } from './caja.service';

@Controller('caja')
export class CajaController {
    constructor(private readonly cajaService: CajaService) { }

    @Post()
    create(@Body() createMovimientoDto: CreateMovimientoCajaDto) {
        return this.cajaService.create(createMovimientoDto);
    }

    @Get()
    findAll(@Query('tipo_movimiento') tipoMovimiento?: string) {
        return this.cajaService.findAll(tipoMovimiento);
    }

    @Get('stats')
    getStats() {
        return this.cajaService.getStats();
    }

    @Get('reporte/anual/:anio')
    getResumenAnual(@Param('anio') anio: string) {
        return this.cajaService.getResumenAnual(+anio);
    }

    @Get('reporte/diario/:anio/:mes')
    getResumenDiario(@Param('anio') anio: string, @Param('mes') mes: string) {
        return this.cajaService.getResumenDiario(+anio, +mes);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.cajaService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateMovimientoDto: UpdateMovimientoCajaDto) {
        return this.cajaService.update(+id, updateMovimientoDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.cajaService.remove(+id);
    }
}