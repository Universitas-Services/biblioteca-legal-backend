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
  UploadedFiles,
  Body,
  UseGuards,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { DocumentosService } from './documentos.service';
import { StorageService } from '../storage/storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { UploadDocumentoDto } from './dto/upload-documento.dto';
import { UploadDocumentoRequestDto } from './dto/upload-documento-request.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
import { ReformaDocumentoDto } from './dto/reforma-documento.dto';
import { PublicQueryDto } from './dto/public-query.dto';
import { AdminDocumentosQueryDto } from './dto/admin-documentos-query.dto';
import { CuradorDocumentosQueryDto } from './dto/curador-documentos-query.dto';
import { UploadBorradorDto } from './dto/upload-borrador.dto';
import { PublicarBorradorDto } from './dto/publicar-borrador.dto';
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
  @ApiResponse({
    status: 200,
    description: `Retorna la lista de documentos.
Nota sobre la respuesta (Nuevos campos y Metadatos):
- \`subcarpetaNormaId\`: Nivel 2 (Ej: Legislación).
- \`carpetaInternaId\`: Nivel 3 o 4 (Ej: Nacional o Leyes Orgánicas).
- \`metadatos\`: Objeto JSON dinámico con propiedades específicas del tipo documental.
- \`gacetaPdfUrl\`: URL directa en GCS al PDF de la Gaceta Oficial (si aplica).
- Campos universales incluidos: \`ocrHabilitado\`, \`pais\`, \`jerarquiaSuperiorId\`, \`documentoRelacionadoId\`.`,
  })
  findPublic(@Query() query: PublicQueryDto) {
    return this.documentosService.findPublic(query);
  }

  @Get('seo/:nombreBreve')
  @ApiOperation({ summary: 'Metadatos SEO sin URL del PDF' })
  @ApiResponse({
    status: 200,
    description: `Retorna la metadata SEO del documento.
Incluye los campos: \`metadatos\` (JSON dinámico), \`ocrHabilitado\`, \`pais\`, \`jerarquiaSuperiorId\`, \`documentoRelacionadoId\`, y \`gacetaPdfUrl\`.`,
  })
  findSeo(@Param('nombreBreve') nombreBreve: string) {
    return this.documentosService.findSeoByNombreBreve(nombreBreve);
  }

  @Post('upload')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Subir documento (Curador)',
    description: `Sube uno o dos archivos (Documento PDF y Gaceta PDF) a la ruta provisional /pendientes/ en GCS y crea el registro en estado PENDIENTE_REVISION. 
El sistema enruta el documento y deduce el Tema basándose en los IDs provistos.

### Enrutamiento Recursivo hacia GCS (Niveles)
Cuando el documento es publicado, el sistema construye la ruta final resolviendo el árbol de carpetas de forma automática:
- **Nivel 1 (Tema Principal):** Auto-derivado (ej. "Derecho Urbanístico")
- **Nivel 2 (Subcarpeta Norma):** Según \`subcarpetaNormaId\` (ej. "Legislación")
- **Nivel 3 (Jurisdicción):** Padre de la Carpeta Interna (ej. "Nacional")
- **Nivel 4 (Subtipo de Norma):** Según \`carpetaInternaId\` (ej. "Leyes Orgánicas")

*Nota: Con solo enviar el ID del Nivel 4 (Leyes Orgánicas), el backend detecta que su padre es el Nivel 3 (Nacional) y arma la ruta completa.*

Ruta Final Resultante: \`tema-principal/derecho-urbanistico/legislacion/nacional/leyes-organicas/\``,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadDocumentoRequestDto })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR, Role.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'gacetaFile', maxCount: 1 },
    ]),
  )
  async uploadDocumento(
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      gacetaFile?: Express.Multer.File[];
    },
    @Body() body: UploadDocumentoDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    const mainFile = files?.file?.[0];
    const gacetaFile = files?.gacetaFile?.[0];
    return this.documentosService.procesarCarga(mainFile, gacetaFile, body, user.sub);
  }

  @Post('reforma')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar reforma de ley existente' })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR, Role.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'gacetaFile', maxCount: 1 },
    ]),
  )
  async reforma(
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      gacetaFile?: Express.Multer.File[];
    },
    @Body() body: ReformaDocumentoDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    const mainFile = files?.file?.[0];
    const gacetaFile = files?.gacetaFile?.[0];
    const { leyViejaId, ...uploadData } = body;
    return this.documentosService.procesarReforma(
      mainFile,
      gacetaFile,
      uploadData,
      leyViejaId,
      user.sub,
    );
  }

  @Post('borrador')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Subir documento como borrador (Solo Curador)',
    description:
      'Sube el archivo al bucket en la ruta /borradores/. Si se proporciona la carpeta destino, se auto-derivan los temas. El estado queda en BORRADOR sin notificar a revisores.',
  })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'gacetaFile', maxCount: 1 },
    ]),
  )
  async uploadBorrador(
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      gacetaFile?: Express.Multer.File[];
    },
    @Body() body: UploadBorradorDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    const mainFile = files?.file?.[0];
    const gacetaFile = files?.gacetaFile?.[0];
    return this.documentosService.procesarCargaBorrador(mainFile, gacetaFile, body, user.sub);
  }

  @Patch('borrador/:id/publicar')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Publicar borrador (Pasa a Pendiente de Revisión)',
    description:
      'Mueve físicamente el archivo en GCS desde /borradores/ hacia /pendientes/. Transiciona el estado de BORRADOR a PENDIENTE_REVISION y notifica al revisor correspondiente.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR)
  async publicarBorrador(
    @Param('id') id: string,
    @Body() body: PublicarBorradorDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.documentosService.publicarBorrador(id, body, user.sub);
  }

  @Get('visor/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, MuroCompletoGuard)
  @Roles(Role.CLIENTE)
  @ApiOperation({ summary: 'Visor PDF con muro de datos completo' })
  @ApiResponse({
    status: 200,
    description: `Registra la vista y retorna el acceso.
Los metadatos del muro de datos (si el frontend los solicita del documento) incluyen: \`metadatos\` (JSON), \`gacetaPdfUrl\`, \`ocrHabilitado\`, \`pais\`, \`jerarquiaSuperiorId\`, y \`documentoRelacionadoId\`.`,
  })
  visor(@Param('id') id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.documentosService.registrarVisor(user.sub, id);
  }

  @Get('admin/list')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listado de documentos para el panel de Administrador' })
  @ApiResponse({
    status: 200,
    description: `Retorna los documentos con conteo de notas y preview de la última nota.
Incluye los campos: \`metadatos\` (JSON), \`gacetaPdfUrl\`, \`ocrHabilitado\`, \`pais\`, \`jerarquiaSuperiorId\`, \`documentoRelacionadoId\` y la jerarquía de carpetas.`,
  })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 403, description: 'Prohibido, requiere rol ADMIN.' })
  findAdminList(@Query() query: AdminDocumentosQueryDto) {
    return this.documentosService.findAdminList(query);
  }

  @Get('curador/con-notas')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR)
  @ApiOperation({ summary: 'Bandeja del Curador: Listado de sus documentos con notas internas.' })
  @ApiResponse({
    status: 200,
    description: `Retorna los documentos asignados al curador que contengan notas.
Incluye los campos: \`metadatos\` (JSON), \`gacetaPdfUrl\`, \`ocrHabilitado\`, \`pais\`, \`jerarquiaSuperiorId\`, \`documentoRelacionadoId\` y la jerarquía de carpetas.`,
  })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 403, description: 'Prohibido, requiere rol CURADOR.' })
  findCuradorConNotas(@CurrentUser() user: JwtPayloadUser) {
    return this.documentosService.findCuradorConNotas(user.sub);
  }

  @Get('curador/list')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR)
  @ApiOperation({ summary: 'Listado de documentos del curador con filtros, búsqueda y paginación' })
  @ApiResponse({
    status: 200,
    description: `Retorna los documentos del curador filtrados y paginados.
Incluye los campos: \`metadatos\` (JSON), \`gacetaPdfUrl\`, \`ocrHabilitado\`, \`pais\`, \`jerarquiaSuperiorId\`, \`documentoRelacionadoId\` y la jerarquía de carpetas.`,
  })
  findCuradorList(@Query() query: CuradorDocumentosQueryDto, @CurrentUser() user: JwtPayloadUser) {
    return this.documentosService.findCuradorList(user.sub, query);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENTE, Role.CURADOR, Role.REVISOR, Role.ADMIN)
  @ApiOperation({ summary: 'Obtener todos los documentos (sin filtros)' })
  @ApiResponse({
    status: 200,
    description: `Retorna la lista de documentos. 
Nota sobre la respuesta (Nuevos campos y Metadatos):
- \`subcarpetaNormaId\`: Nivel 2 (Ej: Legislación).
- \`carpetaInternaId\`: Nivel 3 o 4 (Ej: Nacional o Leyes Orgánicas).
- \`metadatos\`: Objeto JSON dinámico con propiedades específicas del tipo documental.
- \`gacetaPdfUrl\`: URL directa en GCS al PDF de la Gaceta Oficial (si aplica).
- Campos universales incluidos: \`ocrHabilitado\`, \`pais\`, \`jerarquiaSuperiorId\`, \`documentoRelacionadoId\`.`,
  })
  findAll() {
    return this.documentosService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENTE, Role.CURADOR, Role.REVISOR, Role.ADMIN)
  @ApiOperation({ summary: 'Obtener documento por ID' })
  @ApiResponse({
    status: 200,
    description: `Retorna el detalle del documento.
Nota sobre la respuesta (Nuevos campos y Metadatos):
- \`subcarpetaNormaId\`: Nivel 2 (Ej: Legislación).
- \`carpetaInternaId\`: Nivel 3 o 4 (Ej: Nacional o Leyes Orgánicas).
- \`metadatos\`: Objeto JSON dinámico con propiedades específicas del tipo documental.
- \`gacetaPdfUrl\`: URL directa en GCS al PDF de la Gaceta Oficial (si aplica).
- Campos universales incluidos: \`ocrHabilitado\`, \`pais\`, \`jerarquiaSuperiorId\`, \`documentoRelacionadoId\`.`,
  })
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
  @ApiOperation({
    summary: 'Editar documento (Curador, Revisor, Admin)',
    description:
      'Permite modificar los metadatos o reemplazar el archivo PDF. Si el documento estaba en estado RECHAZADO, al editarse pasa automáticamente a PENDIENTE_REVISION para que sea evaluado nuevamente.',
  })
  @Roles(Role.CURADOR, Role.REVISOR, Role.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'gacetaFile', maxCount: 1 },
    ]),
    AuditLogInterceptor,
  )
  @ApiConsumes('multipart/form-data')
  editar(
    @Param('id') id: string,
    @Body() updateData: UpdateDocumentoDto,
    @UploadedFiles()
    files?: {
      file?: Express.Multer.File[];
      gacetaFile?: Express.Multer.File[];
    },
  ) {
    const mainFile = files?.file?.[0];
    const gacetaFile = files?.gacetaFile?.[0];
    return this.documentosService.update(id, updateData, mainFile, gacetaFile);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR, Role.ADMIN, Role.REVISOR)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'gacetaFile', maxCount: 1 },
    ]),
    AuditLogInterceptor,
  )
  @ApiConsumes('multipart/form-data')
  update(
    @Param('id') id: string,
    @Body() updateData: UpdateDocumentoDto,
    @UploadedFiles()
    files?: {
      file?: Express.Multer.File[];
      gacetaFile?: Express.Multer.File[];
    },
  ) {
    const mainFile = files?.file?.[0];
    const gacetaFile = files?.gacetaFile?.[0];
    return this.documentosService.update(id, updateData, mainFile, gacetaFile);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR, Role.ADMIN, Role.REVISOR)
  softDelete(@Param('id') id: string) {
    return this.documentosService.softDelete(id);
  }
}
