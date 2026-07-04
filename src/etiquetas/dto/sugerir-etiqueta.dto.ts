import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SugerirEtiquetaDto {
  @ApiProperty({ example: 'Derecho Electoral', description: 'Nombre sugerido de la etiqueta' })
  @IsString()
  @IsNotEmpty()
  nombre: string;
}
