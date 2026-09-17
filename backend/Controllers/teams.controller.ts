import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { AccessContext } from '../Services/AccessControl/access-context';
import { Access, CurrentAccess } from '../Services/AccessControl/access.decorator';
import { Operation, Resource } from '../Services/AccessControl/role-resolver';
import { TeamPage, TeamService, TeamView } from '../Services/team.service';
import { TeamCreateDto, TeamUpdateDto } from '../DTOs/teams.dto';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  @Access(Resource.Teams, Operation.Read)
  list(@CurrentAccess() access: AccessContext): Promise<TeamPage> {
    return this.teamService.list(access);
  }

  @Post()
  @HttpCode(201)
  @Access(Resource.Teams, Operation.Create)
  create(@CurrentAccess() access: AccessContext, @Body() body: TeamCreateDto): Promise<TeamView> {
    return this.teamService.create(access, { name: body.name, code: body.code });
  }

  @Get(':id')
  @Access(Resource.Teams, Operation.Read)
  get(@CurrentAccess() access: AccessContext, @Param('id', ParseIntPipe) id: number): Promise<TeamView> {
    return this.teamService.get(access, id);
  }

  @Patch(':id')
  @Access(Resource.Teams, Operation.Update)
  update(
    @CurrentAccess() access: AccessContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: TeamUpdateDto,
  ): Promise<TeamView> {
    return this.teamService.update(access, id, { name: body.name, code: body.code });
  }

  @Delete(':id')
  @HttpCode(204)
  @Access(Resource.Teams, Operation.Delete)
  delete(@CurrentAccess() access: AccessContext, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.teamService.delete(access, id);
  }
}
