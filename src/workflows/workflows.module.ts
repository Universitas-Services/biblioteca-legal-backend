import { Module, forwardRef } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MatricesModule } from '../matrices/matrices.module';
import { DocumentosModule } from '../documentos/documentos.module';

@Module({
  imports: [PrismaModule, MatricesModule, forwardRef(() => DocumentosModule)],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
