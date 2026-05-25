import { PartialType } from '@nestjs/swagger';
import { CreateMatrizBDto } from './create-matriz-b.dto';

export class UpdateMatrizBDto extends PartialType(CreateMatrizBDto) {}
