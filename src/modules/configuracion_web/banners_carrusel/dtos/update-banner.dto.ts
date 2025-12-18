// src/modules/configuracion_web/banners/dto/update-banner.dto.ts

import { IsString, IsOptional, IsInt, IsBoolean, MaxLength } from 'class-validator';

export class UpdateBannerDto {
    @IsString()
    @IsOptional()
    @MaxLength(150)
    titulo?: string;

    @IsString()
    @IsOptional()
    @MaxLength(255)
    subtitulo?: string;


    @IsString()
    @IsOptional()
    @MaxLength(255)
    urlImagen?: string;

    @IsString()
    @IsOptional()
    @MaxLength(255)
    linkDestino?: string;

    @IsInt()
    @IsOptional()
    orden?: number;

    @IsBoolean()
    @IsOptional()
    activo?: boolean;
}