import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Put,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentosService } from './documentos.service';
import { StorageService } from '../storage/storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UploadDocumentoDto } from './dto/upload-documento.dto';
import { UploadDocumentoRequestDto } from './dto/upload-documento-request.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
import { ReformaDocumentoDto } from './dto/reforma-documento.dto';
import { PublicQueryDto } from './dto/public-query.dto';
import { CurrentUser, JwtPayloadUser } from '../auth/decorators/current-user.decorator';
import { MuroCompletoGuard } from '../auth/guards/muro-completo.guard';
import { AuditLogInterceptor } from '../audit/audit-log.interceptor';

@Controller('documentos')
@ApiTags('Documentos')
export class DocumentosController {
  constructor(
    private readonly documentosService: DocumentosService,
    private readonly storageService: StorageService,
  ) {}

  @Get('public')
  @ApiOperation({ summary: 'Listado público de documentos vigentes' })
  findPublic(@Query() query: PublicQueryDto) {
    return this.documentosService.findPublic(query);
  }

  @Get('seo/:nombreBreve')
  @ApiOperation({ summary: 'Metadatos SEO sin URL del PDF' })
  findSeo(@Param('nombreBreve') nombreBreve: string) {
    return this.documentosService.findSeoByNombreBreve(nombreBreve);
  }

  @Post('upload')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subir documento (Curador)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadDocumentoRequestDto })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocumento(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDocumentoDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.documentosService.procesarCarga(file, body, user.sub);
  }

  @Post('reforma')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar reforma de ley existente' })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async reforma(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: ReformaDocumentoDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    const { leyViejaId, ...uploadData } = body;
    return this.documentosService.procesarReforma(file, uploadData, leyViejaId, user.sub);
  }

  @Get('visor/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, MuroCompletoGuard)
  @Roles(Role.CLIENTE)
  @ApiOperation({ summary: 'Visor PDF con muro de datos completo' })
  visor(@Param('id') id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.documentosService.registrarVisor(user.sub, id);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENTE, Role.CURADOR, Role.REVISOR, Role.ADMIN)
  findAll() {
    return this.documentosService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENTE, Role.CURADOR, Role.REVISOR, Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.documentosService.findOne(id);
  }

  @Get(':id/preview')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR, Role.REVISOR, Role.ADMIN)
  async preview(@Param('id') id: string) {
    const documento = await this.documentosService.findOne(id);
    const url = await this.storageService.getSignedUrl(documento.archivoOriginalUrl);
    return { url };
  }

  @Put('editar/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.REVISOR, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'), AuditLogInterceptor)
  @ApiConsumes('multipart/form-data')
  editar(
    @Param('id') id: string,
    @Body() updateData: UpdateDocumentoDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.documentosService.update(id, updateData, file);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR, Role.ADMIN, Role.REVISOR)
  @UseInterceptors(FileInterceptor('file'), AuditLogInterceptor)
  @ApiConsumes('multipart/form-data')
  update(
    @Param('id') id: string,
    @Body() updateData: UpdateDocumentoDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.documentosService.update(id, updateData, file);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR, Role.ADMIN, Role.REVISOR)
  softDelete(@Param('id') id: string) {
    return this.documentosService.softDelete(id);
  }
}
