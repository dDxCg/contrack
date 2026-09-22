import { Body, Controller, Delete, Headers, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { SitesController as SitesInteractor } from '../../interface-adapters/controllers/sites.controller';
import { ContractItemResponse, ContractSiteResponse } from '../../interface-adapters/presenters/contract.presenter';
import { ContractItemBodyDto, ContractSiteUpdateBodyDto } from './dto/contract.dto';
import { requireTenantId } from './tenant-header';

@Controller('sites')
export class SitesController {
  constructor(private readonly interactor: SitesInteractor) {}

  @Patch(':id')
  update(
    @Headers('x-tenant-id') tenantHeader: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ContractSiteUpdateBodyDto,
  ): Promise<ContractSiteResponse> {
    return this.interactor.update(requireTenantId(tenantHeader), id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@Headers('x-tenant-id') tenantHeader: string, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.interactor.delete(requireTenantId(tenantHeader), id);
  }

  @Post(':id/items')
  @HttpCode(201)
  addItem(
    @Headers('x-tenant-id') tenantHeader: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ContractItemBodyDto,
  ): Promise<ContractItemResponse> {
    return this.interactor.addItem(requireTenantId(tenantHeader), id, body);
  }
}
