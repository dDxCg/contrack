import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { TenantCreateDto, TenantListQueryDto, TenantStatusDto } from '../../dtos/platform/platform.dto';
import { TenantPage, TenantView } from '../../dtos/platform/platform.response.dto';
import { Access } from '../../services/access-control/access.decorator';
import { Operation, Resource } from '../../services/access-control/role-resolver';
import { TenantService } from '../../services/platform/tenant.service';

@Controller('platform/tenants')
export class TenantsController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  @Access(Resource.Tenants, Operation.Read)
  list(
    @Query()
    query: TenantListQueryDto,
  ): Promise<TenantPage> {
    return this.tenantService.list({ status: query.status, limit: query.limit, offset: query.offset });
  }

  @Post()
  @HttpCode(201)
  @Access(Resource.Tenants, Operation.Create)
  create(
    @Body()
    body: TenantCreateDto,
  ): Promise<TenantView> {
    return this.tenantService.create({
      name: body.name,
      directorEmail: body.director_email,
      directorPassword: body.director_password,
    });
  }

  @Patch(':id')
  @Access(Resource.Tenants, Operation.Update)
  updateStatus(
    @Param('id', ParseIntPipe)
    id: number,
    @Body()
    body: TenantStatusDto,
  ): Promise<TenantView> {
    return this.tenantService.updateStatus(id, body.status);
  }
}
