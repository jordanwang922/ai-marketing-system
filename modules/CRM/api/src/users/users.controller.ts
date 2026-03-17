import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Req() req: any, @Query("teamId") teamId?: string) {
    return this.users.list({ brandId: req.user.brandId, teamId });
  }

  @Get(":id")
  get(@Param("id") id: string, @Req() req: any) {
    return this.users.get({ id, brandId: req.user.brandId });
  }

  @Post()
  create(@Body() body: CreateUserDto, @Req() req: any) {
    if (req.user.role !== "manager") {
      throw new UnauthorizedException("Not allowed");
    }
    return this.users.create({ ...body, brandId: req.user.brandId });
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: UpdateUserDto, @Req() req: any) {
    if (req.user.role !== "manager" && req.user.id !== id) {
      throw new UnauthorizedException("Not allowed");
    }
    return this.users.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: any) {
    if (req.user.role !== "manager") {
      throw new UnauthorizedException("Not allowed");
    }
    return this.users.remove(id, req.user.brandId);
  }
}
