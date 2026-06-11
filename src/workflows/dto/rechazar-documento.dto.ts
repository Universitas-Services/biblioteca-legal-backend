import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RechazarDocumentoDto {
  @ApiProperty({
    example: 'El título del documento no coincide con el archivo adjunto.',
    description: 'Motivo por el cual se rechaza y devuelve el documento al curador.',
  })
  @IsString()
  @IsNotEmpty()
  motivo: string;
}
