import { Body, Controller, Delete, Get, Headers, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ContractsController as ContractsInteractor } from '../../interface-adapters/controllers/contracts.controller';
import { ContractResponse, ContractPageResponse, ContractSiteResponse } from '../../interface-adapters/presenters/contract.presenter';
import { ContractBodyDto, ContractSiteAddBodyDto, ContractUpdateBodyDto } from './dto/contract.dto';
import { PageQueryDto } from './dto/page-query.dto';
import { requireTenantId } from './tenant-header';

// Thin NestJS binding: decorators, route paths and HTTP verbs live here —
// nowhere else in the module. It does no business logic; it parses the
// tenant id (see tenant-header.ts — a stand-in for the real access-control
// module, which is a different bounded context and out of scope for this
// port), converts the validated DTO to the interface-adapters controller's
// plain request shape, and returns whatever the presenter produced.
@Controller('contracts')
export class ContractsController {
  constructor(private readonly interactor: ContractsInteractor) {}

  @Get()
  list(@Headers('x-tenant-id') tenantHeader: string, @Query() query: PageQueryDto): Promise<ContractPageResponse> {
    return this.interactor.list(requireTenantId(tenantHeader), { limit: query.limit, offset: query.offset });
  }

  @Post()
  @HttpCode(201)
  create(@Headers('x-tenant-id') tenantHeader: string, @Body() body: ContractBodyDto): Promise<ContractResponse> {
    return this.interactor.create(requireTenantId(tenantHeader), body);
  }

  @Get(':id')
  get(@Headers('x-tenant-id') tenantHeader: string, @Param('id', ParseIntPipe) id: number): Promise<ContractResponse> {
    return this.interactor.get(requireTenantId(tenantHeader), id);
  }

  @Patch(':id')
  update(
    @Headers('x-tenant-id') tenantHeader: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ContractUpdateBodyDto,
  ): Promise<ContractResponse> {
    return this.interactor.update(requireTenantId(tenantHeader), id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@Headers('x-tenant-id') tenantHeader: string, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.interactor.delete(requireTenantId(tenantHeader), id);
  }

  @Post(':id/sites')
  @HttpCode(201)
  addSite(
    @Headers('x-tenant-id') tenantHeader: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ContractSiteAddBodyDto,
  ): Promise<ContractSiteResponse> {
    return this.interactor.addSite(requireTenantId(tenantHeader), id, body);
  }
}
