import { Module } from '@nestjs/common';
import { MatricesController } from './matrices.controller';
import { MatricesService } from './matrices.service';
import { MatchmakerService } from './matchmaker.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MatricesController],
  providers: [MatricesService, MatchmakerService],
  exports: [MatricesService, MatchmakerService],
})
export class MatricesModule {}
