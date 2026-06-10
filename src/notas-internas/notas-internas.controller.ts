import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayloadUser } from '../auth/decorators/current-user.decorator';
import { NotasInternasService } from './notas-internas.service';
import { CreateNotaInternaDto } from './dto/create-nota-interna.dto';

@ApiTags('Notas Internas')
@ApiBearerAuth()
@Controller('notas-internas')
export class NotasInternasController {
  constructor(private readonly notasInternasService: NotasInternasService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR, Role.REVISOR, Role.ADMIN)
  @ApiOperation({ summary: 'Crear nota interna (ej: Admin a Curador)' })
  @ApiResponse({
    status: 201,
    description: 'Nota interna creada exitosamente. Se notifica al curador automáticamente.',
  })
  @ApiResponse({ status: 404, description: 'Documento no encontrado.' })
  create(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreateNotaInternaDto) {
    return this.notasInternasService.create(user.sub, dto);
  }

  @Get('documento/:documentoId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR, Role.REVISOR, Role.ADMIN, Role.AUDITOR)
  @ApiOperation({ summary: 'Obtener notas internas de un documento' })
  @ApiResponse({
    status: 200,
    description: 'Lista de notas internas del documento, ordenadas por fecha descendente.',
  })
  findByDocumento(@Param('documentoId') documentoId: string) {
    return this.notasInternasService.findByDocumento(documentoId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar una nota interna (Exclusivo para Administradores)' })
  @ApiResponse({ status: 200, description: 'Nota interna eliminada exitosamente.' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido. Solo el rol ADMIN puede ejecutar esta acción.',
  })
  @ApiResponse({ status: 404, description: 'Nota interna no encontrada.' })
  remove(@Param('id') id: string) {
    return this.notasInternasService.remove(id);
  }
}
