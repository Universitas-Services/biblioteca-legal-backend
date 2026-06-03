import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { EspecialidadService } from './especialidad.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [EspecialidadService],
  exports: [EspecialidadService],
})
export class EspecialidadModule {}
