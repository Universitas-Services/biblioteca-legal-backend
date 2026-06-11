import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'temporal123',
    description: 'Contraseña actual (temporal asignada por el Admin)',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: 'MiNuevaContrasena2024!',
    description: 'Nueva contraseña (mínimo 8 caracteres)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  newPassword: string;
}
