import { Module } from "@nestjs/common";
import { AnalyzeController } from "./analyze.controller";
import { AnalyzeService } from "./analyze.service";
import { ViralLabStoreService } from "../store/store.service";
import { ViralLabLlmService } from "../llm/llm.service";

@Module({
  controllers: [AnalyzeController],
  providers: [AnalyzeService, ViralLabStoreService, ViralLabLlmService],
  exports: [AnalyzeService],
})
export class AnalyzeModule {}
