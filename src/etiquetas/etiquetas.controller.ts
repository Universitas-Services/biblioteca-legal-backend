import { Controller, Get, Post, Body, Param, Delete, UseGuards, Put, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayloadUser } from '../auth/decorators/current-user.decorator';
import { EtiquetasService } from './etiquetas.service';
import { SugerirEtiquetaDto } from './dto/sugerir-etiqueta.dto';
import { CreateEtiquetaDto } from './dto/create-etiqueta.dto';

@ApiTags('Etiquetas')
@Controller('etiquetas')
export class EtiquetasController {
  constructor(private readonly etiquetasService: EtiquetasService) {}

  @Post('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Crear etiqueta aprobada (ADMIN)',
    description: 'Alta directa de etiquetas disponibles en la aplicación.',
  })
  crearPorAdmin(@Body() dto: CreateEtiquetaDto) {
    return this.etiquetasService.crearPorAdmin(dto);
  }

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CURADOR)
  @ApiOperation({
    summary: 'Listar todas las etiquetas (ADMIN/CURADOR)',
    description: 'Incluye sugeridas, aprobadas y rechazadas.',
  })
  findAllAdmin() {
    return this.etiquetasService.findAllAdmin();
  }

  @Get('pendientes')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.REVISOR)
  @ApiOperation({ summary: 'Listar etiquetas pendientes/sugeridas (ADMIN/REVISOR)' })
  findPendientes() {
    return this.etiquetasService.findPendientes();
  }

  @Post('sugerir')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR)
  @ApiOperation({ summary: 'Sugerir nueva etiqueta (Curador)' })
  sugerir(@Body() dto: SugerirEtiquetaDto, @CurrentUser() user: JwtPayloadUser) {
    return this.etiquetasService.sugerir(dto, user.sub);
  }

  @Put('aprobar/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.REVISOR, Role.ADMIN)
  @ApiOperation({ summary: 'Aprobar etiqueta sugerida' })
  aprobar(@Param('id') id: string) {
    return this.etiquetasService.aprobar(id);
  }

  @Patch('rechazar/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.REVISOR, Role.ADMIN)
  @ApiOperation({ summary: 'Rechazar etiqueta sugerida' })
  rechazar(@Param('id') id: string) {
    return this.etiquetasService.rechazar(id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar etiquetas aprobadas (público)' })
  findAprobadas() {
    return this.etiquetasService.findAprobadas();
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar etiqueta (ADMIN)' })
  remove(@Param('id') id: string) {
    return this.etiquetasService.remove(id);
  }
}
