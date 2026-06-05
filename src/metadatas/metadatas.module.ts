import { Module } from '@nestjs/common';
import { MetadatasService } from './metadatas.service';
import { MetadatasController } from './metadatas.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MetadatasController],
  providers: [MetadatasService],
  exports: [MetadatasService],
})
export class MetadatasModule {}
