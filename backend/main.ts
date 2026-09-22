import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { DataSource } from 'typeorm';
import { AppModule, configureApp } from './app.module';
import { DATA_SOURCE } from './data/db-context/data-source';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  configureApp(app);
  await app.get<DataSource>(DATA_SOURCE).initialize();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  app.get(Logger).log(`Contrack tenant API listening on http://localhost:${port}/api/v1`, 'bootstrap');
}

void bootstrap();
