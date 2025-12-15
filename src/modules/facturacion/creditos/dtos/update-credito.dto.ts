import { PartialType } from '@nestjs/mapped-types';
import { CreateCreditoDto, CreateDetalleCreditoDto } from './create-credito.dto';
import { IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCreditoDto extends PartialType(CreateCreditoDto) {
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CreateDetalleCreditoDto)
	detalles?: CreateDetalleCreditoDto[];
}
