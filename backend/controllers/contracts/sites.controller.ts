import { Body, Controller, Delete, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ContractItemBodyDto, ContractSiteUpdateBodyDto } from '../../dtos/contracts/contracts.dto';
import { ContractItemView, ContractSiteView } from '../../dtos/contracts/contracts.response.dto';
import { AccessContext } from '../../services/access-control/access-context';
import { Access, CurrentAccess } from '../../services/access-control/access.decorator';
import { Operation, Resource } from '../../services/access-control/role-resolver';
import { ContractService, ContractSiteUpdateCommand } from '../../services/contracts/contract.service';
import { toItemCommand } from './contracts.controller';

@Controller('sites')
export class SitesController {
  constructor(private readonly contractService: ContractService) {}

  @Patch(':id')
  @Access(Resource.Contracts, Operation.Update)
  update(
    @CurrentAccess()
    access: AccessContext,
    @Param('id', ParseIntPipe)
    id: number,
    @Body()
    body: ContractSiteUpdateBodyDto,
  ): Promise<ContractSiteView> {
    return this.contractService.updateSite(access, id, toSiteUpdateCommand(body));
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
    return this.contractService.deleteSite(access, id);
  }

  @Post(':id/items')
  @HttpCode(201)
  @Access(Resource.Contracts, Operation.Create)
  addItem(
    @CurrentAccess()
    access: AccessContext,
    @Param('id', ParseIntPipe)
    id: number,
    @Body()
    body: ContractItemBodyDto,
  ): Promise<ContractItemView> {
    return this.contractService.addItem(access, id, toItemCommand(body));
  }
}

const DEFAULT_GEOFENCE_RADIUS_METERS = 200;

function toSiteUpdateCommand(body: ContractSiteUpdateBodyDto): ContractSiteUpdateCommand {
  return {
    name: body.name,
    workRequirements: body.work_requirements ?? null,
    notes: body.notes ?? null,
    latitude: body.latitude ?? null,
    longitude: body.longitude ?? null,
    radiusMeters: body.radius_meters ?? DEFAULT_GEOFENCE_RADIUS_METERS,
  };
}
