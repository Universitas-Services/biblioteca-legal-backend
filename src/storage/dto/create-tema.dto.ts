import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTemaDto {
  @ApiProperty({
    example: 'Derecho Civil',
    description:
      'Nombre del tema principal. Será formateado a slug (ej: "Derecho Civil" → "derecho-civil").',
  })
  @IsString({ message: 'El campo "nombreTema" debe ser un string.' })
  @IsNotEmpty({ message: 'El campo "nombreTema" es obligatorio y no puede estar vacío.' })
  nombreTema: string;

  @ApiPropertyOptional({
    example: 'Normativa relacionada con relaciones civiles y obligaciones.',
    description: 'Descripción opcional del tema principal.',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;
}
