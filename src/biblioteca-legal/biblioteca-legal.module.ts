import { Module } from '@nestjs/common';
import { BibliotecaLegalController } from './biblioteca-legal.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BibliotecaLegalController],
})
export class BibliotecaLegalModule {}
