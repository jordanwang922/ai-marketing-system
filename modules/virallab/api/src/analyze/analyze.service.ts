import { Injectable } from "@nestjs/common";
import { ViralLabStoreService } from "../store/store.service";
import { ViralLabAnalysis } from "../store/types";
import { ViralLabLlmService } from "../llm/llm.service";
import { PrismaService } from "../prisma.service";
import { computeSampleQuality, parseJsonArray } from "../samples/sample-quality";

const inferHook = (title: string) => {
  if (title.includes("为什么")) return "question-hook";
  if (title.includes("不要")) return "warning-hook";
  if (title.includes("3 个") || title.includes("20 条")) return "list-hook";
  return "pain-point-hook";
};

const inferEmotion = (title: string) => {
  if (title.includes("爆")) return ["anxiety", "hope"];
  if (title.includes("不要")) return ["urgency", "fear-of-mistake"];
  return ["curiosity", "confidence"];
};

const inferContentFormat = (sample: {
  mediaImageUrls?: string[];
  mediaVideoUrls?: string[];
  contentText?: string;
}) => {
  const hasVideo = Array.isArray(sample.mediaVideoUrls) && sample.mediaVideoUrls.length > 0;
  const imageCount = Array.isArray(sample.mediaImageUrls) ? sample.mediaImageUrls.length : 0;
  const textLength = sample.contentText?.trim().length || 0;
  if (hasVideo) return "video-note";
  if (imageCount >= 3) return "multi-image-note";
  if (imageCount > 0) return "single-image-note";
  if (textLength > 600) return "long-text-note";
  return "text-first-note";
};

@Injectable()
export class AnalyzeService {
  constructor(
    private readonly store: ViralLabStoreService,
    private readonly llm: ViralLabLlmService,
    private readonly prisma: PrismaService,
  ) {}

  async createJob(
    sampleIds: string[],
    options?: {
      forceReanalyze?: boolean;
      onSampleProgress?: (update: {
        current: number;
        total: number;
        sampleId: string;
        title?: string;
        phase: "starting" | "completed";
      }) => Promise<void> | void;
    },
  ) {
    const timestamp = new Date().toISOString();
    const forceReanalyze = options?.forceReanalyze === true;
    const defaultIds = this.prisma.isEnabled()
      ? await this.selectDefaultSampleIdsFromPrisma()
      : await this.selectDefaultSampleIdsFromStore();
    const ids = sampleIds.length ? sampleIds : defaultIds;
    const created: ViralLabAnalysis[] = [];
    const additions: ViralLabAnalysis[] = [];

    const total = ids.length;
    let current = 0;

    for (const sampleId of ids) {
      const sample = await this.getSampleById(sampleId);
      if (!sample) continue;
      current += 1;
      await options?.onSampleProgress?.({
        current,
        total,
        sampleId: sample.id,
        title: sample.title,
        phase: "starting",
      });
      const existed = await this.getAnalysisBySampleId(sample.id);
      if (existed && !forceReanalyze) {
        created.push(existed);
        await options?.onSampleProgress?.({
          current,
          total,
          sampleId: sample.id,
          title: sample.title,
          phase: "completed",
        });
        continue;
      }
      if (existed && forceReanalyze) {
        await this.removeAnalysisBySampleId(sample.id);
      }
      const analysis = await this.buildAnalysis(sample, timestamp);
      additions.push(analysis);
      created.push(analysis);
      await options?.onSampleProgress?.({
        current,
        total,
        sampleId: sample.id,
        title: sample.title,
        phase: "completed",
      });
    }

    if (additions.length) {
      await this.persistAnalyses(additions);
    }

    return {
      success: true,
      jobId: this.store.createId("analyzeJob"),
      createdCount: created.length,
      forceReanalyze,
      items: created,
    };
  }

  private async getSampleById(sampleId: string) {
    if (this.prisma.isEnabled()) {
      const item = await this.prisma.contentSample.findUnique({ where: { id: sampleId } });
      if (!item) return null;
      return {
        id: item.id,
        userId: item.userId,
        title: item.title,
        contentText: item.contentText || "",
        contentSummary: item.contentSummary || "",
        keyword: item.keyword || "",
        platformContentId: item.platformContentId || "",
        tags: parseJsonArray(item.tagsJson),
        authorName: item.authorName || "",
        authorId: item.authorId || "",
        publishTime: item.publishTime?.toISOString() || "",
        likeCount: item.likeCount,
        commentCount: item.commentCount,
        collectCount: item.collectCount,
        shareCount: item.shareCount,
        sourceUrl: item.sourceUrl || "",
        coverImageUrl: item.coverImageUrl || "",
        mediaImageUrls: parseJsonArray(item.mediaImageUrlsJson),
        mediaVideoUrls: parseJsonArray(item.mediaVideoUrlsJson),
      };
    }

    const db = await this.store.read();
    return db.samples.find((item) => item.id === sampleId) || null;
  }

  private async getAnalysisBySampleId(sampleId: string) {
    if (this.prisma.isEnabled()) {
      const item = await this.prisma.analysisResult.findFirst({
        where: { sampleId },
        orderBy: { createdAt: "desc" },
      });
      return item ? this.mapAnalysisRecord(item) : null;
    }

    const db = await this.store.read();
    return db.analyses.find((item) => item.sampleId === sampleId) || null;
  }

  private async removeAnalysisBySampleId(sampleId: string) {
    if (this.prisma.isEnabled()) {
      await this.prisma.analysisResult.deleteMany({
        where: { sampleId },
      });
    }

    await this.store.mutate((mutableDb) => {
      mutableDb.analyses = mutableDb.analyses.filter((item) => item.sampleId !== sampleId);
      return null;
    });
  }

  private async persistAnalyses(additions: ViralLabAnalysis[]) {
    if (this.prisma.isEnabled()) {
      await this.prisma.analysisResult.createMany({
        data: additions.map((analysis) => ({
          id: analysis.id,
          sampleId: analysis.sampleId,
          userId: analysis.userId,
          analysisVersion: analysis.analysisVersion,
          hookType: analysis.hookType,
          structureType: analysis.structureType,
          emotionTagsJson: JSON.stringify(analysis.emotionTags || []),
          rhythmType: analysis.rhythmType,
          trendTagsJson: JSON.stringify(analysis.trendTags || []),
          targetAudienceJson: JSON.stringify(analysis.targetAudience || []),
          viralReasonsJson: JSON.stringify(analysis.viralReasons || []),
          keyPointsJson: JSON.stringify(analysis.keyPoints || []),
          riskNotesJson: JSON.stringify(analysis.riskNotes || []),
          summary: analysis.summary,
          modelName: analysis.modelName,
          promptVersion: analysis.promptVersion,
          fallbackStatus: analysis.fallbackStatus,
          fallbackReason: analysis.fallbackReason,
          createdAt: new Date(analysis.createdAt),
          updatedAt: new Date(analysis.updatedAt),
        })),
      });
    }

    await this.store.mutate((mutableDb) => {
      for (const analysis of additions) {
        const existed = mutableDb.analyses.find((item) => item.id === analysis.id);
        if (existed) {
          Object.assign(existed, analysis);
        } else {
          mutableDb.analyses.unshift(analysis);
        }
      }
      return null;
    });
  }

  async list() {
    if (this.prisma.isEnabled()) {
      const items = await this.prisma.analysisResult.findMany({
        orderBy: { createdAt: "desc" },
      });
      return {
        success: true,
        items: items.map((item) => this.mapAnalysisRecord(item)),
      };
    }

    const db = await this.store.read();
    return {
      success: true,
      items: db.analyses.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }

  async getOne(analysisId: string) {
    if (this.prisma.isEnabled()) {
      const item = await this.prisma.analysisResult.findUnique({ where: { id: analysisId } });
      return {
        success: true,
        item: item ? this.mapAnalysisRecord(item) : null,
      };
    }

    const db = await this.store.read();
    return {
      success: true,
      item: db.analyses.find((item) => item.id === analysisId) || null,
    };
  }

  private async buildAnalysis(sample: {
    id: string;
    userId: string;
    title: string;
    contentText: string;
    contentSummary: string;
    keyword: string;
    platformContentId: string;
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
  }, timestamp: string): Promise<ViralLabAnalysis> {
    const fallback = this.buildLocalAnalysis(sample, timestamp);
    if (!this.llm.isEnabled()) {
      return fallback;
    }

    try {
      const response = await this.llm.chatJson<{
        hookType?: string;
        structureType?: string;
        emotionTags?: string[];
        rhythmType?: string;
        trendTags?: string[];
        targetAudience?: string[];
        viralReasons?: string[];
        keyPoints?: string[];
        riskNotes?: string[];
        summary?: string;
      }>({
        messages: [
          {
            role: "system",
            content:
              "你是 ViralLab 的爆款内容分析引擎。请只返回 JSON，不要加解释。输出字段必须包含：hookType, structureType, emotionTags, rhythmType, trendTags, targetAudience, viralReasons, keyPoints, riskNotes, summary。",
          },
          {
            role: "user",
            content: JSON.stringify(
              {
                platform: "xiaohongshu",
                keyword: sample.keyword,
                platformContentId: sample.platformContentId,
                title: sample.title,
                contentSummary: sample.contentSummary,
                contentText: sample.contentText.slice(0, 2400),
                tags: sample.tags,
                author: {
                  authorName: sample.authorName,
                  authorId: sample.authorId,
                },
                publishing: {
                  publishTime: sample.publishTime,
                  sourceUrl: sample.sourceUrl,
                },
                contentFormat: inferContentFormat(sample),
                media: {
                  coverImageUrl: sample.coverImageUrl,
                  imageCount: sample.mediaImageUrls.length,
                  videoCount: sample.mediaVideoUrls.length,
                  mediaImageUrls: sample.mediaImageUrls.slice(0, 6),
                  mediaVideoUrls: sample.mediaVideoUrls.slice(0, 2),
                },
                engagement: {
                  likeCount: sample.likeCount,
                  commentCount: sample.commentCount,
                  collectCount: sample.collectCount,
                  shareCount: sample.shareCount,
                },
              },
              null,
              2,
            ),
          },
        ],
        temperature: 0.3,
        maxTokens: 1200,
        timeoutMs: 45000,
      });

      return {
        id: this.store.createId("analysis"),
        sampleId: sample.id,
        userId: sample.userId,
        analysisVersion: "v1",
        hookType: this.pickString(response.hookType, fallback.hookType),
        structureType: this.pickString(response.structureType, fallback.structureType),
        emotionTags: this.pickArray(response.emotionTags, fallback.emotionTags),
        rhythmType: this.pickString(response.rhythmType, fallback.rhythmType),
        trendTags: this.pickArray(response.trendTags, fallback.trendTags),
        targetAudience: this.pickArray(response.targetAudience, fallback.targetAudience),
        viralReasons: this.pickArray(response.viralReasons, fallback.viralReasons),
        keyPoints: this.pickArray(response.keyPoints, fallback.keyPoints),
        riskNotes: this.pickArray(response.riskNotes, fallback.riskNotes),
        summary: this.pickString(response.summary, fallback.summary),
        modelName: this.llm.getConfig().model || "doubao-ark",
        promptVersion: "analyze.v3.llm",
        fallbackStatus: "llm",
        fallbackReason: null,
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

  private buildLocalAnalysis(sample: {
    id: string;
    userId: string;
    title: string;
    keyword: string;
    authorName?: string;
    publishTime?: string;
    mediaImageUrls?: string[];
    mediaVideoUrls?: string[];
  }, timestamp: string): ViralLabAnalysis {
    const contentFormat = inferContentFormat(sample);
    const trendTags = [sample.keyword, "xiaohongshu-growth", "content-template", contentFormat];
    if (sample.publishTime) {
      trendTags.push("dated-post");
    }
    return {
      id: this.store.createId("analysis"),
      sampleId: sample.id,
      userId: sample.userId,
      analysisVersion: "v1",
      hookType: inferHook(sample.title),
      structureType: "hook + 3-point explanation + action ending",
      emotionTags: inferEmotion(sample.title),
      rhythmType: "fast-opening-stable-body",
      trendTags,
      targetAudience: ["content creators", "operators", "brand teams"],
      viralReasons: [
        "开头直接命中目标人群痛点",
        "正文结构利于快速扫读",
        contentFormat === "video-note" ? "视频表达更容易形成停留和转发" : "结尾给出明确行动感",
      ],
      keyPoints: [
        "标题先制造问题感",
        "正文使用清单和拆解结构",
        sample.authorName ? `保留作者 ${sample.authorName} 的表达视角` : "强调可复制的方法论",
        sample.publishTime ? "结合发布时间判断内容是否具有时效性" : "强调可复制的方法论",
      ],
      riskNotes: ["避免和原爆款标题过度相似", "生成时保留行业适配"],
      summary: `${sample.keyword}赛道的典型模板型热门内容，核心是快速钩子和三段式信息结构。`,
      modelName: "mvp-local-analyzer",
      promptVersion: "analyze.v2.local",
      fallbackStatus: "local-only",
      fallbackReason: null,
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

  private mapAnalysisRecord(item: {
    id: string;
    sampleId: string;
    userId: string;
    analysisVersion: string;
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
    modelName: string | null;
    promptVersion: string | null;
    fallbackStatus: string | null;
    fallbackReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ViralLabAnalysis {
    return {
      id: item.id,
      sampleId: item.sampleId,
      userId: item.userId,
      analysisVersion: item.analysisVersion,
      hookType: item.hookType || "",
      structureType: item.structureType || "",
      emotionTags: parseJsonArray(item.emotionTagsJson),
      rhythmType: item.rhythmType || "",
      trendTags: parseJsonArray(item.trendTagsJson),
      targetAudience: parseJsonArray(item.targetAudienceJson),
      viralReasons: parseJsonArray(item.viralReasonsJson),
      keyPoints: parseJsonArray(item.keyPointsJson),
      riskNotes: parseJsonArray(item.riskNotesJson),
      summary: item.summary || "",
      modelName: item.modelName || "unknown-model",
      promptVersion: item.promptVersion || "unknown-prompt",
      fallbackStatus: (item.fallbackStatus as ViralLabAnalysis["fallbackStatus"]) || "local-only",
      fallbackReason: item.fallbackReason,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private async selectDefaultSampleIdsFromPrisma() {
    const items = await this.prisma.contentSample.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    return items
      .slice()
      .sort((a, b) => {
        const qualityA = computeSampleQuality({
          platformContentId: a.platformContentId || "",
          contentText: a.contentText || "",
          contentSummary: a.contentSummary || "",
          authorName: a.authorName || "",
          authorId: a.authorId || "",
          publishTime: a.publishTime?.toISOString() || "",
          sourceUrl: a.sourceUrl || "",
          coverImageUrl: a.coverImageUrl || "",
          mediaImageUrls: parseJsonArray(a.mediaImageUrlsJson),
          mediaVideoUrls: parseJsonArray(a.mediaVideoUrlsJson),
          tags: parseJsonArray(a.tagsJson),
        }).qualityScore;
        const qualityB = computeSampleQuality({
          platformContentId: b.platformContentId || "",
          contentText: b.contentText || "",
          contentSummary: b.contentSummary || "",
          authorName: b.authorName || "",
          authorId: b.authorId || "",
          publishTime: b.publishTime?.toISOString() || "",
          sourceUrl: b.sourceUrl || "",
          coverImageUrl: b.coverImageUrl || "",
          mediaImageUrls: parseJsonArray(b.mediaImageUrlsJson),
          mediaVideoUrls: parseJsonArray(b.mediaVideoUrlsJson),
          tags: parseJsonArray(b.tagsJson),
        }).qualityScore;
        if (qualityB !== qualityA) return qualityB - qualityA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 5)
      .map((item) => item.id);
  }

  private async selectDefaultSampleIdsFromStore() {
    const db = await this.store.read();
    return db.samples
      .slice()
      .sort((a, b) => {
        const qualityA = computeSampleQuality({
          platformContentId: a.platformContentId || "",
          contentText: a.contentText || "",
          contentSummary: a.contentSummary || "",
          authorName: a.authorName || "",
          authorId: a.authorId || "",
          publishTime: a.publishTime || "",
          sourceUrl: a.sourceUrl || "",
          coverImageUrl: a.coverImageUrl || "",
          mediaImageUrls: a.mediaImageUrls || [],
          mediaVideoUrls: a.mediaVideoUrls || [],
          tags: a.tags || [],
        }).qualityScore;
        const qualityB = computeSampleQuality({
          platformContentId: b.platformContentId || "",
          contentText: b.contentText || "",
          contentSummary: b.contentSummary || "",
          authorName: b.authorName || "",
          authorId: b.authorId || "",
          publishTime: b.publishTime || "",
          sourceUrl: b.sourceUrl || "",
          coverImageUrl: b.coverImageUrl || "",
          mediaImageUrls: b.mediaImageUrls || [],
          mediaVideoUrls: b.mediaVideoUrls || [],
          tags: b.tags || [],
        }).qualityScore;
        if (qualityB !== qualityA) return qualityB - qualityA;
        return b.createdAt.localeCompare(a.createdAt);
      })
      .slice(0, 5)
      .map((item) => item.id);
  }
}
