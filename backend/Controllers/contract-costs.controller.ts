import { Body, Controller, Get, Param, ParseIntPipe, Put, Query } from '@nestjs/common';
import {
  ContractCostQueryDto,
  ProfitabilityQueryDto,
  UpsertContractCostBodyDto,
} from '../DTOs/contract-costs.dto';
import { AccessContext } from '../Services/AccessControl/access-context';
import { Access, CurrentAccess } from '../Services/AccessControl/access.decorator';
import { Operation, Resource } from '../Services/AccessControl/role-resolver';
import { ContractCostService, ContractCostView } from '../Services/contract-cost.service';
import {
  ContractProfitabilityService,
  ContractProfitMonthView,
} from '../Services/contract-profitability.service';

@Controller('contracts/:id')
export class ContractCostsController {
  constructor(
    private readonly contractCostService: ContractCostService,
    private readonly contractProfitabilityService: ContractProfitabilityService,
  ) {}

  @Get('costs')
  @Access(Resource.ContractCosts, Operation.Read)
  async listCosts(
    @CurrentAccess() access: AccessContext,
    @Param('id', ParseIntPipe) contractId: number,
    @Query() query: ContractCostQueryDto,
  ): Promise<{ items: ContractCostView[] }> {
    const period = query.period === undefined ? undefined : new Date(query.period);

    return { items: await this.contractCostService.list(access, contractId, period) };
  }

  @Put('costs')
  @Access(Resource.ContractCosts, Operation.Update)
  upsertCost(
    @CurrentAccess() access: AccessContext,
    @Param('id', ParseIntPipe) contractId: number,
    @Body() body: UpsertContractCostBodyDto,
  ): Promise<ContractCostView> {
    return this.contractCostService.upsert(access, contractId, {
      category: body.category,
      period: new Date(body.period),
      amount: body.amount,
    });
  }

  @Get('profitability')
  @Access(Resource.ContractCosts, Operation.Read)
  async profitability(
    @CurrentAccess() access: AccessContext,
    @Param('id', ParseIntPipe) contractId: number,
    @Query() query: ProfitabilityQueryDto,
  ): Promise<{ items: ContractProfitMonthView[] }> {
    return { items: await this.contractProfitabilityService.get(access, contractId, query.months) };
  }
}
