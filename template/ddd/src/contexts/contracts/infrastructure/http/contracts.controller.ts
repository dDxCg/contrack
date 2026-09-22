import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AddContractItemUseCase } from '../../application/use-cases/add-contract-item.use-case';
import { AddContractSiteUseCase } from '../../application/use-cases/add-contract-site.use-case';
import { CreateContractUseCase } from '../../application/use-cases/create-contract.use-case';
import { DeleteContractUseCase } from '../../application/use-cases/delete-contract.use-case';
import { GenerateScheduleUseCase } from '../../application/use-cases/generate-schedule.use-case';
import { GetContractDetailUseCase } from '../../application/use-cases/get-contract-detail.use-case';
import { ListContractsUseCase } from '../../application/use-cases/list-contracts.use-case';
import { UpdateContractItemUseCase } from '../../application/use-cases/update-contract-item.use-case';
import { UpdateContractUseCase } from '../../application/use-cases/update-contract.use-case';
import {
  ContractBodyDto,
  ContractItemBodyDto,
  ContractSiteAddBodyDto,
  ContractUpdateBodyDto,
} from './dto/contract-request.dto';
import { PageQueryDto } from './dto/page-query.dto';
import {
  toContractPageResponse,
  toContractResponse,
  toCreateContractSites,
  toItemInput,
  toItemResponse,
  toScheduleResponse,
  toSiteInput,
  toSiteResponse,
} from './contracts.http-mapper';
import {
  ContractItemResponse,
  ContractPageResponse,
  ContractResponse,
  ContractSiteResponse,
  ScheduledItemDatesResponse,
} from './dto/contract-response.dto';

/**
 * ContractsController — infrastructure/http adapter.
 *
 * Translates HTTP <-> use-case calls only; all behaviour lives in
 * application/use-cases. Endpoints are a faithful-but-consolidated subset
 * of the three original controllers (contracts.controller.ts,
 * sites.controller.ts, items.controller.ts): everything the use-cases in
 * application/use-cases/ expose is reachable here, collapsed onto one
 * controller since this reference port only has one bounded context.
 *
 * Deliberately stubbed out: access control. The original controllers use
 * `@Access(Resource, Operation)` + `@CurrentAccess()` backed by an
 * AccessControlGuard/AccessContext that resolves the caller's tenant and
 * role from a JWT — that is the access-control bounded context's job, not
 * the contracts context's, and it is out of scope for this port. Here the
 * tenant is read directly from an `x-tenant-id` header as a stand-in, and
 * there is no role/permission check at all. A real deployment would sit
 * this controller behind the same kind of guard the original app uses.
 */
@Controller('contracts')
export class ContractsController {
  constructor(
    private readonly createContract: CreateContractUseCase,
    private readonly listContracts: ListContractsUseCase,
    private readonly getContractDetail: GetContractDetailUseCase,
    private readonly updateContract: UpdateContractUseCase,
    private readonly deleteContract: DeleteContractUseCase,
    private readonly addContractSite: AddContractSiteUseCase,
    private readonly addContractItem: AddContractItemUseCase,
    private readonly updateContractItem: UpdateContractItemUseCase,
    private readonly generateSchedule: GenerateScheduleUseCase,
  ) {}

  @Get()
  async list(
    @Headers('x-tenant-id') tenantIdHeader: string,
    @Query() query: PageQueryDto,
  ): Promise<ContractPageResponse> {
    const page = await this.listContracts.execute(tenantId(tenantIdHeader), {
      limit: query.limit,
      offset: query.offset,
    });
    return toContractPageResponse(page);
  }

  @Post()
  @HttpCode(201)
  async create(
    @Headers('x-tenant-id') tenantIdHeader: string,
    @Body() body: ContractBodyDto,
  ): Promise<ContractResponse> {
    const view = await this.createContract.execute({
      tenantId: tenantId(tenantIdHeader),
      customerId: body.customer_id,
      signedAt: new Date(body.signed_at),
      expiresAt: new Date(body.expires_at),
      sites: toCreateContractSites(body),
    });
    return toContractResponse(view);
  }

  @Get(':id')
  async get(
    @Headers('x-tenant-id') tenantIdHeader: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ContractResponse> {
    const view = await this.getContractDetail.execute(tenantId(tenantIdHeader), id);
    return toContractResponse(view);
  }

  @Patch(':id')
  async update(
    @Headers('x-tenant-id') tenantIdHeader: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ContractUpdateBodyDto,
  ): Promise<ContractResponse> {
    const view = await this.updateContract.execute({
      tenantId: tenantId(tenantIdHeader),
      contractId: id,
      expiresAt: body.expires_at === undefined ? undefined : new Date(body.expires_at),
      status: body.status,
    });
    return toContractResponse(view);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(
    @Headers('x-tenant-id') tenantIdHeader: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.deleteContract.execute(tenantId(tenantIdHeader), id);
  }

  @Post(':id/sites')
  @HttpCode(201)
  async addSite(
    @Headers('x-tenant-id') tenantIdHeader: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ContractSiteAddBodyDto,
  ): Promise<ContractSiteResponse> {
    const view = await this.addContractSite.execute({
      tenantId: tenantId(tenantIdHeader),
      contractId: id,
      site: toSiteInput(body),
    });
    return toSiteResponse(view);
  }

  @Post(':id/sites/:siteId/items')
  @HttpCode(201)
  async addItem(
    @Headers('x-tenant-id') tenantIdHeader: string,
    @Param('id', ParseIntPipe) id: number,
    @Param('siteId', ParseIntPipe) siteId: number,
    @Body() body: ContractItemBodyDto,
  ): Promise<ContractItemResponse> {
    const view = await this.addContractItem.execute({
      tenantId: tenantId(tenantIdHeader),
      contractId: id,
      siteId,
      item: toItemInput(body),
    });
    return toItemResponse(view);
  }

  @Patch(':id/items/:itemId')
  async updateItem(
    @Headers('x-tenant-id') tenantIdHeader: string,
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() body: ContractItemBodyDto,
  ): Promise<ContractItemResponse> {
    const view = await this.updateContractItem.execute({
      tenantId: tenantId(tenantIdHeader),
      contractId: id,
      itemId,
      item: toItemInput(body),
    });
    return toItemResponse(view);
  }

  @Get(':id/schedule')
  async schedule(
    @Headers('x-tenant-id') tenantIdHeader: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ScheduledItemDatesResponse[]> {
    const entries = await this.generateSchedule.execute(tenantId(tenantIdHeader), id);
    return toScheduleResponse(entries);
  }
}

function tenantId(header: string | undefined): number {
  const value = Number(header);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error('Missing or invalid x-tenant-id header');
  }
  return value;
}
