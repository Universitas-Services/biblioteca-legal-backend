import { Controller, Post, UseInterceptors, UploadedFile, Body, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentosService } from './documentos.service';
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
  constructor(private readonly documentosService: DocumentosService) {}

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
}
