import {
  IsInt,
  IsDateString,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  IsNotEmpty
} from 'class-validator';
import { Type } from 'class-transformer';

// Clase para validar cada producto individual dentro del arreglo
export class CreateCompraDetalleDto {
  @IsInt()
  @IsNotEmpty()
  producto_id: number; //

  @IsInt()
  @Min(1, { message: 'La cantidad mínima es 1' })
  cantidad: number; //

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'El costo debe ser mayor o igual a 0' })
  costo_unitario: number; //
}

// Clase principal para la cabecera de la compra
export class CreateCompraDto {
  @IsDateString()
  fecha: string; //

  @IsInt()
  @IsNotEmpty()
  cliente_id: number; // ID del proveedor vinculado a la tabla clientes

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCompraDetalleDto)
  @IsNotEmpty({ message: 'La compra debe tener al menos un producto' })
  items: CreateCompraDetalleDto[]; // Arreglo de productos
}