import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule, configureApp } from './app.module';
import { DATA_SOURCE } from './data-source';

/** Ported from backend/main.ts at a much smaller scale: one context, no shutdown-hook edge cases beyond the DataSource. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  configureApp(app);
  await app.get<DataSource>(DATA_SOURCE).initialize();
  const port = Number(process.env.PORT ?? 3100);
  await app.listen(port, '0.0.0.0');
  new Logger('bootstrap').log(`Contracts DDD reference port listening on http://localhost:${port}/api/v1`);
}

void bootstrap();
