import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayloadUser } from '../auth/decorators/current-user.decorator';
import { CategoriasService } from './categorias.service';
import { SugerirCategoriaDto } from './dto/sugerir-categoria.dto';
import { CreateCategoriaAdminDto } from './dto/create-categoria-admin.dto';

@ApiTags('Categorias')
@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Post('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Crear categoría aprobada (ADMIN)',
    description:
      'Alta directa de categorías disponibles en la aplicación, sin pasar por el flujo de sugerencia.',
  })
  crearPorAdmin(@Body() dto: CreateCategoriaAdminDto) {
    return this.categoriasService.crearPorAdmin(dto);
  }

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CURADOR)
  @ApiOperation({
    summary: 'Listar todas las categorías (ADMIN/CURADOR)',
    description: 'Incluye sugeridas y aprobadas para gestión administrativa.',
  })
  findAllAdmin() {
    return this.categoriasService.findAllAdmin();
  }

  @Post('sugerir')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR)
  @ApiOperation({ summary: 'Sugerir nueva categoría (Curador)' })
  sugerir(@Body() dto: SugerirCategoriaDto, @CurrentUser() user: JwtPayloadUser) {
    return this.categoriasService.sugerir(dto, user.sub);
  }

  @Put('aprobar/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.REVISOR, Role.ADMIN)
  @ApiOperation({ summary: 'Aprobar categoría sugerida' })
  aprobar(@Param('id') id: string) {
    return this.categoriasService.aprobar(id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar categorías aprobadas (público)' })
  findAprobadas() {
    return this.categoriasService.findAprobadas();
  }
}
