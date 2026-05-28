import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateMatrizBDto {
  @ApiProperty({
    description: 'Título exacto del artículo (renderizado como texto hipervinculado)',
  })
  @IsString()
  @IsNotEmpty()
  tituloArticulo: string;

  @ApiProperty({ description: 'Nombre del especialista o doctrinario autor del artículo' })
  @IsString()
  @IsNotEmpty()
  autorArticulo: string;

  @ApiProperty({ description: 'Enlace directo al artículo en el blog WordPress (Ágora)' })
  @IsUrl({}, { message: 'urlDestinoAgora debe ser una URL válida' })
  @IsNotEmpty()
  urlDestinoAgora: string;

  @ApiProperty({
    type: [String],
    required: false,
    description: 'Etiquetas temáticas para el match semántico con el documento legal',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoriasKeywords?: string[];

  @ApiProperty({
    required: false,
    default: true,
    description: 'Control de visualización del artículo',
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
