import { ApiProperty } from '@nestjs/swagger';

export class UploadDocumentoRequestDto {
  @ApiProperty({ example: 'Contrato de servicios 2024', description: 'Título del documento' })
  titulo: string;

  @ApiProperty({ required: false, description: 'Solo lectura de imagen' })
  soloLecturaImagen?: boolean;

  @ApiProperty({ required: false, description: 'Nombre breve' })
  nombreBreve?: string;

  @ApiProperty({ required: false, description: 'Tema principal' })
  temaPrincipal?: string;

  @ApiProperty({ required: false, description: 'Categorías (separadas por coma)' })
  categorias?: string;

  @ApiProperty({ required: false, description: 'Etiquetas (separadas por coma)' })
  etiquetas?: string;

  @ApiProperty({ required: false, description: 'Tipo de norma' })
  tipoNorma?: string;

  @ApiProperty({ example: 'Ministerio de Justicia', required: false })
  enteEmisor?: string;

  @ApiProperty({ example: '2024-01-15', required: false })
  fechaPublicacion?: string;

  @ApiProperty({ required: false, description: 'Número de Gaceta' })
  numeroGaceta?: string;

  @ApiProperty({ required: false, description: 'Es reforma' })
  esReforma?: boolean;

  @ApiProperty({ required: false, description: 'ID del documento que reforma' })
  reformaAId?: string;

  @ApiProperty({ required: false, description: 'Matriz A (separadas por coma)' })
  matrizAElementos?: string;

  @ApiProperty({ required: false, description: 'Matriz B (separadas por coma)' })
  matrizBElementos?: string;

  @ApiProperty({ required: false, description: 'Resumen' })
  resumen?: string;

  @ApiProperty({ required: false, description: 'Palabras clave (separadas por coma)' })
  palabrasClave?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Archivo a subir (PDF, DOC, etc.)',
  })
  file: any;
}
