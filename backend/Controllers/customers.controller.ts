import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { AccessContext } from '../Services/AccessControl/access-context';
import { Access, CurrentAccess } from '../Services/AccessControl/access.decorator';
import { Operation, Resource } from '../Services/AccessControl/role-resolver';
import { CustomerCommand, CustomerPage, CustomerService, CustomerView } from '../Services/customer.service';
import { CustomerBodyDto } from './customers.dto';
import { PageQueryDto } from './page-query.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @Access(Resource.Customers, Operation.Read)
  list(@CurrentAccess() access: AccessContext, @Query() query: PageQueryDto): Promise<CustomerPage> {
    return this.customerService.list(access, { limit: query.limit, offset: query.offset });
  }

  @Post()
  @HttpCode(201)
  @Access(Resource.Customers, Operation.Create)
  create(@CurrentAccess() access: AccessContext, @Body() body: CustomerBodyDto): Promise<CustomerView> {
    return this.customerService.create(access, toCommand(body));
  }

  @Get(':id')
  @Access(Resource.Customers, Operation.Read)
  get(@CurrentAccess() access: AccessContext, @Param('id', ParseIntPipe) id: number): Promise<CustomerView> {
    return this.customerService.get(access, id);
  }

  @Patch(':id')
  @Access(Resource.Customers, Operation.Update)
  update(
    @CurrentAccess() access: AccessContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CustomerBodyDto,
  ): Promise<CustomerView> {
    return this.customerService.update(access, id, toCommand(body));
  }

  @Delete(':id')
  @HttpCode(204)
  @Access(Resource.Customers, Operation.Delete)
  delete(@CurrentAccess() access: AccessContext, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.customerService.delete(access, id);
  }
}

function toCommand(body: CustomerBodyDto): CustomerCommand {
  return {
    name: body.name,
    companyName: body.company_name ?? null,
    contact: body.contact ?? null,
    address: body.address ?? null,
    segment: body.segment,
  };
}
