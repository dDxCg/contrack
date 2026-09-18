import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ComputeStatementBodyDto, StatementListQueryDto } from '../../dtos/statements/statements.dto';
import { StatementPage, StatementView } from '../../dtos/statements/statements.response.dto';
import { AccessContext } from '../../services/access-control/access-context';
import { Access, CurrentAccess } from '../../services/access-control/access.decorator';
import { Operation, Resource } from '../../services/access-control/role-resolver';
import { StatementService } from '../../services/statements/statement.service';
@Controller('statements')
export class StatementsController {
  constructor(private readonly statementService: StatementService) {}
  @Get()
  @Access(Resource.Statements, Operation.Read)
  list(
    @CurrentAccess()
    access: AccessContext,
    @Query()
    query: StatementListQueryDto,
  ): Promise<StatementPage> {
    return this.statementService.list(
      access,
      { period: query.period, status: query.status },
      { limit: query.limit, offset: query.offset },
    );
  }
  @Post()
  @HttpCode(201)
  @Access(Resource.Statements, Operation.Create)
  compute(
    @CurrentAccess()
    access: AccessContext,
    @Body()
    body: ComputeStatementBodyDto,
  ): Promise<StatementView> {
    return this.statementService.compute(access, {
      contractId: body.contract_id,
      period: new Date(body.period),
    });
  }
  @Get(':id')
  @Access(Resource.Statements, Operation.Read)
  get(
    @CurrentAccess()
    access: AccessContext,
    @Param('id', ParseIntPipe)
    id: number,
  ): Promise<StatementView> {
    return this.statementService.get(access, id);
  }
  @Post(':id/export')
  @HttpCode(202)
  @Access(Resource.Statements, Operation.Update)
  async export(
    @CurrentAccess()
    access: AccessContext,
    @Param('id', ParseIntPipe)
    id: number,
  ): Promise<{
    job_id: string;
  }> {
    const { jobId } = await this.statementService.export(access, id);
    return { job_id: jobId };
  }
  @Post(':id/send')
  @HttpCode(200)
  @Access(Resource.Statements, Operation.Update)
  send(
    @CurrentAccess()
    access: AccessContext,
    @Param('id', ParseIntPipe)
    id: number,
  ): Promise<StatementView> {
    return this.statementService.send(access, id);
  }
}
