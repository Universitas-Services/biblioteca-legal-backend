import { ApiProperty } from '@nestjs/swagger';

export class UploadDocumentoRequestDto {
  @ApiProperty()
  titulo: string;

  @ApiProperty()
  tituloIntegro: string;

  @ApiProperty()
  nombreBreve: string;

  @ApiProperty({ description: 'ID de la SubcarpetaNorma destino (Nivel 2)' })
  subcarpetaNormaId: string;

  @ApiProperty({ required: false, description: 'ID de CarpetaInterna destino (Nivel 3 o 4)' })
  carpetaInternaId?: string;

  @ApiProperty()
  enteEmisor: string;

  @ApiProperty()
  fechaPublicacion: string;

  @ApiProperty({ description: 'IDs de categorías aprobadas (separados por coma)' })
  categoriaIds: string;

  @ApiProperty({ required: false })
  soloLecturaImagen?: boolean;

  @ApiProperty({
    required: false,
    description: 'Indica si el PDF tiene OCR habilitado (true/false)',
  })
  ocrHabilitado?: boolean;

  @ApiProperty({ required: false, description: 'País de origen de la norma' })
  pais?: string;

  @ApiProperty({ required: false, description: 'ID del documento de jerarquía superior' })
  jerarquiaSuperiorId?: string;

  @ApiProperty({ required: false, description: 'ID de otro documento relacionado' })
  documentoRelacionadoId?: string;

  @ApiProperty({
    required: false,
    description:
      'Objeto JSON en string con metadatos específicos del tipo documental (ej. tribunal, ISBN, ponente, etc.)',
    example: '{"tribunal": "Tribunal Supremo de Justicia", "numeroExpediente": "12345"}',
  })
  metadatos?: string;

  @ApiProperty({ required: false })
  etiquetas?: string;

  @ApiProperty({ required: false })
  resumen?: string;

  @ApiProperty({ required: false })
  palabrasClave?: string;

  @ApiProperty({ required: false, description: 'ID de la MatrizA (Producto/Formación)' })
  matrizAId?: string;

  @ApiProperty({
    required: false,
    description: 'IDs de MatrizB (Artículos Ágora) separados por coma',
  })
  matrizBIds?: string;

  @ApiProperty({ type: 'string', format: 'binary', description: 'Documento PDF principal' })
  file: any;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Documento PDF de Gaceta Oficial',
  })
  gacetaFile?: any;
}
