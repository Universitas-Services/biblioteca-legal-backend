import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { UploadDocumentoDto } from './upload-documento.dto';
import { IsArray, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateDocumentoDto extends PartialType(UploadDocumentoDto) {
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  @IsUUID('4', { each: true })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').map((s: string) => s.trim()) : (value as string[]),
  )
  categoriaIds?: string[];
}
