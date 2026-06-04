import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { TemaPrincipalResumenDto } from './tema-principal-resumen.dto';

export class UsuarioAdminItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Juan', nullable: true })
  nombre: string | null;

  @ApiProperty({ example: 'Pérez', nullable: true })
  apellido: string | null;

  @ApiProperty({ example: 'juan@biblioteca.com' })
  correo: string;

  @ApiProperty({ enum: Role, example: Role.CURADOR })
  rol: Role;

  @ApiPropertyOptional({
    type: [TemaPrincipalResumenDto],
    description: 'Especialidades asignadas; solo CURADOR y REVISOR. null para AUDITOR/ADMIN.',
    nullable: true,
  })
  temasPrincipales: TemaPrincipalResumenDto[] | null;
}
