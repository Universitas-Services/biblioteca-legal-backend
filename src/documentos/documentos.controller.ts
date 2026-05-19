import {
  Controller,
  Post,
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
    description: 'Endpoint para subir documentos al sistema. Requiere rol de CURADOR.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadDocumentoRequestDto })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocumento(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDocumentoDto,
  ) {
    return this.documentosService.procesarCarga(file, body.titulo);
  }

  @Post('upload/resoluciones')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Subir resolución legal',
    description:
      'Sube una resolución legal a GCS (carpeta resoluciones) y guarda la referencia en la base de datos. Requiere rol de CURADOR.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadDocumentoRequestDto })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CURADOR)
  @UseInterceptors(FileInterceptor('file'))
  async uploadResolucion(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDocumentoDto,
  ): Promise<{
    message: string;
    documento: {
      id: string;
      titulo: string;
      archivoOriginalUrl: string;
      estado: string;
      ultimaActualizacion: Date;
    };
  }> {
    try {
      // 1. Subir el archivo a GCS en la carpeta 'resoluciones'
      const gcsUri: string = await this.storageService.uploadDocument(file, 'resoluciones');

      this.logger.log(`Resolución subida a GCS exitosamente: ${gcsUri}`);

      // 2. Crear el registro en la base de datos con los metadatos y la URI de GCS
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
      // Si el error ya es una excepción de NestJS, lo re-lanzamos tal cual
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
