import { DataSource } from 'typeorm';
import { Customer } from '../../Models/customer.entity';
import { Employee } from '../../Models/employee.entity';
import { Team } from '../../Models/team.entity';
import { Tenant } from '../../Models/tenant.entity';

export const DATA_SOURCE = Symbol('DATA_SOURCE');

export function createDataSource(env: NodeJS.ProcessEnv = process.env): DataSource {
  return new DataSource({
    type: 'postgres',
    host: env.DB_HOST ?? 'localhost',
    port: readPort(env.DB_PORT),
    username: env.DB_USER ?? 'lichhd',
    password: env.DB_PASSWORD ?? 'lichhd',
    database: env.DB_NAME ?? 'lichhd',
    entities: [Tenant, Employee, Customer, Team],
    synchronize: false,
    logging: false,
  });
}

function readPort(raw: string | undefined): number {
  const port = Number(raw ?? 5432);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`DB_PORT must be a positive whole number (got "${raw ?? ''}")`);
  }

  return port;
}
