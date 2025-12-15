// src/creditos/dto/create-credito.dto.ts
import { IsString, IsNumber, IsDateString, Min, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDetalleCreditoDto {
  @IsString()
  articulo_nombre: string;
}

export class CreateCreditoDto {
  @IsNumber()
  cliente_id: number;

  @IsString()
  articulo: string;

  @IsNumber()
  @Min(1)
  valor_credito: number;

  @IsDateString()
  fecha_inicial: string;

  @IsDateString()
  fecha_final: string;

  @IsOptional()
  @IsString()
  num_factura?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDetalleCreditoDto)
  detalles?: CreateDetalleCreditoDto[];
}
