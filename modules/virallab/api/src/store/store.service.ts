import { Injectable, OnModuleInit } from "@nestjs/common";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import * as bcrypt from "bcryptjs";
import {
  ViralLabAdDetectorConfig,
  ViralLabAdDetectorRun,
  ViralLabAdLibraryItem,
  ViralLabAnalysis,
  ViralLabCollectionJob,
  ViralLabDatabase,
  ViralLabGeneratedContent,
  ViralLabGenerationJob,
  ViralLabGeneratedImageAsset,
  ViralLabImageSuggestion,
  ViralLabPattern,
  ViralLabPlatformAccount,
  ViralLabSample,
  ViralLabUser,
} from "./types";
import { PrismaService } from "../prisma.service";
import {
  DEFAULT_AD_DETECTOR_SYSTEM_PROMPT,
  DEFAULT_AD_DETECTOR_USER_PROMPT,
} from "../ad-detector/ad-detector.defaults";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "virallab-mvp.json");

const now = () => new Date().toISOString();

const parseJsonArray = (value: string | null | undefined): string[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
};

const parseJsonValueArray = <T = unknown>(value: string | null | undefined): T[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const parseJsonObject = (value: string | null | undefined): Record<string, unknown> | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const safeIso = (value: Date | string | null | undefined) => {
  if (!value) {
    return null;
  }

  const next = value instanceof Date ? value : new Date(value);
  return Number.isNaN(next.getTime()) ? null : next.toISOString();
};

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

const createDefaultAdDetectorConfig = (userId: string): ViralLabAdDetectorConfig => {
  const timestamp = now();
  return {
    id: "adcfg_default",
    userId,
    enabled: true,
    threshold: 80,
    systemPrompt: DEFAULT_AD_DETECTOR_SYSTEM_PROMPT,
    userPrompt: DEFAULT_AD_DETECTOR_USER_PROMPT,
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

const normalizeGeneratedContents = (
  contents: ViralLabDatabase["generatedContents"] = [],
): ViralLabDatabase["generatedContents"] =>
  contents.map((item): ViralLabGeneratedContent => ({
    ...item,
    imageSuggestions: Array.isArray(item.imageSuggestions)
      ? item.imageSuggestions.map(
          (suggestion): ViralLabImageSuggestion => ({
            id: String(suggestion.id || ""),
            order: Number(suggestion.order || 0),
            title: String(suggestion.title || ""),
            description: String(suggestion.description || ""),
            prompt: String(suggestion.prompt || ""),
            visualStyle:
              suggestion.visualStyle === "photo-realistic" ||
              suggestion.visualStyle === "editorial" ||
              suggestion.visualStyle === "clean-illustration" ||
              suggestion.visualStyle === "hybrid"
                ? suggestion.visualStyle
                : "photo-realistic",
            aspectRatio: suggestion.aspectRatio === "1:1" ? "1:1" : "3:4",
          }),
        )
      : [],
    imageAssets: Array.isArray(item.imageAssets)
      ? item.imageAssets.map(
          (asset): ViralLabGeneratedImageAsset => ({
            id: String(asset.id || ""),
            suggestionId: String(asset.suggestionId || ""),
            status: asset.status === "failed" ? "failed" : "ready",
            prompt: String(asset.prompt || ""),
            imageUrl: asset.imageUrl ? String(asset.imageUrl) : null,
            localPath: asset.localPath ? String(asset.localPath) : null,
            errorMessage: asset.errorMessage ? String(asset.errorMessage) : null,
            createdAt: String(asset.createdAt || now()),
            updatedAt: String(asset.updatedAt || now()),
          }),
        )
      : [],
    fallbackStatus: item.fallbackStatus ?? (item.modelName === "mvp-local-generator" ? "local-only" : "llm"),
    fallbackReason: item.fallbackReason ?? null,
  }));

const normalizeSamples = (samples: ViralLabDatabase["samples"] = []) =>
  samples.map((item) => ({
    ...item,
    platformContentId: item.platformContentId ?? "",
    authorId: item.authorId ?? "",
    contentType: item.contentType ?? (Array.isArray(item.mediaVideoUrls) && item.mediaVideoUrls.length ? "video" : "image"),
    hasVideoMedia: item.hasVideoMedia ?? (Array.isArray(item.mediaVideoUrls) && item.mediaVideoUrls.length > 0),
    contentFormat:
      item.contentFormat ??
      (Array.isArray(item.mediaVideoUrls) && item.mediaVideoUrls.length
        ? "video-note"
        : Array.isArray(item.mediaImageUrls) && item.mediaImageUrls.length > 1
          ? "multi-image-note"
          : "single-image-note"),
    longImageCandidate: item.longImageCandidate ?? false,
    mediaImageUrls: Array.isArray(item.mediaImageUrls) ? item.mediaImageUrls.map((value) => String(value)) : [],
    mediaVideoUrls: Array.isArray(item.mediaVideoUrls) ? item.mediaVideoUrls.map((value) => String(value)) : [],
    ocrTextRaw: item.ocrTextRaw ?? "",
    ocrTextClean: item.ocrTextClean ?? "",
    transcriptText: item.transcriptText ?? "",
    transcriptSegments: Array.isArray(item.transcriptSegments) ? item.transcriptSegments.map((value) => String(value)) : [],
    frameOcrTexts: Array.isArray(item.frameOcrTexts) ? item.frameOcrTexts.map((value) => String(value)) : [],
    resolvedContentText: item.resolvedContentText ?? item.contentText ?? "",
    resolvedContentSource: item.resolvedContentSource ?? "note-body",
    adDecisionStatus: item.adDecisionStatus ?? "accepted",
    adConfidence: typeof item.adConfidence === "number" ? item.adConfidence : 0,
    adDetectorRunId: item.adDetectorRunId ?? null,
  }));

const normalizeAdDetectorConfigs = (items: ViralLabDatabase["adDetectorConfigs"] = [], users: ViralLabDatabase["users"] = []) => {
  const fallbackUserId = users[0]?.id || "user_demo";
  if (!items.length) {
    return [createDefaultAdDetectorConfig(fallbackUserId)];
  }
  return items.map((item) => ({
    ...item,
    enabled: typeof item.enabled === "boolean" ? item.enabled : true,
    threshold: Number.isFinite(Number(item.threshold)) ? Math.max(0, Math.min(100, Number(item.threshold))) : 80,
    systemPrompt: item.systemPrompt || DEFAULT_AD_DETECTOR_SYSTEM_PROMPT,
    userPrompt: item.userPrompt || DEFAULT_AD_DETECTOR_USER_PROMPT,
  }));
};

const normalizeAdDetectorRuns = (
  items: ViralLabDatabase["adDetectorRuns"] = [],
): ViralLabDatabase["adDetectorRuns"] =>
  items.map((item): ViralLabAdDetectorRun => ({
    ...item,
    status: item.status === "failed" ? "failed" : "completed",
    isAd: Boolean(item.isAd),
    confidence: Number.isFinite(Number(item.confidence)) ? Number(item.confidence) : 0,
    commercialIntentScore: Number.isFinite(Number(item.commercialIntentScore))
      ? Number(item.commercialIntentScore)
      : Number.isFinite(Number(item.confidence))
        ? Number(item.confidence)
        : 0,
    adSignals: Array.isArray(item.adSignals) ? item.adSignals.map((signal) => String(signal)) : [],
    threshold: Number.isFinite(Number(item.threshold)) ? Number(item.threshold) : 80,
    systemPromptVersion: item.systemPromptVersion || "default-system-v1",
    userPromptVersion: item.userPromptVersion || "default-user-v1",
  }));

const normalizeAdLibraryItems = (items: ViralLabDatabase["adLibraryItems"] = []) =>
  items.map((item) => ({
    ...item,
    isAd: typeof item.isAd === "boolean" ? item.isAd : true,
    confidence: Number.isFinite(Number(item.confidence)) ? Number(item.confidence) : 0,
    commercialIntentScore: Number.isFinite(Number(item.commercialIntentScore))
      ? Number(item.commercialIntentScore)
      : Number.isFinite(Number(item.confidence))
        ? Number(item.confidence)
        : 0,
    adSignals: Array.isArray(item.adSignals) ? item.adSignals.map((signal) => String(signal)) : [],
    brandNames: Array.isArray(item.brandNames) ? item.brandNames.map((name) => String(name)) : [],
    productNames: Array.isArray(item.productNames) ? item.productNames.map((name) => String(name)) : [],
    institutionNames: Array.isArray(item.institutionNames) ? item.institutionNames.map((name) => String(name)) : [],
    serviceNames: Array.isArray(item.serviceNames) ? item.serviceNames.map((name) => String(name)) : [],
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
    try {
      return JSON.parse(raw) as ViralLabDatabase;
    } catch {
      const recovered = await this.recoverSnapshotFromPrisma();
      await fs.writeFile(DATA_FILE, JSON.stringify(recovered, null, 2));
      return recovered;
    }
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
        adDetectorConfigs: [createDefaultAdDetectorConfig(demoUser.id)],
        adDetectorRuns: [],
        adLibraryItems: [],
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
    let parsed: Partial<ViralLabDatabase>;

    try {
      parsed = JSON.parse(raw) as Partial<ViralLabDatabase>;
    } catch {
      const recovered = await this.recoverSnapshotFromPrisma();
      await fs.writeFile(DATA_FILE, JSON.stringify(recovered, null, 2));
      await this.syncSnapshotToPrisma(recovered);
      return;
    }
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
      !parsed.adDetectorConfigs ||
      !parsed.adDetectorRuns ||
      !parsed.adLibraryItems ||
      parsed.samples?.some(
        (item) =>
          typeof item.platformContentId === "undefined" ||
          typeof item.authorId === "undefined" ||
          typeof item.contentType === "undefined" ||
          typeof item.hasVideoMedia === "undefined" ||
          typeof item.contentFormat === "undefined" ||
          typeof item.longImageCandidate === "undefined" ||
          !Array.isArray(item.mediaImageUrls) ||
          !Array.isArray(item.mediaVideoUrls) ||
          !Array.isArray(item.transcriptSegments) ||
          !Array.isArray(item.frameOcrTexts) ||
          typeof item.ocrTextRaw === "undefined" ||
          typeof item.ocrTextClean === "undefined" ||
          typeof item.transcriptText === "undefined" ||
          typeof item.resolvedContentText === "undefined" ||
          typeof item.resolvedContentSource === "undefined",
      ) ||
      !parsed.workflowJobs;

    if (needsRewrite) {
      const next: ViralLabDatabase = {
        users: parsed.users || [],
        sessions: parsed.sessions || [],
        platformAccounts: normalizePlatformAccounts(parsed.platformAccounts),
        collectionJobs: parsed.collectionJobs || [],
        samples: normalizeSamples(parsed.samples),
        adDetectorConfigs: normalizeAdDetectorConfigs(parsed.adDetectorConfigs, parsed.users || []),
        adDetectorRuns: normalizeAdDetectorRuns(parsed.adDetectorRuns),
        adLibraryItems: normalizeAdLibraryItems(parsed.adLibraryItems),
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
      adDetectorConfigs: normalizeAdDetectorConfigs(parsed.adDetectorConfigs, parsed.users || []),
      adDetectorRuns: normalizeAdDetectorRuns(parsed.adDetectorRuns),
      adLibraryItems: normalizeAdLibraryItems(parsed.adLibraryItems),
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
      await tx.adLibraryItem.deleteMany();
      await tx.adDetectorRun.deleteMany();
      await tx.adDetectorConfig.deleteMany();
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
            rawPayloadJson: JSON.stringify(sample),
            parsedPayloadJson: JSON.stringify({
              contentType: sample.contentType,
              hasVideoMedia: sample.hasVideoMedia,
              contentFormat: sample.contentFormat,
              longImageCandidate: sample.longImageCandidate,
              ocrTextRaw: sample.ocrTextRaw,
              ocrTextClean: sample.ocrTextClean,
              transcriptText: sample.transcriptText,
              transcriptSegments: sample.transcriptSegments || [],
              frameOcrTexts: sample.frameOcrTexts || [],
              resolvedContentText: sample.resolvedContentText,
              resolvedContentSource: sample.resolvedContentSource,
            }),
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
            adDecisionStatus: sample.adDecisionStatus || null,
            adConfidence: typeof sample.adConfidence === "number" ? sample.adConfidence : null,
            adDetectorRunId: sample.adDetectorRunId || null,
            status: sample.status,
            createdAt: new Date(sample.createdAt),
            updatedAt: new Date(sample.updatedAt),
          })),
        });
      }

      if (data.adDetectorConfigs.length) {
        await tx.adDetectorConfig.createMany({
          data: data.adDetectorConfigs.map((config) => ({
            id: config.id,
            userId: config.userId,
            enabled: config.enabled,
            threshold: config.threshold,
            systemPrompt: config.systemPrompt,
            userPrompt: config.userPrompt,
            createdAt: new Date(config.createdAt),
            updatedAt: new Date(config.updatedAt),
          })),
        });
      }

      if (data.adDetectorRuns.length) {
        await tx.adDetectorRun.createMany({
          data: data.adDetectorRuns.map((run) => ({
            id: run.id,
            userId: run.userId,
            sampleId: run.sampleId,
            status: run.status,
            isAd: run.isAd,
            confidence: run.confidence,
            commercialIntentScore: run.commercialIntentScore,
            adType: run.adType,
            reasoning: run.reasoning,
            adSignalsJson: JSON.stringify(run.adSignals || []),
            threshold: run.threshold,
            systemPromptVersion: run.systemPromptVersion,
            userPromptVersion: run.userPromptVersion,
            createdAt: new Date(run.createdAt),
            updatedAt: new Date(run.updatedAt),
          })),
        });
      }

      if (data.adLibraryItems.length) {
        await tx.adLibraryItem.createMany({
          data: data.adLibraryItems.map((item) => ({
            id: item.id,
            userId: item.userId,
            sampleId: item.sampleId,
            detectorRunId: item.detectorRunId,
            title: item.title,
            authorName: item.authorName,
            publishTime: item.publishTime ? new Date(item.publishTime) : null,
            sourceUrl: item.sourceUrl,
            isAd: item.isAd,
            confidence: item.confidence,
            commercialIntentScore: item.commercialIntentScore,
            adType: item.adType,
            reasoning: item.reasoning,
            adSignalsJson: JSON.stringify(item.adSignals || []),
            brandNamesJson: JSON.stringify(item.brandNames || []),
            productNamesJson: JSON.stringify(item.productNames || []),
            institutionNamesJson: JSON.stringify(item.institutionNames || []),
            serviceNamesJson: JSON.stringify(item.serviceNames || []),
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt),
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
            imageSuggestionsJson: JSON.stringify(content.imageSuggestions || []),
            imageAssetsJson: JSON.stringify(content.imageAssets || []),
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

  private async recoverSnapshotFromPrisma(): Promise<ViralLabDatabase> {
    if (!this.prisma.isEnabled()) {
      throw new Error("Unable to recover ViralLab snapshot: Prisma persistence is not enabled.");
    }

    await this.prisma.$connect();

    const [
      users,
      sessions,
      platformAccounts,
      collectionJobs,
      samples,
      adDetectorConfigs,
      adDetectorRuns,
      adLibraryItems,
      analyses,
      patterns,
      patternSources,
      generationJobs,
      generatedContents,
      auditLogs,
    ] = await Promise.all([
      this.prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
      this.prisma.userSession.findMany({ orderBy: { createdAt: "asc" } }),
      this.prisma.platformAccount.findMany({ orderBy: { createdAt: "asc" } }),
      this.prisma.collectionJob.findMany({ orderBy: { createdAt: "asc" } }),
      this.prisma.contentSample.findMany({ orderBy: { createdAt: "asc" } }),
      this.prisma.adDetectorConfig.findMany({ orderBy: { createdAt: "asc" } }),
      this.prisma.adDetectorRun.findMany({ orderBy: { createdAt: "asc" } }),
      this.prisma.adLibraryItem.findMany({ orderBy: { createdAt: "asc" } }),
      this.prisma.analysisResult.findMany({ orderBy: { createdAt: "asc" } }),
      this.prisma.pattern.findMany({ orderBy: { createdAt: "asc" } }),
      this.prisma.patternSource.findMany({ orderBy: { createdAt: "asc" } }),
      this.prisma.generationJob.findMany({ orderBy: { createdAt: "asc" } }),
      this.prisma.generatedContent.findMany({ orderBy: { createdAt: "asc" } }),
      this.prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

    const patternSourceMap = new Map<string, { analysisIds: string[]; sampleIds: string[] }>();
    for (const source of patternSources) {
      const current = patternSourceMap.get(source.patternId) || { analysisIds: [], sampleIds: [] };
      current.analysisIds.push(source.analysisId);
      current.sampleIds.push(source.sampleId);
      patternSourceMap.set(source.patternId, current);
    }

    return {
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        displayName: user.displayName,
        status: "active",
        lastLoginAt: safeIso(user.lastLoginAt),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      })),
      sessions: sessions.map((session) => ({
        id: session.id,
        userId: session.userId,
        token: session.token,
        createdAt: session.createdAt.toISOString(),
        expiredAt: session.expiredAt.toISOString(),
      })),
      platformAccounts: platformAccounts.map((account) => ({
        id: account.id,
        userId: account.userId,
        platform: "xiaohongshu",
        accountName: account.accountName || "",
        cookieBlob: account.cookieBlob || "",
        cookieStatus: (account.cookieStatus as ViralLabPlatformAccount["cookieStatus"]) || "missing",
        lastVerifiedAt: safeIso(account.lastVerifiedAt),
        verificationMessage: account.verificationMessage || null,
        verificationMetadataJson: account.verificationMetadataJson || null,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
      })),
      collectionJobs: collectionJobs.map((job) => {
        const metadata = parseJsonObject(job.metadataJson);
        const noteType =
          typeof metadata?.noteType === "string" ? (metadata.noteType as ViralLabCollectionJob["noteType"]) : "all";
        const publishWindow =
          typeof metadata?.publishWindow === "string"
            ? (metadata.publishWindow as ViralLabCollectionJob["publishWindow"])
            : "all";

        return {
          id: job.id,
          userId: job.userId,
          platform: "xiaohongshu",
          keyword: job.keyword,
          sortBy: job.sortBy as ViralLabCollectionJob["sortBy"],
          noteType,
          publishWindow,
          collectorMode: job.collectorMode as ViralLabCollectionJob["collectorMode"],
          targetCount: job.targetCount,
          status: job.status as ViralLabCollectionJob["status"],
          progress: job.progress,
          startedAt: safeIso(job.startedAt),
          finishedAt: safeIso(job.finishedAt),
          errorMessage: job.errorMessage || null,
          metadataJson: job.metadataJson || null,
          createdAt: job.createdAt.toISOString(),
          updatedAt: job.updatedAt.toISOString(),
        };
      }),
      samples: normalizeSamples(
        samples.map((sample) => {
          const rawPayload = parseJsonObject(sample.rawPayloadJson);
          const parsedPayload = parseJsonObject(sample.parsedPayloadJson);
          const mergedPayload = { ...(rawPayload || {}), ...(parsedPayload || {}) };

          return {
            id: sample.id,
            jobId: sample.jobId || "",
            userId: sample.userId,
            platform: "xiaohongshu",
            collectorMode: sample.collectorMode as ViralLabSample["collectorMode"],
            keyword: sample.keyword || "",
            platformContentId: sample.platformContentId || "",
            title: sample.title || "",
            contentText: sample.contentText || "",
            contentSummary: sample.contentSummary || "",
            contentType: ((mergedPayload.contentType as string) || "image") as ViralLabSample["contentType"],
            contentFormat: ((mergedPayload.contentFormat as string) || "single-image-note") as ViralLabSample["contentFormat"],
            longImageCandidate: Boolean(mergedPayload.longImageCandidate),
            authorName: sample.authorName || "",
            authorId: sample.authorId || "",
            publishTime: safeIso(sample.publishTime) || "",
            likeCount: sample.likeCount,
            commentCount: sample.commentCount,
            collectCount: sample.collectCount,
            shareCount: sample.shareCount,
            tags: parseJsonArray(sample.tagsJson),
            sourceUrl: sample.sourceUrl || "",
            coverImageUrl: sample.coverImageUrl || "",
            mediaImageUrls: parseJsonArray(sample.mediaImageUrlsJson),
            mediaVideoUrls: parseJsonArray(sample.mediaVideoUrlsJson),
            hasVideoMedia: Boolean(mergedPayload.hasVideoMedia),
            adDecisionStatus: (sample.adDecisionStatus as ViralLabSample["adDecisionStatus"]) || "accepted",
            adConfidence: typeof sample.adConfidence === "number" ? sample.adConfidence : 0,
            adDetectorRunId: sample.adDetectorRunId || null,
            ocrTextRaw: String(mergedPayload.ocrTextRaw || ""),
            ocrTextClean: String(mergedPayload.ocrTextClean || ""),
            transcriptText: String(mergedPayload.transcriptText || ""),
            transcriptSegments: Array.isArray(mergedPayload.transcriptSegments)
              ? mergedPayload.transcriptSegments.map((item) => String(item))
              : [],
            frameOcrTexts: Array.isArray(mergedPayload.frameOcrTexts)
              ? mergedPayload.frameOcrTexts.map((item) => String(item))
              : [],
            resolvedContentText: String(mergedPayload.resolvedContentText || sample.contentText || ""),
            resolvedContentSource: ((mergedPayload.resolvedContentSource as string) || "note-body") as ViralLabSample["resolvedContentSource"],
            status: "active",
            createdAt: sample.createdAt.toISOString(),
            updatedAt: sample.updatedAt.toISOString(),
          };
        }),
      ),
      adDetectorConfigs: normalizeAdDetectorConfigs(
        adDetectorConfigs.map((config) => ({
          id: config.id,
          userId: config.userId,
          enabled: config.enabled,
          threshold: config.threshold,
          systemPrompt: config.systemPrompt,
          userPrompt: config.userPrompt,
          createdAt: config.createdAt.toISOString(),
          updatedAt: config.updatedAt.toISOString(),
        })),
        users.map((user) => ({
          id: user.id,
          email: user.email,
          passwordHash: user.passwordHash,
          displayName: user.displayName,
          status: "active" as const,
          lastLoginAt: safeIso(user.lastLoginAt),
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        })),
      ),
      adDetectorRuns: normalizeAdDetectorRuns(
        adDetectorRuns.map((run) => ({
          id: run.id,
          userId: run.userId,
          sampleId: run.sampleId || null,
          status: run.status as ViralLabAdDetectorRun["status"],
          isAd: run.isAd,
          confidence: run.confidence,
          commercialIntentScore: run.commercialIntentScore,
          adType: run.adType || "",
          reasoning: run.reasoning || "",
          adSignals: parseJsonArray(run.adSignalsJson),
          threshold: run.threshold,
          systemPromptVersion: run.systemPromptVersion || "default-system-v1",
          userPromptVersion: run.userPromptVersion || "default-user-v1",
          createdAt: run.createdAt.toISOString(),
          updatedAt: run.updatedAt.toISOString(),
        })),
      ),
      adLibraryItems: normalizeAdLibraryItems(
        adLibraryItems.map((item) => ({
          id: item.id,
          userId: item.userId,
          sampleId: item.sampleId || null,
          detectorRunId: item.detectorRunId,
          title: item.title,
          authorName: item.authorName || "",
          publishTime: safeIso(item.publishTime) || "",
          sourceUrl: item.sourceUrl || "",
          isAd: item.isAd,
          confidence: item.confidence,
          commercialIntentScore: item.commercialIntentScore,
          adType: item.adType || "",
          reasoning: item.reasoning || "",
          adSignals: parseJsonArray(item.adSignalsJson),
          brandNames: parseJsonArray(item.brandNamesJson),
          productNames: parseJsonArray(item.productNamesJson),
          institutionNames: parseJsonArray(item.institutionNamesJson),
          serviceNames: parseJsonArray(item.serviceNamesJson),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
      ),
      analyses: normalizeAnalyses(
        analyses.map((analysis) => ({
          id: analysis.id,
          sampleId: analysis.sampleId,
          userId: analysis.userId,
          analysisVersion: analysis.analysisVersion,
          hookType: analysis.hookType || "",
          structureType: analysis.structureType || "",
          emotionTags: parseJsonArray(analysis.emotionTagsJson),
          rhythmType: analysis.rhythmType || "",
          trendTags: parseJsonArray(analysis.trendTagsJson),
          targetAudience: parseJsonArray(analysis.targetAudienceJson),
          viralReasons: parseJsonArray(analysis.viralReasonsJson),
          keyPoints: parseJsonArray(analysis.keyPointsJson),
          riskNotes: parseJsonArray(analysis.riskNotesJson),
          summary: analysis.summary || "",
          modelName: analysis.modelName || "mvp-local-analyzer",
          promptVersion: analysis.promptVersion || "analyze.v1",
          fallbackStatus: (analysis.fallbackStatus as ViralLabAnalysis["fallbackStatus"]) || "local-only",
          fallbackReason: analysis.fallbackReason || null,
          createdAt: analysis.createdAt.toISOString(),
          updatedAt: analysis.updatedAt.toISOString(),
        })),
      ),
      patterns: normalizePatterns(
        patterns.map((pattern) => {
          const sources = patternSourceMap.get(pattern.id) || { analysisIds: [], sampleIds: [] };
          return {
            id: pattern.id,
            userId: pattern.userId,
            name: pattern.name,
            topic: pattern.topic || "",
            description: pattern.description || "",
            hookTemplate: pattern.hookTemplate || "",
            bodyTemplate: pattern.bodyTemplate || "",
            endingTemplate: pattern.endingTemplate || "",
            emotionalCore: pattern.emotionalCore || "",
            trendSummary: pattern.trendSummary || "",
            applicableScenarios: parseJsonArray(pattern.applicableScenariosJson),
            confidenceScore: pattern.confidenceScore,
            sourceAnalysisIds: sources.analysisIds,
            sourceSampleIds: sources.sampleIds,
            modelName: pattern.modelName || "mvp-local-pattern-engine",
            promptVersion: pattern.promptVersion || "patterns.v1",
            fallbackStatus: (pattern.fallbackStatus as ViralLabPattern["fallbackStatus"]) || "local-only",
            fallbackReason: pattern.fallbackReason || null,
            status: "active",
            createdAt: pattern.createdAt.toISOString(),
            updatedAt: pattern.updatedAt.toISOString(),
          };
        }),
      ),
      generationJobs: generationJobs.map((job) => ({
        id: job.id,
        userId: job.userId,
        patternId: job.patternId || null,
        topic: job.topic,
        goal: job.goal || "",
        tone: job.tone || "",
        targetAudience: job.targetAudience || "",
        status: job.status as ViralLabGenerationJob["status"],
        errorMessage: job.errorMessage || null,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      })),
      generatedContents: normalizeGeneratedContents(
        generatedContents.map((content) => ({
          id: content.id,
          jobId: content.jobId,
          userId: content.userId,
          patternId: content.patternId || null,
          platform: "xiaohongshu",
          titleCandidates: parseJsonArray(content.titleCandidatesJson),
          bodyText: content.bodyText || "",
          coverCopy: content.coverCopy || "",
          tags: parseJsonArray(content.tagsJson),
          generationNotes: content.generationNotes || "",
          imageSuggestions: parseJsonValueArray<ViralLabImageSuggestion>(content.imageSuggestionsJson),
          imageAssets: parseJsonValueArray<ViralLabGeneratedImageAsset>(content.imageAssetsJson),
          modelName: content.modelName || "mvp-local-generator",
          promptVersion: content.promptVersion || "generate.v1",
          fallbackStatus: (content.fallbackStatus as ViralLabGeneratedContent["fallbackStatus"]) || "local-only",
          fallbackReason: content.fallbackReason || null,
          status: "draft",
          createdAt: content.createdAt.toISOString(),
          updatedAt: content.updatedAt.toISOString(),
        })),
      ),
      workflowJobs: [],
      auditLogs: auditLogs.map((log) => ({
        id: log.id,
        userId: log.userId || null,
        action: log.action,
        targetType: log.targetType || "",
        targetId: log.targetId || null,
        payloadJson: log.payloadJson || null,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  }
}
