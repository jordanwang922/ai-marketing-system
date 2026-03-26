import { Injectable } from "@nestjs/common";
import { ViralLabStoreService } from "../store/store.service";
import { PrismaService } from "../prisma.service";
import { computeSampleQuality, parseJsonArray } from "./sample-quality";

@Injectable()
export class SamplesService {
  constructor(
    private readonly store: ViralLabStoreService,
    private readonly prisma: PrismaService,
  ) {}

  async list() {
    if (this.prisma.isEnabled()) {
      const items = await this.prisma.contentSample.findMany({
        include: { job: true },
        orderBy: { createdAt: "desc" },
      });
      return {
        success: true,
        items: items.map((item) => this.mapSampleRecord(item, item.job?.metadataJson || null)),
      };
    }

    const db = await this.store.read();
    return {
      success: true,
      items: db.samples
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((item) => {
          const job = db.collectionJobs.find((candidate) => candidate.id === item.jobId);
          return this.mapSampleRecord(item, job?.metadataJson || null);
        }),
    };
  }

  async getOne(sampleId: string) {
    if (this.prisma.isEnabled()) {
      const item = await this.prisma.contentSample.findUnique({
        where: { id: sampleId },
        include: { job: true },
      });
      return {
        success: true,
        item: item ? this.mapSampleRecord(item, item.job?.metadataJson || null) : null,
      };
    }

    const db = await this.store.read();
    const item = db.samples.find((sample) => sample.id === sampleId) || null;
    const job = item ? db.collectionJobs.find((candidate) => candidate.id === item.jobId) : null;
    return { success: true, item: item ? this.mapSampleRecord(item, job?.metadataJson || null) : null };
  }

  private parseMetadata(value: string | null) {
    if (!value) return null;
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private mapSampleRecord(
    item: {
      id: string;
      jobId?: string | null;
      userId: string;
      platform: string;
      collectorMode: string;
      keyword?: string | null;
      platformContentId?: string | null;
      title: string;
      contentText?: string | null;
      contentSummary?: string | null;
      authorName?: string | null;
      authorId?: string | null;
      publishTime?: Date | string | null;
      likeCount: number;
      commentCount: number;
      collectCount: number;
      shareCount: number;
      tagsJson?: string | null;
      tags?: string[];
      sourceUrl?: string | null;
      coverImageUrl?: string | null;
      mediaImageUrlsJson?: string | null;
      mediaImageUrls?: string[];
      mediaVideoUrlsJson?: string | null;
      mediaVideoUrls?: string[];
      status: string;
      createdAt: Date | string;
      updatedAt: Date | string;
    },
    metadataJson: string | null,
  ) {
    const metadata = this.parseMetadata(metadataJson);
    const contentText = item.contentText || "";
    const contentSummary = item.contentSummary || "";
    const authorName = item.authorName || "";
    const authorId = item.authorId || "";
    const publishTime =
      item.publishTime instanceof Date
        ? item.publishTime.toISOString()
        : typeof item.publishTime === "string"
          ? item.publishTime
          : "";
    const sourceUrl = item.sourceUrl || "";
    const coverImageUrl = item.coverImageUrl || "";
    const mediaImageUrls = Array.isArray(item.mediaImageUrls) ? item.mediaImageUrls : parseJsonArray(item.mediaImageUrlsJson || null);
    const mediaVideoUrls = Array.isArray(item.mediaVideoUrls) ? item.mediaVideoUrls : parseJsonArray(item.mediaVideoUrlsJson || null);
    const { qualityFlags, qualityScore } = computeSampleQuality({
      platformContentId: item.platformContentId || "",
      contentText,
      contentSummary,
      authorName,
      authorId,
      publishTime,
      sourceUrl,
      coverImageUrl,
      mediaImageUrls,
      mediaVideoUrls,
      tags: Array.isArray(item.tags) ? item.tags : parseJsonArray(item.tagsJson || null),
    });
    return {
      id: item.id,
      jobId: item.jobId || "",
      userId: item.userId,
      platform: item.platform as "xiaohongshu",
      collectorMode: item.collectorMode as "mock" | "real",
      provider: typeof metadata?.provider === "string" ? metadata.provider : item.collectorMode === "real" ? "xiaohongshu-playwright" : "mock-local",
      keyword: item.keyword || "",
      platformContentId: item.platformContentId || "",
      title: item.title,
      contentText,
      contentSummary,
      authorName,
      authorId,
      publishTime,
      likeCount: item.likeCount,
      commentCount: item.commentCount,
      collectCount: item.collectCount,
      shareCount: item.shareCount,
      tags: Array.isArray(item.tags) ? item.tags : parseJsonArray(item.tagsJson || null),
      sourceUrl,
      coverImageUrl,
      mediaImageUrls,
      mediaVideoUrls,
      qualityScore,
      qualityFlags,
      status: item.status as "active",
      createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
      updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt,
    };
  }
}
