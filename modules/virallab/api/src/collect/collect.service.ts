import { Injectable, OnModuleInit } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ViralLabStoreService } from "../store/store.service";
import { ViralLabCollectionJob, ViralLabPlatformAccount, ViralLabSample } from "../store/types";
import { MockCollector } from "./mock.collector";
import { XiaohongshuCollector } from "./xiaohongshu.collector";
import { CollectorMode, CollectorProviderId, ViralLabCollectorProvider } from "./collector.types";
import { PrismaService } from "../prisma.service";
import { XiaohongshuManagedCollector } from "./managed.collector";

@Injectable()
export class CollectService implements OnModuleInit {
  private readonly mockCollector = new MockCollector();
  private readonly xiaohongshuCollector = new XiaohongshuCollector();
  private readonly xiaohongshuManagedCollector = new XiaohongshuManagedCollector();
  private readonly activeJobs = new Set<string>();

  constructor(
    private readonly store: ViralLabStoreService,
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    const recoverableJobs = this.prisma.isEnabled()
      ? (await this.prisma.collectionJob.findMany({
          where: { status: { in: ["pending", "running"] } },
          orderBy: { createdAt: "asc" },
        })).map((item) => this.mapCollectionJobRecord(item))
      : (await this.store.read()).collectionJobs.filter((item) => item.status === "pending" || item.status === "running");
    for (const job of recoverableJobs) {
      setTimeout(() => {
        void this.runCollectorJob(job.id);
      }, 0);
    }
  }

  private parseMetadata(value: string | null) {
    if (!value) return null;
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private normalizeJob<T extends ViralLabCollectionJob>(job: T) {
    return {
      ...job,
      metadata: this.parseMetadata(job.metadataJson),
    };
  }

  private getTimestamp() {
    return new Date().toISOString();
  }

  private getProviders() {
    return [
      this.mockCollector,
      this.xiaohongshuCollector,
      this.xiaohongshuManagedCollector,
    ] satisfies ViralLabCollectorProvider[];
  }

  private getCollectorProvider(options: { collectorMode: CollectorMode; providerId?: CollectorProviderId }) {
    const { collectorMode, providerId } = options;
    if (providerId) {
      const matched = this.getProviders().find((provider) => provider.id === providerId);
      if (matched) return matched;
    }

    return collectorMode === "real" ? this.xiaohongshuCollector : this.mockCollector;
  }

  private buildProviderMetadata(provider: ViralLabCollectorProvider, reason: string, extra?: Record<string, unknown>) {
    return {
      provider: provider.id,
      providerMode: provider.mode,
      ready: true,
      reason,
      ...extra,
    };
  }

  private async resolveUserId(token?: string) {
    return this.authService.resolveUserIdOrDefault(token);
  }

  private async getPlatformAccount(userId: string, platform: "xiaohongshu") {
    if (this.prisma.isEnabled()) {
      const account = await this.prisma.platformAccount.findFirst({
        where: { userId, platform },
      });

      if (!account) return null;

      return {
        id: account.id,
        userId: account.userId,
        platform: account.platform as "xiaohongshu",
        accountName: account.accountName || "Xiaohongshu Account",
        cookieBlob: account.cookieBlob || "",
        cookieStatus: account.cookieStatus as ViralLabPlatformAccount["cookieStatus"],
        lastVerifiedAt: account.lastVerifiedAt?.toISOString() || null,
        verificationMessage: account.verificationMessage,
        verificationMetadataJson: account.verificationMetadataJson,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
      } satisfies ViralLabPlatformAccount;
    }

    const db = await this.store.read();
    return db.platformAccounts.find((item) => item.userId === userId && item.platform === platform) || null;
  }

  private async syncCollectionJobToJson(job: ViralLabCollectionJob) {
    await this.store.mutate((db) => {
      const existing = db.collectionJobs.find((item) => item.id === job.id);
      if (existing) {
        Object.assign(existing, job);
      } else {
        db.collectionJobs.push(job);
      }
      return null;
    });
  }

  private async syncSamplesToJson(samples: ViralLabSample[]) {
    if (!samples.length) return;

    await this.store.mutate((db) => {
      for (const sample of samples) {
        const existing = db.samples.find((item) => item.id === sample.id);
        if (existing) {
          Object.assign(existing, sample);
          continue;
        }
        db.samples.unshift(sample);
      }
      return null;
    });
  }

  private async appendAuditLog(entry: {
    userId: string | null;
    action: string;
    targetType: string;
    targetId: string | null;
    payloadJson: string | null;
    createdAt?: string;
  }) {
    const createdAt = entry.createdAt || this.getTimestamp();
    const log = {
      id: this.store.createId("log"),
      userId: entry.userId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      payloadJson: entry.payloadJson,
      createdAt,
    };

    if (this.prisma.isEnabled()) {
      await this.prisma.auditLog.create({
        data: {
          id: log.id,
          userId: log.userId,
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          payloadJson: log.payloadJson,
          createdAt: new Date(log.createdAt),
        },
      });
    }

    await this.store.mutate((db) => {
      db.auditLogs.push(log);
      return null;
    });
  }

  private buildSample(job: ViralLabCollectionJob, timestamp: string, sample: Omit<ViralLabSample, "id" | "jobId" | "userId" | "platform" | "collectorMode" | "keyword" | "status" | "createdAt" | "updatedAt">): ViralLabSample {
    return {
      id: this.store.createId("sample"),
      jobId: job.id,
      userId: job.userId,
      platform: "xiaohongshu",
      collectorMode: job.collectorMode,
      keyword: job.keyword,
      platformContentId: sample.platformContentId,
      title: sample.title,
      contentText: sample.contentText,
      contentSummary: sample.contentSummary,
      authorName: sample.authorName,
      authorId: sample.authorId,
      publishTime: sample.publishTime,
      likeCount: sample.likeCount,
      commentCount: sample.commentCount,
      collectCount: sample.collectCount,
      shareCount: sample.shareCount,
      tags: sample.tags,
      sourceUrl: sample.sourceUrl,
      coverImageUrl: sample.coverImageUrl,
      mediaImageUrls: sample.mediaImageUrls,
      mediaVideoUrls: sample.mediaVideoUrls,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  private async createCollectionJobRecord(job: ViralLabCollectionJob) {
    if (this.prisma.isEnabled()) {
      await this.prisma.collectionJob.create({
        data: {
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
        },
      });
    }

    await this.syncCollectionJobToJson(job);
  }

  private async updateCollectionJobRecord(
    jobId: string,
    updater: (job: ViralLabCollectionJob) => ViralLabCollectionJob | null | Promise<ViralLabCollectionJob | null>,
  ) {
    const current = this.prisma.isEnabled()
      ? await this.prisma.collectionJob.findUnique({ where: { id: jobId } })
      : null;

    const fallbackDb = !current ? await this.store.read() : null;
    const baseJob =
      current
        ? this.mapCollectionJobRecord(current)
        : fallbackDb?.collectionJobs.find((item) => item.id === jobId) || null;

    if (!baseJob) return null;

    const nextJob = await updater({ ...baseJob });
    if (!nextJob) return null;

    if (this.prisma.isEnabled()) {
      await this.prisma.collectionJob.update({
        where: { id: jobId },
        data: {
          keyword: nextJob.keyword,
          sortBy: nextJob.sortBy,
          collectorMode: nextJob.collectorMode,
          targetCount: nextJob.targetCount,
          status: nextJob.status,
          progress: nextJob.progress,
          startedAt: nextJob.startedAt ? new Date(nextJob.startedAt) : null,
          finishedAt: nextJob.finishedAt ? new Date(nextJob.finishedAt) : null,
          errorMessage: nextJob.errorMessage,
          metadataJson: nextJob.metadataJson,
          updatedAt: new Date(nextJob.updatedAt),
        },
      });
    }

    await this.syncCollectionJobToJson(nextJob);
    return nextJob;
  }

  private async autoVerifySavedCookie(account: ViralLabPlatformAccount) {
    const result = await this.xiaohongshuCollector.verifyCookie({ cookieBlob: account.cookieBlob });
    const timestamp = this.getTimestamp();
    const verificationMetadataJson = JSON.stringify(result.metadata || null);

    if (this.prisma.isEnabled()) {
      await this.prisma.platformAccount.update({
        where: { id: account.id },
        data: {
          cookieStatus: result.verified ? "verified" : "invalid",
          lastVerifiedAt: new Date(timestamp),
          verificationMessage: result.errorMessage || (result.verified ? "Cookie auto-verified during collection." : null),
          verificationMetadataJson,
          updatedAt: new Date(timestamp),
        },
      });
    }

    let updatedAccount: ViralLabPlatformAccount | null = null;
    await this.store.mutate((db) => {
      const target = db.platformAccounts.find((item) => item.id === account.id);
      if (!target) return null;

      target.cookieStatus = result.verified ? "verified" : "invalid";
      target.lastVerifiedAt = timestamp;
      target.verificationMessage = result.errorMessage || (result.verified ? "Cookie auto-verified during collection." : null);
      target.verificationMetadataJson = verificationMetadataJson;
      target.updatedAt = timestamp;
      updatedAccount = { ...target };
      return null;
    });

    await this.appendAuditLog({
      userId: account.userId,
      action: result.verified ? "platform_cookie_verified" : "platform_cookie_invalid",
      targetType: "platform_account",
      targetId: account.id,
      payloadJson: JSON.stringify({
        platform: "xiaohongshu",
        source: "collect-auto-verify",
        verified: result.verified,
        reason:
          result.metadata && typeof result.metadata === "object" && "reason" in result.metadata ? result.metadata.reason : null,
        errorMessage: result.errorMessage || null,
      }),
      createdAt: timestamp,
    });

    if (!updatedAccount && this.prisma.isEnabled()) {
      updatedAccount = await this.getPlatformAccount(account.userId, "xiaohongshu");
    }

    return {
      success: result.success,
      verified: result.verified,
      errorMessage: result.errorMessage || null,
      account: updatedAccount,
    };
  }

  async listJobs(token?: string) {
    if (this.prisma.isEnabled()) {
      const userId = await this.resolveUserId(token);
      const jobs = await this.prisma.collectionJob.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      return {
        success: true,
        items: jobs.map((job) => this.mapCollectionJobRecord(job)),
      };
    }

    const user = await this.authService.resolveUserFromToken(token);
    const db = await this.store.read();
    const userId = user?.id || db.users[0]?.id || "user_demo";
    const jobs = db.collectionJobs
      .filter((item) => item.userId === userId)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      success: true,
      items: jobs.map((job) => this.normalizeJob(job)),
    };
  }

  async getJob(jobId: string, token?: string) {
    if (this.prisma.isEnabled()) {
      const userId = await this.resolveUserId(token);
      const job = await this.prisma.collectionJob.findFirst({
        where: { id: jobId, userId },
      });
      const samples = await this.prisma.contentSample.findMany({
        where: { jobId, userId },
        orderBy: { createdAt: "desc" },
      });
      return {
        success: true,
        item: job ? this.mapCollectionJobRecord(job) : null,
        samples: samples.map((item) => ({
          id: item.id,
          jobId: item.jobId || "",
          userId: item.userId,
          platform: item.platform as "xiaohongshu",
          collectorMode: item.collectorMode as "mock" | "real",
          keyword: item.keyword || "",
          platformContentId: item.platformContentId || "",
          title: item.title,
          contentText: item.contentText || "",
          contentSummary: item.contentSummary || "",
          authorName: item.authorName || "",
          authorId: item.authorId || "",
          publishTime: item.publishTime?.toISOString() || "",
          likeCount: item.likeCount,
          commentCount: item.commentCount,
          collectCount: item.collectCount,
          shareCount: item.shareCount,
          tags: this.parseStringArray(item.tagsJson),
          sourceUrl: item.sourceUrl || "",
          coverImageUrl: item.coverImageUrl || "",
          mediaImageUrls: this.parseStringArray(item.mediaImageUrlsJson),
          mediaVideoUrls: this.parseStringArray(item.mediaVideoUrlsJson),
          status: item.status as "active",
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
      };
    }

    const user = await this.authService.resolveUserFromToken(token);
    const db = await this.store.read();
    const userId = user?.id || db.users[0]?.id || "user_demo";
    const job = db.collectionJobs.find((item) => item.id === jobId && item.userId === userId);
    const samples = db.samples.filter((item) => item.jobId === jobId && item.userId === userId);
    return {
      success: true,
      item: job ? this.normalizeJob(job) : null,
      samples,
    };
  }

  private async runCollectorJob(jobId: string) {
    if (this.activeJobs.has(jobId)) return;
    this.activeJobs.add(jobId);

    try {
      const job = await this.updateCollectionJobRecord(jobId, (current) => current);
      if (!job) return;
      if (job.status === "completed" || job.status === "failed") return;
      const account = await this.getPlatformAccount(job.userId, "xiaohongshu");

      await this.updateCollectionJobRecord(jobId, (current) => {
        const timestamp = this.getTimestamp();
        current.status = "running";
        current.progress = 10;
        current.startedAt = current.startedAt || timestamp;
        current.updatedAt = timestamp;
        return current;
      });

      const currentMetadata = this.parseMetadata(job.metadataJson);
      const provider = this.getCollectorProvider({
        collectorMode: job.collectorMode,
        providerId: typeof currentMetadata?.provider === "string" ? (currentMetadata.provider as CollectorProviderId) : undefined,
      });
      const result = await provider.collect(
        { keyword: job.keyword, sortBy: job.sortBy, targetCount: job.targetCount },
        { cookieBlob: account?.cookieBlob },
      );

      const timestamp = this.getTimestamp();
      const createdSamples = result.samples.map((sample) => this.buildSample(job, timestamp, sample));

      if (this.prisma.isEnabled() && createdSamples.length) {
        await this.prisma.contentSample.createMany({
          data: createdSamples.map((sample) => ({
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

      await this.syncSamplesToJson(createdSamples);

      await this.updateCollectionJobRecord(jobId, (current) => {
        current.status = result.status;
        current.progress = result.status === "completed" ? 100 : result.progress;
        current.finishedAt = result.status === "completed" || result.status === "failed" ? timestamp : null;
        current.errorMessage = result.errorMessage || null;
        current.metadataJson = JSON.stringify(result.metadata);
        current.updatedAt = timestamp;
        return current;
      });

      await this.appendAuditLog({
        userId: job.userId,
        action: result.status === "completed" ? "collection_job_completed" : "collection_job_failed",
        targetType: "collection_job",
        targetId: job.id,
        payloadJson: JSON.stringify({
          keyword: job.keyword,
          targetCount: job.targetCount,
          collectorMode: job.collectorMode,
          status: result.status,
          createdSamples: createdSamples.length,
          reason: result.metadata?.reason || null,
        }),
        createdAt: timestamp,
      });
    } catch (error) {
      const timestamp = this.getTimestamp();
      const failedJob = await this.updateCollectionJobRecord(jobId, (current) => {
        const currentMetadata = this.parseMetadata(current.metadataJson);
        current.status = "failed";
        current.progress = 0;
        current.finishedAt = timestamp;
        current.errorMessage = error instanceof Error ? error.message : "Unknown collection job error.";
        current.metadataJson = JSON.stringify({
          provider:
            typeof currentMetadata?.provider === "string"
              ? currentMetadata.provider
              : current.collectorMode === "real"
                ? "xiaohongshu-playwright"
                : "mock-local",
          ready: false,
          reason: "job-runtime-error",
        });
        current.updatedAt = timestamp;
        return current;
      });

      if (failedJob) {
        await this.appendAuditLog({
          userId: failedJob.userId,
          action: "collection_job_failed",
          targetType: "collection_job",
          targetId: failedJob.id,
          payloadJson: JSON.stringify({
            keyword: failedJob.keyword,
            collectorMode: failedJob.collectorMode,
            status: "failed",
            errorMessage: failedJob.errorMessage,
          }),
          createdAt: timestamp,
        });
      }
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  async createJob(payload: {
    keyword?: string;
    sortBy?: "hot" | "latest";
    targetCount?: number;
    collectorMode?: CollectorMode;
    providerId?: CollectorProviderId;
    token?: string;
  }) {
    const userId = await this.resolveUserId(payload.token);
    const collectorMode = payload.collectorMode || "mock";
    const provider = this.getCollectorProvider({
      collectorMode,
      providerId: payload.providerId,
    });
    const account = await this.getPlatformAccount(userId, "xiaohongshu");
    const targetCount = Math.max(5, Math.min(50, Number(payload.targetCount || 10)));
    const keyword = String(payload.keyword || "").trim();
    const sortBy = payload.sortBy || "hot";

    if (collectorMode === "real") {
      const usesLocalCookie = provider.id === "xiaohongshu-playwright";

      if (usesLocalCookie && !account?.cookieBlob) {
        return {
          success: false,
          jobId: null,
          status: "blocked",
          createdSamples: 0,
          collectorMode,
          errorMessage: "No Xiaohongshu cookie has been saved. Save and verify a cookie before running real collection.",
        };
      }

      let effectiveAccount = account;
      if (usesLocalCookie && effectiveAccount?.cookieStatus === "saved") {
        const autoVerify = await this.autoVerifySavedCookie(effectiveAccount);
        effectiveAccount = autoVerify.account || effectiveAccount;
        if (!autoVerify.verified) {
          return {
            success: false,
            jobId: null,
            status: "blocked",
            createdSamples: 0,
            collectorMode,
            errorMessage: `${autoVerify.errorMessage || "The saved Xiaohongshu cookie could not be verified automatically."} Update the cookie and try again.`,
          };
        }
      }

      if (usesLocalCookie && effectiveAccount?.cookieStatus !== "verified") {
        const reason =
          effectiveAccount?.cookieStatus === "invalid"
            ? effectiveAccount?.verificationMessage || "The saved Xiaohongshu cookie is invalid."
            : "The saved Xiaohongshu cookie has not been verified yet.";
        return {
          success: false,
          jobId: null,
          status: "blocked",
          createdSamples: 0,
          collectorMode,
          errorMessage: `${reason} Use Verify Cookie before running real collection.`,
        };
      }

      const readiness = await provider.getReadiness({ cookieBlob: effectiveAccount?.cookieBlob });
      if (!readiness.enabled) {
        return {
          success: false,
          jobId: null,
          status: "blocked",
          createdSamples: 0,
          collectorMode,
          errorMessage: `Collector provider ${provider.id} is not enabled.`,
        };
      }
    }

    const timestamp = this.getTimestamp();
    const job: ViralLabCollectionJob = {
      id: this.store.createId("job"),
      userId,
      platform: "xiaohongshu",
      keyword,
      sortBy,
      collectorMode,
      targetCount,
      status: "pending",
      progress: 0,
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      metadataJson: JSON.stringify(this.buildProviderMetadata(provider, "queued")),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.createCollectionJobRecord(job);
    await this.appendAuditLog({
      userId,
      action: "collection_job_created",
      targetType: "collection_job",
      targetId: job.id,
      payloadJson: JSON.stringify({
        keyword: job.keyword,
        targetCount: job.targetCount,
        collectorMode,
        status: "pending",
      }),
      createdAt: timestamp,
    });

    const queued = {
      success: true,
      jobId: job.id,
      status: "pending",
      createdSamples: 0,
      collectorMode,
      errorMessage: null,
    };

    setTimeout(() => {
      void this.runCollectorJob(queued.jobId);
    }, 0);

    return queued;
  }

  async getCapabilities(token?: string) {
    if (this.prisma.isEnabled()) {
      const userId = await this.resolveUserId(token);
      const account = await this.prisma.platformAccount.findFirst({
        where: { userId, platform: "xiaohongshu" },
      });
      return {
        success: true,
        items: {
          mock: {
            ...(await this.mockCollector.getReadiness()),
            ready: true,
            description: "Local MVP collector that generates simulated Xiaohongshu samples.",
          },
          real: {
            ...(await this.xiaohongshuCollector.getReadiness({ cookieBlob: account?.cookieBlob || undefined })),
            cookieStatus: account?.cookieStatus || "missing",
            lastVerifiedAt: account?.lastVerifiedAt?.toISOString() || null,
            canCollect: account?.cookieStatus === "verified" || account?.cookieStatus === "saved",
            verificationRequired: account?.cookieStatus === "saved",
            verificationMessage: account?.verificationMessage || null,
            description: "Playwright-based Xiaohongshu collector bridge.",
          },
          managed: {
            ...(await this.xiaohongshuManagedCollector.getReadiness({ cookieBlob: account?.cookieBlob || undefined })),
            description:
              "Reserved slot for future managed scraping integrations such as XCrawl-like providers.",
          },
        },
      };
    }

    const user = await this.authService.resolveUserFromToken(token);
    const db = await this.store.read();
    const userId = user?.id || db.users[0]?.id || "user_demo";
    const account = db.platformAccounts.find((item) => item.userId === userId && item.platform === "xiaohongshu");
    return {
      success: true,
      items: {
        mock: {
          ...(await this.mockCollector.getReadiness()),
          ready: true,
          description: "Local MVP collector that generates simulated Xiaohongshu samples.",
        },
        real: {
          ...(await this.xiaohongshuCollector.getReadiness({ cookieBlob: account?.cookieBlob })),
          cookieStatus: account?.cookieStatus || "missing",
          lastVerifiedAt: account?.lastVerifiedAt || null,
          canCollect: account?.cookieStatus === "verified" || account?.cookieStatus === "saved",
          verificationRequired: account?.cookieStatus === "saved",
          verificationMessage: account?.verificationMessage || null,
          description: "Playwright-based Xiaohongshu collector bridge.",
        },
        managed: {
          ...(await this.xiaohongshuManagedCollector.getReadiness({ cookieBlob: account?.cookieBlob })),
          description:
            "Reserved slot for future managed scraping integrations such as XCrawl-like providers.",
        },
      },
    };
  }

  async getDebugSummary(token?: string) {
    if (this.prisma.isEnabled()) {
      const userId = await this.resolveUserId(token);
      const account = await this.prisma.platformAccount.findFirst({
        where: { userId, platform: "xiaohongshu" },
      });
      const latestRealJob = await this.prisma.collectionJob.findFirst({
        where: { userId, collectorMode: "real" },
        orderBy: { createdAt: "desc" },
      });

      const verificationMetadata = account?.verificationMetadataJson
        ? this.parseMetadata(account.verificationMetadataJson)
        : null;

      return {
        success: true,
        item: {
          platform: "xiaohongshu",
          account: account
            ? {
                id: account.id,
                accountName: account.accountName || "Xiaohongshu Account",
                cookieStatus: account.cookieStatus,
                lastVerifiedAt: account.lastVerifiedAt?.toISOString() || null,
                verificationMessage: account.verificationMessage,
                verificationMetadata,
              }
            : null,
          latestRealJob: latestRealJob ? this.mapCollectionJobRecord(latestRealJob) : null,
        },
      };
    }

    const user = await this.authService.resolveUserFromToken(token);
    const db = await this.store.read();
    const userId = user?.id || db.users[0]?.id || "user_demo";
    const account = db.platformAccounts.find((item) => item.userId === userId && item.platform === "xiaohongshu");
    const latestRealJob = db.collectionJobs
      .filter((item) => item.userId === userId && item.collectorMode === "real")
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

    const verificationMetadata = account?.verificationMetadataJson
      ? this.parseMetadata(account.verificationMetadataJson)
      : null;

    return {
      success: true,
      item: {
        platform: "xiaohongshu",
        account: account
          ? {
              id: account.id,
              accountName: account.accountName,
              cookieStatus: account.cookieStatus,
              lastVerifiedAt: account.lastVerifiedAt,
              verificationMessage: account.verificationMessage,
              verificationMetadata,
            }
          : null,
        latestRealJob: latestRealJob ? this.normalizeJob(latestRealJob) : null,
      },
    };
  }

  private parseStringArray(value: string | null) {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
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
    return this.normalizeJob({
      id: item.id,
      userId: item.userId,
      platform: item.platform as "xiaohongshu",
      keyword: item.keyword,
      sortBy: item.sortBy as "hot" | "latest",
      collectorMode: item.collectorMode as "mock" | "real",
      targetCount: item.targetCount,
      status: item.status as ViralLabCollectionJob["status"],
      progress: item.progress,
      startedAt: item.startedAt?.toISOString() || null,
      finishedAt: item.finishedAt?.toISOString() || null,
      errorMessage: item.errorMessage,
      metadataJson: item.metadataJson,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    });
  }
}
