import { FormEvent, useEffect, useMemo, useState } from "react";

type Locale = "zh" | "en";
type HelpTab = "manual" | "cookie";

type OverviewStat = {
  label: string;
  value: string;
  note: string;
};

type Job = {
  id: string;
  keyword: string;
  status: string;
  progress: number;
  targetCount: number;
  sortBy: string;
  collectorMode: "mock" | "real";
  errorMessage?: string | null;
  metadata?: {
    provider?: string;
    providerMode?: string;
    reason?: string;
    rawItemCount?: number;
    normalizedItemCount?: number;
    fallbackItemCount?: number;
    fallbackUsed?: boolean;
    linksCaptured?: number;
    markdownCaptured?: boolean;
    htmlCaptured?: boolean;
    extractedCount?: number;
    extractedFrom?: string;
    diagnostics?: {
      title?: string;
      href?: string;
      bodyTextSample?: string;
    };
    artifacts?: {
      screenshotPath?: string;
      htmlPath?: string;
    };
    modalEnrichment?: {
      attempted?: boolean;
      modalOpenCount?: number;
      modalMissCount?: number;
      detailEnrichedCount?: number;
    };
  } | null;
};

type Sample = {
  id: string;
  keyword: string;
  title: string;
  provider: string;
  contentText: string;
  contentSummary: string;
  authorName: string;
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
  qualityScore: number;
  qualityFlags: string[];
  collectorMode: "mock" | "real";
};

type Analysis = {
  id: string;
  sampleId: string;
  hookType: string;
  structureType: string;
  summary: string;
  modelName: string;
  promptVersion: string;
  fallbackStatus: "llm" | "local-fallback" | "local-only";
  fallbackReason?: string | null;
};

type Pattern = {
  id: string;
  name: string;
  topic: string;
  confidenceScore: number;
  sourceSampleIds: string[];
  description: string;
  modelName: string;
  promptVersion: string;
  fallbackStatus: "llm" | "local-fallback" | "local-only";
  fallbackReason?: string | null;
};

type GeneratedContent = {
  id: string;
  titleCandidates: string[];
  bodyText: string;
  coverCopy: string;
  tags: string[];
  generationNotes: string;
  modelName: string;
  promptVersion: string;
  fallbackStatus: "llm" | "local-fallback" | "local-only";
  fallbackReason?: string | null;
};

type User = {
  id: string;
  email: string;
  displayName: string;
};

type PlatformAccount = {
  id: string;
  accountName: string;
  cookieStatus: string;
  lastVerifiedAt: string | null;
  verificationMessage?: string | null;
  verificationMetadata?: {
    reason?: string;
    diagnostics?: {
      href?: string;
      title?: string;
      stateSummary?: {
        userLoggedIn?: boolean;
        searchKeyword?: string;
        currentSearchType?: string;
        searchFeedCount?: number;
        homeFeedCount?: number;
      };
      networkSummary?: {
        capturedResponses?: number;
        urls?: string[];
        authFailure?: {
          url?: string;
          code?: number | null;
          msg?: string | null;
        } | null;
      };
    };
    artifacts?: {
      screenshotPath?: string;
      htmlPath?: string;
    };
  } | null;
};

type CollectorCapabilities = {
  mock: { mode: "mock"; ready: boolean; description: string; provider?: string };
  real: {
    mode: "real";
    enabled: boolean;
    hasCookie: boolean;
    runner: string;
    description: string;
    provider?: string;
    cookieStatus?: string;
    lastVerifiedAt?: string | null;
    canCollect?: boolean;
    verificationRequired?: boolean;
    verificationMessage?: string | null;
  };
  managed: {
    mode: "real";
    enabled: boolean;
    hasCookie: boolean;
    runner: string;
    description: string;
    provider?: string;
  };
};

type DebugSummary = {
  platform: string;
  account: PlatformAccount | null;
  latestRealJob: Job | null;
};

type WorkflowResult = {
  success: boolean;
  message?: string;
  job?: Job | null;
  samples?: Array<{
    id: string;
    title: string;
    keyword: string;
    likeCount: number;
    qualityScore: number;
  }>;
  analyses?: Analysis[];
  pattern?: Pattern | null;
  generated?: GeneratedContent | null;
  diagnostics?: {
    averageSampleQuality: number | null;
    topSampleQuality: number | null;
    llmAnalysisCount: number;
    fallbackAnalysisCount: number;
    localAnalysisCount: number;
    patternSource: string | null;
    generationSource: string | null;
    patternConfidence: number | null;
    generatedTitleCount: number;
    generatedTagCount: number;
    workflowVerdict: "strong" | "usable" | "review";
    workflowSummary: string;
  };
  contentId?: string | null;
};

type WorkflowJob = {
  id: string;
  workflowType: "latest-real-pipeline";
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  targetJobId: string | null;
  errorMessage: string | null;
  finishedAt: string | null;
  metadata?: {
    stage?: string;
    providerId?: string | null;
    sampleLimit?: number;
    forceReanalyze?: boolean;
    goal?: string;
    tone?: string;
    targetAudience?: string;
    sourceJobId?: string;
    sampleIds?: string[];
    analysisIds?: string[];
    patternId?: string | null;
    contentId?: string | null;
    message?: string;
    workflowVerdict?: "strong" | "usable" | "review" | null;
    workflowSummary?: string | null;
    averageSampleQuality?: number | null;
    llmAnalysisCount?: number;
    fallbackAnalysisCount?: number;
    localAnalysisCount?: number;
    patternSource?: string | null;
    generationSource?: string | null;
    patternConfidence?: number | null;
  } | null;
};

const API_BASE = "http://localhost:3301/api/virallab";
const TOKEN_KEY = "virallab-token";
const LOCALE_KEY = "virallab-locale";

const formatAiSource = (item: {
  fallbackStatus?: "llm" | "local-fallback" | "local-only";
  modelName?: string;
}, locale: Locale) => {
  if (item.fallbackStatus === "llm") {
    return `LLM · ${item.modelName || (locale === "zh" ? "未知模型" : "unknown-model")}`;
  }
  if (item.fallbackStatus === "local-fallback") {
    return `${locale === "zh" ? "降级回退" : "Fallback"} · ${item.modelName || (locale === "zh" ? "本地" : "local")}`;
  }
  return `${locale === "zh" ? "本地" : "Local"} · ${item.modelName || "mvp-local"}`;
};

const formatStatus = (status: string | undefined, locale: Locale) => {
  const map: Record<string, { zh: string; en: string }> = {
    pending: { zh: "等待中", en: "Pending" },
    running: { zh: "运行中", en: "Running" },
    completed: { zh: "已完成", en: "Completed" },
    failed: { zh: "失败", en: "Failed" },
    blocked: { zh: "已阻断", en: "Blocked" },
    hot: { zh: "热门", en: "hot" },
    latest: { zh: "最新", en: "latest" },
    mock: { zh: "模拟", en: "mock" },
    real: { zh: "真实", en: "real" },
    verified: { zh: "已验证", en: "Verified" },
    invalid: { zh: "失效", en: "Invalid" },
    saved: { zh: "已保存", en: "Saved" },
  };

  if (!status) return "--";
  return map[status]?.[locale] || status;
};

const formatQualityFlag = (flag: string, locale: Locale) => {
  const map: Record<string, { zh: string; en: string }> = {
    missing_platform_content_id: { zh: "缺少内容ID", en: "missing content id" },
    missing_author_id: { zh: "缺少作者ID", en: "missing author id" },
    missing_media: { zh: "缺少媒体资源", en: "missing media" },
    weak_content_text: { zh: "正文偏弱", en: "weak content text" },
    weak_content_summary: { zh: "摘要偏弱", en: "weak content summary" },
    missing_cover: { zh: "缺少封面", en: "missing cover" },
    missing_publish_time: { zh: "缺少发布时间", en: "missing publish time" },
    missing_source_url: { zh: "缺少原文链接", en: "missing source url" },
    missing_tags: { zh: "缺少标签", en: "missing tags" },
  };

  return map[flag]?.[locale] || flag;
};

const formatWorkflowVerdict = (verdict: "strong" | "usable" | "review" | null | undefined, locale: Locale) => {
  const map = {
    strong: { zh: "优秀", en: "strong" },
    usable: { zh: "可用", en: "usable" },
    review: { zh: "待复核", en: "review" },
  };

  if (!verdict) return "--";
  return map[verdict][locale];
};

const translateKnownUiText = (value: string | null | undefined, locale: Locale) => {
  if (!value) return "--";
  const map: Record<string, { zh: string; en: string }> = {
    "Workflow completed.": { zh: "工作流已完成。", en: "Workflow completed." },
    "Pipeline needs review.": { zh: "这条流程需要复核。", en: "Pipeline needs review." },
    "Cookie verified successfully.": { zh: "Cookie 验证成功。", en: "Cookie verified successfully." },
    "Local MVP collector that generates simulated Xiaohongshu samples.": { zh: "本地 MVP 模拟采集器，用于生成小红书样本数据。", en: "Local MVP collector that generates simulated Xiaohongshu samples." },
    "Playwright-based Xiaohongshu collector bridge.": { zh: "基于 Playwright 的小红书采集桥接器。", en: "Playwright-based Xiaohongshu collector bridge." },
    "Reserved slot for future managed scraping integrations such as XCrawl-like providers.": { zh: "为 XCrawl 一类托管抓取方案预留的接入口。", en: "Reserved slot for future managed scraping integrations such as XCrawl-like providers." },
  };
  return map[value]?.[locale] || value;
};

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = localStorage.getItem(LOCALE_KEY);
    return stored === "en" ? "en" : "zh";
  });
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({
    email: "demo@virallab.local",
    password: "demo123456",
    displayName: "Jordan",
  });
  const [authError, setAuthError] = useState("");
  const [stats, setStats] = useState<OverviewStat[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [platformAccounts, setPlatformAccounts] = useState<PlatformAccount[]>([]);
  const [capabilities, setCapabilities] = useState<CollectorCapabilities | null>(null);
  const [debugSummary, setDebugSummary] = useState<DebugSummary | null>(null);
  const [workflowResult, setWorkflowResult] = useState<WorkflowResult | null>(null);
  const [workflowJobs, setWorkflowJobs] = useState<WorkflowJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [workspaceMessage, setWorkspaceMessage] = useState("");
  const [collectForm, setCollectForm] = useState({
    keyword: "AI教育",
    sortBy: "hot",
    targetCount: 12,
    collectorMode: "mock" as "mock" | "real",
    providerId: "mock-local",
  });
  const [generateForm, setGenerateForm] = useState({
    patternId: "",
    topic: "AI教育内容选题",
    goal: "生成一篇适合教育博主发布的小红书图文",
    tone: "专业但通俗",
    targetAudience: "老师和家长",
  });
  const [workflowForm, setWorkflowForm] = useState({
    providerId: "xiaohongshu-playwright",
    sampleLimit: 5,
    forceReanalyze: true,
  });
  const [cookieForm, setCookieForm] = useState({
    accountName: "Jordan Xiaohongshu",
    cookieBlob: "",
  });
  const [helpTab, setHelpTab] = useState<HelpTab | null>(null);
  const t = (zh: string, en: string) => (locale === "zh" ? zh : en);

  useEffect(() => {
    localStorage.setItem(LOCALE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    if (!helpTab) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHelpTab(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [helpTab]);

  const selectedSampleIds = useMemo(() => samples.slice(0, 5).map((item) => item.id), [samples]);
  const visibleSamples = useMemo(() => samples.slice(0, 10), [samples]);
  const selectedAnalysisIds = useMemo(() => analyses.slice(0, 4).map((item) => item.id), [analyses]);
  const sampleQualityStats = useMemo(() => {
    if (!samples.length) return null;
    const flagCounts = new Map<string, number>();
    let totalScore = 0;
    let strongCount = 0;
    let weakCount = 0;

    for (const sample of samples) {
      totalScore += sample.qualityScore || 0;
      if ((sample.qualityScore || 0) >= 80) {
        strongCount += 1;
      }
      if ((sample.qualityScore || 0) < 60) {
        weakCount += 1;
      }
      for (const flag of sample.qualityFlags || []) {
        flagCounts.set(flag, (flagCounts.get(flag) || 0) + 1);
      }
    }

    const averageScore = Math.round(totalScore / samples.length);
    const topFlags = Array.from(flagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      averageScore,
      strongCount,
      weakCount,
      topFlags,
    };
  }, [samples]);
  const latestCollectionJob = jobs[0] || null;
  const collectionNextStep = useMemo(() => {
    if (!latestCollectionJob) {
      return {
        title: t("创建任务后下一步怎么做", "What to do after creating a job"),
        body: t(
          "点击“创建任务”后，先看下面第一条任务卡片的状态。状态变成“已完成”后，再去右侧“样本”看具体抓到的内容。",
          "After creating a job, watch the first task card below. Once the status becomes completed, move to Samples to review the collected content.",
        ),
        actions: [
          { href: "#samples", label: t("去看样本区", "Go to Samples") },
          { href: "#analyze", label: t("去看分析区", "Go to Analyze") },
        ],
      };
    }

    if (latestCollectionJob.status === "pending" || latestCollectionJob.status === "running") {
      return {
        title: t("任务已经提交，先等它跑完", "The job is queued, wait for completion"),
        body: t(
          `当前任务 ${latestCollectionJob.id} 正在后台处理。先看下面这条任务卡片，等状态变成“已完成”后，再去“样本”看抓到的内容。页面会自动刷新，不需要重复点“创建任务”。`,
          `Job ${latestCollectionJob.id} is processing in the background. Watch the task card below, then go to Samples after it completes. The page refreshes automatically, so you do not need to click Create Job again.`,
        ),
        actions: [{ href: "#samples", label: t("完成后去看样本", "Review Samples after completion") }],
      };
    }

    if (latestCollectionJob.status === "completed") {
      return {
        title: t("任务已完成，下一步看样本和分析", "The job completed, review Samples and Analyze next"),
        body: t(
          `当前任务 ${latestCollectionJob.id} 已完成。建议先去“样本”确认标题、正文、作者和质量分是否正常；如果样本看起来没问题，再去“分析结果”和“最近一次真实工作流”继续看后续输出。`,
          `Job ${latestCollectionJob.id} completed. First review Samples for title, content, author, and quality. If the samples look correct, continue to Analyze and the latest workflow result.`,
        ),
        actions: [
          { href: "#samples", label: t("先看样本", "Review Samples") },
          { href: "#analyze", label: t("再看分析结果", "Review Analyze") },
          { href: "#overview", label: t("看最近工作流", "Review latest workflow") },
        ],
      };
    }

    return {
      title: t("任务失败，先看原因再继续", "The job failed, check the reason first"),
      body: t(
        `当前任务 ${latestCollectionJob.id} 失败了。请先看下面任务卡片里的错误信息；如果是登录态或 Cookie 问题，请先回到“平台接入”重新保存并验证 Cookie，然后再重试。`,
        `Job ${latestCollectionJob.id} failed. Read the error in the task card first. If this is a cookie or login issue, go back to Platform Access, save a fresh cookie, verify it, and then try again.`,
      ),
      actions: [
        { href: "#collect", label: t("查看失败任务", "Review failed job") },
        { href: "#overview", label: t("回到总览", "Back to Overview") },
      ],
    };
  }, [latestCollectionJob, locale]);
  const selectedCollectorCapability = useMemo(() => {
    if (!capabilities) return null;
    if (collectForm.providerId === "xiaohongshu-managed") return capabilities.managed;
    if (collectForm.collectorMode === "real") return capabilities.real;
    return capabilities.mock;
  }, [capabilities, collectForm.collectorMode, collectForm.providerId]);
  const selectedProviderEnabled = useMemo(() => {
    if (!selectedCollectorCapability) return false;
    if ("enabled" in selectedCollectorCapability) {
      return selectedCollectorCapability.enabled;
    }
    return selectedCollectorCapability.ready;
  }, [selectedCollectorCapability]);
  const helpSections = useMemo(() => {
    if (locale === "zh") {
      return {
        manual: [
          {
            title: "推荐使用顺序",
            points: [
              "先在平台账号区域保存并验证小红书 Cookie。",
              "再到“采集”里输入关键词、数量、排序和采集器。",
              "先看“采集任务”确认任务是否“已完成”。",
              "再看“样本”确认抓到的内容和质量分。",
              "样本没问题后，再继续看分析、模式库和生成草稿。",
            ],
          },
          {
            title: "采集成果在哪里看",
            points: [
              "先看“采集任务”：这里确认任务成功没有、失败原因是什么、抓了多少条。",
              "再看“样本”：这里才是具体成果，会展示标题、作者、发布时间、正文片段、封面、标签和质量分。",
              "如果任务不是“已完成”，请先看任务卡片里的错误提示，不要直接判断系统没抓到内容。",
            ],
          },
          {
            title: "如何跑完整链路",
            points: [
              "如果你想一步一步看，就按“采集 -> 样本 -> 分析 -> 模式库 -> 生成”的顺序使用。",
              "如果你想自动跑完整流程，请使用“运行当前采集器工作流”或“重新运行最近一次工作流”。",
              "最终集中看“最近一次真实工作流”，这里会汇总样本质量、AI 来源、模式快照、生成快照和结论。",
            ],
          },
        ],
        cookie: [
          {
            title: "如何拿到小红书 Cookie",
            points: [
              "先在 Chrome 中打开小红书，并确认当前已经登录。",
              "打开开发者工具：Mac 常用快捷键是 Option + Command + I。",
              "在开发者工具顶部一排标签里，点击“Network”。如果你没看到，就先点最上方那排里的 Network 或“网络”。",
              "打开 Network 以后，回到小红书页面，随便点一下搜索、切一下页面，或者直接刷新页面，让列表里出现很多请求。",
              "在 Network 面板左上角的过滤框里，输入 `xiaohongshu`，如果没有结果，就输入 `edith` 试一下。",
              "在下面请求列表里，点击任意一个域名包含 `xiaohongshu.com` 或 `edith.xiaohongshu.com` 的请求。最常见的是名字里带 `search`、`notes`、`recommend` 的请求。",
              "点开某个请求后，右边会出现详情。找到 `Headers` 标签，然后往下看 `Request Headers`。",
              "在 `Request Headers` 里找到一行叫 `cookie` 的内容。注意是小写 `cookie`，不是 `set-cookie`。",
              "把这一整行 `cookie:` 后面的全部内容完整复制下来，不要漏掉中间的分号。",
              "你需要的是整串 Cookie，例如：a1=xxx; web_session=xxx; webId=xxx; ...;",
              "不要只复制单个字段，也不要只复制页面上的零散文本。",
            ],
          },
          {
            title: "如何在系统里保存和验证",
            points: [
              "回到 ViralLab 页面后，先往下找到“平台接入”这个区块。",
              "在“平台接入”区块里，找到输入框标题“⼩红书 Cookie 内容”。",
              "把你刚刚复制的整串 Cookie，粘贴进这个大输入框里，不是粘贴到关键词框，也不是粘贴到搜索框。",
              "粘贴完成后，点击输入框下面那个按钮：“保存采集 Cookie”。",
              "点击保存后，状态通常会先变成“已保存”，这代表系统已经收到 Cookie。",
              "接着点击“验证 Cookie”，系统会自动带着 Cookie 打开搜索页并检查是否仍然有效。",
              "只有状态变成“已验证”，才建议正式发起真实采集。",
            ],
          },
          {
            title: "Cookie 失效以后怎么办",
            points: [
              "如果你看到 -101、无登录信息、需要登录，或者系统提示当前 Cookie 不可用，通常就是 Cookie 失效了。",
              "正确做法不是反复重试旧任务，而是重新打开小红书扫码登录。",
              "登录后重新复制最新 Cookie，覆盖保存到 ViralLab，然后再次点击“验证 Cookie”。",
              "看到状态恢复成“已验证”之后，再重新发起采集任务。",
            ],
          },
        ],
      };
    }

    return {
      manual: [
        {
          title: "Recommended flow",
          points: [
            "Save and verify the Xiaohongshu cookie first.",
            "Then create a collection job with keyword, target count, sorting, and provider.",
            "Check Collection Jobs first to confirm the task completed.",
            "Then review Samples to inspect quality and correctness.",
            "Move on to analyses, patterns, and drafts only after the sample quality looks good.",
          ],
        },
        {
          title: "Where to review results",
          points: [
            "Use Collection Jobs to see whether the task succeeded and why it failed if not.",
            "Use Samples to inspect the actual titles, authors, publish times, content snippets, covers, tags, and quality scores.",
          ],
        },
      ],
      cookie: [
        {
          title: "How to capture the cookie",
          points: [
            "Open Xiaohongshu in Chrome and make sure you are logged in.",
            "Open DevTools with Option + Command + I on Mac.",
            "In the Network panel, copy the full Cookie request header from any request to xiaohongshu.com.",
          ],
        },
        {
          title: "How to verify and recover",
          points: [
            "Paste the full cookie string into ViralLab, save it, then click Verify Cookie.",
            "If you see -101 or login-required, log in again, copy the latest cookie, save it again, and re-verify before collecting.",
          ],
        },
      ],
    };
  }, [locale]);

  const apiFetch = async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (!headers.has("Content-Type") && options.body) {
      headers.set("Content-Type", "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed: ${response.status}`);
    }
    return response.json();
  };

  const refreshAll = async () => {
    const [debugRes, meRes, overviewRes, jobsRes, workflowJobsRes, samplesRes, analysesRes, patternsRes, accountsRes, capabilitiesRes] = await Promise.all([
      apiFetch("/collect/debug-summary"),
      apiFetch("/auth/me"),
      apiFetch("/overview"),
      apiFetch("/collect/jobs"),
      apiFetch("/workflow/jobs"),
      apiFetch("/samples"),
      apiFetch("/analyze/results"),
      apiFetch("/patterns"),
      apiFetch("/platform-accounts"),
      apiFetch("/collect/capabilities"),
    ]);

    setDebugSummary((debugRes as { item?: DebugSummary }).item || null);
    setUser((meRes as { user?: User }).user || null);
    setStats((overviewRes as { stats?: OverviewStat[] }).stats || []);
    setJobs((jobsRes as { items?: Job[] }).items || []);
    setWorkflowJobs((workflowJobsRes as { items?: WorkflowJob[] }).items || []);
    setSamples((samplesRes as { items?: Sample[] }).items || []);
    setAnalyses((analysesRes as { items?: Analysis[] }).items || []);
    setPatterns((patternsRes as { items?: Pattern[] }).items || []);
    setPlatformAccounts((accountsRes as { items?: PlatformAccount[] }).items || []);
    setCapabilities((capabilitiesRes as { items?: CollectorCapabilities }).items || null);
    setGenerateForm((prev) => ({
      ...prev,
      patternId: prev.patternId || (patternsRes as { items?: Pattern[] }).items?.[0]?.id || "",
    }));
  };

  useEffect(() => {
    if (!token) return;
    void refreshAll().catch((error) => {
      setAuthError(error.message || t("恢复会话失败。", "Unable to restore session."));
      localStorage.removeItem(TOKEN_KEY);
      setToken("");
      setUser(null);
    });
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const hasActiveJob =
      jobs.some((job) => job.status === "pending" || job.status === "running") ||
      workflowJobs.some((job) => job.status === "pending" || job.status === "running");
    if (!hasActiveJob) return;

    const timer = window.setTimeout(() => {
      void refreshAll().catch((error) => {
        setWorkspaceMessage(error instanceof Error ? error.message : t("刷新采集任务失败。", "Unable to refresh collection jobs."));
      });
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [token, jobs, workflowJobs]);

  useEffect(() => {
    if (!token) return;
    const latestWorkflowJob = workflowJobs[0];
    if (!latestWorkflowJob || latestWorkflowJob.status !== "completed") return;

    void apiFetch(`/workflow/jobs/${latestWorkflowJob.id}`)
      .then((detail) => {
        const result = (detail as { result?: WorkflowResult | null }).result || null;
        setWorkflowResult(result);
        if (result?.generated) {
          setGenerated(result.generated);
        }
      })
      .catch(() => {
        // ignore detail refresh errors in the MVP shell
      });
  }, [token, workflowJobs]);

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    setLoading(true);
    try {
      if (authMode === "register") {
        await apiFetch("/auth/register", {
          method: "POST",
          body: JSON.stringify(authForm),
        });
      }
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authForm.email, password: authForm.password }),
      }).then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      });
      localStorage.setItem(TOKEN_KEY, response.token);
      setToken(response.token);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : t("登录失败。", "Authentication failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore logout errors for local MVP
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
    setGenerated(null);
    setStats([]);
    setJobs([]);
    setWorkflowJobs([]);
    setSamples([]);
    setAnalyses([]);
    setPatterns([]);
  };

  const handleCreateJob = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await apiFetch("/collect/jobs", {
        method: "POST",
        body: JSON.stringify(collectForm),
      });
      setWorkspaceMessage(
        response?.status === "pending"
          ? t(`采集任务 ${response?.jobId || ""} 已入队，工作区会自动刷新。`, `Collection job ${response?.jobId || ""} queued. The workspace will refresh automatically.`)
          : response?.errorMessage
            ? t(`采集任务返回问题：${response.errorMessage}`, `Collection job finished with issue: ${response.errorMessage}`)
            : t(`采集任务 ${response?.jobId || ""} 已完成。`, `Collection job ${response?.jobId || ""} completed.`),
      );
      await refreshAll();
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : t("创建采集任务失败。", "Unable to create collection job."));
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      await apiFetch("/analyze/jobs", {
        method: "POST",
        body: JSON.stringify({ sampleIds: selectedSampleIds, forceReanalyze: true }),
      });
      setWorkspaceMessage(t(`已重新分析 ${selectedSampleIds.length} 条样本。`, `Re-analyzed ${selectedSampleIds.length} samples.`));
      await refreshAll();
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : t("分析样本失败。", "Unable to analyze samples."));
    } finally {
      setLoading(false);
    }
  };

  const handleExtractPattern = async () => {
    setLoading(true);
    try {
      await apiFetch("/patterns/extract", {
        method: "POST",
        body: JSON.stringify({ analysisIds: selectedAnalysisIds }),
      });
      setWorkspaceMessage(t(`已从 ${selectedAnalysisIds.length} 条分析中提炼模式。`, `Extracted pattern from ${selectedAnalysisIds.length} analyses.`));
      await refreshAll();
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : t("提炼 Pattern 失败。", "Unable to extract pattern."));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await apiFetch("/generate/jobs", {
        method: "POST",
        body: JSON.stringify(generateForm),
      });

      if (response?.contentId) {
        const detail = await apiFetch(`/generate/contents/${response.contentId}`);
        setGenerated(detail.item || null);
      }
      setWorkspaceMessage(t("已生成一篇新的小红书草稿。", "Generated a new Xiaohongshu draft."));
      await refreshAll();
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : t("生成草稿失败。", "Unable to generate draft."));
    } finally {
      setLoading(false);
    }
  };

  const handleRunLatestRealPipeline = async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/workflow/jobs", {
        method: "POST",
        body: JSON.stringify({
          providerId: workflowForm.providerId,
          sampleLimit: workflowForm.sampleLimit,
          forceReanalyze: workflowForm.forceReanalyze,
          goal: "生成一篇适合教育赛道发布的小红书图文草稿",
          tone: "专业但通俗",
          targetAudience: "老师、家长和教育赛道创作者",
        }),
      });

      if (response?.jobId) {
        const detail = await apiFetch(`/workflow/jobs/${response.jobId}`);
        setWorkflowResult((detail as { result?: WorkflowResult | null }).result || null);
      }
      setWorkspaceMessage(
        response?.status === "pending"
          ? t(`工作流任务 ${response?.jobId || ""} 已入队，工作区会自动刷新。`, `Workflow job ${response?.jobId || ""} queued. The workspace will refresh automatically.`)
          : response?.errorMessage || t("最近一次真实流程入队失败。", "Unable to queue the latest real pipeline."),
      );
      await refreshAll();
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : t("运行最近真实流程失败。", "Unable to run the latest real pipeline."));
    } finally {
      setLoading(false);
    }
  };

  const handleRerunLatestWorkflow = async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/workflow/jobs/rerun-latest", {
        method: "POST",
      });
      if (response?.jobId) {
        const detail = await apiFetch(`/workflow/jobs/${response.jobId}`);
        setWorkflowResult((detail as { result?: WorkflowResult | null }).result || null);
      }
      setWorkspaceMessage(
        response?.status === "pending"
          ? t(`工作流任务 ${response?.jobId || ""} 已按最近配置重新入队。`, `Workflow job ${response?.jobId || ""} re-queued from the latest workflow config.`)
          : response?.errorMessage || t("重跑最近工作流失败。", "Unable to rerun the latest workflow."),
      );
      await refreshAll();
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : t("重跑最近工作流失败。", "Unable to rerun the latest workflow."));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCookies = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/platform-accounts/xiaohongshu/cookies", {
        method: "POST",
        body: JSON.stringify(cookieForm),
      });
      setWorkspaceMessage(t("已为当前账号保存小红书 Cookie。", "Saved Xiaohongshu cookie for the current account."));
      await refreshAll();
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : t("保存 Cookie 失败。", "Unable to save cookie."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCookie = async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/platform-accounts/xiaohongshu/verify", {
        method: "POST",
      });
      setWorkspaceMessage(
        response?.verified
          ? t("小红书 Cookie 验证成功。", "Xiaohongshu cookie verified successfully.")
          : t(`Cookie 验证失败：${response?.errorMessage || "未知原因"}`, `Cookie verification failed: ${response?.errorMessage || "unknown reason"}`),
      );
      await refreshAll();
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : t("验证 Cookie 失败。", "Unable to verify cookie."));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="lang-switch">
            <button className={locale === "zh" ? "active" : ""} onClick={() => setLocale("zh")} type="button">中文</button>
            <button className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")} type="button">EN</button>
          </div>
          <div className="brand-mark">V</div>
          <h1>ViralLab</h1>
          <p>{t("登录后进入小红书采集与分析工作台。", "Sign in to access the Xiaohongshu collection workspace.")}</p>
          <form className="stack-form" onSubmit={handleAuth}>
            {authMode === "register" && (
              <label>
                {t("显示名称", "Display name")}
                <input
                  value={authForm.displayName}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, displayName: event.target.value }))}
                />
              </label>
            )}
            <label>
              {t("邮箱", "Email")}
              <input
                value={authForm.email}
                onChange={(event) => setAuthForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </label>
            <label>
              {t("密码", "Password")}
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </label>
            <button disabled={loading} type="submit">
              {loading ? t("处理中...", "Working...") : authMode === "login" ? t("登录", "Sign In") : t("创建账号", "Create Account")}
            </button>
          </form>
          <div className="auth-meta">
            <button className="link-button" onClick={() => setAuthMode((prev) => (prev === "login" ? "register" : "login"))}>
              {authMode === "login" ? t("还没有账号？", "Need a new account?") : t("返回登录", "Back to sign in")}
            </button>
            <span>{t("演示账号：demo@virallab.local / demo123456", "Demo: demo@virallab.local / demo123456")}</span>
          </div>
          {authError ? <p className="auth-error">{authError}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="sidebar">
        <div className="topbar-brand">
          <div className="brand-mark">V</div>
          <div className="topbar-titleblock">
            <h1>ViralLab</h1>
            <p>{t("爆款内容智能引擎", "Hot content intelligence engine")}</p>
          </div>
        </div>
        <nav className="nav-list">
          <a href="#overview">{t("总览", "Overview")}</a>
          <a href="#collect">{t("采集", "Collection")}</a>
          <a href="#samples">{t("样本", "Samples")}</a>
          <a href="#analyze">{t("分析", "Analyze")}</a>
          <a href="#patterns">{t("模式库", "Patterns")}</a>
          <a href="#generate">{t("生成", "Generate")}</a>
        </nav>
        <div className="topbar-actions">
          <button className="topbar-help secondary-btn" onClick={() => setHelpTab("manual")} type="button">
            {t("使用说明", "User Guide")}
          </button>
          <button className="topbar-help secondary-btn" onClick={() => setHelpTab("cookie")} type="button">
            {t("Cookie 指引", "Cookie Guide")}
          </button>
          {user ? <div className="user-badge">{user.displayName}</div> : null}
          <div className="lang-switch sidebar-lang-switch">
            <button className={locale === "zh" ? "active" : ""} onClick={() => setLocale("zh")} type="button">中文</button>
            <button className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")} type="button">EN</button>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>{t("退出登录", "Log Out")}</button>
        </div>
      </header>

      {helpTab ? (
        <div className="help-modal-backdrop" onClick={() => setHelpTab(null)}>
          <section className="help-modal" onClick={(event) => event.stopPropagation()}>
            <div className="help-modal-header">
              <div>
                <p className="eyebrow">{t("帮助中心", "Help Center")}</p>
                <h3>{helpTab === "manual" ? t("ViralLab 使用说明", "ViralLab User Guide") : t("小红书 Cookie 指引", "Xiaohongshu Cookie Guide")}</h3>
              </div>
              <button className="secondary-btn help-close" onClick={() => setHelpTab(null)} type="button">
                {t("关闭", "Close")}
              </button>
            </div>
            <div className="help-tab-row">
              <button className={helpTab === "manual" ? "active" : ""} onClick={() => setHelpTab("manual")} type="button">
                {t("系统使用", "Using ViralLab")}
              </button>
              <button className={helpTab === "cookie" ? "active" : ""} onClick={() => setHelpTab("cookie")} type="button">
                {t("Cookie 获取与排障", "Cookie setup & recovery")}
              </button>
            </div>
            <p className="help-intro">
              {helpTab === "manual"
                ? t("这部分会告诉用户系统怎么用，以及采集结果应该在哪里看。", "This section explains how to use the system and where to review collected results.")
                : t("这部分专门解决真实采集最常见的问题：怎么拿 Cookie、怎么验证、失效后怎么恢复。", "This section focuses on how to capture, verify, and refresh the cookie for real collection.")}
            </p>
            <div className="help-section-list">
              {helpSections[helpTab].map((section) => (
                <article className="help-section-card" key={section.title}>
                  <h4>{section.title}</h4>
                  <ul>
                    {section.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      <main className="content">
        <section className="panel process-panel" id="overview">
          <div className="panel-head">
            <div>
              <p className="eyebrow">{t("ViralLab 流程", "ViralLab Flow")}</p>
              <h2 className="process-title">{t("按步骤走：先接入，再采集，再查看，再分析，再生成。", "Follow the flow: connect, collect, review, analyze, and generate.")}</h2>
            </div>
            <div className="hero-actions">
              <button onClick={() => void refreshAll()}>{t("刷新工作区", "Refresh Workspace")}</button>
            </div>
          </div>
          <div className="process-strip">
            <div className="process-chip"><span>1</span>{t("平台接入", "Platform Access")}</div>
            <div className="process-chip"><span>2</span>{t("创建采集任务", "Create Collection Job")}</div>
            <div className="process-chip"><span>3</span>{t("查看样本", "Review Samples")}</div>
            <div className="process-chip"><span>4</span>{t("分析与提炼", "Analyze & Pattern")}</div>
            <div className="process-chip"><span>5</span>{t("生成草稿", "Generate Draft")}</div>
          </div>
          {workspaceMessage ? <p className="hero-copy compact-copy">{workspaceMessage}</p> : null}
        </section>

        <div className="flow-stack">
          <article className="panel" id="access">
            <div className="step-head">
              <div className="step-index">1</div>
              <div>
                <h3>{t("先完成平台接入", "Set up platform access first")}</h3>
                <p className="step-copy">{t("如果你要跑真实小红书采集，先把 Cookie 保存并验证。没有完成这一步，真实采集大概率会失败。", "For real Xiaohongshu collection, save and verify the cookie first. Without this step, real collection will usually fail.")}</p>
              </div>
            </div>
            <div className="focus-status-grid">
              <div className="sample-card">
                <strong>{t("真实采集状态", "Real collector status")}</strong>
                <div className="pattern-meta">
                  <span>{capabilities?.real.enabled ? t("已启用", "enabled") : t("未启用", "disabled")}</span>
                  <span>{capabilities?.real.hasCookie ? `${t("Cookie", "cookie")} ${formatStatus(capabilities?.real.cookieStatus || "saved", locale)}` : t("缺少 Cookie", "cookie missing")}</span>
                </div>
                <span className="status-note">{capabilities?.real.verificationMessage || t("先保存并验证小红书 Cookie。", "Save and verify the Xiaohongshu cookie first.")}</span>
              </div>
              {platformAccounts[0] ? (
                <div className="sample-card">
                  <strong>{platformAccounts[0].accountName}</strong>
                  <div className="pattern-meta">
                    <span>{formatStatus(platformAccounts[0].cookieStatus, locale)}</span>
                    <span>{platformAccounts[0].lastVerifiedAt || "--"}</span>
                  </div>
                  <span className="status-note">{translateKnownUiText(platformAccounts[0].verificationMessage, locale)}</span>
                </div>
              ) : null}
            </div>
            <form className="stack-form" onSubmit={handleSaveCookies}>
              <label>
                {t("账号名称", "Account name")}
                <input
                  value={cookieForm.accountName}
                  onChange={(event) => setCookieForm((prev) => ({ ...prev, accountName: event.target.value }))}
                />
              </label>
              <label>
                {t("小红书 Cookie 内容", "Xiaohongshu cookie blob")}
                <textarea
                  rows={4}
                  placeholder={t("粘贴导出的 Cookie 字符串或 JSON", "Paste exported cookie string or JSON here")}
                  value={cookieForm.cookieBlob}
                  onChange={(event) => setCookieForm((prev) => ({ ...prev, cookieBlob: event.target.value }))}
                />
              </label>
              <p className="hint-text">
                {t("请把浏览器里复制出来的整串 Cookie 粘贴到这个输入框，然后点击“保存采集 Cookie”。", "Paste the full browser cookie string into this box, then click “Save Collector Cookie”.")}
              </p>
              <div className="action-row">
                <button disabled={loading} type="submit">{t("保存采集 Cookie", "Save Collector Cookie")}</button>
                <button
                  className="secondary-btn"
                  disabled={loading || platformAccounts.length === 0}
                  onClick={handleVerifyCookie}
                  type="button"
                >
                  {t("验证 Cookie", "Verify Cookie")}
                </button>
              </div>
            </form>
          </article>

          <article className="panel" id="collect">
            <div className="panel-head">
              <div className="step-head">
                <div className="step-index">2</div>
                <div>
                  <h3>{t("创建采集任务", "Create Collection Job")}</h3>
                  <p className="step-copy">{t("填写关键词并创建任务。创建之后不要重复点击，先看任务状态。", "Fill in the keyword and create the job. After creating it, do not click repeatedly. Watch the job status first.")}</p>
                </div>
              </div>
            </div>
            <form className="inline-form" onSubmit={handleCreateJob}>
              <input
                value={collectForm.keyword}
                onChange={(event) => setCollectForm((prev) => ({ ...prev, keyword: event.target.value }))}
                placeholder={t("关键词", "Keyword")}
              />
              <select
                value={collectForm.sortBy}
                onChange={(event) => setCollectForm((prev) => ({ ...prev, sortBy: event.target.value }))}
              >
                <option value="hot">{t("热门", "hot")}</option>
                <option value="latest">{t("最新", "latest")}</option>
              </select>
              <select
                value={collectForm.collectorMode}
                onChange={(event) => {
                  const collectorMode = event.target.value as "mock" | "real";
                  setCollectForm((prev) => ({
                    ...prev,
                    collectorMode,
                    providerId: collectorMode === "real" ? "xiaohongshu-playwright" : "mock-local",
                  }));
                }}
              >
                <option value="mock">{t("模拟", "mock")}</option>
                <option value="real">{t("真实采集", "real collector")}</option>
              </select>
              <select
                value={collectForm.providerId}
                onChange={(event) => setCollectForm((prev) => ({ ...prev, providerId: event.target.value }))}
              >
                {collectForm.collectorMode === "mock" ? (
                  <option value="mock-local">mock-local</option>
                ) : (
                  <>
                    <option value="xiaohongshu-playwright">xiaohongshu-playwright</option>
                    <option value="xiaohongshu-managed">xiaohongshu-managed</option>
                  </>
                )}
              </select>
              <input
                type="number"
                min={5}
                max={50}
                value={collectForm.targetCount}
                onChange={(event) =>
                  setCollectForm((prev) => ({ ...prev, targetCount: Number(event.target.value || 10) }))
                }
              />
              <button
                disabled={
                  loading ||
                  (collectForm.collectorMode === "real" &&
                    (collectForm.providerId === "xiaohongshu-playwright"
                      ? capabilities?.real.canCollect === false
                      : selectedProviderEnabled === false))
                }
                type="submit"
              >
                {loading ? t("运行中...", "Running...") : t("创建任务", "Create Job")}
              </button>
            </form>
            {collectForm.collectorMode === "real" && collectForm.providerId === "xiaohongshu-playwright" && capabilities?.real.canCollect === false ? (
              <p className="hint-text">
                {capabilities.real.verificationMessage || t("请先验证可用的小红书 Cookie，再运行真实采集。", "Verify a working Xiaohongshu cookie before running real collection.")}
              </p>
            ) : collectForm.collectorMode === "real" && collectForm.providerId === "xiaohongshu-playwright" && capabilities?.real.verificationRequired ? (
              <p className="hint-text">{t("启动真实采集任务时会自动验证当前已保存的 Cookie。", "The saved cookie will be auto-verified when you start a real collection job.")}</p>
            ) : collectForm.collectorMode === "real" && collectForm.providerId === "xiaohongshu-managed" ? (
              <p className="hint-text">{t("托管 provider 的 UI 已接好，但后端仍然是预留位。", "Managed provider slot is wired in the UI, but the backend integration is still a stub.")}</p>
            ) : null}
            <div className="sample-card next-step-card">
              <div className="panel-head inline-head">
                <strong>{collectionNextStep.title}</strong>
                <span className="pill">{t("下一步", "Next Step")}</span>
              </div>
              <p className="status-note next-step-copy">{collectionNextStep.body}</p>
              <div className="action-row">
                {collectionNextStep.actions.map((action) => (
                  <a className="secondary-btn nav-action-link" href={action.href} key={action.label}>
                    {action.label}
                  </a>
                ))}
              </div>
            </div>
            <div className="table-list">
              {jobs.slice(0, 3).map((job) => (
                <div className="table-row" key={job.id}>
                  <div>
                    <strong>{job.keyword}</strong>
                    <span>{job.id}</span>
                  </div>
                  <div>
                    <strong>{job.targetCount} {t("条样本", "samples")}</strong>
                    <span>{formatStatus(job.sortBy, locale)} · {formatStatus(job.collectorMode, locale)} · {job.metadata?.provider || "--"}</span>
                  </div>
                  <div>
                    <strong>{job.progress}%</strong>
                    <span>{formatStatus(job.status, locale)}</span>
                    {job.status === "pending" || job.status === "running" ? (
                      <span>{t("后台处理中", "processing in background")}</span>
                    ) : null}
                    {job.errorMessage ? (
                      <span>
                        {job.errorMessage}
                        {job.metadata?.reason ? ` · ${job.metadata.reason}` : ""}
                        {job.metadata?.artifacts?.screenshotPath ? ` · screenshot: ${job.metadata.artifacts.screenshotPath}` : ""}
                      </span>
                    ) : job.metadata?.extractedCount ? (
                      <span>
                        {t("已提取", "extracted")} {job.metadata.extractedCount} {t("条，来源", "via")} {job.metadata.extractedFrom || t("未知", "unknown")}
                      </span>
                    ) : null}
                    {typeof job.metadata?.normalizedItemCount === "number" || typeof job.metadata?.fallbackItemCount === "number" ? (
                      <span>
                        {t("标准化", "normalized")} {job.metadata?.normalizedItemCount || 0}
                        {" · "}
                        {t("回退", "fallback")} {job.metadata?.fallbackItemCount || 0}
                        {job.metadata?.fallbackUsed ? ` · ${t("已使用回退", "fallback used")}` : ""}
                      </span>
                    ) : null}
                    {typeof job.metadata?.linksCaptured === "number" || job.metadata?.markdownCaptured || job.metadata?.htmlCaptured ? (
                      <span>
                        {t("链接", "links")} {job.metadata?.linksCaptured || 0}
                        {" · "}
                        markdown {job.metadata?.markdownCaptured ? t("是", "yes") : t("否", "no")}
                        {" · "}
                        html {job.metadata?.htmlCaptured ? t("是", "yes") : t("否", "no")}
                      </span>
                    ) : null}
                    {job.metadata?.modalEnrichment?.attempted ? (
                      <span>
                        {t("弹层打开", "modal opens")} {job.metadata.modalEnrichment.modalOpenCount || 0}
                        {" · "}
                        {t("弹层补全", "modal enriched")} {job.metadata.modalEnrichment.detailEnrichedCount || 0}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel" id="samples">
            <div className="panel-head">
              <div className="step-head">
                <div className="step-index">3</div>
                <div>
                  <h3>{t("查看采集样本", "Review collected samples")}</h3>
                  <p className="step-copy">{t("任务完成后，先看这里。重点确认标题、正文、作者、发布时间和质量分是不是正常。", "After the job completes, start here. Confirm the title, body, author, publish time, and quality score first.")}</p>
                </div>
              </div>
              <span className="pill">{t("最新 10 条", "Latest 10")}</span>
            </div>
            {sampleQualityStats ? (
              <div className="focus-status-grid compact-focus-grid">
                <div className="sample-card">
                  <strong>{t("样本质量概览", "Sample quality overview")}</strong>
                  <div className="pattern-meta">
                    <span>{sampleQualityStats.averageScore}/100 {t("平均分", "average")}</span>
                    <span>{sampleQualityStats.strongCount} {t("优质", "strong")}</span>
                  </div>
                  <div className="pattern-meta">
                    <span>{sampleQualityStats.weakCount} {t("弱样本", "weak")}</span>
                    <span>{samples.length} {t("总样本", "total samples")}</span>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="table-list">
              {visibleSamples.map((sample) => (
                <div
                  className={`sample-card ${workflowResult?.samples?.some((item) => item.id === sample.id) ? "result-highlight" : ""}`}
                  key={sample.id}
                >
                  <div className="sample-card-top">
                    <div>
                      <strong>{sample.title}</strong>
                      <span>{sample.keyword}</span>
                    </div>
                    {sample.coverImageUrl ? (
                      <img className="sample-cover" src={sample.coverImageUrl} alt={sample.title} />
                    ) : null}
                  </div>
                  <div className="audit-meta">
                    <span className={`quality-pill ${sample.qualityScore >= 80 ? "good" : sample.qualityScore >= 60 ? "medium" : "weak"}`}>
                      {t("质量", "Quality")} {sample.qualityScore}/100
                    </span>
                    {workflowResult?.samples?.some((item) => item.id === sample.id) ? (
                      <span className="result-badge">{t("最近工作流", "latest workflow")}</span>
                    ) : null}
                    {sample.qualityFlags.length ? (
                      <span>{sample.qualityFlags.slice(0, 3).map((flag) => formatQualityFlag(flag, locale)).join(" · ")}</span>
                    ) : (
                      <span>{t("结构化样本字段较完整", "structured sample looks complete")}</span>
                    )}
                  </div>
                  <div className="pattern-meta">
                    <span>{sample.likeCount} {t("点赞", "likes")} · {formatStatus(sample.collectorMode, locale)} · {sample.provider}</span>
                    <span>{sample.authorName || "--"} · {sample.publishTime || "--"}</span>
                  </div>
                  <p className="sample-summary">{sample.contentText || sample.contentSummary}</p>
                  <div className="pattern-meta">
                    <span>{sample.tags.join(" · ")}</span>
                    <span>
                      {sample.mediaImageUrls.length} {t("张图片", "images")} · {sample.mediaVideoUrls.length} {t("个视频", "videos")}
                    </span>
                  </div>
                  <a className="sample-link" href={sample.sourceUrl} target="_blank" rel="noreferrer">
                    {sample.sourceUrl}
                  </a>
                </div>
              ))}
            </div>
          </article>

          <article className="panel" id="analyze">
            <div className="panel-head">
              <div className="step-head">
                <div className="step-index">4</div>
                <div>
                  <h3>{t("分析并提炼模式", "Analyze and extract patterns")}</h3>
                  <p className="step-copy">{t("样本看起来正常后，再进行分析。分析完再提炼 Pattern，不要反过来操作。", "Only analyze after the samples look correct. Extract a pattern after analysis, not before.")}</p>
                </div>
              </div>
            </div>
            <div className="action-row">
              <button onClick={handleAnalyze} disabled={loading || samples.length === 0}>{t("分析前 5 条样本", "Analyze First 5 Samples")}</button>
              <button className="secondary-btn" onClick={handleExtractPattern} disabled={loading || analyses.length === 0}>
                {t("提炼 Pattern", "Extract Pattern")}
              </button>
            </div>
            <div className="pattern-list">
              {analyses.slice(0, 4).map((analysis) => (
                <div
                  className={`pattern-card ${workflowResult?.analyses?.some((item) => item.id === analysis.id) ? "result-highlight" : ""}`}
                  key={analysis.id}
                >
                  <strong>{analysis.hookType}</strong>
                  <span>{analysis.structureType}</span>
                  <div className="audit-meta">
                    <span className={`audit-pill ${analysis.fallbackStatus}`}>{formatAiSource(analysis, locale)}</span>
                    <span>{analysis.promptVersion}</span>
                    {workflowResult?.analyses?.some((item) => item.id === analysis.id) ? (
                      <span className="result-badge">{t("最近工作流", "latest workflow")}</span>
                    ) : null}
                  </div>
                  <div className="pattern-meta">
                    <span>{analysis.sampleId}</span>
                    <span>{analysis.summary}</span>
                  </div>
                  {analysis.fallbackReason ? <span className="status-note">fallback: {analysis.fallbackReason}</span> : null}
                </div>
              ))}
            </div>
            <div className="panel-head">
              <h3>{t("Pattern 模式库", "Pattern Library")}</h3>
              <span className="pill">{t("模式引擎", "Pattern Engine")}</span>
            </div>
            <div className="pattern-list">
              {patterns.map((pattern) => (
                <div
                  className={`pattern-card ${workflowResult?.pattern?.id === pattern.id ? "result-highlight" : ""}`}
                  key={pattern.id}
                >
                  <strong>{pattern.name}</strong>
                  <span>{pattern.topic}</span>
                  <div className="audit-meta">
                    <span className={`audit-pill ${pattern.fallbackStatus}`}>{formatAiSource(pattern, locale)}</span>
                    <span>{pattern.promptVersion}</span>
                    {workflowResult?.pattern?.id === pattern.id ? <span className="result-badge">{t("最近工作流", "latest workflow")}</span> : null}
                  </div>
                  <div className="pattern-meta">
                    <span>{t("置信度", "confidence")} {Math.round(pattern.confidenceScore * 100)}%</span>
                    <span>{pattern.sourceSampleIds.length} {t("条来源", "sources")}</span>
                  </div>
                  <span>{pattern.description}</span>
                  {pattern.fallbackReason ? <span className="status-note">fallback: {pattern.fallbackReason}</span> : null}
                </div>
              ))}
            </div>
          </article>

          <article className="panel panel-wide" id="generate">
            <div className="panel-head">
              <div className="step-head">
                <div className="step-index">5</div>
                <div>
                  <h3>{t("生成草稿", "Generate Draft")}</h3>
                  <p className="step-copy">{t("有了 Pattern 之后再生成草稿。你可以先用默认参数，先看生成结果是否成型。", "Generate the draft after a pattern exists. Start with the default inputs and inspect the output first.")}</p>
                </div>
              </div>
            </div>
            <form className="stack-form" onSubmit={handleGenerate}>
              <div className="field-grid">
                <label>
                  {t("Pattern", "Pattern")}
                  <select
                    value={generateForm.patternId}
                    onChange={(event) => setGenerateForm((prev) => ({ ...prev, patternId: event.target.value }))}
                  >
                    <option value="">{t("不使用 Pattern", "No pattern")}</option>
                    {patterns.map((pattern) => (
                      <option key={pattern.id} value={pattern.id}>
                        {pattern.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("主题", "Topic")}
                  <input
                    value={generateForm.topic}
                    onChange={(event) => setGenerateForm((prev) => ({ ...prev, topic: event.target.value }))}
                  />
                </label>
              </div>
              <label>
                {t("目标", "Goal")}
                <textarea
                  rows={3}
                  value={generateForm.goal}
                  onChange={(event) => setGenerateForm((prev) => ({ ...prev, goal: event.target.value }))}
                />
              </label>
              <div className="field-grid">
                <label>
                  {t("语气", "Tone")}
                  <input
                    value={generateForm.tone}
                    onChange={(event) => setGenerateForm((prev) => ({ ...prev, tone: event.target.value }))}
                  />
                </label>
                <label>
                  {t("目标受众", "Audience")}
                  <input
                    value={generateForm.targetAudience}
                    onChange={(event) =>
                      setGenerateForm((prev) => ({ ...prev, targetAudience: event.target.value }))
                    }
                  />
                </label>
              </div>
              <button disabled={loading} type="submit">
                {loading ? t("生成中...", "Generating...") : t("生成草稿", "Generate Draft")}
              </button>
            </form>
          </article>

          <article className="panel" id="generated">
            <div className="panel-head">
              <h3>{t("最新草稿", "Latest Draft")}</h3>
              <span className="pill">{t("输出", "Output")}</span>
            </div>
            {generated ? (
              <div className={`draft-card ${workflowResult?.generated?.id === generated.id ? "result-highlight" : ""}`}>
                <strong>{generated.titleCandidates[0]}</strong>
                {workflowResult?.generated?.id === generated.id ? (
                  <div className="audit-meta">
                    <span className="result-badge">{t("最近工作流", "latest workflow")}</span>
                  </div>
                ) : null}
                <div className="audit-meta">
                  <span className={`audit-pill ${generated.fallbackStatus}`}>{formatAiSource(generated, locale)}</span>
                  <span>{generated.promptVersion}</span>
                </div>
                <div className="draft-tags">
                  {generated.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <p>{generated.bodyText}</p>
                <div className="draft-footer">
                  <span>{generated.coverCopy}</span>
                  <span>{generated.generationNotes}</span>
                </div>
                {generated.fallbackReason ? <span className="status-note">fallback: {generated.fallbackReason}</span> : null}
              </div>
            ) : (
              <p className="empty-state">{t("运行生成流程后，这里会展示最新的小红书草稿。", "Run the generate flow to preview the latest Xiaohongshu draft.")}</p>
            )}
          </article>

          {(workflowResult || workflowJobs[0] || debugSummary?.account) ? (
            <details className="panel advanced-panel">
              <summary>{t("高级信息与调试", "Advanced details and debugging")}</summary>
              {workflowJobs[0] ? (
                <div className="table-list">
                  <div className="sample-card">
                    <strong>{t("最近工作流任务", "Latest workflow job")}</strong>
                    <div className="pattern-meta">
                      <span>{workflowJobs[0].id}</span>
                      <span>{formatStatus(workflowJobs[0].status, locale)}</span>
                    </div>
                    {workflowJobs[0].metadata?.workflowVerdict ? (
                      <div className="audit-meta">
                        <span className={`quality-pill ${workflowJobs[0].metadata.workflowVerdict === "strong" ? "good" : workflowJobs[0].metadata.workflowVerdict === "usable" ? "medium" : "weak"}`}>
                          {formatWorkflowVerdict(workflowJobs[0].metadata.workflowVerdict, locale)}
                        </span>
                        <span>{translateKnownUiText(workflowJobs[0].metadata.workflowSummary, locale)}</span>
                      </div>
                    ) : null}
                    <div className="action-row">
                      <button className="secondary-btn" disabled={loading} onClick={handleRerunLatestWorkflow} type="button">
                        {t("重跑最近工作流", "Re-run Latest Workflow")}
                      </button>
                      <button
                        className="secondary-btn"
                        disabled={loading || !debugSummary?.latestRealJob || debugSummary.latestRealJob.status !== "completed"}
                        onClick={handleRunLatestRealPipeline}
                        type="button"
                      >
                        {t("运行最近真实流程", "Run Latest Real Pipeline")}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              {workflowResult ? (
                <div className="table-list">
                  <div className="sample-card">
                    <strong>{t("最近一次真实工作流", "Latest real workflow")}</strong>
                    <div className="pattern-meta">
                      <span>{workflowResult.samples?.length || 0} {t("条样本", "samples")}</span>
                      <span>{workflowResult.analyses?.length || 0} {t("条分析", "analyses")}</span>
                    </div>
                    {workflowResult.diagnostics ? (
                      <div className="pattern-meta">
                        <span>{t("平均质量", "avg quality")} {workflowResult.diagnostics.averageSampleQuality ?? "--"}/100</span>
                        <span>{t("Pattern 来源", "pattern")} {workflowResult.diagnostics.patternSource || "--"}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {debugSummary?.account ? (
                <div className="table-list">
                  <div className="debug-card">
                    <strong>{t("采集调试", "Collector Debug")}</strong>
                    <span>{translateKnownUiText(debugSummary.account.verificationMessage, locale) || t("暂无验证信息。", "No verification message yet.")}</span>
                    <div className="debug-grid">
                      <span>{t("原因", "reason")}: {debugSummary.account.verificationMetadata?.reason || "--"}</span>
                      <span>{t("搜索流", "state feeds")}: {debugSummary.account.verificationMetadata?.diagnostics?.stateSummary?.searchFeedCount || 0}</span>
                      <span>{t("首页流", "home feeds")}: {debugSummary.account.verificationMetadata?.diagnostics?.stateSummary?.homeFeedCount || 0}</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </details>
          ) : null}
        </div>
      </main>
    </div>
  );
}
