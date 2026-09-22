import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule, configureApp } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const port = Number(process.env.PORT ?? 3100);
  await app.listen(port, '0.0.0.0');
  new Logger('bootstrap').log(`Contrack clean-architecture contracts API listening on http://localhost:${port}/api/v1`);
}

void bootstrap();
