import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AccessContext } from '../../services/access-control/access-context';
import { Access, CurrentAccess } from '../../services/access-control/access.decorator';
import { Operation, Resource } from '../../services/access-control/role-resolver';
import { EmployeeCommand, EmployeeService } from '../../services/employees/employee.service';
import { EmployeeBodyDto } from '../../dtos/employees/employees.dto';
import { EmployeePage, EmployeeView } from '../../dtos/employees/employees.response.dto';
import { PageQueryDto } from '../../dtos/page-query.dto';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get()
  @Access(Resource.Employees, Operation.Read)
  list(
    @CurrentAccess()
    access: AccessContext,
    @Query()
    query: PageQueryDto,
  ): Promise<EmployeePage> {
    return this.employeeService.list(access, { limit: query.limit, offset: query.offset });
  }

  @Post()
  @HttpCode(201)
  @Access(Resource.Employees, Operation.Create)
  create(
    @CurrentAccess()
    access: AccessContext,
    @Body()
    body: EmployeeBodyDto,
  ): Promise<EmployeeView> {
    return this.employeeService.create(access, toCommand(body));
  }

  @Get(':id')
  @Access(Resource.Employees, Operation.Read)
  get(
    @CurrentAccess()
    access: AccessContext,
    @Param('id', ParseIntPipe)
    id: number,
  ): Promise<EmployeeView> {
    return this.employeeService.get(access, id);
  }

  @Patch(':id')
  @Access(Resource.Employees, Operation.Update)
  update(
    @CurrentAccess()
    access: AccessContext,
    @Param('id', ParseIntPipe)
    id: number,
    @Body()
    body: EmployeeBodyDto,
  ): Promise<EmployeeView> {
    return this.employeeService.update(access, id, toCommand(body));
  }

  @Delete(':id')
  @Access(Resource.Employees, Operation.Delete)
  deactivate(
    @CurrentAccess()
    access: AccessContext,
    @Param('id', ParseIntPipe)
    id: number,
  ): Promise<EmployeeView> {
    return this.employeeService.deactivate(access, id);
  }
}

function toCommand(body: EmployeeBodyDto): EmployeeCommand {
  return {
    name: body.name,
    contact: body.contact ?? null,
    email: body.email,
    password: body.password,
    role: body.role,
    managerId: body.manager_id ?? null,
    teamId: body.team_id ?? null,
    status: body.status,
  };
}
