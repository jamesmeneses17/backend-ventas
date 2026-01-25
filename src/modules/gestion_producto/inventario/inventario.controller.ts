import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { CreateInventarioDto } from './dto/create-inventario.dto';
import { UpdateInventarioDto } from './dto/update-inventario.dto';

@Controller('inventario')
export class InventarioController {
  constructor(private readonly service: InventarioService) { }

  @Post()
  create(@Body() dto: CreateInventarioDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInventarioDto) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }

  @Post('sincronizar/:id')
  sincronizar(@Param('id') id: string) {
    return this.service.sincronizarStock(+id);
  }

  @Post('sincronizar-todo')
  sincronizarTodo() {
    return this.service.sincronizarTodo();
  }
}
