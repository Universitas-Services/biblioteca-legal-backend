import { Module } from '@nestjs/common';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { StorageModule } from '../storage/storage.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CategoriasModule } from '../categorias/categorias.module';
import { EtiquetasModule } from '../etiquetas/etiquetas.module';
import { ValidarDuplicidadService } from './services/validar-duplicidad.service';
import { AsignacionRevisorService } from './services/asignacion-revisor.service';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    StorageModule,
    PrismaModule,
    CategoriasModule,
    EtiquetasModule,
    AuditModule,
    AuthModule,
  ],
  controllers: [DocumentosController],
  providers: [DocumentosService, ValidarDuplicidadService, AsignacionRevisorService],
  exports: [DocumentosService],
})
export class DocumentosModule {}
