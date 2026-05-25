import { PartialType } from '@nestjs/swagger';
import { CreateMatrizADto } from './create-matriz-a.dto';

export class UpdateMatrizADto extends PartialType(CreateMatrizADto) {}
