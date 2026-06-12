import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayloadUser } from '../auth/decorators/current-user.decorator';
import { WorkflowsService } from './workflows.service';
import { PublicarDocumentoDto } from './dto/publicar-documento.dto';
import { RechazarDocumentoDto } from './dto/rechazar-documento.dto';

@ApiTags('Workflows')
@ApiBearerAuth()
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get('bandeja')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.REVISOR, Role.ADMIN)
  @ApiOperation({ summary: 'Bandeja de entrada (Revisor/Admin)' })
  bandeja(@CurrentUser() user: JwtPayloadUser) {
    return this.workflowsService.getBandeja(user.sub);
  }

  @Post('publicar/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.REVISOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Publicar documento tras revisión',
    description:
      'Cambia el estado del documento de PENDIENTE_REVISION a PUBLICADO y genera las recomendaciones cruzadas (matriz A y B). El estado legal (VIGENTE, etc.) se gestionará en otro proceso.',
  })
  publicar(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto?: PublicarDocumentoDto,
  ) {
    return this.workflowsService.publicar(id, user.sub, dto);
  }

  @Post('rechazar/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.REVISOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Rechazar documento y devolver al curador con correcciones',
    description:
      'Cambia el estado del documento de PENDIENTE_REVISION a RECHAZADO y genera una nota interna con el motivo del rechazo, lo que notificará al curador de las correcciones requeridas.',
  })
  rechazar(
    @Param('id') id: string,
    @Body() dto: RechazarDocumentoDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.workflowsService.rechazar(id, user.sub, dto);
  }
}
