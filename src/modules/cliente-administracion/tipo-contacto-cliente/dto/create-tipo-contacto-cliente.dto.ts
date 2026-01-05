import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateTipoContactoClienteDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    nombre: string;
}