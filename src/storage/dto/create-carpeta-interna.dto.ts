import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCarpetaInternaDto {
  @ApiProperty({
    example: 'Sección A',
    description:
      'Nombre de la carpeta interna. Se formatea a slug (ej: "Sección A" → "seccion-a").',
  })
  @IsString({ message: 'El campo "nombreCarpeta" debe ser un string.' })
  @IsNotEmpty({ message: 'El campo "nombreCarpeta" es obligatorio y no puede estar vacío.' })
  nombreCarpeta: string;

  @ApiPropertyOptional({
    example: 'Carpeta de primer nivel bajo el tipo de norma.',
    description: 'Descripción opcional.',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;
}
