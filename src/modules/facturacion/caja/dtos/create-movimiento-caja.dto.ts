import { IsNotEmpty, IsNumber, IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateMovimientoCajaDto {
    @IsNumber()
    @IsNotEmpty()
    tipo_movimiento_id: number;

    @IsDateString()
    @IsNotEmpty()
    fecha: string;

    @IsNumber()
    @IsNotEmpty()
    monto: number;

    @IsString()
    @IsNotEmpty()
    concepto: string;

    @IsNumber()
    @IsOptional()
    venta_id?: number;

    @IsNumber()
    @IsOptional()
    compra_id?: number;
}