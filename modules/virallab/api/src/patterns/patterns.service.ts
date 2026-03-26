import { Injectable } from "@nestjs/common";
import { ViralLabStoreService } from "../store/store.service";
import { ViralLabPattern } from "../store/types";
import { ViralLabLlmService } from "../llm/llm.service";
import { PrismaService } from "../prisma.service";

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

@Injectable()
export class PatternsService {
  constructor(
    private readonly store: ViralLabStoreService,
    private readonly llm: ViralLabLlmService,
    private readonly prisma: PrismaService,
  ) {}

  async list() {
    if (this.prisma.isEnabled()) {
      const items = await this.prisma.pattern.findMany({
        orderBy: { createdAt: "desc" },
        include: { sources: true },
      });
      return {
        success: true,
        items: items.map((item) => this.mapPatternRecord(item)),
      };
    }

    const db = await this.store.read();
    return {
      success: true,
      items: db.patterns.slice().sort((a, b) => toSortableTime(b.createdAt) - toSortableTime(a.createdAt)),
    };
  }

  async getOne(patternId: string) {
    if (this.prisma.isEnabled()) {
      const item = await this.prisma.pattern.findUnique({
        where: { id: patternId },
        include: { sources: true },
      });
      return {
        success: true,
        item: item ? this.mapPatternRecord(item) : null,
      };
    }

    const db = await this.store.read();
    return {
      success: true,
      item: db.patterns.find((item) => item.id === patternId) || null,
    };
  }

  async extract(analysisIds: string[]) {
    const timestamp = new Date().toISOString();
    const analyses = await this.getAnalysesByIds(analysisIds);
    if (!analyses.length) {
      return { success: false, message: "No analyses selected." };
    }

    const samples = await this.getSamplesForAnalyses(analyses);

    const pattern = await this.buildPattern(analyses, samples, timestamp);
    await this.persistPattern(pattern);

    return {
      success: true,
      patternId: pattern.id,
      item: pattern,
    };
  }

  private async getAnalysesByIds(analysisIds: string[]) {
    if (this.prisma.isEnabled()) {
      const items = await this.prisma.analysisResult.findMany({
        where: { id: { in: analysisIds } },
        orderBy: { createdAt: "desc" },
      });
      return items.map((item) => this.mapAnalysisRecordForPattern(item));
    }

    const db = await this.store.read();
    return db.analyses.filter((item) => analysisIds.includes(item.id));
  }

  private async getSamplesForAnalyses(
    analyses: Array<{ sampleId: string }>,
  ) {
    const sampleIds = Array.from(new Set(analyses.map((item) => item.sampleId)));
    if (this.prisma.isEnabled()) {
      const items = await this.prisma.contentSample.findMany({
        where: { id: { in: sampleIds } },
      });
      return items.map((item) => ({
        id: item.id,
        keyword: item.keyword || "",
        platformContentId: item.platformContentId || "",
        title: item.title,
        contentText: item.contentText || "",
        contentSummary: item.contentSummary || "",
        tags: this.parseJsonArray(item.tagsJson),
        authorName: item.authorName || "",
        authorId: item.authorId || "",
        publishTime: item.publishTime?.toISOString() || "",
        likeCount: item.likeCount,
        commentCount: item.commentCount,
        collectCount: item.collectCount,
        shareCount: item.shareCount,
        sourceUrl: item.sourceUrl || "",
        coverImageUrl: item.coverImageUrl || "",
        mediaImageUrls: this.parseJsonArray(item.mediaImageUrlsJson),
        mediaVideoUrls: this.parseJsonArray(item.mediaVideoUrlsJson),
      }));
    }

    const db = await this.store.read();
    return db.samples.filter((item) => sampleIds.includes(item.id));
  }

  private mapAnalysisRecordForPattern(item: {
    id: string;
    sampleId: string;
    userId: string;
    hookType: string | null;
    structureType: string | null;
    emotionTagsJson: string | null;
    rhythmType: string | null;
    trendTagsJson: string | null;
    targetAudienceJson: string | null;
    viralReasonsJson: string | null;
    keyPointsJson: string | null;
    riskNotesJson: string | null;
    summary: string | null;
  }) {
    return {
      id: item.id,
      sampleId: item.sampleId,
      userId: item.userId,
      hookType: item.hookType || "",
      structureType: item.structureType || "",
      emotionTags: this.parseJsonArray(item.emotionTagsJson),
      rhythmType: item.rhythmType || "",
      trendTags: this.parseJsonArray(item.trendTagsJson),
      targetAudience: this.parseJsonArray(item.targetAudienceJson),
      viralReasons: this.parseJsonArray(item.viralReasonsJson),
      keyPoints: this.parseJsonArray(item.keyPointsJson),
      riskNotes: this.parseJsonArray(item.riskNotesJson),
      summary: item.summary || "",
    };
  }

  private async persistPattern(pattern: ViralLabPattern) {
    if (this.prisma.isEnabled()) {
      const analysisIds = Array.from(new Set(pattern.sourceAnalysisIds.filter(Boolean)));
      const sampleIds = Array.from(new Set(pattern.sourceSampleIds.filter(Boolean)));
      const [existingAnalyses, existingSamples] = await Promise.all([
        this.prisma.analysisResult.findMany({
          where: { id: { in: analysisIds } },
          select: { id: true, sampleId: true },
        }),
        this.prisma.contentSample.findMany({
          where: { id: { in: sampleIds } },
          select: { id: true },
        }),
      ]);

      const existingAnalysisMap = new Map(existingAnalyses.map((item) => [item.id, item.sampleId]));
      const existingSampleIds = new Set(existingSamples.map((item) => item.id));
      const sourceRows = pattern.sourceAnalysisIds
        .map((analysisId, index) => {
          const sampleId =
            pattern.sourceSampleIds[index] ||
            existingAnalysisMap.get(analysisId) ||
            pattern.sourceSampleIds[0] ||
            "";
          if (!analysisId || !existingAnalysisMap.has(analysisId)) return null;
          if (!sampleId || !existingSampleIds.has(sampleId)) return null;
          return {
            id: `${pattern.id}_${index}`,
            analysisId,
            sampleId,
            createdAt: new Date(pattern.createdAt),
          };
        })
        .filter((item): item is { id: string; analysisId: string; sampleId: string; createdAt: Date } => Boolean(item));

      await this.prisma.pattern.create({
        data: {
          id: pattern.id,
          userId: pattern.userId,
          name: pattern.name,
          topic: pattern.topic,
          description: pattern.description,
          hookTemplate: pattern.hookTemplate,
          bodyTemplate: pattern.bodyTemplate,
          endingTemplate: pattern.endingTemplate,
          emotionalCore: pattern.emotionalCore,
          trendSummary: pattern.trendSummary,
          applicableScenariosJson: JSON.stringify(pattern.applicableScenarios || []),
          confidenceScore: pattern.confidenceScore,
          modelName: pattern.modelName,
          promptVersion: pattern.promptVersion,
          fallbackStatus: pattern.fallbackStatus,
          fallbackReason: pattern.fallbackReason,
          status: pattern.status,
          createdAt: new Date(pattern.createdAt),
          updatedAt: new Date(pattern.updatedAt),
          sources: sourceRows.length
            ? {
                create: sourceRows,
              }
            : undefined,
        },
      });
    }

    await this.store.mutate((mutableDb) => {
      const existed = mutableDb.patterns.find((item) => item.id === pattern.id);
      if (existed) {
        Object.assign(existed, pattern);
      } else {
        mutableDb.patterns.unshift(pattern);
      }
      return null;
    });
  }

  private async buildPattern(
    analyses: Array<{
      id: string;
      sampleId: string;
      userId: string;
      hookType: string;
      structureType: string;
      emotionTags: string[];
      rhythmType: string;
      trendTags: string[];
      targetAudience: string[];
      viralReasons: string[];
      keyPoints: string[];
      riskNotes: string[];
      summary: string;
    }>,
    samples: Array<{
      id: string;
      keyword: string;
      platformContentId: string;
      title: string;
      contentText: string;
      contentSummary: string;
      tags: string[];
      authorName: string;
      authorId: string;
      publishTime: string;
      likeCount: number;
      commentCount: number;
      collectCount: number;
      shareCount: number;
      sourceUrl: string;
      coverImageUrl: string;
      mediaImageUrls: string[];
      mediaVideoUrls: string[];
    }>,
    timestamp: string,
  ): Promise<ViralLabPattern> {
    const fallback = this.buildLocalPattern(analyses, samples, timestamp);
    if (!this.llm.isEnabled()) {
      return fallback;
    }

    try {
      const response = await this.llm.chatJson<{
        name?: string;
        topic?: string;
        description?: string;
        hookTemplate?: string;
        bodyTemplate?: string;
        endingTemplate?: string;
        emotionalCore?: string;
        trendSummary?: string;
        applicableScenarios?: string[];
        confidenceScore?: number;
      }>({
        messages: [
          {
            role: "system",
            content:
              "你是 ViralLab 的 Pattern Engine。请从多条小红书样本分析里提炼可复用内容模板。只返回 JSON，不要加解释。输出字段必须包含：name, topic, description, hookTemplate, bodyTemplate, endingTemplate, emotionalCore, trendSummary, applicableScenarios, confidenceScore。",
          },
          {
            role: "user",
            content: JSON.stringify(
              {
                platform: "xiaohongshu",
                analyses: analyses.map((analysis) => ({
                  id: analysis.id,
                  hookType: analysis.hookType,
                  structureType: analysis.structureType,
                  emotionTags: analysis.emotionTags,
                  rhythmType: analysis.rhythmType,
                  trendTags: analysis.trendTags,
                  targetAudience: analysis.targetAudience,
                  viralReasons: analysis.viralReasons,
                  keyPoints: analysis.keyPoints,
                  riskNotes: analysis.riskNotes,
                  summary: analysis.summary,
                })),
                samples: samples.map((sample) => ({
                  id: sample.id,
                  keyword: sample.keyword,
                  platformContentId: sample.platformContentId,
                  title: sample.title,
                  contentText: sample.contentText.slice(0, 1200),
                  contentSummary: sample.contentSummary,
                  tags: sample.tags,
                  author: {
                    authorName: sample.authorName,
                    authorId: sample.authorId,
                  },
                  publishing: {
                    publishTime: sample.publishTime,
                    sourceUrl: sample.sourceUrl,
                  },
                  media: {
                    coverImageUrl: sample.coverImageUrl,
                    imageCount: sample.mediaImageUrls.length,
                    videoCount: sample.mediaVideoUrls.length,
                  },
                  engagement: {
                    likeCount: sample.likeCount,
                    commentCount: sample.commentCount,
                    collectCount: sample.collectCount,
                    shareCount: sample.shareCount,
                  },
                })),
              },
              null,
              2,
            ),
          },
        ],
        temperature: 0.35,
        maxTokens: 1400,
        timeoutMs: 45000,
      });

      return {
        id: this.store.createId("pattern"),
        userId: analyses[0].userId,
        name: this.pickString(response.name, fallback.name),
        topic: this.pickString(response.topic, fallback.topic),
        description: this.pickString(response.description, fallback.description),
        hookTemplate: this.pickString(response.hookTemplate, fallback.hookTemplate),
        bodyTemplate: this.pickString(response.bodyTemplate, fallback.bodyTemplate),
        endingTemplate: this.pickString(response.endingTemplate, fallback.endingTemplate),
        emotionalCore: this.pickString(response.emotionalCore, fallback.emotionalCore),
        trendSummary: this.pickString(response.trendSummary, fallback.trendSummary),
        applicableScenarios: this.pickArray(response.applicableScenarios, fallback.applicableScenarios),
        confidenceScore: this.pickConfidence(response.confidenceScore, fallback.confidenceScore),
        sourceAnalysisIds: analyses.map((item) => item.id),
        sourceSampleIds: analyses.map((item) => item.sampleId),
        modelName: this.llm.getConfig().model || "doubao-ark",
        promptVersion: "patterns.v3.llm",
        fallbackStatus: "llm",
        fallbackReason: null,
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    } catch (error) {
      return {
        ...fallback,
        fallbackStatus: "local-fallback",
        fallbackReason: error instanceof Error ? error.message : "llm-error",
      };
    }
  }

  private buildLocalPattern(
    analyses: Array<{
      id: string;
      sampleId: string;
      userId: string;
      hookType: string;
      emotionTags: string[];
    }>,
    samples: Array<{
      keyword: string;
      publishTime?: string;
      mediaVideoUrls?: string[];
    }>,
    timestamp: string,
  ): ViralLabPattern {
    const topic = samples[0]?.keyword || "通用选题";
    const dominantHook = analyses[0].hookType;
    const hasVideo = samples.some((sample) => (sample.mediaVideoUrls?.length || 0) > 0);
    const hasFreshSignals = samples.some((sample) => Boolean(sample.publishTime));
    return {
      id: this.store.createId("pattern"),
      userId: analyses[0].userId,
      name: `${topic} · ${dominantHook} 模板`,
      topic,
      description: `从 ${analyses.length} 条样本分析中归纳出的 ${topic} 赛道内容模式。`,
      hookTemplate: "用一句问题或痛点直接切入，让目标用户马上产生代入感。",
      bodyTemplate: "正文分 3 段展开：现象、原因、可执行方法。",
      endingTemplate: "结尾给出清晰行动建议或立场收束，强化收藏和转发理由。",
      emotionalCore: analyses[0].emotionTags.join(" + "),
      trendSummary: `${topic} 在近期平台内容里更偏向方法论和结果导向表达${hasVideo ? "，视频化表达也在增强" : ""}${hasFreshSignals ? "，并带有明确时效窗口" : ""}。`,
      applicableScenarios: ["图文种草", "经验拆解", "方法清单", hasVideo ? "短视频口播" : "封面图文"],
      confidenceScore: Number((0.78 + analyses.length * 0.03).toFixed(2)),
      sourceAnalysisIds: analyses.map((item) => item.id),
      sourceSampleIds: analyses.map((item) => item.sampleId),
      modelName: "mvp-local-pattern-engine",
      promptVersion: "patterns.v2.local",
      fallbackStatus: "local-only",
      fallbackReason: null,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  private pickString(value: unknown, fallback: string) {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  private pickArray(value: unknown, fallback: string[]) {
    if (!Array.isArray(value)) return fallback;
    const normalized = value.map((item) => String(item || "").trim()).filter(Boolean);
    return normalized.length ? normalized : fallback;
  }

  private pickConfidence(value: unknown, fallback: number) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(0, Math.min(1, Number(numeric.toFixed(2))));
  }

  private parseJsonArray(value: string | null) {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }

  private mapPatternRecord(item: {
    id: string;
    userId: string;
    name: string;
    topic: string | null;
    description: string | null;
    hookTemplate: string | null;
    bodyTemplate: string | null;
    endingTemplate: string | null;
    emotionalCore: string | null;
    trendSummary: string | null;
    applicableScenariosJson: string | null;
    confidenceScore: number;
    modelName: string | null;
    promptVersion: string | null;
    fallbackStatus: string | null;
    fallbackReason: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    sources: Array<{ analysisId: string; sampleId: string }>;
  }): ViralLabPattern {
    return {
      id: item.id,
      userId: item.userId,
      name: item.name,
      topic: item.topic || "",
      description: item.description || "",
      hookTemplate: item.hookTemplate || "",
      bodyTemplate: item.bodyTemplate || "",
      endingTemplate: item.endingTemplate || "",
      emotionalCore: item.emotionalCore || "",
      trendSummary: item.trendSummary || "",
      applicableScenarios: this.parseJsonArray(item.applicableScenariosJson),
      confidenceScore: item.confidenceScore,
      sourceAnalysisIds: item.sources.map((source) => source.analysisId),
      sourceSampleIds: item.sources.map((source) => source.sampleId),
      modelName: item.modelName || "mvp-local-pattern-engine",
      promptVersion: item.promptVersion || "patterns.v1",
      fallbackStatus: (item.fallbackStatus as ViralLabPattern["fallbackStatus"]) || "local-only",
      fallbackReason: item.fallbackReason,
      status: item.status as "active",
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
