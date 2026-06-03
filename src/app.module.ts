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
import { ComentariosModule } from './comentarios/comentarios.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { EspecialidadModule } from './common/especialidad/especialidad.module';

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
    ComentariosModule,
    NotificacionesModule,
    CloudinaryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
