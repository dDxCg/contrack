import { Body, Controller, Delete, HttpCode, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ContractItemBodyDto } from '../../dtos/contracts/contracts.dto';
import { ContractItemView } from '../../dtos/contracts/contracts.response.dto';
import { AccessContext } from '../../services/access-control/access-context';
import { Access, CurrentAccess } from '../../services/access-control/access.decorator';
import { Operation, Resource } from '../../services/access-control/role-resolver';
import { ContractService } from '../../services/contracts/contract.service';
import { toItemCommand } from './contracts.controller';

@Controller('items')
export class ItemsController {
  constructor(private readonly contractService: ContractService) {}

  @Patch(':id')
  @Access(Resource.Contracts, Operation.Update)
  update(
    @CurrentAccess()
    access: AccessContext,
    @Param('id', ParseIntPipe)
    id: number,
    @Body()
    body: ContractItemBodyDto,
  ): Promise<ContractItemView> {
    return this.contractService.updateItem(access, id, toItemCommand(body));
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
    return this.contractService.deleteItem(access, id);
  }
}
