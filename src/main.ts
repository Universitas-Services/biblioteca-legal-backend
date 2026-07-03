import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: [
      'https://biblioteca.universitas.legal',
      'https://iusurbano.universitas.legal',
      'http://localhost:3000',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
    credentials: false,
  });

  const config = new DocumentBuilder()
    .setTitle('Biblioteca Legal API')
    .setDescription('API para gestión de documentos legales')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('/', 'Entorno actual (relativo)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch(err => {
  // eslint-disable-next-line no-console
  console.error('Error during application startup:', err);
  process.exit(1);
});
