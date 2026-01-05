import { PartialType } from '@nestjs/mapped-types';
import { CreateTipoContactoClienteDto } from './create-tipo-contacto-cliente.dto';

export class UpdateTipoContactoClienteDto extends PartialType(CreateTipoContactoClienteDto) { }