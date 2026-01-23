import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAjusteDto {
    @IsInt()
    @IsNotEmpty()
    producto_id: number;

    @IsInt()
    @IsNotEmpty()
    stock_fisico: number;

    @IsString()
    @IsOptional()
    motivo?: string;
}