import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { GenerateService } from "./generate.service";

type CreateGenerationJobDto = {
  patternId?: string;
  platform?: "xiaohongshu";
  topic?: string;
  goal?: string;
  tone?: string;
  targetAudience?: string;
};

@Controller("generate")
export class GenerateController {
  constructor(private readonly generateService: GenerateService) {}

  @Post("jobs")
  createJob(@Body() body: CreateGenerationJobDto) {
    return this.generateService.createJob(body);
  }

  @Get("jobs/:jobId")
  getJob(@Param("jobId") jobId: string) {
    return this.generateService.getJob(jobId);
  }

  @Get("contents/:contentId")
  getContent(@Param("contentId") contentId: string) {
    return this.generateService.getContent(contentId);
  }
}
