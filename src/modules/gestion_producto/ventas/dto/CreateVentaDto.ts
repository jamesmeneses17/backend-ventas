import {
  IsInt,
  IsDateString,
  IsNumber,
  IsNotEmpty,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class CreateVentaDetalleDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  productoId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  cantidad: number;



  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  precio_venta: number;
}

export class CreateVentaDto {
  @ApiProperty({ description: 'Fecha de la venta YYYY-MM-DD' })
  @IsNotEmpty()
  @IsDateString()
  fecha: string;

  @ApiProperty({ description: 'ID del Cliente/Comprador' })
  @IsNotEmpty()
  @IsInt()
  clienteId: number;

  @ApiProperty({ type: [CreateVentaDetalleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVentaDetalleDto)
  items: CreateVentaDetalleDto[];
}