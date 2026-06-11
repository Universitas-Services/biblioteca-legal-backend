import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class TemaAsignadoDto {
  @ApiProperty({
    description: 'ID del tema principal',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({ description: 'Nombre del tema', example: 'Derecho Penal' })
  nombre: string;

  @ApiProperty({ description: 'Slug del tema', example: 'derecho-penal' })
  slug: string;
}

export class MeProfileResponseDto {
  @ApiProperty({
    description: 'ID único del usuario',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({ description: 'Correo electrónico del usuario', example: 'usuario@ejemplo.com' })
  email: string;

  @ApiProperty({
    description: 'Rol del usuario dentro del sistema',
    enum: Role,
    example: Role.CLIENTE,
  })
  role: Role;

  @ApiPropertyOptional({ description: 'Nombre del usuario', example: 'Juan' })
  nombre: string | null;

  @ApiPropertyOptional({ description: 'Apellido del usuario', example: 'Pérez' })
  apellido: string | null;

  @ApiPropertyOptional({ description: 'Número de teléfono', example: '+123456789' })
  telefono: string | null;

  @ApiPropertyOptional({ description: 'País de residencia', example: 'México' })
  pais: string | null;

  @ApiProperty({ description: 'Cantidad de consultas realizadas por el usuario', example: 5 })
  consultasRealizadas: number;

  @ApiProperty({
    description:
      'Lista de temas asignados al usuario (normalmente para roles como CURADOR o REVISOR)',
    type: [TemaAsignadoDto],
  })
  temasAsignados: TemaAsignadoDto[];
}
