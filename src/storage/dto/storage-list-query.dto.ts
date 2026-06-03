import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class StorageListQueryDto {
  @ApiPropertyOptional({
    default: false,
    description: 'Si es true, incluye registros eliminados pasivamente',
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  incluirEliminados?: boolean = false;
}
