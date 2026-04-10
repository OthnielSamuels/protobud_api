import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    // Disable heavy logger in production — saves memory & I/O
    logger: process.env.NODE_ENV === 'development'
      ? ['log', 'warn', 'error']
      : ['warn', 'error'],
  });

  // Global validation pipe — strip unknown fields, auto-transform types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // Strip fields not in DTO
      forbidNonWhitelisted: false,
      transform: true,          // Auto-cast primitives (string → number etc.)
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Internal API only — no CORS needed unless you add a frontend later
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Backend running on port ${port}`);
}

bootstrap();
