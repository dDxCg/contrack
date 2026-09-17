import { Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Query, Body } from '@nestjs/common';
import { ContractBodyDto } from '../DTOs/contracts.dto';
import { PageQueryDto } from '../DTOs/page-query.dto';
import { AccessContext } from '../Services/AccessControl/access-context';
import { Access, CurrentAccess } from '../Services/AccessControl/access.decorator';
import { Operation, Resource } from '../Services/AccessControl/role-resolver';
import {
  ContractCreateCommand,
  ContractPage,
  ContractService,
  ContractView,
} from '../Services/contract.service';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractService: ContractService) {}

  @Get()
  @Access(Resource.Contracts, Operation.Read)
  list(@CurrentAccess() access: AccessContext, @Query() query: PageQueryDto): Promise<ContractPage> {
    return this.contractService.list(access, { limit: query.limit, offset: query.offset });
  }

  @Post()
  @HttpCode(201)
  @Access(Resource.Contracts, Operation.Create)
  create(@CurrentAccess() access: AccessContext, @Body() body: ContractBodyDto): Promise<ContractView> {
    return this.contractService.create(access, toCommand(body));
  }

  @Get(':id')
  @Access(Resource.Contracts, Operation.Read)
  get(@CurrentAccess() access: AccessContext, @Param('id', ParseIntPipe) id: number): Promise<ContractView> {
    return this.contractService.get(access, id);
  }

  @Delete(':id')
  @HttpCode(204)
  @Access(Resource.Contracts, Operation.Delete)
  delete(@CurrentAccess() access: AccessContext, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.contractService.delete(access, id);
  }
}

function toCommand(body: ContractBodyDto): ContractCreateCommand {
  return {
    customerId: body.customer_id,
    signedAt: new Date(body.signed_at),
    expiresAt: new Date(body.expires_at),
    sites: body.sites.map((site) => ({
      name: site.name,
      workRequirements: site.work_requirements ?? null,
      notes: site.notes ?? null,
      items: site.items.map((item) => ({
        name: item.name,
        frequencyCount: item.frequency_count,
        frequencyUnit: item.frequency_unit,
        frequencyRule: item.frequency_rule ?? null,
        unitPrice: item.unit_price,
      })),
    })),
  };
}
