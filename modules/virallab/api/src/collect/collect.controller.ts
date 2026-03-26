import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { CollectService } from "./collect.service";
import {
  CollectNoteType,
  CollectPublishWindow,
  CollectSortBy,
  CollectorMode,
  CollectorProviderId,
} from "./collector.types";

type CreateCollectJobDto = {
  platform?: "xiaohongshu";
  keyword?: string;
  sortBy?: CollectSortBy;
  noteType?: CollectNoteType;
  publishWindow?: CollectPublishWindow;
  targetCount?: number;
  collectorMode?: CollectorMode;
  providerId?: CollectorProviderId;
  manualSearchPageUrl?: string;
  manualSearchRequestData?: Record<string, unknown> | null;
};

@Controller("collect")
export class CollectController {
  constructor(private readonly collectService: CollectService) {}

  @Get("jobs")
  listJobs(@Headers("authorization") authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "").trim();
    return this.collectService.listJobs(token);
  }

  @Get("capabilities")
  getCapabilities(@Headers("authorization") authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "").trim();
    return this.collectService.getCapabilities(token);
  }

  @Get("debug-summary")
  getDebugSummary(@Headers("authorization") authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "").trim();
    return this.collectService.getDebugSummary(token);
  }

  @Post("jobs")
  createJob(@Body() body: CreateCollectJobDto, @Headers("authorization") authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "").trim();
    return this.collectService.createJob({ ...body, token });
  }

  @Get("jobs/:jobId")
  getJob(@Param("jobId") jobId: string, @Headers("authorization") authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "").trim();
    return this.collectService.getJob(jobId, token);
  }
}
