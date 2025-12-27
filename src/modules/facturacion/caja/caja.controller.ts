import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
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
    findAll() {
        return this.cajaService.findAll();
    }

    @Get('stats')
    getStats() {
        return this.cajaService.getStats();
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