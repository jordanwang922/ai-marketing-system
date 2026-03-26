const text = (value: unknown) => String(value || "").replace(/\s+/g, " ").trim();

export const parseJsonArray = (value: string | null | undefined) => {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
};

export const computeSampleQualityFlags = (input: {
  platformContentId?: string;
  contentText?: string;
  contentSummary?: string;
  authorName?: string;
  authorId?: string;
  publishTime?: string;
  sourceUrl?: string;
  coverImageUrl?: string;
  mediaImageUrls?: string[];
  mediaVideoUrls?: string[];
  tags?: string[];
}) => {
  const flags: string[] = [];
  if (!text(input.platformContentId)) flags.push("missing_platform_content_id");
  if (!text(input.authorName)) flags.push("missing_author_name");
  if (!text(input.authorId)) flags.push("missing_author_id");
  if (!text(input.publishTime)) flags.push("missing_publish_time");
  if (!text(input.contentText) || text(input.contentText).length < 80) flags.push("weak_content_text");
  if (!text(input.contentSummary) || text(input.contentSummary).length < 40) flags.push("weak_content_summary");
  if (!text(input.coverImageUrl)) flags.push("missing_cover");
  if (((input.mediaImageUrls?.length || 0) + (input.mediaVideoUrls?.length || 0)) === 0) flags.push("missing_media");
  if (!(input.tags?.length || 0)) flags.push("missing_tags");
  if (!text(input.sourceUrl).includes("/explore/")) flags.push("non_canonical_source_url");
  return flags;
};

export const computeSampleQualityScore = (flags: string[]) => Math.max(0, 100 - flags.length * 12);

export const computeSampleQuality = (input: Parameters<typeof computeSampleQualityFlags>[0]) => {
  const qualityFlags = computeSampleQualityFlags(input);
  const qualityScore = computeSampleQualityScore(qualityFlags);
  return {
    qualityFlags,
    qualityScore,
  };
};
