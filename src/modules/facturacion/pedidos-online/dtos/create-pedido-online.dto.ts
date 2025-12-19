import { IsArray, IsInt, IsNumber, ValidateNested, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDetallePedidoDto {
  @IsInt()
  producto_id: number;

  @IsInt()
  @IsPositive()
  cantidad: number;

  @IsNumber()
  precio_unitario: number;
}

export class CreatePedidoOnlineDto {
  @IsNumber()
  total: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDetallePedidoDto)
  detalles: CreateDetallePedidoDto[];
}