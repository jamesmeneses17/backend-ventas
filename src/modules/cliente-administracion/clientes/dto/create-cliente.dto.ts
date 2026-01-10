import { IsString, IsNotEmpty, IsNumber, IsEmail, IsOptional, MaxLength } from 'class-validator';

export class CreateClienteDto {
    @IsString({ message: 'El nombre debe ser texto.' })
    @IsNotEmpty({ message: 'El nombre es obligatorio.' })
    @MaxLength(100, { message: 'El nombre no debe exceder los 100 caracteres.' })
    nombre: string;

    @IsNumber({}, { message: 'El ID del tipo de documento debe ser un número.' })
    @IsNotEmpty({ message: 'El tipo de documento es obligatorio.' })
    tipo_documento_id: number;

    @IsString({ message: 'El número de documento debe ser texto.' })
    @IsNotEmpty({ message: 'El número de documento es obligatorio.' })
    numero_documento: string;

    @IsOptional() // Hacemos la dirección opcional si no es obligatoria
    @IsString({ message: 'La dirección debe ser texto.' })
    direccion: string;

    @IsOptional() // Hacemos el correo opcional
    @IsEmail({}, { message: 'Formato de correo inválido.' })
    correo: string;

    @IsOptional() // Hacemos el teléfono opcional
    @IsString({ message: 'El teléfono debe ser texto.' })
    telefono: string;

    @IsNumber({}, { message: 'El tipo de contacto debe ser un número.' })
    @IsNotEmpty({ message: 'El tipo de contacto es obligatorio.' })
    tipo_contacto_id: number;

    @IsNumber({}, { message: 'El tipo de persona debe ser un número.' })
    @IsOptional()
    tipo_persona_id: number;
}