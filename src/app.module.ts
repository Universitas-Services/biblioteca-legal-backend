import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { StorageModule } from './storage/storage.module';
import { DocumentosModule } from './documentos/documentos.module';
import { UsersModule } from './users/users.module';
import { CategoriasModule } from './categorias/categorias.module';
import { MatricesModule } from './matrices/matrices.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { NotasInternasModule } from './notas-internas/notas-internas.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { EspecialidadModule } from './common/especialidad/especialidad.module';
import { MetadatasModule } from './metadatas/metadatas.module';
import { BibliotecaLegalModule } from './biblioteca-legal/biblioteca-legal.module';
import { EtiquetasModule } from './etiquetas/etiquetas.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    EspecialidadModule,
    AuthModule,
    StorageModule,
    CategoriasModule,
    MatricesModule,
    DocumentosModule,
    WorkflowsModule,
    UsersModule,
    NotasInternasModule,
    NotificacionesModule,
    CloudinaryModule,
    MetadatasModule,
    BibliotecaLegalModule,
    EtiquetasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
