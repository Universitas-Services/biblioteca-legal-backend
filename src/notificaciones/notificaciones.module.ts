import { Module } from '@nestjs/common';
import { AlertasListener } from './alertas.listener';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AlertasListener],
})
export class NotificacionesModule {}
