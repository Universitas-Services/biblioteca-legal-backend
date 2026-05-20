import { PartialType } from '@nestjs/swagger';
import { UploadDocumentoDto } from './upload-documento.dto';

export class UpdateDocumentoDto extends PartialType(UploadDocumentoDto) {}
