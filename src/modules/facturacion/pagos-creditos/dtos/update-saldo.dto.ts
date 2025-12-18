import { IsNumber, IsString, IsOptional } from 'class-validator';

export class UpdateSaldoDto {
  @IsNumber({}, { message: 'El saldo debe ser un número' })
  saldo_pendiente: number;

  @IsOptional()
  @IsString()
  estado?: string; // Ejemplo: 'PAGADO', 'PENDIENTE', 'MORA'
}