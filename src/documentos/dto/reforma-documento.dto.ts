import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { UploadDocumentoDto } from './upload-documento.dto';

export class ReformaDocumentoDto extends UploadDocumentoDto {
  @ApiProperty({ description: 'ID del documento que será reformado' })
  @IsUUID()
  @IsNotEmpty()
  leyViejaId: string;
}
