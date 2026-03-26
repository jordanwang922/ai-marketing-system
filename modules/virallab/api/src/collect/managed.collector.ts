import {
  CollectedSampleInput,
  CollectRequest,
  CollectorContext,
  CollectorReadiness,
  CollectorRunResult,
  CollectorVerificationResult,
  ViralLabCollectorProvider,
} from "./collector.types";

type XCrawlScrapeResponse = {
  status?: string;
  scrape_id?: string;
  data?: {
    json?: unknown;
    markdown?: string;
    html?: string;
    links?: Array<{
      url?: string;
      href?: string;
      text?: string;
      title?: string;
    }>;
    screenshot?: string;
    metadata?: {
      final_url?: string;
      title?: string;
      status_code?: number;
    };
    credits_used?: number;
  };
};

const DEFAULT_BASE_URL = "https://run.xcrawl.com/v1";

const normalizeText = (value: unknown) => String(value || "").replace(/\s+/g, " ").trim();

const normalizeSourceUrl = (value: unknown) => {
  const url = normalizeText(value);
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) {
    return `https://www.xiaohongshu.com${url}`;
  }
  return `https://www.xiaohongshu.com/${url.replace(/^\/+/, "")}`;
};

const normalizeStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return normalizeText(record.name || record.tag || record.text || record.value);
      }
      return normalizeText(item);
    })
    .filter(Boolean);
};

const normalizeCount = (value: unknown) => {
  const raw = normalizeText(value);
  if (!raw) return 0;
  const wanMatch = raw.match(/^(\d+(?:\.\d+)?)\s*万$/);
  if (wanMatch) {
    return Math.round(Number(wanMatch[1]) * 10000);
  }
  const qianMatch = raw.match(/^(\d+(?:\.\d+)?)\s*k$/i);
  if (qianMatch) {
    return Math.round(Number(qianMatch[1]) * 1000);
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeTimestamp = (value: unknown) => {
  const raw = normalizeText(value);
  if (!raw) return "";
  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString();
  }

  const shortDate = raw.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (shortDate) {
    const year = new Date().getFullYear();
    const month = Number(shortDate[1]);
    const day = Number(shortDate[2]);
    return new Date(Date.UTC(year, month - 1, day)).toISOString();
  }

  return raw;
};

const pickFirstString = (...candidates: unknown[]) => {
  for (const candidate of candidates) {
    const normalized = normalizeText(candidate);
    if (normalized) return normalized;
  }
  return "";
};

const extractNestedArray = (input: unknown): unknown[] => {
  if (!input || typeof input !== "object") return [];
  const record = input as Record<string, unknown>;
  const directCandidates = [
    record.items,
    record.results,
    record.notes,
    record.cards,
    record.list,
    record.data,
  ];

  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === "object") {
      const nested = candidate as Record<string, unknown>;
      const nestedArray =
        (Array.isArray(nested.items) && nested.items) ||
        (Array.isArray(nested.results) && nested.results) ||
        (Array.isArray(nested.notes) && nested.notes) ||
        (Array.isArray(nested.cards) && nested.cards) ||
        (Array.isArray(nested.list) && nested.list);
      if (nestedArray) return nestedArray;
    }
  }

  return [];
};

const truncateText = (value: string, limit: number) => {
  if (value.length <= limit) return value;
  return `${value.slice(0, Math.max(0, limit - 1)).trim()}…`;
};

const stripHtml = (value: string) =>
  value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractExploreId = (url: string) => url.match(/\/explore\/([^/?]+)/)?.[1] || "";

const extractExploreLinksFromMarkdown = (markdown: string) => {
  const matches = Array.from(markdown.matchAll(/\[([^\]]*?)\]\((https?:\/\/www\.xiaohongshu\.com\/explore\/[^)\s]+)\)/gi));
  return matches.map((match) => ({
    sourceUrl: normalizeSourceUrl(match[2]),
    title: normalizeText(match[1]),
  }));
};

const extractExploreLinksFromHtml = (html: string) => {
  const matches = Array.from(
    html.matchAll(/<a[^>]+href=["']([^"']*\/explore\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi),
  );
  return matches.map((match) => ({
    sourceUrl: normalizeSourceUrl(match[1]),
    title: stripHtml(match[2]),
  }));
};

const buildSearchUrl = (request: CollectRequest) => {
  const params = new URLSearchParams({
    keyword: request.keyword,
    source: "web_search_result_notes",
  });
  const sortMap: Record<CollectRequest["sortBy"], string | null> = {
    hot: null,
    latest: "time_descending",
    "most-liked": "likes_descending",
    "most-commented": "comments_descending",
    "most-collected": "collects_descending",
  };
  const noteTypeMap: Record<CollectRequest["noteType"], string | null> = {
    all: null,
    image: "normal",
    video: "video",
  };
  const timeMap: Record<CollectRequest["publishWindow"], string | null> = {
    all: null,
    day: "day",
    week: "week",
    "half-year": "half_year",
  };
  if (sortMap[request.sortBy]) params.set("sort_by", sortMap[request.sortBy]);
  if (noteTypeMap[request.noteType]) params.set("note_type", noteTypeMap[request.noteType]);
  if (timeMap[request.publishWindow]) params.set("publish_time", timeMap[request.publishWindow]);
  return `https://www.xiaohongshu.com/search_result?${params.toString()}`;
};

const buildJsonSchema = (targetCount: number) => ({
  type: "object",
  properties: {
    items: {
      type: "array",
      maxItems: targetCount,
      items: {
        type: "object",
        properties: {
          platformContentId: { type: "string" },
          title: { type: "string" },
          contentText: { type: "string" },
          contentSummary: { type: "string" },
          authorName: { type: "string" },
          authorId: { type: "string" },
          publishTime: { type: "string" },
          likeCount: { type: "number" },
          commentCount: { type: "number" },
          collectCount: { type: "number" },
          shareCount: { type: "number" },
          tags: {
            type: "array",
            items: { type: "string" },
          },
          sourceUrl: { type: "string" },
          coverImageUrl: { type: "string" },
          mediaImageUrls: {
            type: "array",
            items: { type: "string" },
          },
          mediaVideoUrls: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["title", "sourceUrl"],
      },
    },
  },
  required: ["items"],
});

export class XiaohongshuManagedCollector implements ViralLabCollectorProvider {
  readonly id = "xiaohongshu-managed" as const;
  readonly mode = "real" as const;
  readonly platform = "xiaohongshu" as const;

  private getBaseUrl() {
    return String(process.env.XCRAWL_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

  private isConfigured() {
    return (
      String(process.env.VIRALLAB_ENABLE_MANAGED_COLLECTOR || "false") === "true" &&
      Boolean(process.env.XCRAWL_API_KEY)
    );
  }

  private getTimeoutMs() {
    const numeric = Number(process.env.XCRAWL_TIMEOUT_MS || 60000);
    return Number.isFinite(numeric) ? numeric : 60000;
  }

  private async requestScrape(request: CollectRequest) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.getTimeoutMs());
    try {
      const response = await fetch(`${this.getBaseUrl()}/scrape`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.XCRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: buildSearchUrl(request),
          js_render: {
            enabled: true,
            wait_until: "load",
            viewport: { width: 1440, height: 1200 },
          },
          output: {
            formats: ["json", "markdown", "html", "links", "screenshot"],
          },
          json: {
            prompt: `Extract up to ${request.targetCount} Xiaohongshu note cards from this search results page for the keyword "${request.keyword}". Return only visible note cards. For each item extract platformContentId, title, contentText, contentSummary, authorName, authorId, publishTime, likeCount, commentCount, collectCount, shareCount, tags, sourceUrl, coverImageUrl, mediaImageUrls, mediaVideoUrls. If a field is not visible, return an empty string or 0.`,
            json_schema: buildJsonSchema(request.targetCount),
          },
        }),
        signal: controller.signal,
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`XCrawl scrape failed: ${response.status} ${text.slice(0, 300)}`);
      }

      return JSON.parse(text) as XCrawlScrapeResponse;
    } finally {
      clearTimeout(timer);
    }
  }

  private normalizeSample(item: unknown): CollectedSampleInput | null {
    if (!item || typeof item !== "object") return null;
    const record = item as Record<string, unknown>;
    const author =
      record.author && typeof record.author === "object" ? (record.author as Record<string, unknown>) : {};
    const metrics =
      record.metrics && typeof record.metrics === "object" ? (record.metrics as Record<string, unknown>) : {};
    const sourceUrl = normalizeSourceUrl(record.sourceUrl || record.url || record.noteUrl || record.link);
    const title = pickFirstString(record.title, record.noteTitle, record.name);
    if (!title || !sourceUrl) return null;

    const mediaImageUrls = normalizeStringArray(
      record.mediaImageUrls || record.images || record.imageUrls || record.media_images,
    );
    const mediaVideoUrls = normalizeStringArray(
      record.mediaVideoUrls || record.videos || record.videoUrls || record.media_videos,
    );
    const coverImageUrl = pickFirstString(
      record.coverImageUrl,
      record.cover,
      record.coverUrl,
      mediaImageUrls[0],
    );
    const platformContentId = pickFirstString(
      record.platformContentId,
      record.noteId,
      record.id,
      sourceUrl.match(/\/explore\/([^/?]+)/)?.[1],
    );
    const contentText = pickFirstString(record.contentText, record.bodyText, record.desc, record.description, record.content);
    const contentSummary = pickFirstString(
      record.contentSummary,
      record.summary,
      contentText ? contentText.slice(0, 240) : "",
    );
    const authorName = pickFirstString(
      record.authorName,
      author.name,
      author.nickname,
      author.userName,
    );
    const authorId = pickFirstString(record.authorId, author.id, author.userId, author.uid);

    return {
      platformContentId,
      title,
      contentText,
      contentSummary,
      contentType: mediaVideoUrls.length ? "video" : "image",
      contentFormat: mediaVideoUrls.length ? "video-note" : mediaImageUrls.length > 1 ? "multi-image-note" : "single-image-note",
      longImageCandidate: !mediaVideoUrls.length && mediaImageUrls.length > 1 && contentText.length < 120,
      authorName,
      authorId,
      publishTime: normalizeTimestamp(record.publishTime || record.time || record.createdAt || record.publish_at),
      likeCount: normalizeCount(record.likeCount ?? metrics.likeCount ?? metrics.likes ?? record.likes),
      commentCount: normalizeCount(record.commentCount ?? metrics.commentCount ?? metrics.comments ?? record.comments),
      collectCount: normalizeCount(record.collectCount ?? metrics.collectCount ?? metrics.collects ?? record.collects),
      shareCount: normalizeCount(record.shareCount ?? metrics.shareCount ?? metrics.shares ?? record.shares),
      tags: normalizeStringArray(record.tags || record.tagList || record.tag_list),
      sourceUrl,
      coverImageUrl,
      mediaImageUrls,
      mediaVideoUrls,
      hasVideoMedia: mediaVideoUrls.length > 0,
      ocrTextRaw: "",
      ocrTextClean: "",
      transcriptText: "",
      transcriptSegments: [],
      frameOcrTexts: [],
      resolvedContentText: contentText || contentSummary,
      resolvedContentSource: "note-body",
    };
  }

  private buildFallbackSamplesFromLinks(
    request: CollectRequest,
    response: XCrawlScrapeResponse,
  ): CollectedSampleInput[] {
    const links = Array.isArray(response.data?.links) ? response.data?.links : [];
    const markdown = normalizeText(response.data?.markdown || "");
    const rawMarkdown = String(response.data?.markdown || "");
    const rawHtml = String(response.data?.html || "");
    const htmlText = stripHtml(String(response.data?.html || ""));
    const summarySource = markdown || htmlText;
    const markdownLinks = extractExploreLinksFromMarkdown(rawMarkdown);
    const htmlLinks = extractExploreLinksFromHtml(rawHtml);

    const noteLinks = [...links
      .map((link) => {
        const sourceUrl = normalizeSourceUrl(link.url || link.href);
        if (!sourceUrl.includes("/explore/")) return null;
        return {
          sourceUrl,
          title: pickFirstString(link.text, link.title),
        };
      })
      .filter((item): item is { sourceUrl: string; title: string } => Boolean(item?.sourceUrl)),
      ...markdownLinks,
      ...htmlLinks]
      .filter((item, index, array) => array.findIndex((candidate) => candidate.sourceUrl === item.sourceUrl) === index)
      .slice(0, request.targetCount);

    return noteLinks.map((item, index) => {
      const platformContentId = extractExploreId(item.sourceUrl);
      const title = item.title || `${request.keyword} note ${index + 1}`;
      const sharedSummary = truncateText(summarySource, 240);
      return {
        platformContentId,
        title,
        contentText: "",
        contentSummary: sharedSummary || `${request.keyword} related Xiaohongshu result extracted from managed links.`,
        contentType: request.noteType === "video" ? "video" : "image",
        contentFormat: request.noteType === "video" ? "video-note" : "single-image-note",
        longImageCandidate: false,
        authorName: "",
        authorId: "",
        publishTime: "",
        likeCount: 0,
        commentCount: 0,
        collectCount: 0,
        shareCount: 0,
        tags: [request.keyword],
        sourceUrl: item.sourceUrl,
        coverImageUrl: "",
        mediaImageUrls: [],
        mediaVideoUrls: [],
        hasVideoMedia: request.noteType === "video",
        ocrTextRaw: "",
        ocrTextClean: "",
        transcriptText: "",
        transcriptSegments: [],
        frameOcrTexts: [],
        resolvedContentText: sharedSummary || "",
        resolvedContentSource: "merged",
      };
    });
  }

  async collect(request: CollectRequest, _context?: CollectorContext): Promise<CollectorRunResult> {
    if (!this.isConfigured()) {
      return {
        mode: "real",
        status: "failed",
        progress: 0,
        metadata: {
          provider: this.id,
          ready: false,
          reason: "provider-not-configured",
        },
        errorMessage:
          "Managed Xiaohongshu collector is not configured yet. Set VIRALLAB_ENABLE_MANAGED_COLLECTOR=true and XCRAWL_API_KEY before using this provider.",
        samples: [],
      };
    }

    try {
      const result = await this.requestScrape(request);
      const rawItems = extractNestedArray(result.data?.json);
      const normalizedSamples = rawItems
        .map((item) => this.normalizeSample(item))
        .filter((item): item is CollectedSampleInput => Boolean(item))
        .slice(0, request.targetCount);
      const fallbackSamples =
        normalizedSamples.length === 0 ? this.buildFallbackSamplesFromLinks(request, result) : [];
      const samples = normalizedSamples.length ? normalizedSamples : fallbackSamples;
      const fallbackUsed = normalizedSamples.length === 0 && fallbackSamples.length > 0;

      return {
        mode: "real",
        status: samples.length ? "completed" : "failed",
        progress: samples.length ? 100 : 0,
        metadata: {
          provider: this.id,
          ready: true,
          reason: samples.length
            ? fallbackUsed
              ? "xcrawl-links-fallback-completed"
              : "xcrawl-scrape-completed"
            : "xcrawl-no-items",
          scrapeId: result.scrape_id || null,
          finalUrl: result.data?.metadata?.final_url || null,
          remoteStatus: result.status || null,
          statusCode: result.data?.metadata?.status_code || null,
          creditsUsed: result.data?.credits_used || null,
          screenshotCaptured: Boolean(result.data?.screenshot),
          rawItemCount: rawItems.length,
          normalizedItemCount: normalizedSamples.length,
          fallbackItemCount: fallbackSamples.length,
          fallbackUsed,
          markdownCaptured: Boolean(result.data?.markdown),
          htmlCaptured: Boolean(result.data?.html),
          linksCaptured: Array.isArray(result.data?.links) ? result.data?.links.length : 0,
        },
        errorMessage: samples.length ? null : "XCrawl completed but returned no structured Xiaohongshu items.",
        samples,
      };
    } catch (error) {
      return {
        mode: "real",
        status: "failed",
        progress: 0,
        metadata: {
          provider: this.id,
          ready: false,
          reason: "xcrawl-request-failed",
        },
        errorMessage: error instanceof Error ? error.message : "Unknown managed collector error.",
        samples: [],
      };
    }
  }

  async verifyCookie(_context?: CollectorContext): Promise<CollectorVerificationResult> {
    return {
      success: false,
      verified: false,
      metadata: {
        provider: this.id,
        ready: this.isConfigured(),
        reason: "provider-does-not-use-local-cookie",
      },
      errorMessage:
        "Managed provider verification is not tied to the locally saved Xiaohongshu cookie. Verify provider credentials instead.",
    };
  }

  async getReadiness(context?: CollectorContext): Promise<CollectorReadiness> {
    return {
      mode: "real",
      enabled: this.isConfigured(),
      hasCookie: Boolean(context?.cookieBlob),
      runner: "xcrawl-scrape-api",
      provider: this.id,
    };
  }
}
