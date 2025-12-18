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
}