import { PartialType } from '@nestjs/mapped-types';
import { CreateMovimientoCajaDto } from './create-movimiento-caja.dto';

export class UpdateMovimientoCajaDto extends PartialType(CreateMovimientoCajaDto) { }