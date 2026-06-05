import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { MetadatasService } from './metadatas.service';
import { CreateMetadataDto } from './dto/create-metadata.dto';
import { UpdateMetadataDto } from './dto/update-metadata.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('metadatas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('metadatas')
export class MetadatasController {
  constructor(private readonly metadatasService: MetadatasService) {}

  @Post()
  @Roles(Role.ADMIN, Role.CURADOR)
  @ApiOperation({ summary: 'Crear metadata para un documento' })
  create(@Body() createMetadataDto: CreateMetadataDto) {
    return this.metadatasService.create(createMetadataDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.CURADOR, Role.REVISOR)
  @ApiOperation({ summary: 'Obtener todas las metadatas' })
  findAll() {
    return this.metadatasService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CURADOR, Role.REVISOR)
  @ApiOperation({ summary: 'Obtener metadata por ID' })
  findOne(@Param('id') id: string) {
    return this.metadatasService.findOne(id);
  }

  @Get('documento/:documentoId')
  @Roles(Role.ADMIN, Role.CURADOR, Role.REVISOR, Role.CLIENTE)
  @ApiOperation({ summary: 'Obtener metadata por ID de documento' })
  findByDocumentoId(@Param('documentoId') documentoId: string) {
    return this.metadatasService.findByDocumentoId(documentoId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.CURADOR)
  @ApiOperation({ summary: 'Actualizar metadata por ID' })
  update(@Param('id') id: string, @Body() updateMetadataDto: UpdateMetadataDto) {
    return this.metadatasService.update(id, updateMetadataDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar metadata por ID' })
  remove(@Param('id') id: string) {
    return this.metadatasService.remove(id);
  }
}
