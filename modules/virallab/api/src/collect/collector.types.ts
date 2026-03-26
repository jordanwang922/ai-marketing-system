export type CollectorMode = "mock" | "real";
export type CollectorProviderId =
  | "mock-local"
  | "xiaohongshu-playwright"
  | "xiaohongshu-managed";

export type CollectRequest = {
  keyword: string;
  sortBy: "hot" | "latest";
  targetCount: number;
};

export type CollectorContext = {
  cookieBlob?: string;
};

export type CollectedSampleInput = {
  platformContentId: string;
  title: string;
  contentText: string;
  contentSummary: string;
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
