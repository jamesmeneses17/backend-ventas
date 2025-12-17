// src/modules/configuracion_web/informacion_empresa/dto/update-informacion-empresa.dto.ts

import { IsString, IsOptional, IsEmail, IsUrl, MaxLength } from 'class-validator';
// Dependiendo de tu backend (NestJS), podrías extender un DTO base o usar PartialType:
// import { PartialType } from '@nestjs/mapped-types';
// export class UpdateInformacionEmpresaDto extends PartialType(CreateInformacionEmpresaDto) {}


/**
 * DTO utilizado para actualizar la información de la empresa.
 * Todos los campos son opcionales ya que solo se enviarán los datos a modificar.
 */
export class UpdateInformacionEmpresaDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  telefonoFijo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  whatsapp?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(100)
  emailInfo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  direccionPrincipal?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  horarioLunesViernes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  horarioSabados?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  horarioDomingos?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  urlFacebook?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  urlInstagram?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  urlLinkedIn?: string;
}