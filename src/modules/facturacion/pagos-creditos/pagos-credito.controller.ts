import { Controller, Post, Body, Get, Param, ParseIntPipe } from '@nestjs/common';
import { PagosCreditoService } from './pagos-credito.service';
import { CreatePagoDto } from './dtos/create-pago.dto';

@Controller('pagos-credito')
export class PagosCreditoController {
  constructor(private readonly pagosCreditoService: PagosCreditoService) {}

  // Endpoint para registrar un abono: POST /pagos-credito/abono
  @Post('abono')
  async crearAbono(@Body() createPagoDto: CreatePagoDto) {
    return await this.pagosCreditoService.registrarAbono(createPagoDto);
  }

  // Opcional: Obtener historial de pagos de un crédito específico
  @Get('historial/:creditoId')
  async obtenerHistorial(@Param('creditoId', ParseIntPipe) creditoId: number) {
    return await this.pagosCreditoService.buscarPagosPorCredito(creditoId);
  }
}