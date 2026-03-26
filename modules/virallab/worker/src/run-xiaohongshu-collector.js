import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium, request as playwrightRequest } from "playwright";

dotenv.config();

const payload = process.argv[2] ? JSON.parse(process.argv[2]) : {};
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTIFACTS_DIR = path.resolve(__dirname, "../artifacts");
const VISION_OCR_RUNNER = path.resolve(__dirname, "./vision-ocr.swift");
const VERIFY_LOGIN_TEXT = "登录后查看搜索结果";
const execFileAsync = promisify(execFile);
const PROGRESS_FILE_PATH =
  typeof payload.progressFilePath === "string" && payload.progressFilePath.trim()
    ? payload.progressFilePath.trim()
    : null;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = async (promise, ms, fallbackValue) => {
  let timeoutId = null;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        timeoutId = setTimeout(() => resolve(fallbackValue), ms);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const humanPause = async (min = 350, max = 1200) => {
  const lower = Math.max(0, Number(min) || 0);
  const upper = Math.max(lower, Number(max) || lower);
  const duration = lower + Math.floor(Math.random() * (upper - lower + 1));
  await delay(duration);
};

const writeProgress = async (update = {}) => {
  if (!PROGRESS_FILE_PATH) return;
  try {
    await fs.writeFile(
      PROGRESS_FILE_PATH,
      JSON.stringify({
        ...update,
        updatedAt: new Date().toISOString(),
      }),
      "utf8",
    );
  } catch {
    // ignore progress write failures
  }
};

const safeUnlink = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch {
    // ignore cleanup failures
  }
};

const fail = (message, reason, extras = {}) => {
  process.stdout.write(
    JSON.stringify({
      mode: "real",
      status: "failed",
      progress: 0,
      metadata: {
        provider: "xiaohongshu-playwright-worker",
        ready: false,
        reason,
        ...extras,
      },
      errorMessage: message,
      samples: [],
    }),
  );
};

const sanitizeSegment = (value) =>
  String(value || "unknown")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "unknown";

const isLikelySearchApiUrl = (url) => {
  const value = String(url || "");
  return (
    value.includes("/api/sns/web/v1/search/") ||
    value.includes("/api/sns/web/v1/homefeed") ||
    value.includes("/fe_api/burdock/") ||
    (value.includes("xiaohongshu.com") && value.includes("search") && value.includes("api"))
  );
};

const parseCookieBlob = (cookieBlob) => {
  if (!cookieBlob || !String(cookieBlob).trim()) return [];
  const raw = String(cookieBlob).trim();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        name: item.name,
        value: item.value,
        domain: item.domain || ".xiaohongshu.com",
        path: item.path || "/",
        httpOnly: Boolean(item.httpOnly),
        secure: item.secure !== false,
        sameSite: item.sameSite || "Lax",
        expires: typeof item.expires === "number" ? item.expires : undefined,
      }));
    }
  } catch {
    // fall through to semicolon parser
  }

  return raw
    .split(";")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [name, ...rest] = chunk.split("=");
      return {
        name: String(name || "").trim(),
        value: rest.join("=").trim(),
        domain: ".xiaohongshu.com",
        path: "/",
        httpOnly: false,
        secure: true,
        sameSite: "Lax",
      };
    })
    .filter((item) => item.name && item.value);
};

const collectCookieSignatureInputs = (cookieBlob) => {
  const cookies = parseCookieBlob(cookieBlob);
  const cookieMap = Object.fromEntries(
    cookies.map((item) => [String(item.name || "").trim(), String(item.value || "")]),
  );
  const requiredKeys = ["a1", "web_session", "webId"];
  const optionalKeys = ["gid", "abRequestId", "acw_tc"];

  const summarize = (value) => (value ? `${String(value).slice(0, 12)}...` : null);

  return {
    requiredKeys,
    optionalKeys,
    present: Object.fromEntries(
      requiredKeys.concat(optionalKeys).map((key) => [key, Boolean(cookieMap[key])]),
    ),
    valuesPreview: Object.fromEntries(
      requiredKeys.concat(optionalKeys).map((key) => [key, summarize(cookieMap[key])]),
    ),
    allRequiredPresent: requiredKeys.every((key) => Boolean(cookieMap[key])),
  };
};

const SEARCH_SORT_ID_MAP = {
  hot: "general",
  latest: "time_descending",
  "most-liked": "popularity_descending",
  "most-commented": "comment_descending",
  "most-collected": "collect_descending",
};

const SEARCH_NOTE_TYPE_VALUE_MAP = {
  all: 0,
  video: 1,
  image: 2,
};

const SEARCH_FILTER_TAG_FALLBACKS = {
  sort_type: {
    hot: { name: "综合", id: "general" },
    latest: { name: "最新", id: "time_descending" },
    "most-liked": { name: "最多点赞", id: "popularity_descending" },
    "most-commented": { name: "最多评论", id: "comment_descending" },
    "most-collected": { name: "最多收藏", id: "collect_descending" },
  },
  filter_note_type: {
    all: { name: "不限", id: "不限" },
    video: { name: "视频", id: "视频笔记" },
    image: { name: "图文", id: "普通笔记" },
  },
  filter_note_time: {
    all: { name: "不限", id: "不限" },
    day: { name: "一天内", id: "一天内" },
    week: { name: "一周内", id: "一周内" },
    "half-year": { name: "半年内", id: "半年内" },
  },
  filter_note_range: {
    all: { name: "不限", id: "不限" },
  },
  filter_pos_distance: {
    all: { name: "不限", id: "不限" },
  },
};

const findSearchFilterTag = (filterConfig, filterType, selectionKey) => {
  const fallback = SEARCH_FILTER_TAG_FALLBACKS[filterType]?.[selectionKey];
  const group = Array.isArray(filterConfig) ? filterConfig.find((item) => item?.id === filterType) : null;
  const tags = Array.isArray(group?.filter_tags) ? group.filter_tags : [];
  if (!tags.length) {
    return fallback || null;
  }

  if (fallback?.id) {
    const byId = tags.find((tag) => String(tag?.id || "") === String(fallback.id));
    if (byId) return { name: byId.name || fallback.name, id: byId.id || fallback.id };
  }

  if (fallback?.name) {
    const byName = tags.find((tag) => String(tag?.name || "") === String(fallback.name));
    if (byName) return { name: byName.name || fallback.name, id: byName.id || fallback.id || fallback.name };
  }

  return fallback || null;
};

const buildSearchNotesFilters = ({ sortBy, noteType, publishWindow, filterConfig }) => {
  const sortTag = findSearchFilterTag(filterConfig, "sort_type", sortBy) || SEARCH_FILTER_TAG_FALLBACKS.sort_type.hot;
  const noteTypeTag =
    findSearchFilterTag(filterConfig, "filter_note_type", noteType) || SEARCH_FILTER_TAG_FALLBACKS.filter_note_type.all;
  const publishWindowTag =
    findSearchFilterTag(filterConfig, "filter_note_time", publishWindow) ||
    SEARCH_FILTER_TAG_FALLBACKS.filter_note_time.all;
  const rangeTag = findSearchFilterTag(filterConfig, "filter_note_range", "all") || SEARCH_FILTER_TAG_FALLBACKS.filter_note_range.all;
  const distanceTag =
    findSearchFilterTag(filterConfig, "filter_pos_distance", "all") || SEARCH_FILTER_TAG_FALLBACKS.filter_pos_distance.all;

  return {
    sort: sortTag.id || SEARCH_SORT_ID_MAP.hot,
    noteTypeValue: SEARCH_NOTE_TYPE_VALUE_MAP[noteType] ?? 0,
    filters: [
      { type: "sort_type", tags: [sortTag.id || sortTag.name] },
      { type: "filter_note_type", tags: [noteTypeTag.id || noteTypeTag.name] },
      { type: "filter_note_time", tags: [publishWindowTag.id || publishWindowTag.name] },
      { type: "filter_note_range", tags: [rangeTag.id || rangeTag.name] },
      { type: "filter_pos_distance", tags: [distanceTag.id || distanceTag.name] },
    ],
    selections: {
      sort: sortTag,
      noteType: noteTypeTag,
      publishWindow: publishWindowTag,
      range: rangeTag,
      distance: distanceTag,
    },
  };
};

const SEARCH_SORT_LABEL_MAP = {
  hot: "综合",
  latest: "最新",
  "most-liked": "最多点赞",
  "most-commented": "最多评论",
  "most-collected": "最多收藏",
};

const SEARCH_NOTE_TYPE_LABEL_MAP = {
  all: "全部",
  image: "图文",
  video: "视频",
};

const SEARCH_PUBLISH_WINDOW_LABEL_MAP = {
  all: "不限",
  day: "一天内",
  week: "一周内",
  "half-year": "半年内",
};

const clickVisibleText = async (page, label) => {
  if (!label) return { ok: false, reason: "missing-label" };

  const result = await page.evaluate((textLabel) => {
    const isVisible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 10 && rect.height > 10;
    };

    const nodes = Array.from(document.querySelectorAll("button, div, span")).filter((element) => {
      const value = String(element.textContent || "").replace(/\s+/g, " ").trim();
      return value === textLabel && isVisible(element);
    });

    if (!nodes.length) {
      return { ok: false, count: 0 };
    }

    const node = nodes[0];
    node.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    return {
      ok: true,
      count: nodes.length,
      tag: node.tagName,
      className: String(node.className || ""),
    };
  }, label);

  await delay(1200);
  return result;
};

const applySearchUiFilters = async (page, { sortBy, noteType, publishWindow }) => {
  const applied = {
    noteTypeLabel: SEARCH_NOTE_TYPE_LABEL_MAP[noteType] || SEARCH_NOTE_TYPE_LABEL_MAP.all,
    sortLabel: SEARCH_SORT_LABEL_MAP[sortBy] || SEARCH_SORT_LABEL_MAP.hot,
    publishWindowLabel: SEARCH_PUBLISH_WINDOW_LABEL_MAP[publishWindow] || SEARCH_PUBLISH_WINDOW_LABEL_MAP.all,
    steps: [],
  };

  if (noteType !== "all") {
    applied.steps.push({
      step: "note-type",
      label: applied.noteTypeLabel,
      result: await clickVisibleText(page, applied.noteTypeLabel),
    });
  }

  const needsPanel = sortBy !== "hot" || publishWindow !== "all";
  if (!needsPanel) {
    return applied;
  }

  applied.steps.push({
    step: "open-filter",
    label: "筛选",
    result: await clickVisibleText(page, "筛选"),
  });

  if (sortBy !== "hot") {
    applied.steps.push({
      step: "sort",
      label: applied.sortLabel,
      result: await clickVisibleText(page, applied.sortLabel),
    });
  }

  if (publishWindow !== "all") {
    applied.steps.push({
      step: "publish-window",
      label: applied.publishWindowLabel,
      result: await clickVisibleText(page, applied.publishWindowLabel),
    });
  }

  applied.steps.push({
    step: "close-filter",
    label: "收起",
    result: await clickVisibleText(page, "收起"),
  });

  return applied;
};

const extractNoteIdFromUrl = (value) => {
  const match = String(value || "").match(/\/(?:explore|discovery\/item)\/([a-zA-Z0-9]+)/);
  return match ? match[1] : "";
};

const text = (value) => String(value || "").replace(/\s+/g, " ").trim();

const isDateLikeTag = (value) => {
  const normalized = text(value);
  if (!normalized) return false;
  return (
    /^\d{1,2}-\d{1,2}$/.test(normalized) ||
    /^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized) ||
    /^\d{1,2}\/\d{1,2}$/.test(normalized) ||
    /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(normalized) ||
    /^\d{1,2}\.\d{1,2}$/.test(normalized) ||
    /^\d{1,2}月\d{1,2}日$/.test(normalized) ||
    /^\d{4}年\d{1,2}月\d{1,2}日$/.test(normalized)
  );
};

const extractHashtags = (value) => {
  const matches = String(value || "").match(/#([\p{L}\p{N}_-]{2,30})/gu) || [];
  return matches.map((item) => item.replace(/^#/, "").trim()).filter(Boolean);
};

const extractTitleKeywords = (value, keyword) => {
  const normalized = text(value);
  if (!normalized) return [];

  const stopwords = new Set([
    "小红书",
    "分享",
    "笔记",
    "搜索",
    "结果",
    "热门",
    "内容",
    "视频",
    "图文",
    "日记",
    "时代",
    "未来",
    "孩子",
    "这么",
    "这个",
    "那个",
    "居然",
    "简直",
    "真的",
    "太",
    "非常",
    "一个",
    "我们",
    "你们",
    "他们",
    "自己",
    "过去",
    "今天",
    "昨天",
    "攻略",
    "合集",
    "模板",
    String(keyword || "").trim(),
  ]);

  const candidates = normalized
    .split(/[|｜·,，。！？!?:：;；、~\s()（）【】\[\]<>《》"“”'‘’/]+/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item.length >= 2 && item.length <= 16)
    .filter((item) => !isDateLikeTag(item))
    .filter((item) => !/^(day\d+|\d+年|\d+月|\d+日|\d+天前|\d+小时前|\d+分钟前)$/i.test(item))
    .filter((item) => !stopwords.has(item));

  return candidates.filter((item, index, array) => array.indexOf(item) === index).slice(0, 5);
};

const normalizeTagValue = (value, keyword) => {
  const normalized = text(value).replace(/^#/, "");
  if (!normalized) return "";
  if (isDateLikeTag(normalized)) return "";
  if (/^(day\d+|\d+年|\d+月|\d+日|\d+天前|\d+小时前|\d+分钟前)$/i.test(normalized)) return "";
  if (/^(视频|图文|笔记|小红书|热门|搜索结果|正文|作者)$/i.test(normalized)) return "";
  if (normalized === String(keyword || "").trim()) return "";
  return normalized;
};

const mergeTags = (values, keyword, limit = 8) =>
  values
    .flatMap((item) => (Array.isArray(item) ? item : [item]))
    .map((item) => normalizeTagValue(item, keyword))
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index)
    .slice(0, limit);

const normalizeTimestampValue = (value) => {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value > 1e9 ? value * 1000 : null;
    if (!ms) return null;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const raw = text(value);
  if (!raw) return null;
  const normalizedRaw = raw.replace(/^编辑于/, "").replace(/^发布于/, "").replace(/^发表于/, "").trim();
  if (/^(刚刚|刚才)$/.test(normalizedRaw)) {
    return new Date().toISOString();
  }
  const now = new Date();
  const nowMs = now.getTime();
  const relativeMinutes = normalizedRaw.match(/^(\d+)\s*分钟前$/);
  if (relativeMinutes) {
    return new Date(nowMs - Number(relativeMinutes[1]) * 60 * 1000).toISOString();
  }
  const relativeHours = normalizedRaw.match(/^(\d+)\s*小时前$/);
  if (relativeHours) {
    return new Date(nowMs - Number(relativeHours[1]) * 60 * 60 * 1000).toISOString();
  }
  const relativeDays = normalizedRaw.match(/^(\d+)\s*天前$/);
  if (relativeDays) {
    return new Date(nowMs - Number(relativeDays[1]) * 24 * 60 * 60 * 1000).toISOString();
  }
  if (/^今天/.test(normalizedRaw)) {
    return new Date().toISOString();
  }
  if (/^昨天/.test(normalizedRaw)) {
    return new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
  }
  if (/^前天/.test(normalizedRaw)) {
    return new Date(nowMs - 2 * 24 * 60 * 60 * 1000).toISOString();
  }
  if (/^\d+$/.test(raw)) {
    return normalizeTimestampValue(Number(raw));
  }
  if (/^\d{1,2}-\d{1,2}$/.test(raw)) {
    const [month, day] = raw.split("-").map((item) => Number(item));
    const date = new Date(Date.UTC(now.getUTCFullYear(), month - 1, day));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const monthDayMatch = normalizedRaw.match(/^(\d{1,2})月(\d{1,2})日$/);
  if (monthDayMatch) {
    const month = Number(monthDayMatch[1]);
    const day = Number(monthDayMatch[2]);
    const date = new Date(Date.UTC(now.getUTCFullYear(), month - 1, day));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const fullCnDateMatch = normalizedRaw.match(/^(20\d{2})年(\d{1,2})月(\d{1,2})日$/);
  if (fullCnDateMatch) {
    const [, year, month, day] = fullCnDateMatch;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(raw)) {
    const normalized = raw.replace(/\//g, "-");
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
};

const isWithinPublishWindow = (publishTime, publishWindow) => {
  if (!publishWindow || publishWindow === "all") return true;
  const normalized = normalizeTimestampValue(publishTime);
  if (!normalized) return true;
  const timestamp = new Date(normalized).getTime();
  if (Number.isNaN(timestamp)) return true;
  const diffMs = Date.now() - timestamp;
  if (publishWindow === "day") return diffMs <= 24 * 60 * 60 * 1000;
  if (publishWindow === "week") return diffMs <= 7 * 24 * 60 * 60 * 1000;
  if (publishWindow === "half-year") return diffMs <= 183 * 24 * 60 * 60 * 1000;
  return true;
};

const inferContentType = (sample) =>
  sample?.hasVideoMedia || (Array.isArray(sample.mediaVideoUrls) && sample.mediaVideoUrls.length) ? "video" : "image";

const inferContentFormat = (sample) => {
  const imageCount = Array.isArray(sample.mediaImageUrls) ? sample.mediaImageUrls.length : 0;
  if (inferContentType(sample) === "video") return "video-note";
  if (imageCount >= 2 && text(sample.contentText).length < 120) return "long-image-note";
  if (imageCount >= 2) return "multi-image-note";
  return "single-image-note";
};

const filterSamplesByNoteType = (samples, noteType) => {
  if (!noteType || noteType === "all") return samples;
  return samples.filter((sample) => inferContentType(sample) === noteType);
};

const filterSamplesByPublishWindow = (samples, publishWindow) =>
  samples.filter((sample) => isWithinPublishWindow(sample.publishTime, publishWindow));

const sortSamples = (samples, sortBy) => {
  const next = [...samples];
  const publishMs = (sample) => {
    const normalized = normalizeTimestampValue(sample.publishTime);
    return normalized ? new Date(normalized).getTime() : 0;
  };

  next.sort((left, right) => {
    if (sortBy === "latest") {
      return publishMs(right) - publishMs(left);
    }
    if (sortBy === "most-liked") {
      return (right.likeCount || 0) - (left.likeCount || 0);
    }
    if (sortBy === "most-commented") {
      return (right.commentCount || 0) - (left.commentCount || 0);
    }
    if (sortBy === "most-collected") {
      return (right.collectCount || 0) - (left.collectCount || 0);
    }
    return (right.likeCount || 0) + (right.collectCount || 0) - ((left.likeCount || 0) + (left.collectCount || 0));
  });

  return next;
};

const cleanOcrText = (value) =>
  String(value || "")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => text(line))
    .filter(Boolean)
    .filter((line, index, lines) => lines.indexOf(line) === index)
    .join("\n");

const ensureArtifactsDir = async () => {
  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });
};

const downloadFileToArtifacts = async (url, prefix) => {
  if (!url || !/^https?:\/\//.test(url)) return null;
  await ensureArtifactsDir();
  const extMatch = String(url).match(/\.(png|jpe?g|webp)(?:\?|$)/i);
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : ".jpg";
  const filePath = path.join(
    ARTIFACTS_DIR,
    `${sanitizeSegment(prefix)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`,
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  let response;
  try {
    response = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
  clearTimeout(timeoutId);
  if (!response.ok) return null;
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filePath, buffer);
  return filePath;
};

const runVisionOcr = async (filePaths = []) => {
  const targets = filePaths.filter(Boolean);
  if (!targets.length) return [];
  try {
    const result = await withTimeout(
      execFileAsync("swift", [VISION_OCR_RUNNER, ...targets], {
        maxBuffer: 20 * 1024 * 1024,
      }),
      12000,
      null,
    );
    if (!result || typeof result !== "object" || !("stdout" in result)) return [];
    const { stdout } = result;
    const parsed = JSON.parse(stdout || "[]");
    return Array.isArray(parsed)
      ? parsed.map((item) => ({
          path: String(item?.path || ""),
          text: cleanOcrText(item?.text || ""),
        }))
      : [];
  } catch {
    return [];
  }
};

const extractImageOcrTexts = async (imageUrls = [], prefix = "sample-image") => {
  const targets = imageUrls.filter(Boolean).slice(0, 3);
  const files = [];
  try {
    for (const [index, url] of targets.entries()) {
      const filePath = await downloadFileToArtifacts(url, `${prefix}-${index + 1}`);
      if (filePath) files.push(filePath);
    }
    const results = await runVisionOcr(files);
    return results.map((item) => item.text).filter(Boolean);
  } finally {
    await Promise.all(files.map((filePath) => safeUnlink(filePath)));
  }
};

const captureLocatorFrameOcr = async (page, selector, prefix) => {
  const files = [];
  try {
    await ensureArtifactsDir();
    const locator = page.locator(selector).first();
    if ((await locator.count().catch(() => 0)) === 0) return [];
    for (let index = 0; index < 2; index += 1) {
      const filePath = path.join(
        ARTIFACTS_DIR,
        `${sanitizeSegment(prefix)}-frame-${index + 1}-${Date.now()}.png`,
      );
      await locator.screenshot({ path: filePath }).catch(() => {});
      files.push(filePath);
      await delay(900);
    }
    const results = await runVisionOcr(files);
    return results.map((item) => item.text).filter(Boolean);
  } finally {
    await Promise.all(files.map((filePath) => safeUnlink(filePath)));
  }
};

const finalizeResolvedContent = (sample) => {
  const resolvedContentText =
    text(sample.resolvedContentText) ||
    text(sample.ocrTextClean) ||
    text(sample.transcriptText) ||
    text(sample.contentText) ||
    text(sample.contentSummary);
  const resolvedContentSource =
    sample.resolvedContentSource ||
    (text(sample.ocrTextClean)
      ? "image-ocr"
      : text(sample.transcriptText)
        ? "video-frame-ocr"
        : "note-body");
  return {
    ...sample,
    hasVideoMedia: Boolean(sample.hasVideoMedia),
    contentType: inferContentType(sample),
    contentFormat: inferContentFormat(sample),
    longImageCandidate: inferContentFormat(sample) === "long-image-note",
    ocrTextRaw: sample.ocrTextRaw || "",
    ocrTextClean: sample.ocrTextClean || "",
    transcriptText: sample.transcriptText || "",
    transcriptSegments: Array.isArray(sample.transcriptSegments) ? sample.transcriptSegments.filter(Boolean) : [],
    frameOcrTexts: Array.isArray(sample.frameOcrTexts) ? sample.frameOcrTexts.filter(Boolean) : [],
    resolvedContentText,
    resolvedContentSource,
  };
};

const summarizeJsonishBody = (value) => {
  const raw = String(value || "").trim();
  if (!raw) {
    return {
      bodySnippet: "",
      parsed: null,
    };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      bodySnippet: raw.slice(0, 240),
      parsed: {
        code: typeof parsed?.code === "number" ? parsed.code : null,
        success: typeof parsed?.success === "boolean" ? parsed.success : null,
        msg: typeof parsed?.msg === "string" ? parsed.msg : null,
        dataKeys:
          parsed?.data && typeof parsed.data === "object" && !Array.isArray(parsed.data)
            ? Object.keys(parsed.data).slice(0, 20)
            : [],
      },
    };
  } catch {
    return {
      bodySnippet: raw.slice(0, 240),
      parsed: null,
    };
  }
};

const filterSignedHeaders = (headers = {}) => ({
  referer: headers?.referer || null,
  "user-agent": headers?.["user-agent"] || null,
  "x-s": headers?.["x-s"] || null,
  "x-t": headers?.["x-t"] || null,
  "x-s-common": headers?.["x-s-common"] || null,
  "x-xray-traceid": headers?.["x-xray-traceid"] || null,
  "x-b3-traceid": headers?.["x-b3-traceid"] || null,
  xsecappid: headers?.xsecappid || null,
  xsecappvers: headers?.xsecappvers || null,
  xsecplatform: headers?.xsecplatform || null,
});

const createTrackedResponseCollector = (noteId) => {
  const discoveredResponses = [];

  const captureResponse = async (response) => {
    const url = response.url();
    if (!url.includes("edith.xiaohongshu.com")) return;
    if (!/note|feed|comment|user|video|explore|discovery|board|search/i.test(url)) return;
    const body = await response.text().catch(() => "");
    discoveredResponses.push({
      url,
      status: response.status(),
      resourceType: response.request().resourceType(),
      ...summarizeJsonishBody(body),
      isTargetNoteInfo: url.includes("/api/sns/h5/v1/note_info") && url.includes(noteId),
    });
  };

  return {
    discoveredResponses,
    captureResponse,
  };
};

const extractSearchCards = async (page, keyword, targetCount) => {
  const items = await page.evaluate(
    ({ keyword, targetCount }) => {
      const text = (value) => String(value || "").replace(/\s+/g, " ").trim();
      const numberFromText = (value) => {
        const normalized = text(value).replace(/[,，]/g, "");
        const match = normalized.match(/(\d+(?:\.\d+)?)([万wW]?)/);
        if (!match) return 0;
        const base = Number(match[1] || 0);
        return match[2] ? Math.round(base * 10000) : Math.round(base);
      };

      const extractFromNode = (node) => {
        if (!(node instanceof HTMLElement)) return null;
        const link =
          node.querySelector('a[href*="/explore/"]') ||
          node.querySelector('a[href*="/discovery/item/"]') ||
          node.closest('a[href*="/explore/"]') ||
          node.closest('a[href*="/discovery/item/"]');
        const href = link?.getAttribute("href") || "";
        if (!href) return null;

        const title =
          text(
            node.querySelector('[class*="title"]')?.textContent ||
              node.querySelector("h3")?.textContent ||
              link.textContent,
          ) || `${keyword} 热门内容`;

        const desc = text(
          node.querySelector('[class*="desc"]')?.textContent ||
            node.querySelector('[class*="content"]')?.textContent ||
            "",
        );

        const author = text(
          node.querySelector('[class*="author"]')?.textContent ||
            node.querySelector('[class*="user"]')?.textContent ||
            "小红书用户",
        );

        const image =
          node.querySelector("img")?.getAttribute("src") ||
          node.querySelector("img")?.getAttribute("data-src") ||
          "";

        const tagNodes = Array.from(node.querySelectorAll('[class*="tag"], [class*="topic"]'));
        const tags = tagNodes
          .map((item) => text(item.textContent))
          .filter(Boolean)
          .slice(0, 3);
        const publishText = text(
          node.querySelector("time")?.getAttribute("datetime") ||
            node.querySelector("time")?.textContent ||
            node.querySelector('[class*="date"]')?.textContent ||
            "",
        );

        const metricText = text(node.textContent);
        const likeCount = numberFromText(metricText);

        return {
          title,
          contentText: desc || `${title}，围绕 ${keyword} 展开，等待后续深入解析。`,
          contentSummary: desc || `${keyword} 搜索结果卡片内容摘要。`,
          hasVideoMedia:
            node.querySelector("video") !== null ||
            /视频/.test(title) ||
            /视频/.test(metricText),
          authorName: author,
          publishTime: publishText || "",
          likeCount,
          commentCount: 0,
          collectCount: 0,
          shareCount: 0,
          tags: tags.length ? tags : [keyword],
          sourceUrl: href.startsWith("http") ? href : `https://www.xiaohongshu.com${href}`,
          coverImageUrl: image,
        };
      };

      const candidates = [
        ...document.querySelectorAll('[class*="note-item"]'),
        ...document.querySelectorAll('[class*="search-item"]'),
        ...document.querySelectorAll('[class*="note-card"]'),
        ...document.querySelectorAll('section'),
      ];

      const seen = new Set();
      const items = [];
      for (const node of candidates) {
        const item = extractFromNode(node);
        if (!item) continue;
        if (seen.has(item.sourceUrl)) continue;
        seen.add(item.sourceUrl);
        items.push(item);
        if (items.length >= targetCount) break;
      }
      return items;
    },
    { keyword, targetCount },
  );
  return items.map((item) => ({
    ...item,
    publishTime: normalizeTimestampValue(item.publishTime) || new Date().toISOString(),
    tags: mergeTags([item.tags, extractHashtags(item.title), extractTitleKeywords(item.title, keyword)], keyword, 5),
  }));
};

const extractFromInitialState = async (page, keyword, targetCount) => {
  const items = await page.evaluate(
    ({ keyword, targetCount }) => {
      const text = (value) => String(value || "").replace(/\s+/g, " ").trim();
      const normalizeUrl = (value) => {
        const raw = text(value);
        if (!raw) return "";
        if (raw.startsWith("http")) return raw;
        if (raw.startsWith("//")) return `https:${raw}`;
        if (raw.startsWith("/")) return `https://www.xiaohongshu.com${raw}`;
        return `https://www.xiaohongshu.com/${raw.replace(/^\/+/, "")}`;
      };
      const isValidNoteUrl = (value) => {
        const normalized = normalizeUrl(value);
        return (
          normalized.includes("xiaohongshu.com/explore/") ||
          normalized.includes("xiaohongshu.com/discovery/item/")
        );
      };
      const numberFromUnknown = (value) => {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        const raw = text(value).replace(/[,，]/g, "");
        const match = raw.match(/(\d+(?:\.\d+)?)([万wW]?)/);
        if (!match) return 0;
        const base = Number(match[1] || 0);
        return match[2] ? Math.round(base * 10000) : Math.round(base);
      };
      const unwrap = (value, depth = 0) => {
        if (!value || depth > 5) return value;
        if (Array.isArray(value)) return value.map((item) => unwrap(item, depth + 1));
        if (typeof value !== "object") return value;
        if ("_value" in value) return unwrap(value._value, depth + 1);
        return value;
      };
      const state = unwrap(window.__INITIAL_STATE__);
      const queue = [state];
      const visited = new WeakSet();
      const discovered = [];

      while (queue.length) {
        const current = queue.shift();
        if (!current || typeof current !== "object") continue;
        if (visited.has(current)) continue;
        visited.add(current);

        if (Array.isArray(current)) {
          for (const item of current) queue.push(unwrap(item));
          continue;
        }

        const values = Object.values(current);
        for (const item of values) queue.push(unwrap(item));

        const modelType = text(current.model_type || current.modelType || current.type || "");
        if (modelType && modelType !== "note") continue;

        const noteId =
          current.noteId ||
          current.id ||
          current.note_id ||
          current.noteid ||
          current.itemId ||
          current.item_id;
        const title =
          current.displayTitle ||
          current.title ||
          current.noteTitle ||
          current.note_title ||
          current.coverTitle;
        const user =
          current.user ||
          current.author ||
          current.userInfo ||
          current.noteUser ||
          current.xsecUserInfo;
        const interaction = current.interactInfo || current.interaction || current.metrics || {};
        const imageList = current.imageList || current.imagesList || current.coversList || current.cover || [];
        const tagList = current.tagList || current.tags || current.topics || current.topicList || [];
        const content =
          current.desc ||
          current.content ||
          current.summary ||
          current.noteAbstract ||
          current.noteDesc ||
          "";
        const sourceUrl =
          current.noteLink ||
          current.link ||
          current.url ||
          (noteId ? `/explore/${noteId}` : "");

        const source = normalizeUrl(sourceUrl);
        const looksLikeNote =
          Boolean(current.noteCardType || current.noteType || current.modelType || current.xsecToken || current.xsec_token) ||
          isValidNoteUrl(source) ||
          Boolean(noteId && String(noteId).length >= 8);

        if (!source || !looksLikeNote || (!title && !content)) continue;

        const authorName =
          user?.nickname ||
          user?.name ||
          user?.userName ||
          current.nickname ||
          current.authorName ||
          "小红书用户";
        const coverImageUrl =
          current.cover?.url ||
          current.cover?.default ||
          current.coverInfo?.url ||
          current.image?.url ||
          current.imageUrl ||
          (Array.isArray(imageList) ? imageList[0]?.url || imageList[0]?.default : "");
        const tags = (Array.isArray(tagList) ? tagList : [])
          .map((item) => text(item?.name || item?.text || item))
          .filter(Boolean)
          .slice(0, 8);

        discovered.push({
          title: text(title) || `${keyword} 热门内容`,
          contentText: text(content) || `${text(title)}，围绕 ${keyword} 展开。`,
          contentSummary: text(content) || `${keyword} 搜索结果摘要。`,
          hasVideoMedia:
            Boolean(current.video_info || current.videoInfo || current.video_info_v2 || current.videoInfoV2) ||
            /video|视频/i.test(
              [
                current.noteCardType,
                current.noteType,
                current.note_type,
                current.modelType,
                current.model_type,
                current.type,
                title,
              ]
                .filter(Boolean)
                .join(" "),
            ),
          authorName: text(authorName),
          publishTime:
            current.publish_time ||
            current.publishTime ||
            current.time ||
            current.note_time ||
            current.create_time ||
            current.last_update_time ||
            "",
          likeCount: numberFromUnknown(interaction?.likedCount || interaction?.liked_count || current.likeCount || current.likes),
          commentCount: numberFromUnknown(
            interaction?.commentCount || interaction?.comment_count || current.commentCount || current.comments,
          ),
          collectCount: numberFromUnknown(
            interaction?.collectedCount || interaction?.collectCount || interaction?.collected_count || current.collects,
          ),
          shareCount: numberFromUnknown(interaction?.shareCount || interaction?.share_count || current.shares),
          tags: tags.length ? tags : [keyword],
          sourceUrl: source,
          coverImageUrl: normalizeUrl(coverImageUrl),
        });
      }

      const unique = [];
      const seen = new Set();
      for (const item of discovered) {
        if (!item.sourceUrl || seen.has(item.sourceUrl)) continue;
        seen.add(item.sourceUrl);
        unique.push(item);
        if (unique.length >= targetCount) break;
      }
      return unique;
    },
    { keyword, targetCount },
  );
  return items.map((item) => ({
    ...item,
    publishTime: normalizeTimestampValue(item.publishTime) || new Date().toISOString(),
    tags: mergeTags([item.tags, extractHashtags(item.title), extractHashtags(item.contentText), extractTitleKeywords(item.title, keyword)], keyword, 5),
  }));
};

const extractFromSearchState = async (page, keyword, targetCount) => {
  const items = await page.evaluate(
    ({ keyword, targetCount }) => {
      const text = (value) => String(value || "").replace(/\s+/g, " ").trim();
      const normalizeUrl = (value) => {
        const raw = text(value);
        if (!raw) return "";
        if (raw.startsWith("http")) return raw;
        if (raw.startsWith("//")) return `https:${raw}`;
        if (raw.startsWith("/")) return `https://www.xiaohongshu.com${raw}`;
        return `https://www.xiaohongshu.com/${raw.replace(/^\/+/, "")}`;
      };
      const numberFromUnknown = (value) => {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        const raw = text(value).replace(/[,，]/g, "");
        const match = raw.match(/(\d+(?:\.\d+)?)([万wW]?)/);
        if (!match) return 0;
        const base = Number(match[1] || 0);
        return match[2] ? Math.round(base * 10000) : Math.round(base);
      };
      const unwrap = (value, depth = 0) => {
        if (!value || depth > 5) return value;
        if (Array.isArray(value)) return value.map((item) => unwrap(item, depth + 1));
        if (typeof value !== "object") return value;
        if ("_value" in value) return unwrap(value._value, depth + 1);
        return value;
      };
      const state = unwrap(window.__INITIAL_STATE__) || {};
      const search = unwrap(state.search) || {};
      const feeds = Array.isArray(search.feeds) ? search.feeds : [];

      const items = [];
      const seen = new Set();
      for (const current of feeds) {
        if (!current || typeof current !== "object") continue;
        const modelType = text(current.model_type || current.modelType || current.type || "");
        if (modelType && modelType !== "note") continue;
        const noteId =
          current.noteId ||
          current.id ||
          current.note_id ||
          current.noteid ||
          current.itemId ||
          current.item_id;
        const sourceUrl = normalizeUrl(
          current.noteLink ||
            current.link ||
            current.url ||
            (noteId ? `/explore/${noteId}` : ""),
        );
        if (!sourceUrl || seen.has(sourceUrl)) continue;

        const user = current.user || current.author || current.userInfo || current.noteUser || {};
        const interaction = current.interactInfo || current.interaction || current.metrics || {};
        const imageList = current.imageList || current.imagesList || current.coversList || [];
        const tagList = current.tagList || current.tags || current.topics || current.topicList || [];
        const title = text(
          current.displayTitle || current.title || current.noteTitle || current.note_title || current.coverTitle,
        );
        const content = text(
          current.desc || current.content || current.summary || current.noteAbstract || current.noteDesc,
        );
        if (!title && !content) continue;

        const coverImageUrl = normalizeUrl(
          current.cover?.url ||
            current.cover?.default ||
            current.coverInfo?.url ||
            current.image?.url ||
            current.imageUrl ||
            (Array.isArray(imageList) ? imageList[0]?.url || imageList[0]?.default : ""),
        );
        const tags = (Array.isArray(tagList) ? tagList : [])
          .map((item) => text(item?.name || item?.text || item))
          .filter(Boolean)
          .slice(0, 8);

        seen.add(sourceUrl);
        items.push({
          title: title || `${keyword} 热门内容`,
          contentText: content || `${title}，围绕 ${keyword} 展开。`,
          contentSummary: content || `${keyword} 搜索结果摘要。`,
          hasVideoMedia:
            Boolean(
              current.video_info ||
                current.videoInfo ||
                current.video_info_v2 ||
                current.videoInfoV2 ||
                current.noteCardType ||
                current.noteType ||
                current.note_type ||
                current.modelType ||
                current.model_type ||
                current.type,
            ) &&
            /video|视频/i.test(
              [
                current.type,
                current.noteCardType,
                current.noteType,
                current.note_type,
                current.modelType,
                current.model_type,
                title,
              ]
                .filter(Boolean)
                .join(" "),
            ),
          authorName: text(user?.nickname || user?.name || user?.userName || current.nickname || current.authorName || "小红书用户"),
          publishTime:
            current.publish_time ||
            current.publishTime ||
            current.time ||
            current.note_time ||
            current.create_time ||
            current.last_update_time ||
            "",
          likeCount: numberFromUnknown(interaction?.likedCount || interaction?.liked_count || current.likeCount || current.likes),
          commentCount: numberFromUnknown(interaction?.commentCount || interaction?.comment_count || current.commentCount || current.comments),
          collectCount: numberFromUnknown(interaction?.collectedCount || interaction?.collectCount || interaction?.collected_count || current.collects),
          shareCount: numberFromUnknown(interaction?.shareCount || interaction?.share_count || current.shares),
          tags: tags.length ? tags : [keyword],
          sourceUrl,
          coverImageUrl,
        });
        if (items.length >= targetCount) break;
      }

      return items;
    },
    { keyword, targetCount },
  );
  return items.map((item) => ({
    ...item,
    publishTime: normalizeTimestampValue(item.publishTime) || new Date().toISOString(),
    tags: mergeTags([item.tags, extractHashtags(item.title), extractHashtags(item.contentText), extractTitleKeywords(item.title, keyword)], keyword, 5),
  }));
};

const extractFromNetworkPayloads = (payloads, keyword, targetCount) => {
  const text = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const isDateLikeTag = (value) => {
    const normalized = text(value);
    if (!normalized) return false;
    return (
      /^\d{1,2}-\d{1,2}$/.test(normalized) ||
      /^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized) ||
      /^\d{1,2}\/\d{1,2}$/.test(normalized) ||
      /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(normalized) ||
      /^\d{1,2}\.\d{1,2}$/.test(normalized)
    );
  };
  const extractHashtags = (value) => {
    const matches = String(value || "").match(/#([\p{L}\p{N}_-]{2,30})/gu) || [];
    return matches.map((item) => item.replace(/^#/, "").trim()).filter(Boolean);
  };
  const extractTitleKeywords = (value, keyword) => {
    const normalized = text(value);
    if (!normalized) return [];

    const stopwords = new Set([
      "小红书",
      "分享",
      "笔记",
      "搜索",
      "结果",
      "热门",
      "内容",
      "视频",
      "日记",
      "时代",
      "未来",
      "孩子",
      "这么",
      "居然",
      "简直",
      "浪费",
      "时间",
      "过去",
      "这么规划",
      String(keyword || "").trim(),
    ]);

    const candidates = normalized
      .split(/[|｜·,，。！？!?:：;；、~\s()（）【】\[\]<>《》"“”'‘’/]+/g)
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => item.length >= 2 && item.length <= 12)
      .filter((item) => !isDateLikeTag(item))
      .filter((item) => !/^(day\d+|\d+年|\d+月|\d+日)$/i.test(item))
      .filter((item) => !stopwords.has(item));

    return candidates.filter((item, index, array) => array.indexOf(item) === index).slice(0, 4);
  };
  const buildSummary = ({ title, content, authorName, likeCount, commentCount, collectCount, shareCount, publishTime, keyword, tags }) => {
    const contentValue = text(content);
    if (contentValue) return contentValue.slice(0, 120);
    const publishLabel = publishTime
      ? new Date(publishTime).toISOString().slice(0, 10)
      : "";
    const tagPart = Array.isArray(tags) && tags.length ? `，标签：${tags.slice(0, 3).join("、")}` : "";
    const authorPart = authorName ? `，作者：${authorName}` : "";
    const likePart = likeCount > 0 ? `，点赞约 ${likeCount}` : "";
    const commentPart = commentCount > 0 ? `，评论约 ${commentCount}` : "";
    const collectPart = collectCount > 0 ? `，收藏约 ${collectCount}` : "";
    const sharePart = shareCount > 0 ? `，分享约 ${shareCount}` : "";
    const timePart = publishLabel ? `，发布时间 ${publishLabel}` : "";
    return `${text(title) || keyword} 的小红书搜索样本${authorPart}${timePart}${tagPart}${likePart}${commentPart}${collectPart}${sharePart}。`;
  };
  const normalizeUrl = (value) => {
    const raw = text(value);
    if (!raw) return "";
    if (raw.startsWith("http")) return raw;
    if (raw.startsWith("//")) return `https:${raw}`;
    if (raw.startsWith("/")) return `https://www.xiaohongshu.com${raw}`;
    return `https://www.xiaohongshu.com/${raw.replace(/^\/+/, "")}`;
  };
  const numberFromUnknown = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const raw = text(value).replace(/[,，]/g, "");
    const match = raw.match(/(\d+(?:\.\d+)?)([万wW]?)/);
    if (!match) return 0;
    const base = Number(match[1] || 0);
    return match[2] ? Math.round(base * 10000) : Math.round(base);
  };
  const toSample = (current) => {
    if (!current || typeof current !== "object") return null;

    const card = current.note_card || current.noteCard || current.card || current;
    const modelType = text(current.model_type || current.modelType || card.model_type || card.modelType || current.type || "");
    if (modelType && modelType !== "note") return null;
    const user = card.user || current.user || current.author || current.userInfo || {};
    const interaction = card.interact_info || card.interactInfo || current.interactInfo || current.interaction || current.metrics || {};
    const cover = card.cover || current.cover || {};
    const imageList = card.image_list || card.imageList || current.imageList || current.imagesList || current.coversList || [];
    const tagList =
      card.corner_tag_info ||
      card.tag_list ||
      card.tagList ||
      current.corner_tag_info ||
      current.tagList ||
      current.tags ||
      current.topics ||
      current.topicList ||
      [];

    const noteId = current.id || current.noteId || current.note_id || current.itemId || card.id || card.noteId;
    const sourceUrl = normalizeUrl(
      current.noteLink ||
        current.link ||
        current.url ||
        current.shareUrl ||
        card.noteLink ||
        card.link ||
        card.url ||
        card.share_url ||
        (noteId ? `/explore/${noteId}` : ""),
    );
    const title = text(
      card.display_title ||
        card.displayTitle ||
        card.title ||
        card.noteTitle ||
        current.displayTitle ||
        current.title ||
        current.noteTitle ||
        current.note_title ||
        current.coverTitle,
    );
    const content = text(
      card.desc ||
        card.content ||
        card.note_desc ||
        card.noteDesc ||
        card.summary ||
        current.desc ||
        current.content ||
        current.summary ||
        current.noteAbstract ||
        current.noteDesc,
    );
    const publishTime =
      normalizeTimestampValue(
        card.publish_time ||
          card.publishTime ||
          card.time ||
          card.note_time ||
          card.create_time ||
          card.last_update_time ||
          current.publish_time ||
          current.publishTime ||
          current.time ||
          current.note_time ||
          current.create_time ||
          current.last_update_time,
      ) ||
      normalizeTimestampValue(
        (Array.isArray(tagList) ? tagList : [])
          .map((item) => item?.name || item?.text || item?.tag || item)
          .find((item) => isDateLikeTag(item)),
      );

    if (!sourceUrl || (!sourceUrl.includes("/explore/") && !sourceUrl.includes("/discovery/item/"))) return null;
    if (!title && !content) return null;

    const coverImageUrl = normalizeUrl(
      cover.url_default ||
        cover.url_pre ||
        cover.url ||
        current.cover?.url ||
        current.cover?.default ||
        current.coverInfo?.url ||
        current.image?.url ||
        current.imageUrl ||
        (Array.isArray(imageList)
          ? imageList[0]?.url_default || imageList[0]?.url_pre || imageList[0]?.url || imageList[0]?.default
          : ""),
    );
    const tags = (Array.isArray(tagList) ? tagList : [])
      .map((item) => text(item?.name || item?.text || item?.tag || item))
      .filter((item) => !isDateLikeTag(item))
      .concat(extractHashtags(title), extractHashtags(content), extractTitleKeywords(title, keyword))
      .filter(Boolean)
      .filter((item, index, array) => array.indexOf(item) === index)
      .slice(0, 5);
    const authorName = text(
      user?.nick_name || user?.nickname || user?.name || user?.userName || current.nickname || current.authorName || "小红书用户",
    );
    const authorId = text(
      user?.user_id || user?.id || user?.userid || current.user_id || current.authorId || "",
    );
    const likeCount = numberFromUnknown(interaction?.liked_count || interaction?.likedCount || current.likeCount || current.likes);
    const commentCount = numberFromUnknown(interaction?.comment_count || interaction?.commentCount || current.commentCount || current.comments);
    const collectCount = numberFromUnknown(
      interaction?.collected_count || interaction?.collectedCount || interaction?.collectCount || current.collects,
    );
    const shareCount = numberFromUnknown(interaction?.shared_count || interaction?.shareCount || current.shares);
    const noteTypeHints = [
      modelType,
      card.type,
      card.note_type,
      card.noteType,
      card.note_card_type,
      card.noteCardType,
      current.note_type,
      current.noteType,
      current.note_card_type,
      current.noteCardType,
      current.modelType,
      title,
    ]
      .filter(Boolean)
      .join(" ");
    const summary = buildSummary({
      title,
      content,
      authorName,
      likeCount,
      commentCount,
      collectCount,
      shareCount,
      publishTime,
      keyword,
      tags,
    });

    return {
      title: title || `${keyword} 热门内容`,
      platformContentId: String(noteId || ""),
      contentText: content || summary,
      contentSummary: summary,
      authorName,
      authorId,
      publishTime: publishTime || new Date().toISOString(),
      likeCount,
      commentCount,
      collectCount,
      shareCount,
      tags: tags.length ? tags : [keyword],
      sourceUrl,
      coverImageUrl,
      mediaImageUrls: coverImageUrl ? [coverImageUrl] : [],
      mediaVideoUrls: [],
      hasVideoMedia:
        Boolean(card.video_info || card.videoInfo || card.video_info_v2 || card.videoInfoV2) ||
        /video|视频/i.test(noteTypeHints),
    };
  };

  const discovered = [];
  const seen = new Set();

  for (const payload of payloads) {
    const directItems = Array.isArray(payload?.data?.items) ? payload.data.items : [];
    for (const item of directItems) {
      const sample = toSample(item);
      if (!sample || seen.has(sample.sourceUrl)) continue;
      seen.add(sample.sourceUrl);
      discovered.push(sample);
      if (discovered.length >= targetCount) {
        return discovered;
      }
    }

    const queue = [payload];
    const visited = new Set();

    while (queue.length) {
      const current = queue.shift();
      if (!current || typeof current !== "object") continue;
      if (visited.has(current)) continue;
      visited.add(current);

      if (Array.isArray(current)) {
        for (const item of current) queue.push(item);
        continue;
      }

      for (const value of Object.values(current)) {
        queue.push(value);
      }

      const sample = toSample(current);
      if (!sample) continue;
      if (seen.has(sample.sourceUrl)) continue;
      seen.add(sample.sourceUrl);
      discovered.push(sample);

      if (discovered.length >= targetCount) {
        return discovered;
      }
    }
  }

  return discovered;
};

const enrichSamplesFromNotePages = async (context, samples, keyword) => {
  const text = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const unique = (values) =>
    values.filter((item, index, array) => item && array.indexOf(item) === index);

  const page = await context.newPage();
  const enriched = [];

  try {
    for (const sample of samples) {
      let detail = null;
      const expectedNoteId = extractNoteIdFromUrl(sample.sourceUrl);
      try {
        await page.goto(sample.sourceUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
        await delay(1500);
        detail = await page.evaluate(({ expectedNoteId }) => {
          const text = (value) => String(value || "").replace(/\s+/g, " ").trim();
          const unique = (values) =>
            values.filter((item, index, array) => item && array.indexOf(item) === index);

          const extractHashtags = (value) => {
            const matches = String(value || "").match(/#([\p{L}\p{N}_-]{2,30})/gu) || [];
            return matches.map((item) => item.replace(/^#/, "").trim()).filter(Boolean);
          };
          const normalizeTimestamp = (value) => {
            if (value == null || value === "") return null;
            if (typeof value === "number" && Number.isFinite(value)) {
              const ms = value > 1e12 ? value : value > 1e9 ? value * 1000 : null;
              if (!ms) return null;
              const date = new Date(ms);
              return Number.isNaN(date.getTime()) ? null : date.toISOString();
            }
            const raw = text(value);
            if (!raw) return null;
            if (/^\d+$/.test(raw)) {
              return normalizeTimestamp(Number(raw));
            }
            const fullDateMatch = raw.match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
            if (fullDateMatch) {
              const [, year, month, day] = fullDateMatch;
              const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
              return Number.isNaN(date.getTime()) ? null : date.toISOString();
            }
            const shortDateMatch = raw.match(/(^|[^0-9])(\d{1,2})[-/.月](\d{1,2})([^0-9]|$)/);
            if (shortDateMatch) {
              const now = new Date();
              const month = Number(shortDateMatch[2]);
              const day = Number(shortDateMatch[3]);
              const date = new Date(Date.UTC(now.getUTCFullYear(), month - 1, day));
              return Number.isNaN(date.getTime()) ? null : date.toISOString();
            }
            const iso = new Date(raw.replace(/\//g, "-"));
            return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
          };
          const unwrap = (value, depth = 0) => {
            if (!value || depth > 6) return value;
            if (Array.isArray(value)) return value.map((item) => unwrap(item, depth + 1));
            if (typeof value !== "object") return value;
            if ("_value" in value) return unwrap(value._value, depth + 1);
            return value;
          };
          const findBestNoteObject = (root) => {
            const queue = [unwrap(root)];
            const visited = new WeakSet();
            let best = null;
            let bestScore = 0;

            while (queue.length) {
              const current = queue.shift();
              if (!current || typeof current !== "object") continue;
              if (visited.has(current)) continue;
              visited.add(current);

              if (Array.isArray(current)) {
                for (const item of current) queue.push(unwrap(item));
                continue;
              }

              for (const value of Object.values(current)) queue.push(unwrap(value));

              const currentNoteId = String(
                current.noteId || current.note_id || current.id || current.itemId || "",
              ).trim();
              const matchedExpectedNote =
                expectedNoteId && currentNoteId && currentNoteId === expectedNoteId;
              const score =
                (matchedExpectedNote ? 10 : 0) +
                (current.noteId || current.note_id || current.id ? 1 : 0) +
                (current.title || current.displayTitle || current.note_title || current.noteTitle ? 2 : 0) +
                (current.desc || current.content || current.noteDesc || current.note_desc ? 3 : 0) +
                (current.user || current.author || current.userInfo ? 1 : 0) +
                (current.interactInfo || current.interact_info ? 1 : 0);

              if (score > bestScore) {
                best = current;
                bestScore = score;
              }
            }

            return best;
          };

          const state = unwrap(window.__INITIAL_STATE__) || {};
          const noteState = unwrap(state.note) || {};
          const noteObject =
            findBestNoteObject(noteState) ||
            findBestNoteObject(state) ||
            {};
          const resolvedNoteId = String(
            noteObject.noteId || noteObject.note_id || noteObject.id || noteObject.itemId || "",
          ).trim();
          const matchedExpectedNote =
            !expectedNoteId || (resolvedNoteId && resolvedNoteId === expectedNoteId);
          const user =
            noteObject.user ||
            noteObject.author ||
            noteObject.userInfo ||
            {};
          const interaction =
            noteObject.interactInfo ||
            noteObject.interact_info ||
            noteObject.interaction ||
            noteObject.metrics ||
            {};

          const domText = text(document.body?.innerText || "");
          const title =
            text(
              noteObject.display_title ||
                noteObject.displayTitle ||
                noteObject.title ||
                noteObject.noteTitle ||
                noteObject.note_title ||
                document.querySelector("h1")?.textContent ||
                document.querySelector('meta[property="og:title"]')?.getAttribute("content"),
            ) || "";

          const contentCandidates = [
            noteObject.desc,
            noteObject.content,
            noteObject.note_desc,
            noteObject.noteDesc,
            noteObject.summary,
            document.querySelector('[class*="desc"]')?.textContent,
            document.querySelector('[class*="content"]')?.textContent,
            document.querySelector("article")?.textContent,
            document.querySelector("main")?.textContent,
          ]
            .map((item) => text(item))
            .filter(Boolean)
            .filter((item) => item !== title)
            .filter((item) => item.length >= 12);

          const publishTextCandidates = [
            noteObject.publish_time,
            noteObject.publishTime,
            noteObject.time,
            noteObject.note_time,
            noteObject.create_time,
            noteObject.last_update_time,
            document.querySelector("time")?.getAttribute("datetime"),
            document.querySelector("time")?.textContent,
            domText.match(/20\d{2}[./-]\d{1,2}[./-]\d{1,2}/)?.[0],
            domText.match(/\d{1,2}[./-]\d{1,2}/)?.[0],
          ];

          const tagNodes = Array.from(
            document.querySelectorAll('a[href*="/tag/"], a[href*="/topic/"], [class*="tag"], [class*="topic"]'),
          );
          const domTags = tagNodes
            .map((node) => text(node.textContent))
            .filter(Boolean)
            .filter((item) => item !== title)
            .slice(0, 8);
          const stateTags = [
            ...(Array.isArray(noteObject.tagList) ? noteObject.tagList : []),
            ...(Array.isArray(noteObject.tags) ? noteObject.tags : []),
            ...(Array.isArray(noteObject.topics) ? noteObject.topics : []),
          ]
            .map((item) => text(item?.name || item?.text || item?.tag || item))
            .filter(Boolean);

          const description =
            contentCandidates[0] ||
            text(
              document
                .querySelector('meta[property="og:description"]')
                ?.getAttribute("content"),
            ) ||
            "";
          const mediaImageUrls = unique(
            Array.from(document.querySelectorAll(".media-container img"))
              .map((node) => text(node.getAttribute("src") || node.getAttribute("data-src") || ""))
              .concat(
                Array.from(document.querySelectorAll(".media-container video")).map((node) =>
                  text(node.getAttribute("poster") || ""),
                ),
              )
              .filter(Boolean),
          ).slice(0, 12);
          const mediaVideoUrls = unique(
            Array.from(document.querySelectorAll(".media-container video"))
              .map((node) =>
                text(
                  node.getAttribute("src") ||
                    node.currentSrc ||
                    node.querySelector("source")?.getAttribute("src") ||
                    "",
                ),
              )
              .filter((value) => value && !value.startsWith("blob:")),
          ).slice(0, 6);

          return {
            matchedExpectedNote,
            resolvedNoteId,
            title,
            content: description,
            hasVideoElement: document.querySelectorAll(".media-container video").length > 0,
            authorName: text(
              user.nick_name || user.nickname || user.name || user.userName || "",
            ),
            publishTime:
              publishTextCandidates.map((item) => normalizeTimestamp(item)).find(Boolean) || null,
            tags: unique(
              domTags
                .concat(stateTags)
                .concat(extractHashtags(title), extractHashtags(description))
                .filter(Boolean),
            ).slice(0, 8),
            bodyTextSample: domText.slice(0, 240),
            likeCount:
              Number(
                interaction.liked_count ||
                  interaction.likedCount ||
                  noteObject.likeCount ||
                  noteObject.likes ||
                  0,
              ) || 0,
            commentCount:
              Number(
                interaction.comment_count ||
                  interaction.commentCount ||
                  noteObject.commentCount ||
                  noteObject.comments ||
                  0,
              ) || 0,
            collectCount:
              Number(
                interaction.collected_count ||
                  interaction.collectedCount ||
                  interaction.collectCount ||
                  noteObject.collects ||
                  0,
              ) || 0,
            shareCount:
              Number(
                interaction.shared_count ||
                  interaction.shareCount ||
                  noteObject.shares ||
                  0,
              ) || 0,
            mediaImageUrls,
            mediaVideoUrls,
          };
        }, { expectedNoteId });
      } catch {
        detail = null;
      }

      if (!detail || detail.matchedExpectedNote === false) {
        enriched.push(sample);
        continue;
      }

      const mergedTags = mergeTags(
        [
          Array.isArray(detail.tags) ? detail.tags : [],
          Array.isArray(sample.tags) ? sample.tags : [],
          extractHashtags(detail.title),
          extractHashtags(detail.content),
          extractTitleKeywords(detail.title, keyword),
        ],
        keyword,
        8,
      );

      const sampleTitle = text(sample.title);
      const detailTitle = text(detail.title);
      const sameTitle =
        !detailTitle ||
        detailTitle.includes(sampleTitle) ||
        sampleTitle.includes(detailTitle);
      const detailContent = text(detail.content);
      const summary =
        detailContent ||
        text(sample.contentSummary) ||
        `${text(sample.title) || keyword} 的小红书详情页补全摘要。`;

      if (!sameTitle || !detailContent || detailContent.length < 20) {
        enriched.push(sample);
        continue;
      }

        enriched.push({
          ...sample,
          contentText: detailContent,
          contentSummary: summary.slice(0, 220),
          hasVideoMedia: sample.hasVideoMedia || detail.hasVideoElement,
          tags: mergedTags.length ? mergedTags : sample.tags,
          coverImageUrl: sample.coverImageUrl || detail.mediaImageUrls?.[0] || "",
        mediaImageUrls: unique([...(detail.mediaImageUrls || []), ...(sample.mediaImageUrls || [])]),
        mediaVideoUrls: unique([...(detail.mediaVideoUrls || []), ...(sample.mediaVideoUrls || [])]),
      });
    }
  } finally {
    await page.close();
  }

  return enriched;
};

const enrichSamplesFromSearchModal = async (page, samples, keyword) => {
  const text = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const unique = (values) =>
    values.filter((item, index, array) => item && array.indexOf(item) === index);
  const parseCount = (value) => {
    const raw = text(value).replace(/,/g, "");
    if (!raw) return 0;
    if (raw.includes("万")) {
      const num = Number(raw.replace("万", ""));
      return Number.isFinite(num) ? Math.round(num * 10000) : 0;
    }
    const num = Number(raw.replace(/[^\d.]/g, ""));
    return Number.isFinite(num) ? Math.round(num) : 0;
  };
  const extractModalDetail = async (noteId) =>
    page.evaluate((expectedNoteId) => {
      const text = (value) => String(value || "").replace(/\s+/g, " ").trim();
      const unique = (values) =>
        values.filter((item, index, array) => item && array.indexOf(item) === index);
      const title =
        text(
          document.querySelector("#detail-title")?.textContent ||
            document.querySelector(".note-container .title")?.textContent,
        ) || "";
      const content =
        text(
          document.querySelector("#detail-desc .note-text")?.textContent ||
            document.querySelector(".note-container .note-scroller .note-content .note-text")
              ?.textContent,
        ) || "";
      const authorName =
        text(
          document.querySelector(".author-container .username")?.textContent ||
            document.querySelector(".author-wrapper .username")?.textContent,
        ) || "";
      const tagNodes = Array.from(
        document.querySelectorAll(
          ".note-container .note-content .note-text a, .note-container a[href*=\"/tag/\"], .note-container a[href*=\"/topic/\"]",
        ),
      );
      const tags = unique(
        tagNodes
          .map((node) => text(node.textContent).replace(/^#/, ""))
          .filter(Boolean),
      ).slice(0, 8);
      const publishText =
        text(
          document.querySelector(".note-container time")?.getAttribute("datetime") ||
            document.querySelector(".note-container time")?.textContent ||
            document.querySelector(".date")?.textContent,
        ) || null;
      const href =
        Array.from(document.querySelectorAll('a[href*="/explore/"], a[href*="/discovery/item/"]'))
          .map((node) => node.href || node.getAttribute("href") || "")
          .find((value) => String(value).includes(expectedNoteId)) || location.href;
      const mediaImageUrls = unique(
        Array.from(document.querySelectorAll(".media-container img"))
          .map((node) => text(node.getAttribute("src") || node.getAttribute("data-src") || ""))
          .concat(
            Array.from(document.querySelectorAll(".media-container video")).map((node) =>
              text(node.getAttribute("poster") || ""),
            ),
          )
          .filter(Boolean),
      ).slice(0, 12);
      const mediaVideoUrls = unique(
        Array.from(document.querySelectorAll(".media-container video"))
          .map((node) =>
            text(
              node.getAttribute("src") ||
                node.currentSrc ||
                node.querySelector("source")?.getAttribute("src") ||
                "",
            ),
          )
          .filter((value) => value && !value.startsWith("blob:")),
      ).slice(0, 6);

      return {
        title,
        content,
        hasVideoElement: document.querySelectorAll(".media-container video").length > 0,
        authorName,
        publishText,
        tags,
        href,
        likeText:
          text(document.querySelector(".interact-container .like-wrapper .count")?.textContent) ||
          text(document.querySelector(".engage-bar-style .like-wrapper .count")?.textContent),
        commentText:
          text(document.querySelector(".interact-container .chat-wrapper .count")?.textContent) ||
          text(document.querySelector(".engage-bar-style .chat-wrapper .count")?.textContent),
        collectText:
          text(document.querySelector(".interact-container .collect-wrapper .count")?.textContent) ||
          text(document.querySelector(".engage-bar-style .collect-wrapper .count")?.textContent),
        mediaImageUrls,
        mediaVideoUrls,
      };
    }, noteId);

  const enriched = [];
  let detailEnrichedCount = 0;
  let modalOpenCount = 0;
  let modalMissCount = 0;
  const totalSamples = Math.max(1, samples.length);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    const noteId = extractNoteIdFromUrl(sample.sourceUrl);
    await writeProgress({
      progress: Math.min(72, 40 + Math.round((index / totalSamples) * 28)),
      stage: "opening-note-details",
      message: `正在打开第 ${index + 1}/${totalSamples} 条`,
      extractedCount: index,
      totalCount: totalSamples,
    });
    if (!noteId) {
      enriched.push(sample);
      modalMissCount += 1;
      continue;
    }

    try {
      await humanPause(450, 1100);
      await page.evaluate(() => window.scrollTo(0, 0));
      await humanPause(300, 700);

      const matchedSection = page.locator(
        `section.note-item:has(a[href*="/explore/${noteId}"]), section.note-item:has(a[href*="/discovery/item/${noteId}"])`,
      );

      if ((await matchedSection.count()) === 0) {
        enriched.push(sample);
        modalMissCount += 1;
        continue;
      }

      const clickable = matchedSection.first().locator("a.cover.mask.ld, a.title").first();
      await matchedSection.first().scrollIntoViewIfNeeded().catch(() => {});
      await humanPause(250, 650);
      const box = await clickable.boundingBox().catch(() => null);
      if (box) {
        const targetX = box.x + Math.max(6, Math.min(box.width - 6, box.width * (0.3 + Math.random() * 0.4)));
        const targetY = box.y + Math.max(6, Math.min(box.height - 6, box.height * (0.3 + Math.random() * 0.4)));
        await page.mouse.move(targetX, targetY, { steps: 8 }).catch(() => {});
        await humanPause(120, 260);
      }
      await clickable.click({ force: true }).catch(async () => {
        await page.evaluate((expectedNoteId) => {
          const section = Array.from(document.querySelectorAll("section.note-item")).find((node) =>
            String(node.innerHTML || "").includes(`/explore/${expectedNoteId}`) ||
            String(node.innerHTML || "").includes(`/discovery/item/${expectedNoteId}`),
          );
          const trigger = section?.querySelector("a.cover.mask.ld, a.title");
          if (trigger instanceof HTMLElement) trigger.click();
        }, noteId);
      });
      await page.waitForSelector("#noteContainer, .note-container", { timeout: 8000 });
      await humanPause(900, 1600);
      modalOpenCount += 1;

      const detail = await extractModalDetail(noteId);
      const frameOcrTexts =
        Array.isArray(detail.mediaVideoUrls) && detail.mediaVideoUrls.length
          ? await captureLocatorFrameOcr(page, ".media-container, #noteContainer, .note-container", `video-${noteId}`)
          : [];
      const sameTitle =
        !text(detail.title) ||
        text(detail.title).includes(text(sample.title)) ||
        text(sample.title).includes(text(detail.title));
      const content = text(detail.content);
      const transcriptText = cleanOcrText(frameOcrTexts.join("\n"));

      if (!sameTitle || content.length < 20) {
        enriched.push(
          finalizeResolvedContent({
            ...sample,
            hasVideoMedia: sample.hasVideoMedia || detail.hasVideoElement,
            frameOcrTexts,
            transcriptText,
            transcriptSegments: transcriptText ? transcriptText.split("\n").filter(Boolean) : [],
            resolvedContentText: text(sample.contentText) || transcriptText || text(sample.contentSummary),
            resolvedContentSource: transcriptText ? "video-frame-ocr" : "note-body",
          }),
        );
      } else {
        detailEnrichedCount += 1;
        enriched.push(
          finalizeResolvedContent({
          ...sample,
            hasVideoMedia: sample.hasVideoMedia || detail.hasVideoElement,
          contentText: content,
          contentSummary: content.slice(0, 220),
          authorName: text(detail.authorName) || sample.authorName,
          publishTime: normalizeTimestampValue(detail.publishText) || sample.publishTime,
          sourceUrl: text(detail.href) || sample.sourceUrl,
          likeCount: parseCount(detail.likeText) || sample.likeCount,
          commentCount: parseCount(detail.commentText) || sample.commentCount,
          collectCount: parseCount(detail.collectText) || sample.collectCount,
          tags: mergeTags(
            [
              detail.tags || [],
              sample.tags || [],
              extractHashtags(detail.title),
              extractHashtags(content),
              extractTitleKeywords(detail.title, keyword),
            ],
            keyword,
            8,
          ),
          coverImageUrl: sample.coverImageUrl || detail.mediaImageUrls?.[0] || "",
          mediaImageUrls: unique([...(detail.mediaImageUrls || []), ...(sample.mediaImageUrls || [])]),
          mediaVideoUrls: unique([...(detail.mediaVideoUrls || []), ...(sample.mediaVideoUrls || [])]),
            frameOcrTexts,
            transcriptText,
            transcriptSegments: transcriptText ? transcriptText.split("\n").filter(Boolean) : [],
            resolvedContentText: content || transcriptText,
            resolvedContentSource: content ? "note-body" : transcriptText ? "video-frame-ocr" : "note-body",
          }),
        );
      }
    } catch {
      enriched.push(sample);
      modalMissCount += 1;
    } finally {
      const closeButton = page.locator(
        '.close-circle, [class*="close-circle"], [class*="close"] button, .note-container [aria-label="关闭"]',
      );
      if ((await closeButton.count().catch(() => 0)) > 0) {
        await closeButton.first().click({ force: true }).catch(() => {});
      } else {
        await page.keyboard.press("Escape").catch(() => {});
      }
      await page.waitForTimeout(500).catch(() => {});
      await page
        .waitForSelector("#noteContainer, .note-container", {
          state: "detached",
          timeout: 3000,
        })
        .catch(() => {});
      await writeProgress({
        progress: Math.min(72, 40 + Math.round(((index + 1) / totalSamples) * 28)),
        stage: "opening-note-details",
        message: `已处理 ${index + 1}/${totalSamples} 条`,
        extractedCount: index + 1,
        totalCount: totalSamples,
      });
    }
  }

  return {
    samples: enriched,
    stats: {
      attempted: true,
      modalOpenCount,
      modalMissCount,
      detailEnrichedCount,
    },
  };
};

const enrichSamplesWithImageOcr = async (samples = []) => {
  const enriched = [];
  let longImageDetectedCount = 0;
  let imageOcrCount = 0;
  const totalSamples = Math.max(1, samples.length);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    await writeProgress({
      progress: Math.min(92, 74 + Math.round((index / totalSamples) * 16)),
      stage: "running-image-ocr",
      message: `正在检查 OCR ${index + 1}/${totalSamples} 条`,
      extractedCount: index,
      totalCount: totalSamples,
    });
    const draft = finalizeResolvedContent(sample);
    const shouldOcr =
      draft.contentType === "image" &&
      Array.isArray(draft.mediaImageUrls) &&
      draft.mediaImageUrls.length >= 1 &&
      text(draft.contentText).length < 220;

    if (!shouldOcr) {
      enriched.push(draft);
      continue;
    }

    longImageDetectedCount += 1;
    const ocrTexts = await extractImageOcrTexts(draft.mediaImageUrls, draft.platformContentId || draft.title || "long-image");
    const ocrTextRaw = ocrTexts.join("\n\n");
    const ocrTextClean = cleanOcrText(ocrTextRaw);

    if (!ocrTextClean) {
      enriched.push({
        ...draft,
        longImageCandidate: true,
        contentFormat: "long-image-note",
      });
      continue;
    }

    imageOcrCount += 1;
    enriched.push(
      finalizeResolvedContent({
        ...draft,
        contentFormat: "long-image-note",
        longImageCandidate: true,
        ocrTextRaw,
        ocrTextClean,
        resolvedContentText: ocrTextClean,
        resolvedContentSource: "image-ocr",
      }),
    );
    await writeProgress({
      progress: Math.min(92, 74 + Math.round(((index + 1) / totalSamples) * 16)),
      stage: "running-image-ocr",
      message: `已完成 OCR ${index + 1}/${totalSamples} 条`,
      extractedCount: index + 1,
      totalCount: totalSamples,
    });
  }

  return {
    samples: enriched,
    stats: {
      attempted: true,
      longImageDetectedCount,
      imageOcrCount,
    },
  };
};

const probeSearchNavigation = async (context, keyword, target) => {
  if (!keyword || !target?.noteId) {
    return null;
  }

  const page = await context.newPage();
  const tracker = createTrackedResponseCollector(target.noteId);
  page.on("response", tracker.captureResponse);

  try {
    const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}&source=web_explore_feed`;
    await page.goto(searchUrl, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await delay(1500);

    const href = await page.evaluate((noteId) => {
      const links = Array.from(
        document.querySelectorAll('a[href*="/explore/"], a[href*="/discovery/item/"]'),
      );
      const found = links.find((link) =>
        String(link.getAttribute("href") || "").includes(noteId),
      );
      return found ? found.href || found.getAttribute("href") : null;
    }, target.noteId);

    if (!href) {
      return {
        name: "search-page-note-route",
        searchUrl,
        noteId: target.noteId,
        foundLink: false,
        discoveredResponses: tracker.discoveredResponses.slice(0, 12),
      };
    }

    await page.goto(href, {
      waitUntil: "networkidle",
      timeout: 30000,
    }).catch(() => {});
    await delay(2000);

    return {
      name: "search-page-note-route",
      searchUrl,
      noteId: target.noteId,
      foundLink: true,
      href,
      finalUrl: page.url(),
      title: await page.title(),
      discoveredResponses: tracker.discoveredResponses.slice(0, 12),
    };
  } catch (error) {
    return {
      name: "search-page-note-route",
      noteId: target.noteId,
      error: error instanceof Error ? error.message : "unknown-search-page-probe-error",
      discoveredResponses: tracker.discoveredResponses.slice(0, 12),
    };
  } finally {
    page.off("response", tracker.captureResponse);
    await page.close();
  }
};

const probeDetailApiCandidates = async (context, cookieBlob, samples = [], keyword = "") => {
  const targets = samples
    .map((sample) => ({
      noteId: extractNoteIdFromUrl(sample.sourceUrl),
      sourceUrl: sample.sourceUrl,
      title: sample.title,
    }))
    .filter((item) => item.noteId)
    .slice(0, 2);

  if (!cookieBlob || !targets.length) {
    return null;
  }

  const cookieHeader = String(cookieBlob || "");
  const api = await playwrightRequest.newContext({
    extraHTTPHeaders: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      cookie: cookieHeader,
      accept: "application/json, text/plain, */*",
      origin: "https://www.xiaohongshu.com",
    },
  });

  try {
    const cookieSignatureInputs = collectCookieSignatureInputs(cookieBlob);
    const results = [];
    for (const target of targets) {
      const candidates = [
        {
          name: "h5-note-info",
          url: `https://edith.xiaohongshu.com/api/sns/h5/v1/note_info?note_id=${target.noteId}`,
          headers: {
            referer: target.sourceUrl,
          },
        },
        {
          name: "web-feed-note-id",
          url: `https://edith.xiaohongshu.com/api/sns/web/v1/feed?note_id=${target.noteId}`,
          headers: {
            referer: target.sourceUrl,
          },
        },
        {
          name: "web-feed-source-note-id",
          url: `https://edith.xiaohongshu.com/api/sns/web/v1/feed?source_note_id=${target.noteId}`,
          headers: {
            referer: target.sourceUrl,
          },
        },
        {
          name: "web-feed-note-id-method-post",
          url: "https://edith.xiaohongshu.com/api/sns/web/v1/feed",
          method: "POST",
          payload: {
            note_id: target.noteId,
          },
          headers: {
            referer: target.sourceUrl,
            "content-type": "application/json;charset=UTF-8",
          },
        },
      ];

      const probes = [];
      for (const candidate of candidates) {
        try {
          const response =
            candidate.method === "POST"
              ? await api.post(candidate.url, {
                  headers: candidate.headers,
                  data: candidate.payload,
                })
              : await api.get(candidate.url, {
                  headers: candidate.headers,
                });
          const body = await response.text();
          const summary = summarizeJsonishBody(body);
          probes.push({
            name: candidate.name,
            url: candidate.url,
            method: candidate.method || "GET",
            status: response.status(),
            bodySnippet: summary.bodySnippet,
            parsed: summary.parsed,
          });
        } catch (error) {
          probes.push({
            name: candidate.name,
            url: candidate.url,
            error: error instanceof Error ? error.message : "unknown-error",
          });
        }
      }

      let browserProbe = null;
      const page = await context.newPage();
      const cdpSession = await context.newCDPSession(page);
      await cdpSession.send("Network.enable");
      const cdpInitiators = [];
      cdpSession.on("Network.requestWillBeSent", (event) => {
        const url = event.request?.url || "";
        if (!url.includes("/api/sns/h5/v1/note_info")) return;
        if (!url.includes(target.noteId)) return;
        cdpInitiators.push({
          url,
          type: event.type || null,
          hasUserGesture: Boolean(event.hasUserGesture),
          documentURL: event.documentURL || "",
          initiator: event.initiator || null,
        });
      });
      await page.addInitScript(() => {
        if (window.__virallabRequestHooksInstalled) return;
        window.__virallabRequestHooksInstalled = true;
        window.__virallabRequestHooks = [];

        const pushRecord = (record) => {
          try {
            window.__virallabRequestHooks.push({
              ...record,
              timestamp: Date.now(),
            });
          } catch {
            // ignore hook failures
          }
        };

        const originalFetch = window.fetch.bind(window);
        window.fetch = async (...args) => {
          const input = args[0];
          const init = args[1] || {};
          const url = typeof input === "string" ? input : input?.url || "";
          if (String(url).includes("/api/sns/h5/v1/note_info")) {
            pushRecord({
              type: "fetch",
              url,
              headers:
                init && typeof init.headers === "object" && !Array.isArray(init.headers)
                  ? init.headers
                  : null,
              stack: String(new Error().stack || "").slice(0, 1200),
            });
          }
          return originalFetch(...args);
        };

        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;
        const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

        XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
          this.__virallabUrl = url;
          this.__virallabMethod = method;
          this.__virallabHeaders = {};
          this.__virallabStack = String(new Error().stack || "").slice(0, 1200);
          return originalOpen.call(this, method, url, ...rest);
        };

        XMLHttpRequest.prototype.setRequestHeader = function patchedSetRequestHeader(name, value) {
          try {
            this.__virallabHeaders[name] = value;
          } catch {
            // ignore header capture failures
          }
          return originalSetRequestHeader.call(this, name, value);
        };

        XMLHttpRequest.prototype.send = function patchedSend(...args) {
          if (String(this.__virallabUrl || "").includes("/api/sns/h5/v1/note_info")) {
            pushRecord({
              type: "xhr",
              url: this.__virallabUrl || "",
              method: this.__virallabMethod || "",
              headers: this.__virallabHeaders || null,
              stack: this.__virallabStack || "",
            });
          }
          return originalSend.apply(this, args);
        };
      });
      let capturedRequest = null;
      let capturedResponse = null;
      const tracker = createTrackedResponseCollector(target.noteId);
      const captureRequest = (request) => {
        const url = request.url();
        if (!url.includes("/api/sns/h5/v1/note_info")) return;
        if (!url.includes(target.noteId)) return;
        capturedRequest = {
          url,
          method: request.method(),
          headers: request.headers(),
        };
      };
      page.on("request", captureRequest);
      page.on("response", tracker.captureResponse);

      try {
        await page.goto(target.sourceUrl, {
          waitUntil: "networkidle",
          timeout: 30000,
        });
        await delay(1500);
        capturedResponse = tracker.discoveredResponses.find((item) => item.isTargetNoteInfo) || null;
        const preSignedJsRequestHooks = await page.evaluate((noteId) => {
          const records = Array.isArray(window.__virallabRequestHooks)
            ? window.__virallabRequestHooks
            : [];
          return records
            .filter((item) => String(item?.url || "").includes(noteId))
            .slice(0, 12);
        }, target.noteId);
        const capturedReplayHeaders = filterSignedHeaders(capturedRequest?.headers || {});
        const pageSignedFetch = await page.evaluate(async ({ noteId, capturedReplayHeaders }) => {
          const url = `https://edith.xiaohongshu.com/api/sns/h5/v1/note_info?note_id=${noteId}`;
          const summarizeBody = (value) => {
            const raw = String(value || "").trim();
            if (!raw) {
              return {
                bodySnippet: "",
                parsed: null,
              };
            }

            try {
              const parsed = JSON.parse(raw);
              return {
                bodySnippet: raw.slice(0, 240),
                parsed: {
                  code: typeof parsed?.code === "number" ? parsed.code : null,
                  success: typeof parsed?.success === "boolean" ? parsed.success : null,
                  msg: typeof parsed?.msg === "string" ? parsed.msg : null,
                  dataKeys:
                    parsed?.data && typeof parsed.data === "object" && !Array.isArray(parsed.data)
                      ? Object.keys(parsed.data).slice(0, 20)
                      : [],
                },
              };
            } catch {
              return {
                bodySnippet: raw.slice(0, 240),
                parsed: null,
              };
            }
          };
          const result = {
            hasWebmsxyw: typeof window._webmsxyw === "function",
          };

          if (typeof window._webmsxyw !== "function") {
            return result;
          }

          try {
            const signed = await window._webmsxyw(url, "GET");
            result.generatedHeaders = {
              "x-s": signed?.["X-s"] || signed?.["x-s"] || null,
              "x-t": signed?.["X-t"] || signed?.["x-t"] || null,
            };
            result.xsecHeaders = {
              xsecappid: String(window.xsecappid || ""),
              xsecappvers: String(window.xsecappvers || ""),
              xsecplatform: String(window.xsecplatform || ""),
            };

            try {
              const fetchResponse = await fetch(url, {
                credentials: "include",
                headers: {
                  accept: "application/json, text/plain, */*",
                  "x-s": result.generatedHeaders["x-s"] || "",
                  "x-t": String(result.generatedHeaders["x-t"] || ""),
                },
              });
              const fetchBody = await fetchResponse.text();
              result.fetchResult = {
                status: fetchResponse.status,
                ...summarizeBody(fetchBody),
              };
            } catch (error) {
              result.fetchError = String(error?.message || error);
            }

            try {
              const fetchWithXsecResponse = await fetch(url, {
                credentials: "include",
                headers: {
                  accept: "application/json, text/plain, */*",
                  "x-s": result.generatedHeaders["x-s"] || "",
                  "x-t": String(result.generatedHeaders["x-t"] || ""),
                  xsecappid: result.xsecHeaders.xsecappid,
                  xsecappvers: result.xsecHeaders.xsecappvers,
                  xsecplatform: result.xsecHeaders.xsecplatform,
                },
              });
              const fetchWithXsecBody = await fetchWithXsecResponse.text();
              result.fetchWithXsecResult = {
                status: fetchWithXsecResponse.status,
                ...summarizeBody(fetchWithXsecBody),
              };
            } catch (error) {
              result.fetchWithXsecError = String(error?.message || error);
            }

            try {
              const fetchWithCapturedHeaders = await fetch(url, {
                credentials: "include",
                headers: Object.fromEntries(
                  Object.entries({
                    accept: "application/json, text/plain, */*",
                    "x-s": capturedReplayHeaders["x-s"] || "",
                    "x-t": String(capturedReplayHeaders["x-t"] || ""),
                    "x-s-common": capturedReplayHeaders["x-s-common"] || "",
                    "x-xray-traceid": capturedReplayHeaders["x-xray-traceid"] || "",
                    "x-b3-traceid": capturedReplayHeaders["x-b3-traceid"] || "",
                    xsecappid: capturedReplayHeaders.xsecappid || result.xsecHeaders.xsecappid,
                    xsecappvers: capturedReplayHeaders.xsecappvers || result.xsecHeaders.xsecappvers,
                    xsecplatform: capturedReplayHeaders.xsecplatform || result.xsecHeaders.xsecplatform,
                  }).filter(([, value]) => String(value || "").length > 0),
                ),
              });
              const fetchWithCapturedHeadersBody = await fetchWithCapturedHeaders.text();
              result.fetchWithCapturedHeadersResult = {
                status: fetchWithCapturedHeaders.status,
                ...summarizeBody(fetchWithCapturedHeadersBody),
              };
            } catch (error) {
              result.fetchWithCapturedHeadersError = String(error?.message || error);
            }

            try {
              const xhrResult = await new Promise((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.open("GET", url, true);
                xhr.withCredentials = true;
                xhr.setRequestHeader("accept", "application/json, text/plain, */*");
                xhr.setRequestHeader("x-s", result.generatedHeaders["x-s"] || "");
                xhr.setRequestHeader("x-t", String(result.generatedHeaders["x-t"] || ""));
                xhr.onload = () =>
                  resolve({
                    status: xhr.status,
                    body: String(xhr.responseText || ""),
                  });
                xhr.onerror = () => resolve({ error: "xhr-error" });
                xhr.send();
              });
              result.xhrResult =
                xhrResult && typeof xhrResult === "object" && "body" in xhrResult
                  ? {
                      status: xhrResult.status,
                      ...summarizeBody(xhrResult.body),
                    }
                  : xhrResult;
            } catch (error) {
              result.xhrError = String(error?.message || error);
            }

            try {
              const xhrWithXsecResult = await new Promise((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.open("GET", url, true);
                xhr.withCredentials = true;
                xhr.setRequestHeader("accept", "application/json, text/plain, */*");
                xhr.setRequestHeader("x-s", result.generatedHeaders["x-s"] || "");
                xhr.setRequestHeader("x-t", String(result.generatedHeaders["x-t"] || ""));
                xhr.setRequestHeader("xsecappid", result.xsecHeaders.xsecappid);
                xhr.setRequestHeader("xsecappvers", result.xsecHeaders.xsecappvers);
                xhr.setRequestHeader("xsecplatform", result.xsecHeaders.xsecplatform);
                xhr.onload = () =>
                  resolve({
                    status: xhr.status,
                    body: String(xhr.responseText || ""),
                  });
                xhr.onerror = () => resolve({ error: "xhr-error" });
                xhr.send();
              });
              result.xhrWithXsecResult =
                xhrWithXsecResult && typeof xhrWithXsecResult === "object" && "body" in xhrWithXsecResult
                  ? {
                      status: xhrWithXsecResult.status,
                      ...summarizeBody(xhrWithXsecResult.body),
                    }
                  : xhrWithXsecResult;
            } catch (error) {
              result.xhrWithXsecError = String(error?.message || error);
            }

            try {
              const xhrWithCapturedHeadersResult = await new Promise((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.open("GET", url, true);
                xhr.withCredentials = true;
                const headerEntries = Object.entries({
                  accept: "application/json, text/plain, */*",
                  "x-s": capturedReplayHeaders["x-s"] || "",
                  "x-t": String(capturedReplayHeaders["x-t"] || ""),
                  "x-s-common": capturedReplayHeaders["x-s-common"] || "",
                  "x-xray-traceid": capturedReplayHeaders["x-xray-traceid"] || "",
                  "x-b3-traceid": capturedReplayHeaders["x-b3-traceid"] || "",
                  xsecappid: capturedReplayHeaders.xsecappid || result.xsecHeaders.xsecappid,
                  xsecappvers: capturedReplayHeaders.xsecappvers || result.xsecHeaders.xsecappvers,
                  xsecplatform: capturedReplayHeaders.xsecplatform || result.xsecHeaders.xsecplatform,
                }).filter(([, value]) => String(value || "").length > 0);
                headerEntries.forEach(([key, value]) => xhr.setRequestHeader(key, value));
                xhr.onload = () =>
                  resolve({
                    status: xhr.status,
                    body: String(xhr.responseText || ""),
                  });
                xhr.onerror = () => resolve({ error: "xhr-error" });
                xhr.send();
              });
              result.xhrWithCapturedHeadersResult =
                xhrWithCapturedHeadersResult &&
                typeof xhrWithCapturedHeadersResult === "object" &&
                "body" in xhrWithCapturedHeadersResult
                  ? {
                      status: xhrWithCapturedHeadersResult.status,
                      ...summarizeBody(xhrWithCapturedHeadersResult.body),
                    }
                  : xhrWithCapturedHeadersResult;
            } catch (error) {
              result.xhrWithCapturedHeadersError = String(error?.message || error);
            }
          } catch (error) {
            result.signError = String(error?.message || error);
          }

          return result;
        }, { noteId: target.noteId, capturedReplayHeaders });
        let signedReplay = null;
        if (capturedRequest?.headers && capturedRequest?.url) {
          const replayApi = await playwrightRequest.newContext({
            extraHTTPHeaders: capturedRequest.headers,
          });
          try {
            const replayResponse = await replayApi.get(capturedRequest.url);
            const replayBody = await replayResponse.text();
            signedReplay = {
              name: "signed-replay-note-info",
              url: capturedRequest.url,
              requestHeaders: filterSignedHeaders(capturedRequest.headers),
              responseStatus: replayResponse.status(),
              ...summarizeJsonishBody(replayBody),
            };
          } catch (error) {
            signedReplay = {
              name: "signed-replay-note-info",
              url: capturedRequest.url,
              requestHeaders: filterSignedHeaders(capturedRequest.headers),
              error: error instanceof Error ? error.message : "unknown-signed-replay-error",
            };
          } finally {
            await replayApi.dispose();
          }
        }
        const globals = await page.evaluate(() => ({
          locationHref: location.href,
          title: document.title,
          hasWindowXS: Boolean(window._webmsxyw),
          hasEncryptMcr: Boolean(window._webmsxyw?.encrypt_mcr),
          signKeys: Object.keys(window)
            .filter((key) => /xs|sign|encrypt|webm/i.test(key))
            .slice(0, 20),
        }));
        const jsRequestHooks = await page.evaluate((noteId) => {
          const records = Array.isArray(window.__virallabRequestHooks)
            ? window.__virallabRequestHooks
            : [];
          return records
            .filter((item) => String(item?.url || "").includes(noteId))
            .slice(0, 12);
        }, target.noteId);
        const automaticCdpInitiator = cdpInitiators.find(
          (item) =>
            item.hasUserGesture === false &&
            item.initiator?.type === "script" &&
            Array.isArray(item.initiator?.stack?.callFrames),
        );
        const automaticRequestStackSummary = automaticCdpInitiator
          ? automaticCdpInitiator.initiator.stack.callFrames.slice(0, 8).map((frame) => ({
              functionName: frame.functionName || "",
              url: frame.url || "",
            }))
          : [];
        browserProbe = {
          name: "browser-note-info",
          url: capturedResponse?.url || capturedRequest?.url || null,
          requestHeaders: capturedRequest ? filterSignedHeaders(capturedRequest.headers) : null,
          responseStatus: capturedResponse?.status ?? null,
          bodySnippet: capturedResponse?.bodySnippet || "",
          parsed: capturedResponse?.parsed || null,
          discoveredResponses: tracker.discoveredResponses.slice(0, 12),
          cdpInitiators: cdpInitiators.slice(0, 6),
          automaticRequestStackSummary,
          preSignedJsRequestHooks,
          automaticRequestBypassedJsHooks: Boolean(capturedResponse) && preSignedJsRequestHooks.length === 0,
          jsRequestHooks,
          pageSignedFetch,
          signedReplay,
          globals,
        };
      } catch (error) {
        browserProbe = {
          name: "browser-note-info",
          error: error instanceof Error ? error.message : "unknown-browser-probe-error",
        };
      } finally {
        page.off("request", captureRequest);
        page.off("response", tracker.captureResponse);
        await cdpSession.detach().catch(() => {});
        await page.close();
      }

      if (browserProbe) {
        probes.push(browserProbe);
      }

      const searchPageProbe = await probeSearchNavigation(context, keyword, target);
      if (searchPageProbe) {
        probes.push(searchPageProbe);
      }

      results.push({
        noteId: target.noteId,
        sourceUrl: target.sourceUrl,
        title: target.title,
        probes,
      });
    }

    return {
      attempted: true,
      targetCount: results.length,
      cookieSignatureInputs,
      results,
    };
  } finally {
    await api.dispose();
  }
};

const summarizeNetworkPayloads = (networkPayloads = []) => {
  const summaries = networkPayloads.slice(0, 6).map((item) => ({
    url: item.url,
    status: item.status,
    code: typeof item.payload?.code === "number" ? item.payload.code : null,
    success: typeof item.payload?.success === "boolean" ? item.payload.success : null,
    msg: typeof item.payload?.msg === "string" ? item.payload.msg : null,
  }));

  const authFailure = summaries.find((item) => item.code === -101 || /无登录信息|登录信息为空/i.test(String(item.msg || "")));

  return {
    capturedResponses: networkPayloads.length,
    urls: summaries.map((item) => item.url),
    responses: summaries,
    authFailure: authFailure
      ? {
          url: authFailure.url,
          code: authFailure.code,
          msg: authFailure.msg,
        }
      : null,
  };
};

const collectStateSummary = async (page) => {
  return await page.evaluate(() => {
    const unwrap = (value, depth = 0) => {
      if (!value || depth > 5) return value;
      if (Array.isArray(value)) return value.map((item) => unwrap(item, depth + 1));
      if (typeof value !== "object") return value;
      if ("_value" in value) return unwrap(value._value, depth + 1);
      return value;
    };

    const state = unwrap(window.__INITIAL_STATE__) || {};
    const search = unwrap(state.search) || {};
    const feed = unwrap(state.feed) || {};
    const user = unwrap(state.user) || {};
    return {
      userLoggedIn: Boolean(user.loggedIn),
      searchKeyword: String(search.searchContext?.keyword || ""),
      currentSearchType:
        typeof search.currentSearchType === "string" ? search.currentSearchType : String(search.currentSearchType?.type || ""),
      searchFeedCount: Number(Array.isArray(search.feeds) ? search.feeds.length : 0),
      homeFeedCount: Number(Array.isArray(feed.feeds) ? feed.feeds.length : 0),
    };
  });
};

const collectDiagnostics = async (page, networkPayloads = []) => {
  const [domDiagnostics, stateSummary] = await Promise.all([
    page.evaluate(() => ({
      title: document.title,
      href: location.href,
      bodyTextSample: String(document.body?.innerText || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 300),
      selectorCounts: {
        noteItem: document.querySelectorAll('[class*="note-item"]').length,
        searchItem: document.querySelectorAll('[class*="search-item"]').length,
        noteCard: document.querySelectorAll('[class*="note-card"]').length,
        exploreLinks: document.querySelectorAll('a[href*="/explore/"]').length,
        discoveryLinks: document.querySelectorAll('a[href*="/discovery/item/"]').length,
        sections: document.querySelectorAll("section").length,
      },
      hasInitialState: Boolean(window.__INITIAL_STATE__),
      initialStateKeys: window.__INITIAL_STATE__ ? Object.keys(window.__INITIAL_STATE__).slice(0, 20) : [],
    })),
    collectStateSummary(page),
  ]);

  return {
    ...domDiagnostics,
    stateSummary,
    networkSummary: summarizeNetworkPayloads(networkPayloads),
  };
};

const assessCookieValidity = (diagnostics) => {
  const body = String(diagnostics?.bodyTextSample || "");
  const stateSummary = diagnostics?.stateSummary || {};
  const networkSummary = diagnostics?.networkSummary || {};
  if (networkSummary.authFailure) {
    return {
      valid: false,
      reason: "network-auth-required",
      message: `Xiaohongshu search API rejected the cookie: ${networkSummary.authFailure.msg || "authentication required"}.`,
    };
  }
  if (body.includes(VERIFY_LOGIN_TEXT)) {
    return {
      valid: false,
      reason: "login-required",
      message: "The supplied Xiaohongshu cookie still lands on the login-required search page.",
    };
  }
  if (Number(stateSummary.searchFeedCount || 0) > 0 || Number(stateSummary.homeFeedCount || 0) > 0) {
    return {
      valid: true,
      reason: "state-search-content-visible",
      message: "The supplied Xiaohongshu cookie exposes search feeds in initial state.",
    };
  }

  const hasSearchContent =
    Number(diagnostics?.selectorCounts?.noteItem || 0) > 0 ||
    Number(diagnostics?.selectorCounts?.searchItem || 0) > 0 ||
    Number(diagnostics?.selectorCounts?.noteCard || 0) > 0 ||
    Number(diagnostics?.selectorCounts?.exploreLinks || 0) > 0 ||
    Number(diagnostics?.selectorCounts?.discoveryLinks || 0) > 0;

  if (hasSearchContent) {
    return {
      valid: true,
      reason: "search-content-visible",
      message: "The supplied Xiaohongshu cookie exposes visible search content.",
    };
  }

  return {
    valid: false,
    reason: "search-content-missing",
    message: "The supplied Xiaohongshu cookie did not expose visible search content.",
  };
};

const writeArtifacts = async (page, keyword) => {
  const runKey = `${new Date().toISOString().replace(/[:.]/g, "-")}-${sanitizeSegment(keyword)}`;
  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });
  const screenshotPath = path.join(ARTIFACTS_DIR, `${runKey}.png`);
  const htmlPath = path.join(ARTIFACTS_DIR, `${runKey}.html`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await fs.writeFile(htmlPath, await page.content(), "utf8");
  return {
    screenshotPath,
    htmlPath,
  };
};

if (!process.env.VIRALLAB_ENABLE_REAL_COLLECTOR || process.env.VIRALLAB_ENABLE_REAL_COLLECTOR !== "true") {
  fail("Worker bridge is disabled. Set VIRALLAB_ENABLE_REAL_COLLECTOR=true.", "collector-disabled");
  process.exit(0);
}

if (!payload.cookieBlob) {
  fail("Missing Xiaohongshu cookie payload for worker collector.", "missing-cookie");
  process.exit(0);
}

const run = async () => {
  let browser;
  let page;
  const networkPayloads = [];
  let searchFilterConfig = null;
  let appliedSearchFilters = null;
  const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();

  try {
    browser = await chromium.launch({
      headless: process.env.VIRALLAB_COLLECTOR_HEADLESS !== "false",
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 1200 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    });

    const cookies = parseCookieBlob(payload.cookieBlob);
    if (!cookies.length) {
      fail("Unable to parse Xiaohongshu cookie blob into browser cookies.", "cookie-parse-failed");
      return;
    }

    const keyword = String(payload.keyword || "").trim();
    const sortBy = ["latest", "most-liked", "most-commented", "most-collected"].includes(payload.sortBy)
      ? payload.sortBy
      : "hot";
    const noteType = ["image", "video"].includes(payload.noteType) ? payload.noteType : "all";
    const publishWindow = ["day", "week", "half-year"].includes(payload.publishWindow) ? payload.publishWindow : "all";
    const targetCount = Math.max(5, Math.min(50, Number(payload.targetCount || 10)));

    await context.addCookies(cookies);
    const manualSearchRequestData =
      payload.manualSearchRequestData && typeof payload.manualSearchRequestData === "object" && !Array.isArray(payload.manualSearchRequestData)
        ? payload.manualSearchRequestData
        : null;
    const manualSearchPageUrl =
      typeof payload.manualSearchPageUrl === "string" && payload.manualSearchPageUrl.includes("xiaohongshu.com")
        ? payload.manualSearchPageUrl
        : null;

    await context.route("**/api/sns/web/v1/search/notes", async (route, request) => {
      const rawPostData = request.postData();
      if (!rawPostData) {
        await route.continue();
        return;
      }

      try {
        const requestData = JSON.parse(rawPostData);
        if (manualSearchRequestData) {
          if (typeof manualSearchRequestData.keyword === "string" && manualSearchRequestData.keyword.trim()) {
            requestData.keyword = manualSearchRequestData.keyword;
          }
          if (typeof manualSearchRequestData.sort === "string" && manualSearchRequestData.sort.trim()) {
            requestData.sort = manualSearchRequestData.sort;
          }
          if (typeof manualSearchRequestData.note_type === "number") {
            requestData.note_type = manualSearchRequestData.note_type;
          }
          if (Array.isArray(manualSearchRequestData.filters)) {
            requestData.filters = manualSearchRequestData.filters;
          }
          appliedSearchFilters = {
            source: "manual-search-request",
            sort: requestData.sort ?? null,
            noteType: requestData.note_type ?? null,
            filters: Array.isArray(requestData.filters) ? requestData.filters : [],
          };
        } else {
          const selection = buildSearchNotesFilters({
            sortBy,
            noteType,
            publishWindow,
            filterConfig: searchFilterConfig,
          });

          requestData.sort = selection.sort;
          requestData.note_type = selection.noteTypeValue;
          requestData.filters = selection.filters;
          appliedSearchFilters = selection.selections;
        }

        await route.continue({
          postData: JSON.stringify(requestData),
        });
      } catch {
        await route.continue();
      }
    });
    page = await context.newPage();
    page.on("response", async (response) => {
      if (!isLikelySearchApiUrl(response.url())) return;
      const resourceType = response.request().resourceType();
      if (resourceType !== "xhr" && resourceType !== "fetch") return;
      const contentType = response.headers()["content-type"] || "";
      if (!contentType.includes("application/json")) return;
      try {
        const json = await response.json();
        if (response.url().includes("/api/sns/web/v1/search/filter")) {
          searchFilterConfig = Array.isArray(json?.data?.filters) ? json.data.filters : null;
        }
        networkPayloads.push({
          url: response.url(),
          status: response.status(),
          payload: json,
        });
      } catch {
        // ignore malformed or unreadable responses
      }
    });
    const url =
      manualSearchPageUrl ||
      `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}&source=web_explore_feed`;

    await writeProgress({
      progress: 8,
      stage: "opening-search-page",
      message: "正在打开小红书结果页",
      extractedCount: 0,
      totalCount: targetCount,
    });
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await delay(2500);

    await writeProgress({
      progress: 18,
      stage: "applying-filters",
      message: "正在应用筛选条件",
      extractedCount: 0,
      totalCount: targetCount,
    });
    const uiFilterApplication = manualSearchRequestData
      ? {
          mode: "manual-search-request",
          pageUrl: url,
          steps: [],
        }
      : await applySearchUiFilters(page, {
          sortBy,
          noteType,
          publishWindow,
        });

    for (let i = 0; i < 4; i += 1) {
      await page.mouse.wheel(0, 1800);
      await delay(1200);
    }

    const diagnostics = await collectDiagnostics(page, networkPayloads);
    const artifacts = await writeArtifacts(page, keyword);
    const verifyResult = assessCookieValidity(diagnostics);

    if (payload.action === "verify") {
      process.stdout.write(
        JSON.stringify({
          mode: "real",
          status: verifyResult.valid ? "completed" : "failed",
          progress: verifyResult.valid ? 100 : 0,
          metadata: {
            provider: "xiaohongshu-playwright-worker",
            ready: verifyResult.valid,
            reason: verifyResult.reason,
            diagnostics,
            artifacts,
            verificationOnly: true,
          },
          errorMessage: verifyResult.valid ? null : verifyResult.message,
          samples: [],
        }),
      );
      return;
    }

    const networkSamples = extractFromNetworkPayloads(networkPayloads.map((item) => item.payload), keyword, targetCount);
    const searchStateSamples = await extractFromSearchState(page, keyword, targetCount);
    const stateSamples = await extractFromInitialState(page, keyword, targetCount);
    const domSamples = await extractSearchCards(page, keyword, targetCount);
    await writeProgress({
      progress: 34,
      stage: "extracting-search-results",
      message: "正在读取搜索结果列表",
      extractedCount: Math.max(networkSamples.length, searchStateSamples.length, stateSamples.length, domSamples.length),
      totalCount: targetCount,
      metadata: {
        networkCount: networkSamples.length,
        searchStateCount: searchStateSamples.length,
        initialStateCount: stateSamples.length,
        domCount: domSamples.length,
      },
    });
    const initialSamples = networkSamples.length
      ? networkSamples
      : searchStateSamples.length
        ? searchStateSamples
        : stateSamples.length
          ? stateSamples
          : domSamples;

    if (!initialSamples.length) {
      fail(
        "Collector reached Xiaohongshu search page but did not extract any cards. The cookie may be invalid or the page structure may have changed.",
        "no-cards-extracted",
        {
          diagnostics,
          artifacts,
          extractedFrom: networkSamples.length
            ? "network"
            : searchStateSamples.length
              ? "search-state"
              : stateSamples.length
                ? "initial-state"
                : "dom",
        },
      );
      return;
    }

    const modalEnrichment = await withTimeout(
      enrichSamplesFromSearchModal(page, initialSamples, keyword),
      45000,
      {
        samples: initialSamples,
        stats: {
          attempted: true,
          timedOut: true,
          reason: "modal-enrichment-timeout",
          modalOpenCount: 0,
          modalMissCount: initialSamples.length,
          detailEnrichedCount: 0,
        },
      },
    );
    const notePageEnriched = await withTimeout(
      enrichSamplesFromNotePages(context, modalEnrichment.samples, keyword),
      30000,
      modalEnrichment.samples,
    );
    await writeProgress({
      progress: 76,
      stage: "note-detail-enrichment",
      message: "正在补充图文详情正文",
      extractedCount: Math.min(notePageEnriched.length, targetCount),
      totalCount: targetCount,
    });
    const imageOcrEnrichment = await withTimeout(
      enrichSamplesWithImageOcr(notePageEnriched),
      25000,
      {
        samples: notePageEnriched,
        stats: {
          attempted: true,
          timedOut: true,
          reason: "image-ocr-timeout",
          longImageDetectedCount: 0,
          imageOcrCount: 0,
        },
      },
    );
    const finalizedSamples = imageOcrEnrichment.samples.map((sample) => finalizeResolvedContent(sample));
    const filteredSamples = sortSamples(
      filterSamplesByPublishWindow(filterSamplesByNoteType(finalizedSamples, noteType), publishWindow),
      sortBy,
    ).slice(0, targetCount);
    await writeProgress({
      progress: 94,
      stage: "finalizing-samples",
      message: "正在整理最终样本",
      extractedCount: filteredSamples.length,
      totalCount: targetCount,
    });

    if (!filteredSamples.length) {
      fail(
        "Collector extracted raw Xiaohongshu samples but none matched the selected note type or publish window.",
        "no-filtered-samples",
        {
          noteType,
          publishWindow,
          appliedSearchFilters,
          uiFilterApplication,
          diagnostics,
          artifacts,
          extractedFrom: networkSamples.length
            ? "network"
            : searchStateSamples.length
              ? "search-state"
              : stateSamples.length
                ? "initial-state"
                : "dom",
        },
      );
      return;
    }
    const detailApiProbe = await withTimeout(
      probeDetailApiCandidates(context, payload.cookieBlob, filteredSamples, keyword),
      12000,
      {
        timedOut: true,
        reason: "detail-api-probe-timeout",
      },
    );
    const detailEnrichedCount = filteredSamples.filter(
      (item, index) =>
        normalizeText(item.contentText) !== normalizeText(initialSamples[index]?.contentText) ||
        JSON.stringify(item.tags || []) !== JSON.stringify(initialSamples[index]?.tags || []),
    ).length;
    const contentTypeCounts = filteredSamples.reduce(
      (accumulator, sample) => {
        accumulator[sample.contentType] += 1;
        return accumulator;
      },
      { image: 0, video: 0 },
    );

    process.stdout.write(
      JSON.stringify({
        mode: "real",
        status: "completed",
        progress: 100,
        metadata: {
          provider: "xiaohongshu-playwright-worker",
          ready: true,
          extractedCount: filteredSamples.length,
          sortBy,
          noteType,
          publishWindow,
          appliedSearchFilters,
          uiFilterApplication,
          extractedFrom: networkSamples.length
            ? "network"
            : searchStateSamples.length
              ? "search-state"
              : stateSamples.length
                ? "initial-state"
                : "dom",
          modalEnrichment: modalEnrichment.stats,
          imageOcr: imageOcrEnrichment.stats,
          detailEnrichedCount,
          contentTypeCounts,
          detailApiProbe,
          diagnostics,
          artifacts,
          progressStage: "completed",
          progressMessage: "抓取完成",
        },
        samples: filteredSamples,
      }),
    );
  } catch (error) {
    let extras = {};
    if (page) {
      try {
        extras = {
          diagnostics: await collectDiagnostics(page, networkPayloads),
          artifacts: await writeArtifacts(page, payload.keyword),
        };
      } catch {
        extras = {};
      }
    }
    fail(error instanceof Error ? error.message : "Unknown Playwright collector error.", "playwright-runtime-error", extras);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

run();
