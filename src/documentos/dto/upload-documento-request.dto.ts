import { ApiProperty } from '@nestjs/swagger';

export class UploadDocumentoRequestDto {
  @ApiProperty()
  titulo: string;

  @ApiProperty()
  tituloIntegro: string;

  @ApiProperty()
  nombreBreve: string;

  @ApiProperty()
  temaPrincipal: string;

  @ApiProperty()
  tipoNorma: string;

  @ApiProperty()
  enteEmisor: string;

  @ApiProperty()
  fechaPublicacion: string;

  @ApiProperty({ description: 'IDs de categorías aprobadas (separados por coma)' })
  categoriaIds: string;

  @ApiProperty({ required: false })
  soloLecturaImagen?: boolean;

  @ApiProperty({ required: false })
  etiquetas?: string;

  @ApiProperty({ required: false })
  numeroGaceta?: string;

  @ApiProperty({ required: false })
  resumen?: string;

  @ApiProperty({ required: false })
  palabrasClave?: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  file: Express.Multer.File;
}
