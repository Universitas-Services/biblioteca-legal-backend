import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentosService } from './documentos.service';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UploadDocumentoDto } from './dto/upload-documento.dto';
import { UploadDocumentoRequestDto } from './dto/upload-documento-request.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';

@Controller('documentos')
@ApiTags('Documentos')
export class DocumentosController {
  private readonly logger = new Logger(DocumentosController.name);

  constructor(
    private readonly documentosService: DocumentosService,
    private readonly storageService: StorageService,
    private readonly prismaService: PrismaService,
  ) {}

  @Post('upload')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Subir documento',
    description:
      'Endpoint para subir documentos al sistema. Requiere rol de CURADOR, ADMIN o REVISOR.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadDocumentoRequestDto })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR, Role.ADMIN, Role.REVISOR)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocumento(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDocumentoDto,
  ) {
    return this.documentosService.procesarCarga(file, body);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar documentos',
    description:
      'Obtiene todos los documentos activos. Accesible por CLIENTE, CURADOR, REVISOR, ADMIN.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENTE, Role.CURADOR, Role.REVISOR, Role.ADMIN)
  async findAll() {
    return this.documentosService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener un documento',
    description:
      'Obtiene los detalles de un documento. Accesible por CLIENTE, CURADOR, REVISOR, ADMIN.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENTE, Role.CURADOR, Role.REVISOR, Role.ADMIN)
  async findOne(@Param('id') id: string) {
    return this.documentosService.findOne(id);
  }

  @Get(':id/preview')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Previsualizar documento',
    description:
      'Devuelve una URL firmada de Google Cloud Storage configurada para previsualización (inline) que expira en 15 minutos.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENTE, Role.CURADOR, Role.REVISOR, Role.ADMIN)
  async preview(@Param('id') id: string) {
    const documento = await this.documentosService.findOne(id);
    const url = await this.storageService.getSignedUrl(documento.archivoOriginalUrl);
    return { url };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar documento',
    description:
      'Actualiza los metadatos o el archivo de un documento. Requiere rol de CURADOR, ADMIN o REVISOR.',
  })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR, Role.ADMIN, Role.REVISOR)
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id') id: string,
    @Body() updateData: UpdateDocumentoDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.documentosService.update(id, updateData, file);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Eliminar documento de forma pasiva',
    description: 'Marca un documento como eliminado. Requiere rol de CURADOR, ADMIN o REVISOR.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR, Role.ADMIN, Role.REVISOR)
  async softDelete(@Param('id') id: string) {
    return this.documentosService.softDelete(id);
  }

  @Post('upload/resoluciones')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Subir resolución legal',
    description:
      'Sube una resolución legal a GCS (carpeta resoluciones) y guarda la referencia en la base de datos. Requiere rol de CURADOR, ADMIN o REVISOR.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadDocumentoRequestDto })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR, Role.ADMIN, Role.REVISOR)
  @UseInterceptors(FileInterceptor('file'))
  async uploadResolucion(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDocumentoDto,
  ): Promise<{
    message: string;
    documento: any;
  }> {
    try {
      const gcsUri: string = await this.storageService.uploadDocument(file, 'resoluciones');
      this.logger.log(`Resolución subida a GCS exitosamente: ${gcsUri}`);

      const documento = await this.prismaService.client.documento.create({
        data: {
          titulo: body.titulo,
          archivoOriginalUrl: gcsUri,
          estado: 'Pendiente de Revisión',
        },
      });

      this.logger.log(`Registro creado en BD para resolución: ${documento.id}`);

      return {
        message: 'Resolución legal subida y registrada exitosamente.',
        documento,
      };
    } catch (error: unknown) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error al procesar la subida de resolución: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        `Error al procesar la subida de la resolución: ${message}`,
      );
    }
  }
}
