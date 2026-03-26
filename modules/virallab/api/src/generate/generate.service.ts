import { Injectable } from "@nestjs/common";
import { ViralLabStoreService } from "../store/store.service";
import { ViralLabGeneratedContent, ViralLabGenerationJob } from "../store/types";
import { ViralLabLlmService } from "../llm/llm.service";
import { PrismaService } from "../prisma.service";

@Injectable()
export class GenerateService {
  constructor(
    private readonly store: ViralLabStoreService,
    private readonly llm: ViralLabLlmService,
    private readonly prisma: PrismaService,
  ) {}

  async createJob(payload: {
    patternId?: string;
    topic?: string;
    goal?: string;
    tone?: string;
    targetAudience?: string;
    userId?: string;
  }) {
    const timestamp = new Date().toISOString();
    const userId = payload.userId || (await this.resolveUserId());
    const pattern = payload.patternId ? await this.getPatternById(payload.patternId) : null;
    const job: ViralLabGenerationJob = {
      id: this.store.createId("genjob"),
      userId,
      patternId: pattern?.id || null,
      topic: String(payload.topic || pattern?.topic || "未命名主题"),
      goal: String(payload.goal || "生成一篇可直接二次修改的小红书图文草稿"),
      tone: String(payload.tone || "专业但通俗"),
      targetAudience: String(payload.targetAudience || "内容创作者"),
      status: "completed",
      errorMessage: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const content = await this.buildContent(job, pattern, timestamp);

    await this.persistGeneration(job, content);

    return {
      success: true,
      jobId: job.id,
      contentId: content.id,
      item: content,
    };
  }

  private async resolveUserId() {
    if (this.prisma.isEnabled()) {
      const user = await this.prisma.user.findFirst({
        orderBy: { createdAt: "asc" },
      });
      if (user?.id) return user.id;
    }

    const db = await this.store.read();
    return db.users[0]?.id || "user_demo";
  }

  private async getPatternById(patternId: string) {
    if (this.prisma.isEnabled()) {
      const item = await this.prisma.pattern.findUnique({
        where: { id: patternId },
      });
      if (!item) return null;
      return {
        id: item.id,
        name: item.name,
        topic: item.topic || "",
        description: item.description || "",
        hookTemplate: item.hookTemplate || "",
        bodyTemplate: item.bodyTemplate || "",
        endingTemplate: item.endingTemplate || "",
        emotionalCore: item.emotionalCore || "",
        trendSummary: item.trendSummary || "",
        applicableScenarios: this.parseJsonArray(item.applicableScenariosJson),
      };
    }

    const db = await this.store.read();
    return db.patterns.find((item) => item.id === patternId) || null;
  }

  private async persistGeneration(job: ViralLabGenerationJob, content: ViralLabGeneratedContent) {
    if (this.prisma.isEnabled()) {
      await this.prisma.generationJob.create({
        data: {
          id: job.id,
          userId: job.userId,
          patternId: job.patternId,
          topic: job.topic,
          goal: job.goal,
          tone: job.tone,
          targetAudience: job.targetAudience,
          status: job.status,
          errorMessage: job.errorMessage,
          createdAt: new Date(job.createdAt),
          updatedAt: new Date(job.updatedAt),
        },
      });

      await this.prisma.generatedContent.create({
        data: {
          id: content.id,
          jobId: content.jobId,
          userId: content.userId,
          patternId: content.patternId,
          platform: content.platform,
          titleCandidatesJson: JSON.stringify(content.titleCandidates || []),
          bodyText: content.bodyText,
          coverCopy: content.coverCopy,
          tagsJson: JSON.stringify(content.tags || []),
          generationNotes: content.generationNotes,
          modelName: content.modelName,
          promptVersion: content.promptVersion,
          fallbackStatus: content.fallbackStatus,
          fallbackReason: content.fallbackReason,
          status: content.status,
          createdAt: new Date(content.createdAt),
          updatedAt: new Date(content.updatedAt),
        },
      });
    }

    await this.store.mutate((mutableDb) => {
      const existingJob = mutableDb.generationJobs.find((item) => item.id === job.id);
      if (existingJob) {
        Object.assign(existingJob, job);
      } else {
        mutableDb.generationJobs.unshift(job);
      }

      const existingContent = mutableDb.generatedContents.find((item) => item.id === content.id);
      if (existingContent) {
        Object.assign(existingContent, content);
      } else {
        mutableDb.generatedContents.unshift(content);
      }
      return null;
    });
  }

  async getJob(jobId: string) {
    if (this.prisma.isEnabled()) {
      const item = await this.prisma.generationJob.findUnique({ where: { id: jobId } });
      return {
        success: true,
        item: item
          ? {
              id: item.id,
              userId: item.userId,
              patternId: item.patternId,
              topic: item.topic,
              goal: item.goal || "",
              tone: item.tone || "",
              targetAudience: item.targetAudience || "",
              status: item.status as ViralLabGenerationJob["status"],
              errorMessage: item.errorMessage,
              createdAt: item.createdAt.toISOString(),
              updatedAt: item.updatedAt.toISOString(),
            }
          : null,
      };
    }

    const db = await this.store.read();
    return {
      success: true,
      item: db.generationJobs.find((item) => item.id === jobId) || null,
    };
  }

  async getContent(contentId: string) {
    if (this.prisma.isEnabled()) {
      const item = await this.prisma.generatedContent.findUnique({ where: { id: contentId } });
      return {
        success: true,
        item: item ? this.mapGeneratedContent(item) : null,
      };
    }

    const db = await this.store.read();
    return {
      success: true,
      item: db.generatedContents.find((item) => item.id === contentId) || null,
    };
  }

  private async buildContent(
    job: ViralLabGenerationJob,
    pattern: {
      id: string;
      name: string;
      description: string;
      hookTemplate: string;
      bodyTemplate: string;
      endingTemplate: string;
      emotionalCore: string;
      trendSummary: string;
      applicableScenarios: string[];
    } | null,
    timestamp: string,
  ): Promise<ViralLabGeneratedContent> {
    const fallback = this.buildLocalContent(job, pattern, timestamp);
    if (!this.llm.isEnabled()) {
      return fallback;
    }

    try {
      const response = await this.llm.chatJson<{
        titleCandidates?: string[];
        bodyText?: string;
        coverCopy?: string;
        tags?: string[];
        generationNotes?: string;
      }>({
        messages: [
          {
            role: "system",
            content:
              "你是 ViralLab 的小红书内容生成引擎。请只返回 JSON，不要加解释。输出字段必须包含：titleCandidates, bodyText, coverCopy, tags, generationNotes。要求内容可直接作为图文草稿二次编辑。",
          },
          {
            role: "user",
            content: JSON.stringify(
              {
                platform: "xiaohongshu",
                topic: job.topic,
                goal: job.goal,
                tone: job.tone,
                targetAudience: job.targetAudience,
                pattern: pattern
                  ? {
                      name: pattern.name,
                      description: pattern.description,
                      hookTemplate: pattern.hookTemplate,
                      bodyTemplate: pattern.bodyTemplate,
                      endingTemplate: pattern.endingTemplate,
                      emotionalCore: pattern.emotionalCore,
                      trendSummary: pattern.trendSummary,
                      applicableScenarios: pattern.applicableScenarios,
                    }
                  : null,
              },
              null,
              2,
            ),
          },
        ],
        temperature: 0.6,
        maxTokens: 1200,
        timeoutMs: 45000,
      });

      return {
        id: this.store.createId("content"),
        jobId: job.id,
        userId: job.userId,
        patternId: job.patternId,
        platform: "xiaohongshu",
        titleCandidates: this.pickArray(response.titleCandidates, fallback.titleCandidates),
        bodyText: this.pickString(response.bodyText, fallback.bodyText),
        coverCopy: this.pickString(response.coverCopy, fallback.coverCopy),
        tags: this.normalizeTags(response.tags, fallback.tags),
        generationNotes: this.pickString(response.generationNotes, fallback.generationNotes),
        modelName: this.llm.getConfig().model || "doubao-ark",
        promptVersion: "generate.v2.llm",
        fallbackStatus: "llm",
        fallbackReason: null,
        status: "draft",
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

  private buildLocalContent(
    job: ViralLabGenerationJob,
    pattern: { id: string; name: string } | null,
    timestamp: string,
  ): ViralLabGeneratedContent {
    return {
      id: this.store.createId("content"),
      jobId: job.id,
      userId: job.userId,
      patternId: job.patternId,
      platform: "xiaohongshu",
      titleCandidates: [
        `${job.topic}怎么写更容易被看见？我总结了一个稳妥模板`,
        `做${job.topic}别再凭感觉了，这个结构更容易出结果`,
        `我复盘了热门${job.topic}内容，发现大家都在用这套写法`,
      ],
      bodyText: [
        `如果你最近也在做${job.topic}，先别急着堆信息量。`,
        "真正更容易被用户看完并愿意收藏的内容，往往都有 3 个共同点：开头马上切痛点，中间用清单结构讲清方法，结尾给出明确行动。",
        "这次我建议你直接从用户最真实的问题开始，比如“为什么明明很努力写内容，却总是没有反馈？”",
        "接着把正文拆成三段：第一段讲现象，第二段讲原因，第三段讲解决办法。这样读者不会迷路，也更容易记住。",
        "最后别只停在观点上，要把结尾写成一句可以马上执行的话，比如“先把这套结构照着写一篇，再看数据差异”。",
      ].join("\n\n"),
      coverCopy: `${job.topic}\n爆款结构模板`,
      tags: [`#${job.topic}`, "#小红书运营", "#内容结构", "#爆款拆解"],
      generationNotes: pattern
        ? `基于 Pattern《${pattern.name}》生成，适合做方法论型图文内容。`
        : "未指定 Pattern，按通用方法论模板生成。",
      modelName: "mvp-local-generator",
      promptVersion: "generate.v1",
      fallbackStatus: "local-only",
      fallbackReason: null,
      status: "draft",
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

  private normalizeTags(value: unknown, fallback: string[]) {
    const raw = this.pickArray(value, fallback);
    const tags = raw
      .flatMap((item) => item.split(/[\s,，]+/))
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => (item.startsWith("#") ? item : `#${item}`));
    return Array.from(new Set(tags)).slice(0, 8);
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

  private mapGeneratedContent(item: {
    id: string;
    jobId: string;
    userId: string;
    patternId: string | null;
    platform: string;
    titleCandidatesJson: string | null;
    bodyText: string | null;
    coverCopy: string | null;
    tagsJson: string | null;
    generationNotes: string | null;
    modelName: string | null;
    promptVersion: string | null;
    fallbackStatus: string | null;
    fallbackReason: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): ViralLabGeneratedContent {
    return {
      id: item.id,
      jobId: item.jobId,
      userId: item.userId,
      patternId: item.patternId,
      platform: item.platform as "xiaohongshu",
      titleCandidates: this.parseJsonArray(item.titleCandidatesJson),
      bodyText: item.bodyText || "",
      coverCopy: item.coverCopy || "",
      tags: this.parseJsonArray(item.tagsJson),
      generationNotes: item.generationNotes || "",
      modelName: item.modelName || "mvp-local-generator",
      promptVersion: item.promptVersion || "generate.v1",
      fallbackStatus: (item.fallbackStatus as ViralLabGeneratedContent["fallbackStatus"]) || "local-only",
      fallbackReason: item.fallbackReason,
      status: item.status as "draft",
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
