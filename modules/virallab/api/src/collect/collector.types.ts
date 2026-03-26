export type CollectorMode = "mock" | "real";
export type CollectorProviderId =
  | "mock-local"
  | "xiaohongshu-playwright"
  | "xiaohongshu-managed";

export type CollectSortBy =
  | "hot"
  | "latest"
  | "most-liked"
  | "most-commented"
  | "most-collected";

export type CollectNoteType = "all" | "image" | "video";
export type CollectPublishWindow = "all" | "day" | "week" | "half-year";
export type SampleContentType = "image" | "video";
export type SampleContentFormat =
  | "single-image-note"
  | "multi-image-note"
  | "long-image-note"
  | "video-note";

export type CollectRequest = {
  keyword: string;
  sortBy: CollectSortBy;
  noteType: CollectNoteType;
  publishWindow: CollectPublishWindow;
  targetCount: number;
  manualSearchPageUrl?: string;
  manualSearchRequestData?: Record<string, unknown> | null;
};

export type CollectorContext = {
  cookieBlob?: string;
  onProgress?: (update: CollectorProgressUpdate) => Promise<void> | void;
};

export type CollectorProgressUpdate = {
  progress: number;
  stage?: string;
  message?: string;
  extractedCount?: number;
  totalCount?: number;
  metadata?: Record<string, unknown>;
};

export type CollectedSampleInput = {
  platformContentId: string;
  title: string;
  contentText: string;
  contentSummary: string;
  contentType: SampleContentType;
  contentFormat: SampleContentFormat;
  longImageCandidate: boolean;
  authorName: string;
  authorId: string;
  publishTime: string;
  likeCount: number;
  commentCount: number;
  collectCount: number;
  shareCount: number;
  tags: string[];
  sourceUrl: string;
  coverImageUrl: string;
  mediaImageUrls: string[];
  mediaVideoUrls: string[];
  hasVideoMedia: boolean;
  ocrTextRaw: string;
  ocrTextClean: string;
  transcriptText: string;
  transcriptSegments: string[];
  frameOcrTexts: string[];
  resolvedContentText: string;
  resolvedContentSource: "note-body" | "image-ocr" | "video-frame-ocr" | "merged";
};

export type CollectorRunResult = {
  mode: CollectorMode;
  status: "completed" | "failed";
  progress: number;
  metadata: Record<string, unknown>;
  errorMessage?: string | null;
  samples: CollectedSampleInput[];
};

export type CollectorVerificationResult = {
  success: boolean;
  verified: boolean;
  metadata: Record<string, unknown>;
  errorMessage?: string | null;
};

export type CollectorReadiness = {
  mode: CollectorMode;
  enabled: boolean;
  hasCookie: boolean;
  runner: string;
  provider: CollectorProviderId;
};

export interface ViralLabCollectorProvider {
  readonly id: CollectorProviderId;
  readonly mode: CollectorMode;
  readonly platform: "xiaohongshu";
  collect(request: CollectRequest, context?: CollectorContext): Promise<CollectorRunResult>;
  verifyCookie?(context?: CollectorContext): Promise<CollectorVerificationResult>;
  getReadiness(context?: CollectorContext): Promise<CollectorReadiness>;
}
