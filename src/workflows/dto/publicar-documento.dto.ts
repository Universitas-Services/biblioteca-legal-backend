import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class PublicarDocumentoDto {
  @ApiProperty({
    required: false,
    description: 'Override de MatrizA por el revisor/admin. Si se omite, se usa la del curador.',
  })
  @IsOptional()
  @IsUUID('4')
  matrizAId?: string;

  @ApiProperty({
    required: false,
    type: [String],
    description: 'Override de MatrizB por el revisor/admin. Si se omite, se usan las del curador.',
  })
  @IsArray()
  @IsOptional()
  @IsUUID('4', { each: true })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').map((s: string) => s.trim()) : (value as string[]),
  )
  matrizBIds?: string[];
}
