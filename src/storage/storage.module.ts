import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Módulo de almacenamiento.
 *
 * Registra el StorageService como proveedor (inyectable en otros módulos)
 * y el StorageController para exponer los endpoints administrativos
 * de gestión de carpetas en GCS.
 *
 * Imports:
 * - AuthModule: provee JwtStrategy para que JwtAuthGuard funcione en este contexto.
 * - PrismaModule: provee PrismaService para que StorageService pueda persistir
 *   registros de TemaPrincipal y SubcarpetaNorma en la base de datos.
 */
@Module({
  imports: [
    AuthModule, // Necesario para que JwtStrategy esté disponible en este contexto
    PrismaModule, // Necesario para inyectar PrismaService en StorageService
  ],
  controllers: [StorageController], // Controlador que expone los endpoints de carpetas
  providers: [StorageService], // Servicio con la lógica de GCS + persistencia en BD
  exports: [StorageService], // Exportar para que otros módulos puedan inyectar StorageService
})
export class StorageModule {}
