import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayloadUser } from '../auth/decorators/current-user.decorator';
import { ComentariosService } from './comentarios.service';
import { CreateComentarioDto } from './dto/create-comentario.dto';

@ApiTags('Comentarios Internos')
@ApiBearerAuth()
@Controller('comentarios-internos')
export class ComentariosController {
  constructor(private readonly comentariosService: ComentariosService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR, Role.REVISOR, Role.ADMIN)
  @ApiOperation({ summary: 'Crear comentario interno' })
  create(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreateComentarioDto) {
    return this.comentariosService.create(user.sub, dto);
  }

  @Get('documento/:documentoId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR, Role.REVISOR, Role.ADMIN, Role.AUDITOR)
  findByDocumento(@Param('documentoId') documentoId: string) {
    return this.comentariosService.findByDocumento(documentoId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.REVISOR)
  remove(@Param('id') id: string) {
    return this.comentariosService.remove(id);
  }
}
