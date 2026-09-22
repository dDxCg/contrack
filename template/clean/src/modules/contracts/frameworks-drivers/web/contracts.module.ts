import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AddContractItemUseCase } from '../../use-cases/add-contract-item.use-case';
import { AddContractSiteUseCase } from '../../use-cases/add-contract-site.use-case';
import { CreateContractUseCase } from '../../use-cases/create-contract.use-case';
import { DeleteContractItemUseCase } from '../../use-cases/delete-contract-item.use-case';
import { DeleteContractSiteUseCase } from '../../use-cases/delete-contract-site.use-case';
import { DeleteContractUseCase } from '../../use-cases/delete-contract.use-case';
import { GetContractDetailUseCase } from '../../use-cases/get-contract-detail.use-case';
import { ListContractsUseCase } from '../../use-cases/list-contracts.use-case';
import { UpdateContractItemUseCase } from '../../use-cases/update-contract-item.use-case';
import { UpdateContractSiteUseCase } from '../../use-cases/update-contract-site.use-case';
import { UpdateContractUseCase } from '../../use-cases/update-contract.use-case';
import { ContractsController as ContractsInteractor } from '../../interface-adapters/controllers/contracts.controller';
import { ItemsController as ItemsInteractor } from '../../interface-adapters/controllers/items.controller';
import { SitesController as SitesInteractor } from '../../interface-adapters/controllers/sites.controller';
import { DATA_SOURCE, createDataSource } from '../db/data-source';
import { TypeOrmContractItemRepository } from '../orm/contract-item.repository';
import { TypeOrmContractSiteRepository } from '../orm/contract-site.repository';
import { TypeOrmContractRepository } from '../orm/contract.repository';
import { ContractsController } from './contracts.controller';
import { ItemsController } from './items.controller';
import { SitesController } from './sites.controller';

// The only place in the module that wires framework concerns (NestJS DI, a
// TypeORM DataSource) to the inner layers. Nothing under entities/ or
// use-cases/ is imported here for its own sake — this module exists purely
// to *assemble* them behind the gateway interfaces they declared.
@Module({
  controllers: [ContractsController, SitesController, ItemsController],
  providers: [
    {
      provide: DATA_SOURCE,
      useFactory: async (): Promise<DataSource> => {
        const dataSource = createDataSource();
        await dataSource.initialize();
        return dataSource;
      },
    },
    { provide: TypeOrmContractRepository, useFactory: (ds: DataSource) => new TypeOrmContractRepository(ds), inject: [DATA_SOURCE] },
    { provide: TypeOrmContractSiteRepository, useFactory: (ds: DataSource) => new TypeOrmContractSiteRepository(ds), inject: [DATA_SOURCE] },
    { provide: TypeOrmContractItemRepository, useFactory: (ds: DataSource) => new TypeOrmContractItemRepository(ds), inject: [DATA_SOURCE] },

    {
      provide: CreateContractUseCase,
      useFactory: (c: TypeOrmContractRepository, s: TypeOrmContractSiteRepository, i: TypeOrmContractItemRepository) =>
        new CreateContractUseCase(c, s, i),
      inject: [TypeOrmContractRepository, TypeOrmContractSiteRepository, TypeOrmContractItemRepository],
    },
    {
      provide: ListContractsUseCase,
      useFactory: (c: TypeOrmContractRepository) => new ListContractsUseCase(c),
      inject: [TypeOrmContractRepository],
    },
    {
      provide: GetContractDetailUseCase,
      useFactory: (c: TypeOrmContractRepository, s: TypeOrmContractSiteRepository, i: TypeOrmContractItemRepository) =>
        new GetContractDetailUseCase(c, s, i),
      inject: [TypeOrmContractRepository, TypeOrmContractSiteRepository, TypeOrmContractItemRepository],
    },
    {
      provide: UpdateContractUseCase,
      useFactory: (c: TypeOrmContractRepository) => new UpdateContractUseCase(c),
      inject: [TypeOrmContractRepository],
    },
    {
      provide: DeleteContractUseCase,
      useFactory: (c: TypeOrmContractRepository) => new DeleteContractUseCase(c),
      inject: [TypeOrmContractRepository],
    },
    {
      provide: AddContractSiteUseCase,
      useFactory: (c: TypeOrmContractRepository, s: TypeOrmContractSiteRepository, i: TypeOrmContractItemRepository) =>
        new AddContractSiteUseCase(c, s, i),
      inject: [TypeOrmContractRepository, TypeOrmContractSiteRepository, TypeOrmContractItemRepository],
    },
    {
      provide: UpdateContractSiteUseCase,
      useFactory: (s: TypeOrmContractSiteRepository) => new UpdateContractSiteUseCase(s),
      inject: [TypeOrmContractSiteRepository],
    },
    {
      provide: DeleteContractSiteUseCase,
      useFactory: (s: TypeOrmContractSiteRepository) => new DeleteContractSiteUseCase(s),
      inject: [TypeOrmContractSiteRepository],
    },
    {
      provide: AddContractItemUseCase,
      useFactory: (s: TypeOrmContractSiteRepository, i: TypeOrmContractItemRepository) => new AddContractItemUseCase(s, i),
      inject: [TypeOrmContractSiteRepository, TypeOrmContractItemRepository],
    },
    {
      provide: UpdateContractItemUseCase,
      useFactory: (i: TypeOrmContractItemRepository) => new UpdateContractItemUseCase(i),
      inject: [TypeOrmContractItemRepository],
    },
    {
      provide: DeleteContractItemUseCase,
      useFactory: (i: TypeOrmContractItemRepository) => new DeleteContractItemUseCase(i),
      inject: [TypeOrmContractItemRepository],
    },

    {
      provide: ContractsInteractor,
      useFactory: (
        create: CreateContractUseCase,
        list: ListContractsUseCase,
        detail: GetContractDetailUseCase,
        update: UpdateContractUseCase,
        del: DeleteContractUseCase,
        addSite: AddContractSiteUseCase,
      ) => new ContractsInteractor(create, list, detail, update, del, addSite),
      inject: [
        CreateContractUseCase,
        ListContractsUseCase,
        GetContractDetailUseCase,
        UpdateContractUseCase,
        DeleteContractUseCase,
        AddContractSiteUseCase,
      ],
    },
    {
      provide: SitesInteractor,
      useFactory: (update: UpdateContractSiteUseCase, del: DeleteContractSiteUseCase, addItem: AddContractItemUseCase) =>
        new SitesInteractor(update, del, addItem),
      inject: [UpdateContractSiteUseCase, DeleteContractSiteUseCase, AddContractItemUseCase],
    },
    {
      provide: ItemsInteractor,
      useFactory: (update: UpdateContractItemUseCase, del: DeleteContractItemUseCase) => new ItemsInteractor(update, del),
      inject: [UpdateContractItemUseCase, DeleteContractItemUseCase],
    },
  ],
  exports: [DATA_SOURCE],
})
export class ContractsModule {}
