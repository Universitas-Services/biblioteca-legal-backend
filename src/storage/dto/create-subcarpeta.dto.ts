import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO para crear una subcarpeta de tipo de norma dentro de un tema en GCS.
 *
 * Se usa en el endpoint POST /admin/storage/tema/:nombreTema/subcarpeta.
 * El ValidationPipe global de NestJS valida automáticamente
 * que `tipoNorma` sea un string no vacío antes de llegar al controlador.
 */
export class CreateSubcarpetaDto {
  @ApiProperty({
    example: 'Ley',
    description:
      'Tipo de norma para la subcarpeta. Será formateado a slug (ej: "Ley Orgánica" → "ley-organica").',
  })
  @IsString({ message: 'El campo "tipoNorma" debe ser un string.' })
  @IsNotEmpty({ message: 'El campo "tipoNorma" es obligatorio y no puede estar vacío.' })
  tipoNorma: string;
}
