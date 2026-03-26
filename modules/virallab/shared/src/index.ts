export const VIRALLAB_PLATFORM = "xiaohongshu";

export const VIRALLAB_JOB_STATUS = [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;

export type ViralLabJobStatus = (typeof VIRALLAB_JOB_STATUS)[number];

export type ViralLabCollectionJobSummary = {
  id: string;
  keyword: string;
  platform: "xiaohongshu";
  status: ViralLabJobStatus;
  progress: number;
  targetCount: number;
  createdAt: string;
};

export type ViralLabPatternSummary = {
  id: string;
  name: string;
  topic: string;
  confidenceScore: number;
  sampleCount: number;
};

export type ViralLabGenerationSummary = {
  id: string;
  topic: string;
  status: ViralLabJobStatus;
  patternName: string;
  createdAt: string;
};
