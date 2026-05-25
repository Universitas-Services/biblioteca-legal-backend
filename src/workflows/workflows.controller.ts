import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayloadUser } from '../auth/decorators/current-user.decorator';
import { WorkflowsService } from './workflows.service';

@ApiTags('Workflows')
@ApiBearerAuth()
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get('bandeja')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.REVISOR)
  @ApiOperation({ summary: 'Bandeja de entrada del revisor' })
  bandeja(@CurrentUser() user: JwtPayloadUser) {
    return this.workflowsService.getBandeja(user.sub);
  }

  @Post('publicar/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.REVISOR, Role.ADMIN)
  @ApiOperation({ summary: 'Publicar documento tras revisión' })
  publicar(@Param('id') id: string) {
    return this.workflowsService.publicar(id);
  }
}
