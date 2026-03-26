import { Injectable } from "@nestjs/common";
import { ViralLabStoreService } from "../store/store.service";
import { PrismaService } from "../prisma.service";
import { computeSampleQuality, parseJsonArray } from "./sample-quality";

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
        .sort((a, b) => toSortableTime(b.createdAt) - toSortableTime(a.createdAt))
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
      parsedPayloadJson?: string | null;
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
    const parsedPayload = this.parseMetadata(item.parsedPayloadJson || null);
    const hasVideoMedia = Boolean(parsedPayload?.hasVideoMedia) || mediaVideoUrls.length > 0;
    const resolvedContentText =
      typeof parsedPayload?.resolvedContentText === "string" && parsedPayload.resolvedContentText
        ? parsedPayload.resolvedContentText
        : contentText;
    const { qualityFlags, qualityScore } = computeSampleQuality({
      platformContentId: item.platformContentId || "",
      contentText: resolvedContentText,
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
      contentType: hasVideoMedia || parsedPayload?.contentType === "video" ? "video" : "image",
      contentFormat:
        typeof parsedPayload?.contentFormat === "string"
          ? parsedPayload.contentFormat
          : hasVideoMedia || mediaVideoUrls.length
            ? "video-note"
            : mediaImageUrls.length > 1
              ? "multi-image-note"
              : "single-image-note",
      longImageCandidate: Boolean(parsedPayload?.longImageCandidate),
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
      hasVideoMedia,
      ocrTextRaw: typeof parsedPayload?.ocrTextRaw === "string" ? parsedPayload.ocrTextRaw : "",
      ocrTextClean: typeof parsedPayload?.ocrTextClean === "string" ? parsedPayload.ocrTextClean : "",
      transcriptText: typeof parsedPayload?.transcriptText === "string" ? parsedPayload.transcriptText : "",
      transcriptSegments: Array.isArray(parsedPayload?.transcriptSegments)
        ? parsedPayload.transcriptSegments.map((entry) => String(entry))
        : [],
      frameOcrTexts: Array.isArray(parsedPayload?.frameOcrTexts)
        ? parsedPayload.frameOcrTexts.map((entry) => String(entry))
        : [],
      resolvedContentText,
      resolvedContentSource:
        parsedPayload?.resolvedContentSource === "image-ocr" ||
        parsedPayload?.resolvedContentSource === "video-frame-ocr" ||
        parsedPayload?.resolvedContentSource === "merged"
          ? parsedPayload.resolvedContentSource
          : "note-body",
      qualityScore,
      qualityFlags,
      status: item.status as "active",
      createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
      updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt,
    };
  }
}
