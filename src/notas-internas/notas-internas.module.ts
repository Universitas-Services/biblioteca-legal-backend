import { Module } from '@nestjs/common';
import { NotasInternasController } from './notas-internas.controller';
import { NotasInternasService } from './notas-internas.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotasInternasController],
  providers: [NotasInternasService],
  exports: [NotasInternasService],
})
export class NotasInternasModule {}
