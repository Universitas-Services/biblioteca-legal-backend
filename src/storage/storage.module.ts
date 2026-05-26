import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { AuthModule } from '../auth/auth.module';

/**
 * Módulo de almacenamiento.
 *
 * Registra el StorageService como proveedor (inyectable en otros módulos)
 * y el StorageController para exponer los endpoints administrativos
 * de gestión de carpetas en GCS.
 *
 * Importa AuthModule para que JwtStrategy (la estrategia 'jwt' de Passport)
 * esté disponible en el contexto de inyección de dependencias de este módulo.
 * Sin esto, JwtAuthGuard no puede resolver la estrategia y devuelve 401.
 */
@Module({
  imports: [AuthModule], // Necesario para que JwtStrategy esté disponible en este contexto
  controllers: [StorageController], // Controlador que expone los endpoints POST de carpetas
  providers: [StorageService], // Servicio con la lógica de interacción con GCS
  exports: [StorageService], // Exportar para que otros módulos puedan inyectar StorageService
})
export class StorageModule {}
