import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { TipoContactoClienteService } from './tipo-contacto-cliente.service';
import { CreateTipoContactoClienteDto } from './dto/create-tipo-contacto-cliente.dto';
import { UpdateTipoContactoClienteDto } from './dto/update-tipo-contacto-cliente.dto';

@Controller('tipo-contacto-cliente')
export class TipoContactoClienteController {
    constructor(private readonly tipoContactoClienteService: TipoContactoClienteService) { }

    @Post()
    create(@Body() createDto: CreateTipoContactoClienteDto) {
        return this.tipoContactoClienteService.create(createDto);
    }

    @Get()
    findAll() {
        return this.tipoContactoClienteService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.tipoContactoClienteService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateTipoContactoClienteDto) {
        return this.tipoContactoClienteService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.tipoContactoClienteService.remove(id);
    }
}