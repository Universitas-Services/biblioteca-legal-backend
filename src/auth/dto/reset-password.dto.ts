import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token de reseteo recibido por correo' })
  @IsString()
  @IsNotEmpty({ message: 'El token es obligatorio' })
  token: string;

  @ApiProperty({ example: 'NuevaPass123', description: 'La nueva contraseña' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  newPassword: string;
}
