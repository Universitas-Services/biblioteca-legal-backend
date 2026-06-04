import { ApiProperty } from '@nestjs/swagger';

export class TemaPrincipalResumenDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Derecho Civil' })
  nombre: string;

  @ApiProperty({ example: 'derecho-civil' })
  slug: string;
}
