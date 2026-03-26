import { Injectable, OnModuleInit } from "@nestjs/common";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import * as bcrypt from "bcryptjs";
import { ViralLabDatabase, ViralLabUser } from "./types";
import { PrismaService } from "../prisma.service";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "virallab-mvp.json");

const now = () => new Date().toISOString();

const createDemoUser = async (): Promise<ViralLabUser> => {
  const timestamp = now();
  return {
    id: "user_demo",
    email: "demo@virallab.local",
    passwordHash: await bcrypt.hash("demo123456", 8),
    displayName: "Demo User",
    status: "active",
    lastLoginAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const normalizePlatformAccounts = (accounts: ViralLabDatabase["platformAccounts"] = []) =>
  accounts.map((item) => ({
    ...item,
    verificationMessage: item.verificationMessage ?? null,
    verificationMetadataJson: item.verificationMetadataJson ?? null,
  }));

const normalizeAnalyses = (analyses: ViralLabDatabase["analyses"] = []) =>
  analyses.map((item) => ({
    ...item,
    fallbackStatus: item.fallbackStatus ?? (item.modelName === "mvp-local-analyzer" ? "local-only" : "llm"),
    fallbackReason: item.fallbackReason ?? null,
  }));

const normalizePatterns = (patterns: ViralLabDatabase["patterns"] = []) =>
  patterns.map((item) => ({
    ...item,
    modelName: item.modelName ?? "mvp-local-pattern-engine",
    promptVersion: item.promptVersion ?? "patterns.v1",
    fallbackStatus: item.fallbackStatus ?? (item.modelName && item.modelName !== "mvp-local-pattern-engine" ? "llm" : "local-only"),
    fallbackReason: item.fallbackReason ?? null,
  }));

const normalizeGeneratedContents = (contents: ViralLabDatabase["generatedContents"] = []) =>
  contents.map((item) => ({
    ...item,
    fallbackStatus: item.fallbackStatus ?? (item.modelName === "mvp-local-generator" ? "local-only" : "llm"),
    fallbackReason: item.fallbackReason ?? null,
  }));

const normalizeSamples = (samples: ViralLabDatabase["samples"] = []) =>
  samples.map((item) => ({
    ...item,
    platformContentId: item.platformContentId ?? "",
    authorId: item.authorId ?? "",
    mediaImageUrls: Array.isArray(item.mediaImageUrls) ? item.mediaImageUrls.map((value) => String(value)) : [],
    mediaVideoUrls: Array.isArray(item.mediaVideoUrls) ? item.mediaVideoUrls.map((value) => String(value)) : [],
  }));

@Injectable()
export class ViralLabStoreService implements OnModuleInit {
  private initPromise: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureInitialized();
  }

  async ensureInitialized() {
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    await this.initPromise;
  }

  async read(): Promise<ViralLabDatabase> {
    await this.ensureInitialized();
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as ViralLabDatabase;
  }

  async write(data: ViralLabDatabase, options?: { mirrorToPrisma?: boolean }) {
    await this.ensureInitialized();
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    if (options?.mirrorToPrisma) {
      await this.syncSnapshotToPrisma(data);
    }
  }

  async mutate<T>(
    mutator: (db: ViralLabDatabase) => T | Promise<T>,
    options?: { mirrorToPrisma?: boolean },
  ): Promise<T> {
    const db = await this.read();
    const result = await mutator(db);
    await this.write(db, options);
    return result;
  }

  async syncFileToPrisma() {
    const data = await this.read();
    await this.syncSnapshotToPrisma(data);
  }

  createId(prefix: string) {
    return `${prefix}_${randomUUID().slice(0, 8)}`;
  }

  private async initialize() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(DATA_FILE);
    } catch {
      const demoUser = await createDemoUser();
      const seed: ViralLabDatabase = {
        users: [demoUser],
        sessions: [],
        platformAccounts: [],
        collectionJobs: [],
        samples: [],
        analyses: [],
        patterns: [],
        generationJobs: [],
        generatedContents: [],
        workflowJobs: [],
        auditLogs: [],
      };
      await fs.writeFile(DATA_FILE, JSON.stringify(seed, null, 2));
      await this.syncSnapshotToPrisma(seed);
      return;
    }

    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<ViralLabDatabase>;
    const needsRewrite =
      !parsed.platformAccounts ||
      parsed.platformAccounts.some(
        (item) => typeof item.verificationMessage === "undefined" || typeof item.verificationMetadataJson === "undefined",
      ) ||
      parsed.analyses?.some((item) => typeof item.fallbackStatus === "undefined" || typeof item.fallbackReason === "undefined") ||
      parsed.patterns?.some(
        (item) =>
          typeof item.modelName === "undefined" ||
          typeof item.promptVersion === "undefined" ||
          typeof item.fallbackStatus === "undefined" ||
          typeof item.fallbackReason === "undefined",
      ) ||
      parsed.generatedContents?.some(
        (item) => typeof item.fallbackStatus === "undefined" || typeof item.fallbackReason === "undefined",
      ) ||
      parsed.samples?.some(
        (item) =>
          typeof item.platformContentId === "undefined" ||
          typeof item.authorId === "undefined" ||
          !Array.isArray(item.mediaImageUrls) ||
          !Array.isArray(item.mediaVideoUrls),
      ) ||
      !parsed.workflowJobs;

    if (needsRewrite) {
      const next: ViralLabDatabase = {
        users: parsed.users || [],
        sessions: parsed.sessions || [],
        platformAccounts: normalizePlatformAccounts(parsed.platformAccounts),
        collectionJobs: parsed.collectionJobs || [],
        samples: normalizeSamples(parsed.samples),
        analyses: normalizeAnalyses(parsed.analyses),
        patterns: normalizePatterns(parsed.patterns),
        generationJobs: parsed.generationJobs || [],
        generatedContents: normalizeGeneratedContents(parsed.generatedContents),
        workflowJobs: parsed.workflowJobs || [],
        auditLogs: parsed.auditLogs || [],
      };
      await fs.writeFile(DATA_FILE, JSON.stringify(next, null, 2));
      await this.syncSnapshotToPrisma(next);
      return;
    }

    await this.syncSnapshotToPrisma({
      users: parsed.users || [],
      sessions: parsed.sessions || [],
      platformAccounts: normalizePlatformAccounts(parsed.platformAccounts),
      collectionJobs: parsed.collectionJobs || [],
      samples: normalizeSamples(parsed.samples),
      analyses: normalizeAnalyses(parsed.analyses),
      patterns: normalizePatterns(parsed.patterns),
      generationJobs: parsed.generationJobs || [],
      generatedContents: normalizeGeneratedContents(parsed.generatedContents),
      workflowJobs: parsed.workflowJobs || [],
      auditLogs: parsed.auditLogs || [],
    });
  }

  private async syncSnapshotToPrisma(data: ViralLabDatabase) {
    if (!this.prisma.isEnabled()) {
      return;
    }

    // Ensure the Prisma client is connected before running bootstrap/backfill syncs.
    await this.prisma.$connect();

    await this.prisma.$transaction(async (tx) => {
      await tx.auditLog.deleteMany();
      await tx.generatedContent.deleteMany();
      await tx.generationJob.deleteMany();
      await tx.patternSource.deleteMany();
      await tx.pattern.deleteMany();
      await tx.analysisResult.deleteMany();
      await tx.contentSample.deleteMany();
      await tx.collectionJob.deleteMany();
      await tx.platformAccount.deleteMany();
      await tx.userSession.deleteMany();
      await tx.user.deleteMany();

      if (data.users.length) {
        await tx.user.createMany({
          data: data.users.map((user) => ({
            id: user.id,
            email: user.email,
            passwordHash: user.passwordHash,
            displayName: user.displayName,
            status: user.status,
            lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
          })),
        });
      }

      if (data.sessions.length) {
        await tx.userSession.createMany({
          data: data.sessions.map((session) => ({
            id: session.id,
            userId: session.userId,
            token: session.token,
            createdAt: new Date(session.createdAt),
            expiredAt: new Date(session.expiredAt),
            updatedAt: new Date(session.createdAt),
          })),
        });
      }

      if (data.platformAccounts.length) {
        await tx.platformAccount.createMany({
          data: data.platformAccounts.map((account) => ({
            id: account.id,
            userId: account.userId,
            platform: account.platform,
            accountName: account.accountName,
            cookieBlob: account.cookieBlob,
            cookieStatus: account.cookieStatus,
            lastVerifiedAt: account.lastVerifiedAt ? new Date(account.lastVerifiedAt) : null,
            verificationMessage: account.verificationMessage,
            verificationMetadataJson: account.verificationMetadataJson,
            createdAt: new Date(account.createdAt),
            updatedAt: new Date(account.updatedAt),
          })),
        });
      }

      if (data.collectionJobs.length) {
        await tx.collectionJob.createMany({
          data: data.collectionJobs.map((job) => ({
            id: job.id,
            userId: job.userId,
            platform: job.platform,
            keyword: job.keyword,
            sortBy: job.sortBy,
            collectorMode: job.collectorMode,
            targetCount: job.targetCount,
            status: job.status,
            progress: job.progress,
            startedAt: job.startedAt ? new Date(job.startedAt) : null,
            finishedAt: job.finishedAt ? new Date(job.finishedAt) : null,
            errorMessage: job.errorMessage,
            metadataJson: job.metadataJson,
            createdAt: new Date(job.createdAt),
            updatedAt: new Date(job.updatedAt),
          })),
        });
      }

      if (data.samples.length) {
        await tx.contentSample.createMany({
          data: data.samples.map((sample) => ({
            id: sample.id,
            jobId: sample.jobId,
            userId: sample.userId,
            platform: sample.platform,
            collectorMode: sample.collectorMode,
            keyword: sample.keyword,
            platformContentId: sample.platformContentId,
            title: sample.title,
            contentText: sample.contentText,
            contentSummary: sample.contentSummary,
            authorName: sample.authorName,
            authorId: sample.authorId,
            publishTime: sample.publishTime ? new Date(sample.publishTime) : null,
            likeCount: sample.likeCount,
            commentCount: sample.commentCount,
            collectCount: sample.collectCount,
            shareCount: sample.shareCount,
            tagsJson: JSON.stringify(sample.tags || []),
            sourceUrl: sample.sourceUrl,
            coverImageUrl: sample.coverImageUrl,
            mediaImageUrlsJson: JSON.stringify(sample.mediaImageUrls || []),
            mediaVideoUrlsJson: JSON.stringify(sample.mediaVideoUrls || []),
            status: sample.status,
            createdAt: new Date(sample.createdAt),
            updatedAt: new Date(sample.updatedAt),
          })),
        });
      }

      if (data.analyses.length) {
        await tx.analysisResult.createMany({
          data: data.analyses.map((analysis) => ({
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
            rawResultJson: null,
            createdAt: new Date(analysis.createdAt),
            updatedAt: new Date(analysis.updatedAt),
          })),
        });
      }

      if (data.patterns.length) {
        await tx.pattern.createMany({
          data: data.patterns.map((pattern) => ({
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
          })),
        });

        const validAnalysisIds = new Set(data.analyses.map((analysis) => analysis.id));
        const validSampleIds = new Set(data.samples.map((sample) => sample.id));
        const patternSources = data.patterns.flatMap((pattern) =>
          pattern.sourceAnalysisIds.map((analysisId, index) => ({
            id: `${pattern.id}_${index}`,
            patternId: pattern.id,
            analysisId,
            sampleId: pattern.sourceSampleIds[index] || pattern.sourceSampleIds[0],
            createdAt: new Date(pattern.createdAt),
          })),
        ).filter(
          (item) =>
            item.sampleId &&
            validSampleIds.has(item.sampleId) &&
            validAnalysisIds.has(item.analysisId),
        );

        if (patternSources.length) {
          await tx.patternSource.createMany({ data: patternSources });
        }
      }

      if (data.generationJobs.length) {
        await tx.generationJob.createMany({
          data: data.generationJobs.map((job) => ({
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
          })),
        });
      }

      if (data.generatedContents.length) {
        await tx.generatedContent.createMany({
          data: data.generatedContents.map((content) => ({
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
            rawResultJson: null,
            status: content.status,
            createdAt: new Date(content.createdAt),
            updatedAt: new Date(content.updatedAt),
          })),
        });
      }

      if (data.auditLogs.length) {
        await tx.auditLog.createMany({
          data: data.auditLogs.map((log) => ({
            id: log.id,
            userId: log.userId,
            action: log.action,
            targetType: log.targetType,
            targetId: log.targetId,
            payloadJson: log.payloadJson,
            createdAt: new Date(log.createdAt),
          })),
        });
      }
    });
  }
}
