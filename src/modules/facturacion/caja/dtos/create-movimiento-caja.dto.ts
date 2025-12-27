import { IsNotEmpty, IsNumber, IsString, IsDateString } from 'class-validator';

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
}