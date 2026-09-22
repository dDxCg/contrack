import 'dotenv/config';
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule, configureApp } from './app.module';
import { DATA_SOURCE } from './data/db-context/data-source';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  configureApp(app);
  await app.get<DataSource>(DATA_SOURCE).initialize();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  new Logger('bootstrap').log(`Contrack tenant API listening on http://localhost:${port}/api/v1`);
}

void bootstrap();
