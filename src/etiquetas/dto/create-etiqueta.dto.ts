import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateEtiquetaDto {
  @ApiProperty({ example: 'Contrataciones Públicas', description: 'Nombre de la etiqueta' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;
}
