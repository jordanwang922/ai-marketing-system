import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { WorkflowService } from "./workflow.service";
import { CollectorProviderId } from "../collect/collector.types";

@Controller("workflow")
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get("jobs")
  listJobs() {
    return this.workflowService.listJobs();
  }

  @Get("jobs/:workflowJobId")
  getJob(@Param("workflowJobId") workflowJobId: string) {
    return this.workflowService.getJob(workflowJobId);
  }

  @Post("jobs")
  createLatestRealPipelineJob(
    @Body()
    body: {
      jobId?: string;
      providerId?: CollectorProviderId;
      sampleLimit?: number;
      forceReanalyze?: boolean;
      goal?: string;
      tone?: string;
      targetAudience?: string;
    },
  ) {
    return this.workflowService.createLatestRealPipelineJob(body || {});
  }

  @Post("jobs/rerun-latest")
  rerunLatestWorkflowJob() {
    return this.workflowService.rerunLatestWorkflowJob();
  }

  @Post("latest-real-pipeline")
  runLatestRealPipeline(
    @Body()
    body: {
      jobId?: string;
      providerId?: CollectorProviderId;
      sampleLimit?: number;
      forceReanalyze?: boolean;
      goal?: string;
      tone?: string;
      targetAudience?: string;
    },
  ) {
    return this.workflowService.runLatestRealPipeline(body || {});
  }
}
