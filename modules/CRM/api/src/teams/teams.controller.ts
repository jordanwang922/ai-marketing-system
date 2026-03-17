import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UnauthorizedException } from "@nestjs/common";
import { TeamsService } from "./teams.service";
import { CreateTeamDto } from "./dto/create-team.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";

@Controller("teams")
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  list(@Req() req: any) {
    return this.teams.list({ brandId: req.user.brandId });
  }

  @Get(":id")
  get(@Param("id") id: string, @Req() req: any) {
    return this.teams.get({ id, brandId: req.user.brandId });
  }

  @Post()
  create(@Body() body: CreateTeamDto, @Req() req: any) {
    if (req.user.role !== "manager") {
      throw new UnauthorizedException("Not allowed");
    }
    return this.teams.create({ ...body, brandId: req.user.brandId });
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: UpdateTeamDto, @Req() req: any) {
    if (req.user.role !== "manager") {
      throw new UnauthorizedException("Not allowed");
    }
    return this.teams.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: any) {
    if (req.user.role !== "manager") {
      throw new UnauthorizedException("Not allowed");
    }
    return this.teams.remove(id);
  }
}
