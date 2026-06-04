import { ApiProperty } from '@nestjs/swagger';
import { UsuarioAdminItemDto } from './usuario-admin-item.dto';

export class ListUsuariosAdminResponseDto {
  @ApiProperty({ type: [UsuarioAdminItemDto] })
  items: UsuarioAdminItemDto[];

  @ApiProperty({ example: 12 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 2 })
  totalPages: number;
}
