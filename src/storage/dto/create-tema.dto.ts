import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO para crear una carpeta de tema principal en GCS.
 *
 * Se usa en el endpoint POST /admin/storage/tema.
 * El ValidationPipe global de NestJS valida automáticamente
 * que `nombreTema` sea un string no vacío antes de llegar al controlador.
 */
export class CreateTemaDto {
  @ApiProperty({
    example: 'Derecho Civil',
    description:
      'Nombre del tema principal. Será formateado a slug (ej: "Derecho Civil" → "derecho-civil").',
  })
  @IsString({ message: 'El campo "nombreTema" debe ser un string.' })
  @IsNotEmpty({ message: 'El campo "nombreTema" es obligatorio y no puede estar vacío.' })
  nombreTema: string;
}
