export type ViralLabUser = {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  status: "active";
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ViralLabSession = {
  id: string;
  userId: string;
  token: string;
  createdAt: string;
  expiredAt: string;
};

export type ViralLabPlatformAccount = {
  id: string;
  userId: string;
  platform: "xiaohongshu";
  accountName: string;
  cookieBlob: string;
  cookieStatus: "missing" | "saved" | "verified" | "invalid";
  lastVerifiedAt: string | null;
  verificationMessage: string | null;
  verificationMetadataJson: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ViralLabCollectionJob = {
  id: string;
  userId: string;
  platform: "xiaohongshu";
  keyword: string;
  sortBy: "hot" | "latest" | "most-liked" | "most-commented" | "most-collected";
  noteType: "all" | "image" | "video";
  publishWindow: "all" | "day" | "week" | "half-year";
  collectorMode: "mock" | "real";
  targetCount: number;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  metadataJson: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ViralLabSample = {
  id: string;
  jobId: string;
  userId: string;
  platform: "xiaohongshu";
  collectorMode: "mock" | "real";
  keyword: string;
  platformContentId: string;
  title: string;
  contentText: string;
  contentSummary: string;
  contentType: "image" | "video";
  contentFormat: "single-image-note" | "multi-image-note" | "long-image-note" | "video-note";
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
  status: "active";
  adDecisionStatus?: "pending" | "accepted" | "rejected";
  adConfidence?: number;
  adDetectorRunId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ViralLabAdDetectorConfig = {
  id: string;
  userId: string;
  enabled: boolean;
  threshold: number;
  systemPrompt: string;
  userPrompt: string;
  createdAt: string;
  updatedAt: string;
};

export type ViralLabAdDetectorRun = {
  id: string;
  userId: string;
  sampleId: string | null;
  status: "completed" | "failed";
  isAd: boolean;
  confidence: number;
  commercialIntentScore: number;
  adType: string;
  reasoning: string;
  adSignals: string[];
  threshold: number;
  systemPromptVersion: string;
  userPromptVersion: string;
  createdAt: string;
  updatedAt: string;
};

export type ViralLabAdLibraryItem = {
  id: string;
  userId: string;
  sampleId: string | null;
  detectorRunId: string;
  title: string;
  authorName: string;
  publishTime: string;
  sourceUrl: string;
  isAd: boolean;
  confidence: number;
  commercialIntentScore: number;
  adType: string;
  reasoning: string;
  adSignals: string[];
  brandNames: string[];
  productNames: string[];
  institutionNames: string[];
  serviceNames: string[];
  createdAt: string;
  updatedAt: string;
};

export type ViralLabAnalysis = {
  id: string;
  sampleId: string;
  userId: string;
  analysisVersion: string;
  hookType: string;
  structureType: string;
  emotionTags: string[];
  rhythmType: string;
  trendTags: string[];
  targetAudience: string[];
  viralReasons: string[];
  keyPoints: string[];
  riskNotes: string[];
  summary: string;
  modelName: string;
  promptVersion: string;
  fallbackStatus: "llm" | "local-fallback" | "local-only";
  fallbackReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ViralLabPattern = {
  id: string;
  userId: string;
  name: string;
  topic: string;
  description: string;
  hookTemplate: string;
  bodyTemplate: string;
  endingTemplate: string;
  emotionalCore: string;
  trendSummary: string;
  applicableScenarios: string[];
  confidenceScore: number;
  sourceAnalysisIds: string[];
  sourceSampleIds: string[];
  modelName: string;
  promptVersion: string;
  fallbackStatus: "llm" | "local-fallback" | "local-only";
  fallbackReason: string | null;
  status: "active";
  createdAt: string;
  updatedAt: string;
};

export type ViralLabGenerationJob = {
  id: string;
  userId: string;
  patternId: string | null;
  topic: string;
  goal: string;
  tone: string;
  targetAudience: string;
  status: "pending" | "completed" | "failed";
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ViralLabGeneratedContent = {
  id: string;
  jobId: string;
  userId: string;
  patternId: string | null;
  platform: "xiaohongshu";
  titleCandidates: string[];
  bodyText: string;
  coverCopy: string;
  tags: string[];
  generationNotes: string;
  imageSuggestions: ViralLabImageSuggestion[];
  imageAssets: ViralLabGeneratedImageAsset[];
  modelName: string;
  promptVersion: string;
  fallbackStatus: "llm" | "local-fallback" | "local-only";
  fallbackReason: string | null;
  status: "draft";
  createdAt: string;
  updatedAt: string;
};

export type ViralLabImageSuggestion = {
  id: string;
  order: number;
  title: string;
  description: string;
  prompt: string;
  visualStyle: "photo-realistic" | "editorial" | "clean-illustration" | "hybrid";
  aspectRatio: "3:4" | "1:1";
};

export type ViralLabGeneratedImageAsset = {
  id: string;
  suggestionId: string;
  status: "ready" | "failed";
  prompt: string;
  imageUrl: string | null;
  localPath: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ViralLabWorkflowJob = {
  id: string;
  userId: string | null;
  workflowType: "latest-real-pipeline";
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  targetJobId: string | null;
  errorMessage: string | null;
  metadataJson: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
};

export type ViralLabAuditLog = {
  id: string;
  userId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  payloadJson: string | null;
  createdAt: string;
};

export type ViralLabDatabase = {
  users: ViralLabUser[];
  sessions: ViralLabSession[];
  platformAccounts: ViralLabPlatformAccount[];
  collectionJobs: ViralLabCollectionJob[];
  samples: ViralLabSample[];
  adDetectorConfigs: ViralLabAdDetectorConfig[];
  adDetectorRuns: ViralLabAdDetectorRun[];
  adLibraryItems: ViralLabAdLibraryItem[];
  analyses: ViralLabAnalysis[];
  patterns: ViralLabPattern[];
  generationJobs: ViralLabGenerationJob[];
  generatedContents: ViralLabGeneratedContent[];
  workflowJobs: ViralLabWorkflowJob[];
  auditLogs: ViralLabAuditLog[];
};
