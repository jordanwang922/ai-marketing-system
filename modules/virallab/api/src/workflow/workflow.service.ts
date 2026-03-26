import { Injectable, OnModuleInit } from "@nestjs/common";
import { AnalyzeService } from "../analyze/analyze.service";
import { GenerateService } from "../generate/generate.service";
import { PatternsService } from "../patterns/patterns.service";
import { PrismaService } from "../prisma.service";
import { ViralLabStoreService } from "../store/store.service";
import { ViralLabCollectionJob, ViralLabWorkflowJob } from "../store/types";
import { CollectSortBy, CollectorProviderId } from "../collect/collector.types";
import { computeSampleQuality, parseJsonArray } from "../samples/sample-quality";

const toSortableTime = (value: unknown) => {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

type WorkflowRequest = {
  jobId?: string;
  providerId?: CollectorProviderId;
  sampleLimit?: number;
  forceReanalyze?: boolean;
  goal?: string;
  tone?: string;
  targetAudience?: string;
};

type WorkflowProgressUpdate = {
  progress: number;
  message: string;
  stage:
    | "queued"
    | "preparing"
    | "analyzing"
    | "analysis_completed"
    | "pattern_inputs_ready"
    | "extracting_pattern"
    | "pattern_completed"
    | "pattern_persisted"
    | "generating"
    | "generation_completed"
    | "completed"
    | "failed";
  sampleIds?: string[];
  analysisIds?: string[];
  patternId?: string | null;
  contentId?: string | null;
};

type WorkflowSourceJob = {
  id: string;
  userId: string;
  platform: "xiaohongshu";
  keyword: string;
  sortBy: CollectSortBy;
  collectorMode: "mock" | "real";
  targetCount: number;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

type HydratedWorkflowResult = {
  success: boolean;
  message?: string;
  job?: WorkflowSourceJob | null;
  samples?: Array<{
    id: string;
    title: string;
    keyword: string;
    likeCount: number;
    qualityScore: number;
  }>;
  analyses?: Array<{
    id: string;
    sampleId: string;
    userId: string;
    hookType: string;
    structureType: string;
    summary: string;
    modelName: string;
    promptVersion: string;
    fallbackStatus: string;
    fallbackReason: string | null;
  }>;
  pattern?: {
    id: string;
    name: string;
    topic: string;
    description: string;
    sourceSampleIds: string[];
    confidenceScore: number;
    modelName: string;
    promptVersion: string;
    fallbackStatus: string;
    fallbackReason: string | null;
  } | null;
  generated?: {
    id: string;
    titleCandidates: string[];
    bodyText: string;
    coverCopy: string;
    tags: string[];
    generationNotes: string;
    modelName: string;
    promptVersion: string;
    fallbackStatus: string;
    fallbackReason: string | null;
  } | null;
  diagnostics?: {
    averageSampleQuality: number | null;
    topSampleQuality: number | null;
    llmAnalysisCount: number;
    fallbackAnalysisCount: number;
    localAnalysisCount: number;
    patternSource: string | null;
    generationSource: string | null;
    patternConfidence: number | null;
    generatedTitleCount: number;
    generatedTagCount: number;
    workflowVerdict: "strong" | "usable" | "review";
    workflowSummary: string;
  };
  contentId?: string | null;
};

@Injectable()
export class WorkflowService implements OnModuleInit {
  private readonly activeJobs = new Set<string>();

  constructor(
    private readonly analyzeService: AnalyzeService,
    private readonly patternsService: PatternsService,
    private readonly generateService: GenerateService,
    private readonly prisma: PrismaService,
    private readonly store: ViralLabStoreService,
  ) {}

  async onModuleInit() {
    const db = await this.store.read();
    const recoverableJobs = db.workflowJobs.filter((item) => item.status === "pending" || item.status === "running");
    for (const job of recoverableJobs) {
      setTimeout(() => {
        void this.runWorkflowJob(job.id);
      }, 0);
    }
  }

  async createLatestRealPipelineJob(payload: WorkflowRequest = {}) {
    const targetJob = await this.resolveRealJob(payload.jobId);
    if (!targetJob) {
      return {
        success: false,
        jobId: null,
        status: "blocked",
        errorMessage: "No completed real Xiaohongshu collection job is available.",
      };
    }

    const timestamp = this.getTimestamp();
    const workflowJob: ViralLabWorkflowJob = {
      id: this.store.createId("workflow"),
      userId: targetJob.userId,
      workflowType: "latest-real-pipeline",
      status: "pending",
      progress: 0,
      targetJobId: targetJob.id,
      errorMessage: null,
      metadataJson: JSON.stringify({
        sampleLimit: this.clampSampleLimit(payload.sampleLimit),
        providerId: payload.providerId || null,
        forceReanalyze: payload.forceReanalyze !== false,
        goal: payload.goal || `生成一篇围绕 ${targetJob.keyword} 的小红书图文草稿`,
        tone: payload.tone || "专业但通俗",
        targetAudience: payload.targetAudience || "老师、家长和教育赛道创作者",
        stage: "queued",
        message: "Workflow queued.",
      }),
      createdAt: timestamp,
      updatedAt: timestamp,
      finishedAt: null,
    };

    await this.store.mutate((db) => {
      db.workflowJobs.unshift(workflowJob);
      return null;
    });

    setTimeout(() => {
      void this.runWorkflowJob(workflowJob.id);
    }, 0);

    return {
      success: true,
      jobId: workflowJob.id,
      status: workflowJob.status,
      errorMessage: null,
    };
  }

  async rerunLatestWorkflowJob() {
    const db = await this.store.read();
    const latestJob = db.workflowJobs
      .slice()
      .sort((a, b) => toSortableTime(b.createdAt) - toSortableTime(a.createdAt))[0];

    if (!latestJob) {
      return {
        success: false,
        jobId: null,
        status: "blocked",
        errorMessage: "No previous workflow job is available to rerun.",
      };
    }

    const metadata = this.parseJson(latestJob.metadataJson) || {};
    return this.createLatestRealPipelineJob({
      jobId: typeof latestJob.targetJobId === "string" ? latestJob.targetJobId : undefined,
      providerId: typeof metadata.providerId === "string" ? (metadata.providerId as CollectorProviderId) : undefined,
      sampleLimit: this.numberOrUndefined(metadata.sampleLimit),
      forceReanalyze: metadata.forceReanalyze !== false,
      goal: typeof metadata.goal === "string" ? metadata.goal : undefined,
      tone: typeof metadata.tone === "string" ? metadata.tone : undefined,
      targetAudience: typeof metadata.targetAudience === "string" ? metadata.targetAudience : undefined,
    });
  }

  async listJobs() {
    const db = await this.store.read();
    return {
      success: true,
      items: db.workflowJobs
        .slice()
        .sort((a, b) => toSortableTime(b.createdAt) - toSortableTime(a.createdAt))
        .map((item) => this.normalizeWorkflowJob(item)),
    };
  }

  async getJob(workflowJobId: string) {
    const db = await this.store.read();
    const job = db.workflowJobs.find((item) => item.id === workflowJobId) || null;
    return {
      success: true,
      item: job ? this.normalizeWorkflowJob(job) : null,
      result: job ? await this.resolveWorkflowResult(job) : null,
    };
  }

  async runLatestRealPipeline(payload: WorkflowRequest = {}) {
    return this.executeLatestRealPipeline(payload);
  }

  private async runWorkflowJob(workflowJobId: string) {
    if (this.activeJobs.has(workflowJobId)) return;
    this.activeJobs.add(workflowJobId);

    try {
      const job = await this.updateWorkflowJob(workflowJobId, (current) => current);
      if (!job || job.status === "completed" || job.status === "failed") return;
      const payload = this.parseJson(job.metadataJson) || {};

      await this.updateWorkflowJob(workflowJobId, (current) => ({
        ...current,
        status: "running",
        progress: 10,
        updatedAt: this.getTimestamp(),
        metadataJson: JSON.stringify({
          ...payload,
          stage: "preparing",
          message: "Workflow is running.",
        }),
      }));

      const result = await this.executeLatestRealPipeline({
        jobId: job.targetJobId || undefined,
        providerId: typeof payload.providerId === "string" ? payload.providerId as CollectorProviderId : undefined,
        sampleLimit: this.numberOrUndefined(payload.sampleLimit),
        forceReanalyze: payload.forceReanalyze !== false,
        goal: typeof payload.goal === "string" ? payload.goal : undefined,
        tone: typeof payload.tone === "string" ? payload.tone : undefined,
        targetAudience: typeof payload.targetAudience === "string" ? payload.targetAudience : undefined,
        onProgress: async (update) => {
          await this.updateWorkflowJob(workflowJobId, (current) => {
            const metadata = this.parseJson(current.metadataJson) || {};
            return {
              ...current,
              progress: update.progress,
              updatedAt: this.getTimestamp(),
              metadataJson: JSON.stringify({
                ...metadata,
                stage: update.stage,
                message: update.message,
                ...(update.sampleIds ? { sampleIds: update.sampleIds } : {}),
                ...(update.analysisIds ? { analysisIds: update.analysisIds } : {}),
                ...(typeof update.patternId !== "undefined" ? { patternId: update.patternId } : {}),
                ...(typeof update.contentId !== "undefined" ? { contentId: update.contentId } : {}),
              }),
            };
          });
        },
      });

      const timestamp = this.getTimestamp();
      if (!result.success) {
        await this.updateWorkflowJob(workflowJobId, (current) => ({
          ...current,
          status: "failed",
          progress: 100,
          updatedAt: timestamp,
          finishedAt: timestamp,
          errorMessage: result.message || "Workflow failed.",
          metadataJson: JSON.stringify({
            ...payload,
            stage: "failed",
            message: result.message || "Workflow failed.",
          }),
        }));
        return;
      }

      await this.updateWorkflowJob(workflowJobId, (current) => ({
        ...current,
        status: "completed",
        progress: 100,
        updatedAt: timestamp,
        finishedAt: timestamp,
        errorMessage: null,
        metadataJson: JSON.stringify({
          ...payload,
          stage: "completed",
          message: "Workflow completed.",
          sourceJobId: result.job?.id || current.targetJobId,
          sampleIds: result.samples?.map((item) => item.id) || [],
          analysisIds: result.analyses?.map((item) => item.id) || [],
          patternId: result.pattern?.id || null,
          contentId: result.contentId || result.generated?.id || null,
          workflowVerdict: result.diagnostics?.workflowVerdict || null,
          workflowSummary: result.diagnostics?.workflowSummary || null,
          averageSampleQuality: result.diagnostics?.averageSampleQuality ?? null,
          llmAnalysisCount: result.diagnostics?.llmAnalysisCount ?? 0,
          fallbackAnalysisCount: result.diagnostics?.fallbackAnalysisCount ?? 0,
          localAnalysisCount: result.diagnostics?.localAnalysisCount ?? 0,
          patternSource: result.diagnostics?.patternSource ?? null,
          generationSource: result.diagnostics?.generationSource ?? null,
          patternConfidence: result.diagnostics?.patternConfidence ?? null,
        }),
      }));
    } catch (error) {
      const timestamp = this.getTimestamp();
      await this.updateWorkflowJob(workflowJobId, (current) => ({
        ...current,
        status: "failed",
        progress: 100,
        updatedAt: timestamp,
        finishedAt: timestamp,
        errorMessage: error instanceof Error ? error.message : "Unknown workflow error.",
        metadataJson: JSON.stringify({
          ...(this.parseJson(current.metadataJson) || {}),
          stage: "failed",
          message: error instanceof Error ? error.message : "Unknown workflow error.",
        }),
      }));
    } finally {
      this.activeJobs.delete(workflowJobId);
    }
  }

  private async executeLatestRealPipeline(
    payload: WorkflowRequest & {
      onProgress?: (update: WorkflowProgressUpdate) => Promise<void> | void;
    } = {},
  ): Promise<HydratedWorkflowResult> {
    const sampleLimit = this.clampSampleLimit(payload.sampleLimit);
    const job = await this.resolveRealJob(payload.jobId, payload.providerId);
    if (!job) {
      return {
        success: false,
        message: "No completed real Xiaohongshu collection job is available.",
      };
    }

    const samples = await this.getSamplesForJob(job.id, sampleLimit);
    await payload.onProgress?.({
      stage: "preparing",
      progress: 20,
      message: `Loaded ${samples.length} real samples from ${job.id}.`,
      sampleIds: samples.map((item) => item.id),
    });
    if (!samples.length) {
      return {
        success: false,
        message: `Real collection job ${job.id} has no samples yet.`,
        job,
      };
    }

    await payload.onProgress?.({
      stage: "analyzing",
      progress: 35,
      message: `Analyzing ${samples.length} samples.`,
      sampleIds: samples.map((item) => item.id),
    });
    const analyzeResult = await this.analyzeService.createJob(samples.map((item) => item.id), {
      forceReanalyze: payload.forceReanalyze !== false,
      onSampleProgress: async (update) => {
        const safeTotal = Math.max(update.total, 1);
        const base = 35;
        const span = 23;
        const progress = update.phase === "completed"
          ? base + Math.round((update.current / safeTotal) * span)
          : base + Math.round(((update.current - 1) / safeTotal) * span);
        const title = update.title ? ` · ${update.title}` : "";
        await payload.onProgress?.({
          stage: "analyzing",
          progress,
          message:
            update.phase === "completed"
              ? `Analyzed ${update.current}/${update.total}${title}`
              : `Analyzing ${update.current}/${update.total}${title}`,
          sampleIds: samples.map((item) => item.id),
        });
      },
    });
    const analysisIds = Array.isArray(analyzeResult?.items)
      ? analyzeResult.items.map((item) => item.id)
      : [];

    await payload.onProgress?.({
      stage: "analysis_completed",
      progress: 60,
      message: `Completed ${analysisIds.length} analyses.`,
      sampleIds: samples.map((item) => item.id),
      analysisIds,
    });

    if (!analysisIds.length) {
      return {
        success: false,
        message: "Analyze stage did not produce any results.",
        job,
        samples,
      };
    }

    await payload.onProgress?.({
      stage: "pattern_inputs_ready",
      progress: 68,
      message: `Prepared ${analysisIds.length} analyses for pattern extraction.`,
      sampleIds: samples.map((item) => item.id),
      analysisIds,
    });

    await payload.onProgress?.({
      stage: "extracting_pattern",
      progress: 72,
      message: "Extracting pattern from fresh analyses.",
      sampleIds: samples.map((item) => item.id),
      analysisIds,
    });
    const patternResult = await this.patternsService.extract(analysisIds);
    if (!patternResult?.success || !patternResult?.item) {
      return {
        success: false,
        message: patternResult?.message || "Pattern extraction failed.",
        job,
        samples,
        analyses: analyzeResult?.items || [],
      };
    }

    await payload.onProgress?.({
      stage: "pattern_completed",
      progress: 84,
      message: `Pattern ${patternResult.item.id} created.`,
      sampleIds: samples.map((item) => item.id),
      analysisIds,
      patternId: patternResult.item.id,
    });

    await payload.onProgress?.({
      stage: "pattern_persisted",
      progress: 88,
      message: `Pattern ${patternResult.item.id} is ready for generation.`,
      sampleIds: samples.map((item) => item.id),
      analysisIds,
      patternId: patternResult.item.id,
    });

    const topic = patternResult.item.topic || job.keyword;
    await payload.onProgress?.({
      stage: "generating",
      progress: 92,
      message: `Generating draft for ${topic}.`,
      sampleIds: samples.map((item) => item.id),
      analysisIds,
      patternId: patternResult.item.id,
    });
    const generateResult = await this.generateService.createJob({
      patternId: patternResult.item.id,
      topic,
      goal: payload.goal || `生成一篇围绕 ${topic} 的小红书图文草稿`,
      tone: payload.tone || "专业但通俗",
      targetAudience: payload.targetAudience || "老师、家长和教育赛道创作者",
      userId: job.userId,
    });

    await payload.onProgress?.({
      stage: "generation_completed",
      progress: 97,
      message: `Draft ${generateResult.contentId || generateResult.item?.id || ""} generated.`,
      sampleIds: samples.map((item) => item.id),
      analysisIds,
      patternId: patternResult.item.id,
      contentId: generateResult.contentId || generateResult.item?.id || null,
    });

    await payload.onProgress?.({
      stage: "completed",
      progress: 100,
      message: "Workflow completed.",
      sampleIds: samples.map((item) => item.id),
      analysisIds,
      patternId: patternResult.item.id,
      contentId: generateResult.contentId || generateResult.item?.id || null,
    });

    return {
      success: true,
      job,
      samples,
      analyses: analyzeResult.items || [],
      pattern: patternResult.item,
      generated: generateResult.item || null,
      contentId: generateResult.contentId || null,
    };
  }

  private async resolveRealJob(jobId?: string, providerId?: CollectorProviderId) {
    if (jobId) {
      if (this.prisma.isEnabled()) {
        const item = await this.prisma.collectionJob.findUnique({ where: { id: jobId } });
        const mapped = item ? this.mapCollectionJobRecord(item) : null;
        if (!mapped) return null;
        if (providerId && mapped.metadata?.provider !== providerId) return null;
        return mapped;
      }

      const db = await this.store.read();
      const item = db.collectionJobs.find((entry) => entry.id === jobId);
      const mapped = item ? this.mapCollectionJobFile(item) : null;
      if (!mapped) return null;
      if (providerId && mapped.metadata?.provider !== providerId) return null;
      return mapped;
    }

    if (this.prisma.isEnabled()) {
      const item = await this.prisma.collectionJob.findFirst({
        where: {
          collectorMode: "real",
          platform: "xiaohongshu",
          status: "completed",
        },
        orderBy: [{ finishedAt: "desc" }, { createdAt: "desc" }],
      });
      if (!item) return null;
      const candidates = await this.prisma.collectionJob.findMany({
        where: {
          collectorMode: "real",
          platform: "xiaohongshu",
          status: "completed",
        },
        orderBy: [{ finishedAt: "desc" }, { createdAt: "desc" }],
        take: 20,
      });
      const mapped = candidates.map((candidate) => this.mapCollectionJobRecord(candidate));
      return providerId ? mapped.find((candidate) => candidate.metadata?.provider === providerId) || null : mapped[0] || null;
    }

    const db = await this.store.read();
    const items = db.collectionJobs
      .filter((entry) => entry.collectorMode === "real" && entry.platform === "xiaohongshu" && entry.status === "completed")
      .sort((a, b) => (b.finishedAt || b.createdAt).localeCompare(a.finishedAt || a.createdAt))
      .map((item) => this.mapCollectionJobFile(item));
    return providerId ? items.find((item) => item.metadata?.provider === providerId) || null : items[0] || null;
  }

  private async getSamplesForJob(jobId: string, limit: number) {
    if (this.prisma.isEnabled()) {
      const items = await this.prisma.contentSample.findMany({
        where: { jobId },
      });
      return items
        .map((item) => ({
          id: item.id,
          title: item.title,
          keyword: item.keyword || "",
          likeCount: item.likeCount,
          qualityScore: computeSampleQuality({
            platformContentId: item.platformContentId || "",
            contentText: item.contentText || "",
            contentSummary: item.contentSummary || "",
            authorName: item.authorName || "",
            authorId: item.authorId || "",
            publishTime: item.publishTime?.toISOString() || "",
            sourceUrl: item.sourceUrl || "",
            coverImageUrl: item.coverImageUrl || "",
            mediaImageUrls: parseJsonArray(item.mediaImageUrlsJson),
            mediaVideoUrls: parseJsonArray(item.mediaVideoUrlsJson),
            tags: parseJsonArray(item.tagsJson),
          }).qualityScore,
          createdAt: item.createdAt.toISOString(),
        }))
        .sort((a, b) => {
          if (b.qualityScore !== a.qualityScore) return b.qualityScore - a.qualityScore;
          if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
          return toSortableTime(b.createdAt) - toSortableTime(a.createdAt);
        })
        .slice(0, limit)
        .map((item) => ({
          id: item.id,
          title: item.title,
          keyword: item.keyword || "",
          likeCount: item.likeCount,
          qualityScore: item.qualityScore,
        }));
    }

    const db = await this.store.read();
    return db.samples
      .filter((item) => item.jobId === jobId)
      .map((item) => ({
        ...item,
        qualityScore: computeSampleQuality({
          platformContentId: item.platformContentId || "",
          contentText: item.contentText || "",
          contentSummary: item.contentSummary || "",
          authorName: item.authorName || "",
          authorId: item.authorId || "",
          publishTime: item.publishTime || "",
          sourceUrl: item.sourceUrl || "",
          coverImageUrl: item.coverImageUrl || "",
          mediaImageUrls: item.mediaImageUrls || [],
          mediaVideoUrls: item.mediaVideoUrls || [],
          tags: item.tags || [],
        }).qualityScore,
      }))
      .sort((a, b) => {
        if (b.qualityScore !== a.qualityScore) return b.qualityScore - a.qualityScore;
        if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
        return toSortableTime(b.createdAt) - toSortableTime(a.createdAt);
      })
      .slice(0, limit)
      .map((item) => ({
        id: item.id,
        title: item.title,
        keyword: item.keyword,
        likeCount: item.likeCount,
        qualityScore: item.qualityScore,
      }));
  }

  private async resolveWorkflowResult(job: ViralLabWorkflowJob) {
    const metadata = this.parseJson(job.metadataJson) || {};
    const sourceJobId = typeof metadata.sourceJobId === "string" ? metadata.sourceJobId : job.targetJobId;
    const providerId = typeof metadata.providerId === "string" ? metadata.providerId as CollectorProviderId : undefined;
    const sampleIds = this.parseStringArray(metadata.sampleIds);
    const analysisIds = this.parseStringArray(metadata.analysisIds);
    const patternId = typeof metadata.patternId === "string" ? metadata.patternId : null;
    const contentId = typeof metadata.contentId === "string" ? metadata.contentId : null;

    const [sourceJob, samples, analyses, pattern, generated] = await Promise.all([
      sourceJobId ? this.resolveRealJob(sourceJobId, providerId) : Promise.resolve(null),
      this.getSampleSummaries(sampleIds),
      this.getAnalysisSummaries(analysisIds),
      patternId ? this.getPatternSummary(patternId) : Promise.resolve(null),
      contentId ? this.getGeneratedContentSummary(contentId) : Promise.resolve(null),
    ]);

    return {
      success: job.status === "completed",
      message:
        (typeof metadata.message === "string" ? metadata.message : undefined) ||
        job.errorMessage ||
        undefined,
      job: sourceJob,
      samples,
      analyses,
      pattern,
      generated,
      diagnostics: this.buildWorkflowDiagnostics({
        samples,
        analyses,
        pattern,
        generated,
      }),
      contentId,
    };
  }

  private buildWorkflowDiagnostics(input: {
    samples: Array<{ qualityScore: number }>;
    analyses: Array<{ fallbackStatus: string }>;
    pattern: { fallbackStatus: string; confidenceScore: number } | null;
    generated: { fallbackStatus: string; titleCandidates: string[]; tags: string[] } | null;
  }) {
    const sampleScores = input.samples.map((item) => item.qualityScore).filter((item) => Number.isFinite(item));
    const averageSampleQuality = sampleScores.length
      ? Math.round(sampleScores.reduce((sum, item) => sum + item, 0) / sampleScores.length)
      : null;
    const topSampleQuality = sampleScores.length ? Math.max(...sampleScores) : null;
    const llmAnalysisCount = input.analyses.filter((item) => item.fallbackStatus === "llm").length;
    const fallbackAnalysisCount = input.analyses.filter((item) => item.fallbackStatus === "local-fallback").length;
    const localAnalysisCount = input.analyses.filter((item) => item.fallbackStatus === "local-only").length;
    const patternSource = input.pattern?.fallbackStatus || null;
    const generationSource = input.generated?.fallbackStatus || null;
    const patternConfidence = typeof input.pattern?.confidenceScore === "number" ? input.pattern.confidenceScore : null;
    const generatedTitleCount = input.generated?.titleCandidates?.length || 0;
    const generatedTagCount = input.generated?.tags?.length || 0;

    let workflowVerdict: "strong" | "usable" | "review" = "review";
    let workflowSummary = "Pipeline needs review.";

    const allAnalysesLlm = input.analyses.length > 0 && llmAnalysisCount === input.analyses.length;
    const strongSampleQuality = averageSampleQuality !== null && averageSampleQuality >= 80;
    const solidPattern = patternSource === "llm" && (patternConfidence === null || patternConfidence >= 0.75);
    const solidGenerate = generationSource === "llm" && generatedTitleCount >= 3;

    if (strongSampleQuality && allAnalysesLlm && solidPattern && solidGenerate) {
      workflowVerdict = "strong";
      workflowSummary = "High-quality samples and full LLM pipeline produced a strong run.";
    } else if (
      (averageSampleQuality !== null && averageSampleQuality >= 65) &&
      llmAnalysisCount > 0 &&
      (patternSource === "llm" || generationSource === "llm")
    ) {
      workflowVerdict = "usable";
      workflowSummary = "Pipeline is usable, but at least one stage still needs attention.";
    }

    return {
      averageSampleQuality,
      topSampleQuality,
      llmAnalysisCount,
      fallbackAnalysisCount,
      localAnalysisCount,
      patternSource,
      generationSource,
      patternConfidence,
      generatedTitleCount,
      generatedTagCount,
      workflowVerdict,
      workflowSummary,
    };
  }

  private async getSampleSummaries(sampleIds: string[]) {
    if (!sampleIds.length) return [];
    if (this.prisma.isEnabled()) {
      const items = await this.prisma.contentSample.findMany({
        where: { id: { in: sampleIds } },
      });
      const mapped = new Map(
        items.map((item) => [
          item.id,
          {
            id: item.id,
            title: item.title,
            keyword: item.keyword || "",
            likeCount: item.likeCount,
            qualityScore: computeSampleQuality({
              platformContentId: item.platformContentId || "",
              contentText: item.contentText || "",
              contentSummary: item.contentSummary || "",
              authorName: item.authorName || "",
              authorId: item.authorId || "",
              publishTime: item.publishTime?.toISOString() || "",
              sourceUrl: item.sourceUrl || "",
              coverImageUrl: item.coverImageUrl || "",
              mediaImageUrls: parseJsonArray(item.mediaImageUrlsJson),
              mediaVideoUrls: parseJsonArray(item.mediaVideoUrlsJson),
              tags: parseJsonArray(item.tagsJson),
            }).qualityScore,
          },
        ]),
      );
      return sampleIds.map((id) => mapped.get(id)).filter(Boolean);
    }

    const db = await this.store.read();
    return sampleIds
      .map((id) => db.samples.find((item) => item.id === id))
      .filter(Boolean)
      .map((item) => ({
        id: item.id,
        title: item.title,
        keyword: item.keyword,
        likeCount: item.likeCount,
        qualityScore: computeSampleQuality({
          platformContentId: item.platformContentId || "",
          contentText: item.contentText || "",
          contentSummary: item.contentSummary || "",
          authorName: item.authorName || "",
          authorId: item.authorId || "",
          publishTime: item.publishTime || "",
          sourceUrl: item.sourceUrl || "",
          coverImageUrl: item.coverImageUrl || "",
          mediaImageUrls: item.mediaImageUrls || [],
          mediaVideoUrls: item.mediaVideoUrls || [],
          tags: item.tags || [],
        }).qualityScore,
      }));
  }

  private async getAnalysisSummaries(analysisIds: string[]) {
    if (!analysisIds.length) return [];
    if (this.prisma.isEnabled()) {
      const items = await this.prisma.analysisResult.findMany({
        where: { id: { in: analysisIds } },
      });
      const mapped = new Map(
        items.map((item) => [
          item.id,
          {
            id: item.id,
            sampleId: item.sampleId,
            userId: item.userId,
            hookType: item.hookType || "",
            structureType: item.structureType || "",
            summary: item.summary || "",
            modelName: item.modelName || "",
            promptVersion: item.promptVersion || "",
            fallbackStatus: item.fallbackStatus || "local-only",
            fallbackReason: item.fallbackReason,
          },
        ]),
      );
      return analysisIds.map((id) => mapped.get(id)).filter(Boolean);
    }

    const db = await this.store.read();
    return analysisIds
      .map((id) => db.analyses.find((item) => item.id === id))
      .filter(Boolean)
      .map((item) => ({
        id: item.id,
        sampleId: item.sampleId,
        userId: item.userId,
        hookType: item.hookType,
        structureType: item.structureType,
        summary: item.summary,
        modelName: item.modelName,
        promptVersion: item.promptVersion,
        fallbackStatus: item.fallbackStatus,
        fallbackReason: item.fallbackReason,
      }));
  }

  private async getPatternSummary(patternId: string) {
    if (this.prisma.isEnabled()) {
      const item = await this.prisma.pattern.findUnique({
        where: { id: patternId },
        include: { sources: true },
      });
      if (!item) return null;
      return {
        id: item.id,
        name: item.name,
        topic: item.topic || "",
        description: item.description || "",
        sourceSampleIds: item.sources.map((source) => source.sampleId),
        confidenceScore: item.confidenceScore,
        modelName: item.modelName || "",
        promptVersion: item.promptVersion || "",
        fallbackStatus: item.fallbackStatus || "local-only",
        fallbackReason: item.fallbackReason,
      };
    }

    const db = await this.store.read();
    const item = db.patterns.find((pattern) => pattern.id === patternId);
    if (!item) return null;
    return {
      id: item.id,
      name: item.name,
      topic: item.topic,
      description: item.description,
      sourceSampleIds: item.sourceSampleIds,
      confidenceScore: item.confidenceScore,
      modelName: item.modelName,
      promptVersion: item.promptVersion,
      fallbackStatus: item.fallbackStatus,
      fallbackReason: item.fallbackReason,
    };
  }

  private async getGeneratedContentSummary(contentId: string) {
    if (this.prisma.isEnabled()) {
      const item = await this.prisma.generatedContent.findUnique({
        where: { id: contentId },
      });
      if (!item) return null;
      return {
        id: item.id,
        titleCandidates: this.parseStringArray(item.titleCandidatesJson),
        bodyText: item.bodyText || "",
        coverCopy: item.coverCopy || "",
        tags: this.parseStringArray(item.tagsJson),
        generationNotes: item.generationNotes || "",
        modelName: item.modelName || "",
        promptVersion: item.promptVersion || "",
        fallbackStatus: item.fallbackStatus || "local-only",
        fallbackReason: item.fallbackReason,
      };
    }

    const db = await this.store.read();
    const item = db.generatedContents.find((content) => content.id === contentId);
    if (!item) return null;
    return {
      id: item.id,
      titleCandidates: item.titleCandidates,
      bodyText: item.bodyText,
      coverCopy: item.coverCopy,
      tags: item.tags,
      generationNotes: item.generationNotes,
      modelName: item.modelName,
      promptVersion: item.promptVersion,
      fallbackStatus: item.fallbackStatus,
      fallbackReason: item.fallbackReason,
    };
  }

  private async updateWorkflowJob(
    workflowJobId: string,
    updater: (job: ViralLabWorkflowJob) => ViralLabWorkflowJob | null | Promise<ViralLabWorkflowJob | null>,
  ) {
    const db = await this.store.read();
    const baseJob = db.workflowJobs.find((item) => item.id === workflowJobId);
    if (!baseJob) return null;

    const nextJob = await updater({ ...baseJob });
    if (!nextJob) return null;

    await this.store.mutate((mutableDb) => {
      const existing = mutableDb.workflowJobs.find((item) => item.id === workflowJobId);
      if (existing) {
        Object.assign(existing, nextJob);
      }
      return null;
    });

    return nextJob;
  }

  private normalizeWorkflowJob(job: ViralLabWorkflowJob) {
    return {
      ...job,
      metadata: this.parseJson(job.metadataJson),
    };
  }

  private clampSampleLimit(value?: number) {
    return Math.min(Math.max(Number(value || 5), 1), 12);
  }

  private getTimestamp() {
    return new Date().toISOString();
  }

  private mapCollectionJobRecord(item: {
    id: string;
    userId: string;
    platform: string;
    keyword: string;
    sortBy: string;
    collectorMode: string;
    targetCount: number;
    status: string;
    progress: number;
    startedAt: Date | null;
    finishedAt: Date | null;
    errorMessage: string | null;
    metadataJson: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: item.id,
      userId: item.userId,
      platform: item.platform as "xiaohongshu",
      keyword: item.keyword,
      sortBy: item.sortBy as "hot" | "latest",
      collectorMode: item.collectorMode as "mock" | "real",
      targetCount: item.targetCount,
      status: item.status as "pending" | "running" | "completed" | "failed",
      progress: item.progress,
      startedAt: item.startedAt?.toISOString() || null,
      finishedAt: item.finishedAt?.toISOString() || null,
      errorMessage: item.errorMessage,
      metadata: this.parseJson(item.metadataJson),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private mapCollectionJobFile(item: ViralLabCollectionJob): WorkflowSourceJob {
    return {
      id: item.id,
      userId: item.userId,
      platform: item.platform,
      keyword: item.keyword,
      sortBy: item.sortBy,
      collectorMode: item.collectorMode,
      targetCount: item.targetCount,
      status: item.status,
      progress: item.progress,
      startedAt: item.startedAt,
      finishedAt: item.finishedAt,
      errorMessage: item.errorMessage,
      metadata: this.parseJson(item.metadataJson),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private parseJson(value: string | null) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private parseStringArray(value: unknown) {
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? value.map((item) => String(item)) : [];
  }

  private numberOrUndefined(value: unknown) {
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  }
}
