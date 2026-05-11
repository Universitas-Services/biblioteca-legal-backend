import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Franksito es hombre y le gusta las mujeres sobre todo valeria';
  }
}
