import { IsString, IsNotEmpty } from 'class-validator';

export class TipoMovimientoDto {
    @IsString()
    @IsNotEmpty()
    nombre: string;
}