import { ApiProperty } from '@nestjs/swagger';

export class UploadDocumentoRequestDto {
  @ApiProperty({
    example: 'Contrato de servicios 2024',
    description: 'Título del documento',
  })
  titulo: string;

  @ApiProperty({
    example: 'Ministerio de Justicia',
    description: 'Ente/emisor del documento',
  })
  ente: string;

  @ApiProperty({
    example: '2024-01-15',
    description: 'Fecha del documento en formato YYYY-MM-DD',
  })
  fecha: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Archivo a subir (PDF, DOC, etc.)',
  })
  file: any;
}
