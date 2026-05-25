import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMatrizADto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsOptional()
  palabrasClave?: string[];

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
