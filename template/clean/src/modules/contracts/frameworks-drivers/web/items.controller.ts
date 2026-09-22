import { Body, Controller, Delete, Headers, HttpCode, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ItemsController as ItemsInteractor } from '../../interface-adapters/controllers/items.controller';
import { ContractItemResponse } from '../../interface-adapters/presenters/contract.presenter';
import { ContractItemBodyDto } from './dto/contract.dto';
import { requireTenantId } from './tenant-header';

@Controller('items')
export class ItemsController {
  constructor(private readonly interactor: ItemsInteractor) {}

  @Patch(':id')
  update(
    @Headers('x-tenant-id') tenantHeader: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ContractItemBodyDto,
  ): Promise<ContractItemResponse> {
    return this.interactor.update(requireTenantId(tenantHeader), id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@Headers('x-tenant-id') tenantHeader: string, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.interactor.delete(requireTenantId(tenantHeader), id);
  }
}
