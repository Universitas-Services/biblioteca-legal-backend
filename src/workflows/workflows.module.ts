import { Module, forwardRef } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentosModule } from '../documentos/documentos.module';
import { NotasInternasModule } from '../notas-internas/notas-internas.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, forwardRef(() => DocumentosModule), NotasInternasModule, StorageModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
