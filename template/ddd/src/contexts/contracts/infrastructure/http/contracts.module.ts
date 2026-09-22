import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from '../../../../data-source';
import { AddContractItemUseCase } from '../../application/use-cases/add-contract-item.use-case';
import { AddContractSiteUseCase } from '../../application/use-cases/add-contract-site.use-case';
import { CreateContractUseCase } from '../../application/use-cases/create-contract.use-case';
import { DeleteContractUseCase } from '../../application/use-cases/delete-contract.use-case';
import { GenerateScheduleUseCase } from '../../application/use-cases/generate-schedule.use-case';
import { GetContractDetailUseCase } from '../../application/use-cases/get-contract-detail.use-case';
import { ListContractsUseCase } from '../../application/use-cases/list-contracts.use-case';
import { UpdateContractItemUseCase } from '../../application/use-cases/update-contract-item.use-case';
import { UpdateContractUseCase } from '../../application/use-cases/update-contract.use-case';
import { CONTRACT_REPOSITORY } from '../../domain/contract-repository.port';
import { ScheduleGeneratorDomainService } from '../../domain/schedule-generator.domain-service';
import { ContractOrmEntity } from '../persistence/contract.orm-entity';
import { TypeOrmContractRepository } from '../persistence/typeorm-contract.repository';
import { ContractsController } from './contracts.controller';
import { DomainExceptionFilter } from './domain-error.filter';

/**
 * ContractsModule — NestJS wiring for the contracts bounded context.
 *
 * Binds ContractRepositoryPort (CONTRACT_REPOSITORY) to
 * TypeOrmContractRepository, and registers every use-case as a provider so
 * ContractsController can inject them. This is the only file in the
 * contracts context that is allowed to know about the concrete
 * infrastructure implementation AND the application layer at the same
 * time — it is composition, not logic.
 */
@Module({
  controllers: [ContractsController],
  providers: [
    {
      provide: CONTRACT_REPOSITORY,
      useFactory: (dataSource: DataSource) =>
        new TypeOrmContractRepository(dataSource.getRepository(ContractOrmEntity)),
      inject: [DATA_SOURCE],
    },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    {
      provide: CreateContractUseCase,
      useFactory: (repo: TypeOrmContractRepository) => new CreateContractUseCase(repo),
      inject: [CONTRACT_REPOSITORY],
    },
    {
      provide: ListContractsUseCase,
      useFactory: (repo: TypeOrmContractRepository) => new ListContractsUseCase(repo),
      inject: [CONTRACT_REPOSITORY],
    },
    {
      provide: GetContractDetailUseCase,
      useFactory: (repo: TypeOrmContractRepository) => new GetContractDetailUseCase(repo),
      inject: [CONTRACT_REPOSITORY],
    },
    {
      provide: UpdateContractUseCase,
      useFactory: (repo: TypeOrmContractRepository) => new UpdateContractUseCase(repo),
      inject: [CONTRACT_REPOSITORY],
    },
    {
      provide: DeleteContractUseCase,
      useFactory: (repo: TypeOrmContractRepository) => new DeleteContractUseCase(repo),
      inject: [CONTRACT_REPOSITORY],
    },
    {
      provide: AddContractSiteUseCase,
      useFactory: (repo: TypeOrmContractRepository) => new AddContractSiteUseCase(repo),
      inject: [CONTRACT_REPOSITORY],
    },
    {
      provide: AddContractItemUseCase,
      useFactory: (repo: TypeOrmContractRepository) => new AddContractItemUseCase(repo),
      inject: [CONTRACT_REPOSITORY],
    },
    {
      provide: UpdateContractItemUseCase,
      useFactory: (repo: TypeOrmContractRepository) => new UpdateContractItemUseCase(repo),
      inject: [CONTRACT_REPOSITORY],
    },
    {
      provide: GenerateScheduleUseCase,
      useFactory: (repo: TypeOrmContractRepository) =>
        new GenerateScheduleUseCase(repo, new ScheduleGeneratorDomainService()),
      inject: [CONTRACT_REPOSITORY],
    },
  ],
})
export class ContractsModule {}
