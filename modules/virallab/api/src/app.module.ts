import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { OverviewModule } from "./overview/overview.module";
import { AuthModule } from "./auth/auth.module";
import { CollectModule } from "./collect/collect.module";
import { SamplesModule } from "./samples/samples.module";
import { AnalyzeModule } from "./analyze/analyze.module";
import { PatternsModule } from "./patterns/patterns.module";
import { GenerateModule } from "./generate/generate.module";
import { PlatformModule } from "./platform/platform.module";
import { DatabaseModule } from "./database/database.module";
import { WorkflowModule } from "./workflow/workflow.module";

@Module({
  imports: [DatabaseModule, HealthModule, OverviewModule, AuthModule, PlatformModule, CollectModule, SamplesModule, AnalyzeModule, PatternsModule, GenerateModule, WorkflowModule],
})
export class AppModule {}
