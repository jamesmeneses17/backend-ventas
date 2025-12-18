import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  ValidateNested,
  IsArray,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDetalleCreditoDto {
  @IsInt()
  producto_id: number;

  @IsInt()
  cantidad: number;

  @IsOptional()
  @IsNumber()
  precio_unitario?: number;

  @IsOptional()
  @IsNumber()
  subtotal?: number;
}

export class CreateCreditoDto {
  @IsOptional()
  @IsString()
  numero_factura?: string;

  @IsInt()
  cliente_id: number;

  @IsOptional()
  @IsNumber()
  saldo_pendiente?: number;

  @IsDateString()
  fecha_inicial: string;

  @IsOptional()
  @IsDateString()
  fecha_final?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDetalleCreditoDto)
  detalles?: CreateDetalleCreditoDto[];
}
