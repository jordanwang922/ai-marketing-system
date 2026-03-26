import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { PatternsService } from "./patterns.service";

@Controller("patterns")
export class PatternsController {
  constructor(private readonly patternsService: PatternsService) {}

  @Get()
  listPatterns() {
    return this.patternsService.list();
  }

  @Post("extract")
  extract(@Body() body: { analysisIds?: string[] }) {
    return this.patternsService.extract(body.analysisIds || []);
  }

  @Get(":patternId")
  getPattern(@Param("patternId") patternId: string) {
    return this.patternsService.getOne(patternId);
  }
}
