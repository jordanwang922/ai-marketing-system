import {
  CollectedSampleInput,
  CollectRequest,
  CollectorContext,
  CollectorReadiness,
  CollectorRunResult,
  ViralLabCollectorProvider,
} from "./collector.types";

const AUTHOR_POOL = ["内容研究员小羽", "运营实验室阿青", "爆款拆解日报", "副业观察站", "教育工具情报局"];
const TAG_POOL = ["小红书运营", "内容增长", "AI工具", "教育博主", "副业灵感", "选题拆解", "爆款方法"];

const buildTitle = (keyword: string, index: number) => {
  const templates = [
    `${keyword}赛道最近爆的 3 个共同点，我拆给你看`,
    `为什么这条${keyword}内容能爆？看完这 5 秒开头就懂了`,
    `做${keyword}不要再乱写了，这种结构更容易出爆款`,
    `我扒了 20 条${keyword}热门笔记，发现这套模板最稳`,
    `${keyword}内容起号，先学会这类“痛点式”标题`,
  ];
  return templates[index % templates.length];
};

const buildBody = (keyword: string, index: number) =>
  [
    `这篇内容围绕${keyword}切入，用一个非常直接的痛点开头吸引目标人群，再用清单结构把信息快速讲清楚。`,
    `作者先抛出反常识观点，再结合自己的经验展示结果，让读者在前几行就愿意继续往下看。`,
    `正文节奏很快，每一段都围绕${keyword}的具体使用场景展开，减少空话，增加可复制方法。`,
    `结尾使用“立即可做”的收束方式，让用户感觉不是在看观点，而是在拿行动指南。`,
  ][index % 4];

export class MockCollector implements ViralLabCollectorProvider {
  readonly id = "mock-local" as const;
  readonly mode = "mock" as const;
  readonly platform = "xiaohongshu" as const;

  async collect(request: CollectRequest, _context?: CollectorContext): Promise<CollectorRunResult> {
    const samples: CollectedSampleInput[] = Array.from({ length: request.targetCount }).map((_, index) => {
      const isVideo = request.noteType === "video" || (request.noteType === "all" && index % 3 === 0);
      const imageUrls = isVideo
        ? ["https://placehold.co/1200x1600?text=ViralLab+Video+Poster"]
        : index % 2 === 0
          ? [
              "https://placehold.co/1200x3200?text=ViralLab+Long+Image+1",
              "https://placehold.co/1200x3200?text=ViralLab+Long+Image+2",
            ]
          : ["https://placehold.co/1200x1600?text=ViralLab+Media"];
      const isLongImage = !isVideo && imageUrls.length > 1;
      const contentText = isLongImage ? "正文较短，主要信息在长图里。" : buildBody(request.keyword, index);
      return {
        platformContentId: `mock_${encodeURIComponent(request.keyword)}_${index + 1}`,
        title: buildTitle(request.keyword, index),
        contentText,
        contentSummary: `${request.keyword}主题的热门${isVideo ? "视频" : "图文"}样本，强调钩子、结构和结尾转化。`,
        contentType: isVideo ? "video" : "image",
        contentFormat: isVideo ? "video-note" : isLongImage ? "long-image-note" : "single-image-note",
        longImageCandidate: isLongImage,
        authorName: AUTHOR_POOL[index % AUTHOR_POOL.length],
        authorId: `mock_author_${index % AUTHOR_POOL.length}`,
        publishTime: new Date(Date.now() - index * 3600 * 1000).toISOString(),
        likeCount: 1200 + index * 137,
        commentCount: 90 + index * 11,
        collectCount: 230 + index * 18,
        shareCount: 40 + index * 5,
        tags: [TAG_POOL[index % TAG_POOL.length], TAG_POOL[(index + 2) % TAG_POOL.length], request.keyword],
        sourceUrl: `https://www.xiaohongshu.com/explore/mock_${encodeURIComponent(request.keyword)}_${index + 1}`,
        coverImageUrl: imageUrls[0],
        mediaImageUrls: imageUrls,
        mediaVideoUrls: isVideo ? ["https://example.com/mock-video.mp4"] : [],
        hasVideoMedia: isVideo,
        ocrTextRaw: isLongImage ? `${request.keyword} 长图第一页\n${request.keyword} 长图第二页` : "",
        ocrTextClean: isLongImage ? `${request.keyword} 长图第一页 ${request.keyword} 长图第二页` : "",
        transcriptText: isVideo ? `${request.keyword} 视频口播示例，讲解选题、结构和转化动作。` : "",
        transcriptSegments: isVideo ? [`${request.keyword} 视频口播示例`, "讲解选题、结构和转化动作。"] : [],
        frameOcrTexts: isVideo ? [`${request.keyword} 视频封面`, "3个爆款切入角度"] : [],
        resolvedContentText: isVideo
          ? `${request.keyword} 视频口播示例，讲解选题、结构和转化动作。`
          : isLongImage
            ? `${request.keyword} 长图第一页 ${request.keyword} 长图第二页`
            : contentText,
        resolvedContentSource: isVideo ? "video-frame-ocr" : isLongImage ? "image-ocr" : "note-body",
      };
    });

    return {
      mode: "mock",
      status: "completed",
      progress: 100,
      metadata: {
        provider: this.id,
        reason: "local-mvp",
        sortBy: request.sortBy,
        noteType: request.noteType,
        publishWindow: request.publishWindow,
      },
      samples,
    };
  }

  async getReadiness(_context?: CollectorContext): Promise<CollectorReadiness> {
    return {
      mode: "mock",
      enabled: true,
      hasCookie: false,
      runner: "local-generator",
      provider: this.id,
    };
  }
}
