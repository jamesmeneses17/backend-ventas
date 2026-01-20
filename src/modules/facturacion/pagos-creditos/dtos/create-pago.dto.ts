import { IsNumber, IsPositive, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePagoDto {
  @IsNotEmpty({ message: 'El ID del crédito es obligatorio' })
  @IsNumber({}, { message: 'El ID del crédito debe ser un número' })
  credito_id: number;

  @IsNotEmpty({ message: 'El monto del pago es obligatorio' })
  @IsNumber({}, { message: 'El monto debe ser un valor numérico' })
  @IsPositive({ message: 'El monto del pago debe ser mayor a cero' })
  monto_pago: number;

  @IsOptional()
  @IsString({ message: 'La nota debe ser un texto' })
  notas?: string;

  @IsOptional()
  @IsString({ message: 'La fecha debe ser un texto válido (ISO date)' }) // IsDateString is strictly better but standard string is safer if frontend format varies. sticking to string compatible with TypeORM dates for now, or DateString if strict. Let's use IsOptional + IsString for flexible parsing or IsDateString.
  // Actually, let's use IsDateString for validation if possible, but user might send 'YYYY-MM-DD'.
  fecha_pago?: string;
}