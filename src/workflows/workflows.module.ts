import { Module, forwardRef } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentosModule } from '../documentos/documentos.module';
import { NotasInternasModule } from '../notas-internas/notas-internas.module';

@Module({
  imports: [PrismaModule, forwardRef(() => DocumentosModule), NotasInternasModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
