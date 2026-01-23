import { Controller, Post, Body, Delete, Param, Get, Query } from '@nestjs/common';
import { AjustesService } from './ajustes.service';
import { CreateAjusteDto } from './dtos/create-ajuste.dto';

@Controller('ajustes-inventario')
export class AjustesController {
    constructor(private readonly ajustesService: AjustesService) { }

    @Post()
    crear(@Body() createAjusteDto: CreateAjusteDto) {
        return this.ajustesService.crearAjuste(createAjusteDto);
    }

    @Delete(':id')
    eliminar(@Param('id') id: string) {
        return this.ajustesService.eliminarAjuste(+id);
    }
    @Get('recientes')
    obtenerRecientes(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        return this.ajustesService.findRecent(page, limit);
    }
}