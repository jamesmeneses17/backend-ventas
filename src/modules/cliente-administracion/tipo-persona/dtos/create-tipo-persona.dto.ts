import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTipoPersonaDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    nombre: string;
}
