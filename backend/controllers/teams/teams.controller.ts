import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { AccessContext } from '../../services/access-control/access-context';
import { Access, CurrentAccess } from '../../services/access-control/access.decorator';
import { Operation, Resource } from '../../services/access-control/role-resolver';
import { TeamService } from '../../services/teams/team.service';
import { TeamCreateDto, TeamUpdateDto } from '../../dtos/teams/teams.dto';
import { TeamPage, TeamView } from '../../dtos/teams/teams.response.dto';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  @Access(Resource.Teams, Operation.Read)
  list(
    @CurrentAccess()
    access: AccessContext,
  ): Promise<TeamPage> {
    return this.teamService.list(access);
  }

  @Post()
  @HttpCode(201)
  @Access(Resource.Teams, Operation.Create)
  create(
    @CurrentAccess()
    access: AccessContext,
    @Body()
    body: TeamCreateDto,
  ): Promise<TeamView> {
    return this.teamService.create(access, { name: body.name, code: body.code });
  }

  @Get(':id')
  @Access(Resource.Teams, Operation.Read)
  get(
    @CurrentAccess()
    access: AccessContext,
    @Param('id', ParseIntPipe)
    id: number,
  ): Promise<TeamView> {
    return this.teamService.get(access, id);
  }

  @Patch(':id')
  @Access(Resource.Teams, Operation.Update)
  update(
    @CurrentAccess()
    access: AccessContext,
    @Param('id', ParseIntPipe)
    id: number,
    @Body()
    body: TeamUpdateDto,
  ): Promise<TeamView> {
    return this.teamService.update(access, id, { name: body.name, code: body.code });
  }

  @Delete(':id')
  @HttpCode(204)
  @Access(Resource.Teams, Operation.Delete)
  delete(
    @CurrentAccess()
    access: AccessContext,
    @Param('id', ParseIntPipe)
    id: number,
  ): Promise<void> {
    return this.teamService.delete(access, id);
  }
}
