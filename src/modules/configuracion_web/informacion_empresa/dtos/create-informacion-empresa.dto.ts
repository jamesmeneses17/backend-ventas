// src/modules/configuracion_web/informacion_empresa/dto/create-informacion-empresa.dto.ts

import { IsString, IsNotEmpty, IsEmail, IsOptional, MaxLength } from 'class-validator';

/**
 * DTO utilizado para crear el registro inicial de la información de la empresa.
 * Se marcan como obligatorios los campos mínimos necesarios.
 */
export class CreateInformacionEmpresaDto {
  
  // DATOS MÍNIMOS OBLIGATORIOS (Se usa @IsNotEmpty() en lugar de @IsOptional())
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombreEmpresa: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(100)
  emailInfo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  telefonoFijo: string;

  @IsOptional()
  @IsString()
  nosotros?: string;
}