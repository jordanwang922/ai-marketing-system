import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { LeadsService } from "./leads.service";
import { CreateLeadDto } from "./dto/create-lead.dto";
import { UpdateLeadDto } from "./dto/update-lead.dto";
import { MergeLeadDto } from "./dto/merge-lead.dto";
import { AssignLeadDto } from "./dto/assign-lead.dto";
import { AiEvalDto } from "./dto/ai-eval.dto";
import { LeadFormDto } from "./dto/lead-form.dto";
import { CreateActivityDto } from "./dto/create-activity.dto";

@Controller("leads")
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  list(@Req() req: any) {
    return this.leads.listForUser(req.user);
  }

  @Get(":id")
  get(@Param("id") id: string, @Req() req: any) {
    return this.leads.getForUser(id, req.user);
  }

  @Post()
  create(@Body() body: CreateLeadDto, @Req() req: any) {
    return this.leads.create(body, req.user);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: UpdateLeadDto, @Req() req: any) {
    return this.leads.update(id, body, req.user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: any) {
    return this.leads.remove(id, req.user);
  }

  @Post(":id/assign")
  assign(@Param("id") id: string, @Body() body: AssignLeadDto, @Req() req: any) {
    return this.leads.assign(id, body.ownerId, req.user);
  }

  @Post(":id/ai-eval")
  aiEval(@Param("id") id: string, @Body() body: AiEvalDto, @Req() req: any) {
    return this.leads.aiEval(id, body, req.user);
  }

  @Post(":id/ai-eval-start")
  aiEvalStart(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    return this.leads.aiEvalStart(id, body ?? {}, req.user);
  }

  @Get(":id/activities")
  activities(@Param("id") id: string, @Req() req: any) {
    return this.leads.listActivities(id, req.user);
  }

  @Post(":id/activities")
  createActivity(@Param("id") id: string, @Body() body: CreateActivityDto, @Req() req: any) {
    return this.leads.createActivity(id, body, req.user);
  }

  @Post("form")
  fromForm(@Body() body: LeadFormDto) {
    return this.leads.create(
      {
        brandId: body.brandId,
        companyName: body.companyName,
        companyNameEn: body.companyNameEn,
        name: body.name,
        email: body.email,
        phone: body.phone,
        notes: body.notes ?? body.requirement ?? null,
        status: "New",
        ownerId: null,
      },
      { id: "form", role: "member", brandId: body.brandId, teamId: null }
    );
  }

  @Post("merge")
  merge(@Body() body: MergeLeadDto, @Req() req: any) {
    return this.leads.mergeByCompany(body.companyName, req.user);
  }
}
