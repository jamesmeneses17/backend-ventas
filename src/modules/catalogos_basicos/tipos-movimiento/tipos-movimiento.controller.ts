import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TiposMovimientoService } from './tipos-movimiento.service';
import { TipoMovimientoDto } from './dtos/tipo-movimiento.dto';

@Controller('tipos-movimiento')
export class TiposMovimientoController {
    constructor(private readonly tiposMovimientoService: TiposMovimientoService) { }

    @Post()
    create(@Body() dto: TipoMovimientoDto) {
        return this.tiposMovimientoService.create(dto);
    }

    @Get()
    findAll() {
        return this.tiposMovimientoService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.tiposMovimientoService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: TipoMovimientoDto) {
        return this.tiposMovimientoService.update(+id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.tiposMovimientoService.remove(+id);
    }
}