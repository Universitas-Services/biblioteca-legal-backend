import { Module } from '@nestjs/common';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AuditLogInterceptor],
  exports: [AuditLogInterceptor],
})
export class AuditModule {}
