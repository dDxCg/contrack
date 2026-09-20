import { Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Query, Body } from '@nestjs/common';
import { ContractBodyDto } from '../../dtos/contracts/contracts.dto';
import { ContractPage, ContractView } from '../../dtos/contracts/contracts.response.dto';
import { PageQueryDto } from '../../dtos/page-query.dto';
import { AccessContext } from '../../services/access-control/access-context';
import { Access, CurrentAccess } from '../../services/access-control/access.decorator';
import { Operation, Resource } from '../../services/access-control/role-resolver';
import { ContractCreateCommand, ContractService } from '../../services/contracts/contract.service';
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractService: ContractService) {}
  @Get()
  @Access(Resource.Contracts, Operation.Read)
  list(
    @CurrentAccess()
    access: AccessContext,
    @Query()
    query: PageQueryDto,
  ): Promise<ContractPage> {
    return this.contractService.list(access, { limit: query.limit, offset: query.offset });
  }
  @Post()
  @HttpCode(201)
  @Access(Resource.Contracts, Operation.Create)
  create(
    @CurrentAccess()
    access: AccessContext,
    @Body()
    body: ContractBodyDto,
  ): Promise<ContractView> {
    return this.contractService.create(access, toCommand(body));
  }
  @Get(':id')
  @Access(Resource.Contracts, Operation.Read)
  get(
    @CurrentAccess()
    access: AccessContext,
    @Param('id', ParseIntPipe)
    id: number,
  ): Promise<ContractView> {
    return this.contractService.get(access, id);
  }
  @Delete(':id')
  @HttpCode(204)
  @Access(Resource.Contracts, Operation.Delete)
  delete(
    @CurrentAccess()
    access: AccessContext,
    @Param('id', ParseIntPipe)
    id: number,
  ): Promise<void> {
    return this.contractService.delete(access, id);
  }
}
const DEFAULT_GEOFENCE_RADIUS_METERS = 200;
function toCommand(body: ContractBodyDto): ContractCreateCommand {
  return {
    customerId: body.customer_id,
    signedAt: new Date(body.signed_at),
    expiresAt: new Date(body.expires_at),
    sites: body.sites.map((site) => ({
      name: site.name,
      workRequirements: site.work_requirements ?? null,
      notes: site.notes ?? null,
      latitude: site.latitude ?? null,
      longitude: site.longitude ?? null,
      radiusMeters: site.radius_meters ?? DEFAULT_GEOFENCE_RADIUS_METERS,
      items: site.items.map((item) => ({
        name: item.name,
        frequencyCount: item.frequency_count,
        frequencyUnit: item.frequency_unit,
        frequencyRule: item.frequency_rule ?? null,
        dayOfWeek: item.day_of_week ?? null,
        dayOfMonth: item.day_of_month ?? null,
        unitPrice: item.unit_price,
      })),
    })),
  };
}
