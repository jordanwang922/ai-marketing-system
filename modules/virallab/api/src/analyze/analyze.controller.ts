import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { AnalyzeService } from "./analyze.service";

@Controller("analyze")
export class AnalyzeController {
  constructor(private readonly analyzeService: AnalyzeService) {}

  @Post("jobs")
  createAnalyzeJob(@Body() body: { sampleIds?: string[]; forceReanalyze?: boolean }) {
    return this.analyzeService.createJob(body.sampleIds || [], {
      forceReanalyze: body.forceReanalyze === true,
    });
  }

  @Get("results")
  listResults() {
    return this.analyzeService.list();
  }

  @Get("results/:analysisId")
  getResult(@Param("analysisId") analysisId: string) {
    return this.analyzeService.getOne(analysisId);
  }
}
