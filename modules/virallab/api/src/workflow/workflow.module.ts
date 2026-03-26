import { Module } from "@nestjs/common";
import { AnalyzeModule } from "../analyze/analyze.module";
import { GenerateModule } from "../generate/generate.module";
import { PatternsModule } from "../patterns/patterns.module";
import { ViralLabStoreService } from "../store/store.service";
import { WorkflowController } from "./workflow.controller";
import { WorkflowService } from "./workflow.service";

@Module({
  imports: [AnalyzeModule, PatternsModule, GenerateModule],
  controllers: [WorkflowController],
  providers: [WorkflowService, ViralLabStoreService],
})
export class WorkflowModule {}
