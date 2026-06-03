import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSubcarpetaDto {
  @ApiProperty({
    example: 'Ley Orgánica',
    description:
      'Tipo de norma para la subcarpeta. Será formateado a slug (ej: "Ley Orgánica" → "ley-organica").',
  })
  @IsString({ message: 'El campo "tipoNorma" debe ser un string.' })
  @IsNotEmpty({ message: 'El campo "tipoNorma" es obligatorio y no puede estar vacío.' })
  tipoNorma: string;

  @ApiPropertyOptional({
    example: 'Leyes de rango orgánico dentro de este tema principal.',
    description: 'Descripción del tipo de norma.',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;
}
