import { PartialType } from '@nestjs/mapped-types';
import { CreateProductoDto } from './create-producto.dto';
import { IsOptional } from 'class-validator';

// Hereda todos los campos de CreateProductoDto como opcionales
export class UpdateProductoDto extends PartialType(CreateProductoDto) {
	@IsOptional()
	activo?: boolean;
}
