import { BadRequestException, Injectable } from "@nestjs/common";
import { ViralLabStoreService } from "../store/store.service";
import {
  ViralLabGeneratedContent,
  ViralLabGeneratedImageAsset,
  ViralLabGenerationJob,
  ViralLabImageSuggestion,
} from "../store/types";
import { ViralLabLlmService } from "../llm/llm.service";
import { PrismaService } from "../prisma.service";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const IMAGE_OUTPUT_DIR = path.resolve(process.cwd(), "output", "virallab-images");

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
          imageSuggestionsJson: JSON.stringify(content.imageSuggestions || []),
          imageAssetsJson: JSON.stringify(content.imageAssets || []),
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

  async generateImageForSuggestion(contentId: string, suggestionId: string) {
    const content = await this.getRawContent(contentId);
    if (!content) {
      throw new BadRequestException("Generated content not found.");
    }

    const suggestion = content.imageSuggestions.find((item) => item.id === suggestionId);
    if (!suggestion) {
      throw new BadRequestException("Image suggestion not found.");
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new BadRequestException(
        "OPENAI_API_KEY missing. Configure the OpenAI image API key before generating AI images.",
      );
    }

    await fs.mkdir(IMAGE_OUTPUT_DIR, { recursive: true });

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: suggestion.prompt,
        size: suggestion.aspectRatio === "1:1" ? "1024x1024" : "1024x1536",
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new BadRequestException(`Image generation failed: ${response.status} ${text.slice(0, 300)}`);
    }

    const payload = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const first = payload.data?.[0];
    if (!first?.b64_json && !first?.url) {
      throw new BadRequestException("Image generation returned no image payload.");
    }

    const timestamp = new Date().toISOString();
    const asset: ViralLabGeneratedImageAsset = {
      id: this.store.createId("imgasset"),
      suggestionId,
      status: "ready",
      prompt: suggestion.prompt,
      imageUrl: first?.url || null,
      localPath: null,
      errorMessage: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (first?.b64_json) {
      const filePath = path.join(IMAGE_OUTPUT_DIR, `${asset.id}.png`);
      await fs.writeFile(filePath, Buffer.from(first.b64_json, "base64"));
      asset.localPath = filePath;
    }

    const nextContent: ViralLabGeneratedContent = {
      ...content,
      imageAssets: [
        ...content.imageAssets.filter((item) => item.suggestionId !== suggestionId),
        asset,
      ],
      updatedAt: timestamp,
    };

    await this.persistGeneratedContentUpdate(nextContent);

    return {
      success: true,
      item: nextContent,
      asset,
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
        imageSuggestions?: Array<{
          title?: string;
          description?: string;
          prompt?: string;
          visualStyle?: "photo-realistic" | "editorial" | "clean-illustration" | "hybrid";
          aspectRatio?: "3:4" | "1:1";
        }>;
      }>({
        messages: [
          {
            role: "system",
            content:
              "你是 ViralLab 的小红书内容生成引擎。请只返回 JSON，不要加解释。输出字段必须包含：titleCandidates, bodyText, coverCopy, tags, generationNotes, imageSuggestions。imageSuggestions 是数组，每项必须包含 title, description, prompt, visualStyle, aspectRatio。prompt 必须足够详细，可直接用于 AI 生图，且适合小红书图文配图。",
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
        imageSuggestions: this.normalizeImageSuggestions(response.imageSuggestions, timestamp, job, pattern),
        imageAssets: [],
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
      imageSuggestions: this.buildLocalImageSuggestions(job, pattern, timestamp),
      imageAssets: [],
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

  private normalizeImageSuggestions(
    value: unknown,
    timestamp: string,
    job: ViralLabGenerationJob,
    pattern: { name: string; description: string; emotionalCore: string } | null,
  ) {
    if (!Array.isArray(value) || !value.length) {
      return this.buildLocalImageSuggestions(job, pattern, timestamp);
    }

    return value.map((item, index) => this.normalizeImageSuggestion(item, index));
  }

  private normalizeImageSuggestion(value: unknown, index: number): ViralLabImageSuggestion {
    const item = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    return {
      id: this.store.createId("imgprompt"),
      order: index + 1,
      title: String(item.title || `配图 ${index + 1}`),
      description: String(item.description || ""),
      prompt: String(item.prompt || item.description || ""),
      visualStyle:
        item.visualStyle === "editorial" ||
        item.visualStyle === "clean-illustration" ||
        item.visualStyle === "hybrid" ||
        item.visualStyle === "photo-realistic"
          ? item.visualStyle
          : "photo-realistic",
      aspectRatio: item.aspectRatio === "1:1" ? "1:1" : "3:4",
    };
  }

  private buildLocalImageSuggestions(
    job: ViralLabGenerationJob,
    pattern: { name: string; description?: string; emotionalCore?: string } | null,
    _timestamp: string,
  ): ViralLabImageSuggestion[] {
    return [
      {
        id: this.store.createId("imgprompt"),
        order: 1,
        title: "封面主图",
        description: "作为首图，突出核心标题和人群痛点。",
        prompt: `为小红书图文生成一张高质感封面图，主题是“${job.topic}”，面向${job.targetAudience}，语气${job.tone}，照片级真实感，人物或真实场景，标题可读性强，留出叠字空间，不要卡通，不要夸张二次元风格。`,
        visualStyle: "photo-realistic",
        aspectRatio: "3:4",
      },
      {
        id: this.store.createId("imgprompt"),
        order: 2,
        title: "方法拆解图",
        description: "用一张信息层级明确的配图承接正文的核心方法。",
        prompt: `为小红书图文生成一张内容拆解配图，围绕“${job.topic}”，强调${pattern?.description || "可执行的方法论"}，编辑风、真实学习场景、桌面道具、人物动作自然、画面简洁高级，适合叠加要点文案。`,
        visualStyle: "editorial",
        aspectRatio: "3:4",
      },
      {
        id: this.store.createId("imgprompt"),
        order: 3,
        title: "收尾行动图",
        description: "作为结尾图，强化执行感和可复制感。",
        prompt: `为小红书图文生成一张收尾配图，主题“${job.topic}”，表达${pattern?.emotionalCore || "能立刻执行"}，真实拍摄感，干净背景，自然光，偏教育内容运营风格，不要卡通，适合做最后一页的行动建议图。`,
        visualStyle: "photo-realistic",
        aspectRatio: "3:4",
      },
    ];
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

  private parseImageSuggestions(value: string | null): ViralLabImageSuggestion[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item, index) => this.normalizeImageSuggestion(item, index)) : [];
    } catch {
      return [];
    }
  }

  private parseImageAssets(value: string | null): ViralLabGeneratedImageAsset[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map((item) => ({
            id: String(item.id || ""),
            suggestionId: String(item.suggestionId || ""),
            status: item.status === "failed" ? "failed" : "ready",
            prompt: String(item.prompt || ""),
            imageUrl: item.imageUrl ? String(item.imageUrl) : null,
            localPath: item.localPath ? String(item.localPath) : null,
            errorMessage: item.errorMessage ? String(item.errorMessage) : null,
            createdAt: String(item.createdAt || new Date().toISOString()),
            updatedAt: String(item.updatedAt || new Date().toISOString()),
          }))
        : [];
    } catch {
      return [];
    }
  }

  private async getRawContent(contentId: string) {
    if (this.prisma.isEnabled()) {
      const item = await this.prisma.generatedContent.findUnique({ where: { id: contentId } });
      return item ? this.mapGeneratedContent(item) : null;
    }

    const db = await this.store.read();
    return db.generatedContents.find((item) => item.id === contentId) || null;
  }

  private async persistGeneratedContentUpdate(content: ViralLabGeneratedContent) {
    if (this.prisma.isEnabled()) {
      await this.prisma.generatedContent.update({
        where: { id: content.id },
        data: {
          imageSuggestionsJson: JSON.stringify(content.imageSuggestions || []),
          imageAssetsJson: JSON.stringify(content.imageAssets || []),
          updatedAt: new Date(content.updatedAt),
        },
      });
    }

    await this.store.mutate((db) => {
      const existing = db.generatedContents.find((item) => item.id === content.id);
      if (existing) {
        Object.assign(existing, content);
      }
      return null;
    });
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
    imageSuggestionsJson: string | null;
    imageAssetsJson: string | null;
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
      imageSuggestions: this.parseImageSuggestions(item.imageSuggestionsJson),
      imageAssets: this.parseImageAssets(item.imageAssetsJson),
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
