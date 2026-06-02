import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { static as serveStatic } from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS configuration
  const configuredOrigin = process.env.PICKTOR_WEB_ORIGIN?.trim();
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production' && configuredOrigin
        ? configuredOrigin
        : true,
    credentials: true,
  });
  app.use('/uploads', serveStatic(join(process.cwd(), 'uploads')));

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('SijangYeojido API')
    .setDescription('The SijangYeojido backend API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
