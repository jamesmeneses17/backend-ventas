import { IsNotEmpty, IsOptional, IsString, MaxLength, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductoDto {
  // Datos básicos requeridos en el formulario
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  codigo: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  nombre: string;

  // Relación obligatoria: categoría (frontend envía la categoría seleccionada)
  @IsNumber()
  @IsNotEmpty()
  categoriaId: number;

  // Subcategoría opcional
  @ApiPropertyOptional({ description: 'ID de la subcategoría (opcional)' })
  @IsNumber()
  @IsOptional()
  subcategoriaId?: number | null;

  // Texto descriptivo opcional
  @IsOptional()
  @IsString()
  descripcion?: string;

  // URL de ficha técnica opcional que puede crearse vía upload separado
  @IsOptional()
  @IsString()
  ficha_tecnica_url?: string;

  // Precio de venta opcional (para creación/edición)
  @ApiPropertyOptional({ description: 'Precio de venta (opcional)' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  precio_venta?: number;

  // Porcentaje de promoción opcional (0-100)
  @ApiPropertyOptional({ description: 'Porcentaje de promoción (0-100%), por defecto 0' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  promocion_porcentaje?: number;
  // Estado activo (opcional, por defecto true)
  @IsOptional()
  activo?: boolean;
}
