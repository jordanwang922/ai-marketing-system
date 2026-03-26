# ViralLab Development Log

**Author:** Codex  
**Project:** AI Marketing System  
**Module:** ViralLab  
**Date Range:** 2026-03-25

---

## 2026-03-25

### ViralLab V1 设计文档完成
- 新增 [virallab_v1_design.md](/Users/jordanwang/YOLO/ai-marketing-system/docs/virallab_v1_design.md)。
- 明确 ViralLab 按独立子系统设计，不依赖主项目业务用户体系。
- 定义了 V1 的核心链路：`采集 -> 分析 -> Pattern -> 生成 -> 沉淀`。
- 明确 V1 首版只做小红书图文闭环，抖音放到后续阶段。

### ViralLab 模块骨架搭建
- 新增模块目录：`modules/virallab`
- 新增子目录：
  - `app`
  - `api`
  - `worker`
  - `shared`
  - `docs`
- 根仓库新增启动脚本：
  - `npm run virallab:app`
  - `npm run virallab:api`
  - `npm run virallab:worker`

### 前端 MVP 工作台
- 前端位于 [App.tsx](/Users/jordanwang/YOLO/ai-marketing-system/modules/virallab/app/src/App.tsx)。
- 已实现单页工作台，包含以下区域：
  - Overview
  - Collection Jobs
  - Samples
  - Analyses
  - Pattern Library
  - Generate Draft
- 前端已接入本地 ViralLab API，不再是静态 mock 卡片。

### 后端 MVP API 实现
- 后端位于 `modules/virallab/api`。
- 当前已具备以下可用接口：
  - `GET /api/virallab/overview`
  - `POST /api/virallab/auth/register`
  - `POST /api/virallab/auth/login`
  - `GET /api/virallab/auth/me`
  - `GET /api/virallab/collect/jobs`
  - `POST /api/virallab/collect/jobs`
  - `GET /api/virallab/collect/jobs/:jobId`
  - `GET /api/virallab/samples`
  - `GET /api/virallab/samples/:sampleId`
  - `POST /api/virallab/analyze/jobs`
  - `GET /api/virallab/analyze/results`
  - `GET /api/virallab/analyze/results/:analysisId`
  - `GET /api/virallab/patterns`
  - `POST /api/virallab/patterns/extract`
  - `GET /api/virallab/patterns/:patternId`
  - `POST /api/virallab/generate/jobs`
  - `GET /api/virallab/generate/jobs/:jobId`
  - `GET /api/virallab/generate/contents/:contentId`

### 本地持久化 MVP 方案
- 当前 MVP 没有强制依赖 PostgreSQL 或 Prisma migration。
- 为了让系统先可演示，新增文件存储服务：
  - [store.service.ts](/Users/jordanwang/YOLO/ai-marketing-system/modules/virallab/api/src/store/store.service.ts)
  - [types.ts](/Users/jordanwang/YOLO/ai-marketing-system/modules/virallab/api/src/store/types.ts)
- 本地数据文件位置：
  - `modules/virallab/api/data/virallab-mvp.json`
- 默认会创建一个 demo 用户：
  - email: `demo@virallab.local`
  - password: `demo123456`

### 已跑通的 MVP 闭环
- 已通过本地 API 请求验证以下链路：
  1. 创建采集任务
  2. 自动生成样本
  3. 对样本发起分析
  4. 从分析结果提取 Pattern
  5. 基于 Pattern 生成小红书图文草稿

### 模拟业务逻辑说明
- 当前 Collector 为本地模拟生成，不是真实小红书采集。
- 当前 Analyzer 为规则生成，不是真实 LLM 分析。
- 当前 Pattern Engine 为本地模板归纳，不是真实多样本深度抽象。
- 当前 Generator 为本地模板生成，不是真实大模型生成。

这些做法是为了先把产品工作流跑通，便于用户先看 MVP。

### 验证结果
- `modules/virallab/app` build 通过
- `modules/virallab/api` build 通过
- `modules/virallab/worker` 可启动
- API 运行态验证通过

### 当前限制
- 还没有真实登录鉴权保护
- 还没有真实数据库接入
- 还没有 Playwright Collector
- 还没有真实 Prompt / LLM 接入
- 还没有任务队列

### 第二轮增强：登录态与 Collector 分层
- 前端新增登录页和本地 token 持久化。
- 前端新增：
  - `auth/login`
  - `auth/register`
  - `auth/logout`
  - `auth/me`
  的联调能力。
- 首页左侧新增当前登录用户显示与退出按钮。
- Collection 表单新增 `collectorMode`，支持：
  - `mock`
  - `real`

### Collector 结构升级
- 采集模块从“单一模拟函数”改为 provider 结构：
  - `mock.collector.ts`
  - `xiaohongshu.collector.ts`
  - `collector.types.ts`
- 当前策略：
  - `mock` 模式：继续本地生成样本，保证可演示
  - `real` 模式：返回明确失败态与错误信息，不会让前端直接崩掉

### 本轮验证
- 使用 demo 账户登录成功
- `GET /auth/me` 可返回当前登录用户
- `collectorMode=mock` 可正常创建任务和样本
- `collectorMode=real` 可返回结构化失败结果，错误信息可直接用于前端提示

### 第三轮增强：平台账号配置与 real collector bridge
- 新增平台账号接口：
  - `GET /api/virallab/platform-accounts`
  - `POST /api/virallab/platform-accounts/xiaohongshu/cookies`
- 本地文件存储增加 `platformAccounts`
- 可为当前用户保存小红书 Cookie 文本
- 新增 `GET /api/virallab/collect/capabilities`
  - 返回 `mock` 和 `real` 两种采集模式的 readiness
- `real` collector 已改为 worker bridge 架构：
  - API: `xiaohongshu.collector.ts`
  - Worker: `worker/src/run-xiaohongshu-collector.js`

### 当前 real collector 行为
- 如果未设置 `VIRALLAB_ENABLE_REAL_COLLECTOR=true`
  - `real` 模式会明确返回 `collector-disabled`
- 如果没保存 Cookie
  - `real` 模式会明确返回 `missing-cookie`
- 如果启用 real collector 且已有 Cookie
  - 当前 worker 会真正启动 Playwright，访问小红书搜索页，并尝试提取真实内容

这意味着：
- 结构已经齐
- API 契约已经齐
- 前端状态已经齐
- real collector 已经进入“真实联调阶段”，不再只是空壳

### 第四轮增强：Playwright 真实采集、诊断与 artifact
- `worker/src/run-xiaohongshu-collector.js` 已接入 Playwright Chromium。
- 已完成：
  - Cookie 文本解析（JSON 数组 / 分号字符串）
  - 小红书搜索页访问
  - 页面滚动
  - DOM note-card 提取
  - `window.__INITIAL_STATE__` fallback 提取
  - 结构化 diagnostics 输出
  - 自动写出调试 artifact：
    - `modules/virallab/worker/artifacts/*.png`
    - `modules/virallab/worker/artifacts/*.html`
- API 的 collection job 列表现在会额外返回结构化 `metadata`，前端可直接显示失败原因和 screenshot 路径。

### 本轮验证
- `modules/virallab/worker` Playwright 浏览器已安装：
  - `npx playwright install chromium`
- `worker/src/run-xiaohongshu-collector.js` 语法检查通过
- `modules/virallab/app` build 通过
- `modules/virallab/api` build 通过
- 真实 worker 直跑验证通过：
  - 无效示例 Cookie 下，collector 不会崩溃
  - 会稳定返回 `no-cards-extracted`
  - 会返回页面标题、URL、页面文本摘要、selector 计数等 diagnostics
  - 会生成 artifact 截图和 HTML 文件
- API 端到端验证通过：
  - `auth/login`
  - `platform-accounts/xiaohongshu/cookies`
  - `collect/jobs` with `collectorMode=real`
  - `collect/jobs` 列表中可看到 metadata、diagnostics 与 artifact 路径

### 第五轮增强：采集任务异步化
- `POST /api/virallab/collect/jobs` 已调整为异步任务模型：
  - 请求创建 job 时立即返回
  - 初始状态为 `pending`
  - 后台自动切换到 `running`
  - 完成后切换到 `completed` 或 `failed`
- API 内部新增轻量级任务执行机制：
  - 使用 `CollectService` 内部队列和去重集合执行 job
  - 避免重复处理同一个 job
  - API 重启后会自动恢复 `pending/running` 任务
- `GET /api/virallab/collect/jobs`
  - 现在按当前登录用户过滤
  - 会返回结构化 `metadata`
- `GET /api/virallab/collect/jobs/:jobId`
  - 现在按当前登录用户读取
  - 可直接用于前端轮询单个任务状态
- 前端工作台已接入自动轮询：
  - 只要有 `pending/running` job，就会定时刷新
  - 创建任务后会提示“queued”

### 本轮验证
- 已验证 `POST /collect/jobs` 立即返回：
  - `status: pending`
- 已验证后端会自动执行任务并更新状态：
  - `pending -> running -> failed`
- 已验证失败后的 job detail 仍保留 diagnostics 和 artifact 路径

### 第六轮增强：Cookie 验证接口
- 新增平台账号验证接口：
  - `POST /api/virallab/platform-accounts/xiaohongshu/verify`
- 新增 Cookie 验证逻辑：
  - worker 支持 `action=verify`
  - 会访问小红书搜索页并判断是否仍落在“登录后查看搜索结果”页面
  - 会返回 diagnostics 和 artifact 路径
- 平台账号状态现在会根据验证结果更新：
  - `verified`
  - `invalid`
- 平台账号会更新：
  - `lastVerifiedAt`
  - `updatedAt`
- 前端已新增 `Verify Cookie` 操作按钮

### 本轮验证
- 已验证保存示例 Cookie 后调用 `POST /platform-accounts/xiaohongshu/verify`
- 已验证返回结果为：
  - `verified: false`
  - `reason: login-required`
- 已验证平台账号状态更新为：
  - `cookieStatus: invalid`
  - `lastVerifiedAt` 已写入

### 第七轮增强：Cookie 状态驱动真实采集
- 平台账号新增字段：
  - `verificationMessage`
  - `verificationMetadataJson`
- 保存新 Cookie 时会重置验证状态，账号回到 `saved`
- `GET /api/virallab/platform-accounts`
  - 现在会返回解析后的 `verificationMetadata`
- `GET /api/virallab/collect/capabilities`
  - 现在会返回：
    - `cookieStatus`
    - `lastVerifiedAt`
    - `canCollect`
    - `verificationMessage`
- `POST /api/virallab/collect/jobs`
  - 当 `collectorMode=real` 且 Cookie 未验证时，不再排队执行
  - 会直接返回 `status: blocked`
  - 已验证失败的 Cookie 也会被拦截
- 前端已根据 `canCollect` 自动禁用 real collect 提交，并显示明确提示

### 本轮验证
- 已验证“只保存 Cookie、不做验证”时：
  - real collect 返回 `status: blocked`
  - 提示必须先 Verify Cookie
- 已验证“验证失败后”：
  - 平台账号保持 `cookieStatus: invalid`
  - real collect 继续被拦截
- 已验证 `collect/capabilities` 正确返回：
  - `cookieStatus: invalid`
  - `canCollect: false`
  - `verificationMessage`

### 第八轮增强：real collect 自动验证 saved Cookie
- `POST /api/virallab/collect/jobs`
  - 当 `collectorMode=real` 且平台账号状态为 `saved` 时
  - 现在会先自动执行一次 Cookie 验证
  - 验证通过则继续排队采集
  - 验证失败则直接返回 `status: blocked`
- `collect/capabilities`
  - 对 `saved` 状态会返回：
    - `canCollect: true`
    - `verificationRequired: true`
- 前端现在会区分：
  - `saved`：允许提交，并提示会自动验证
  - `invalid/missing`：禁止提交 real collect

### 本轮验证
- 已验证在 `cookieStatus: saved` 时：
  - `collect/capabilities` 返回 `canCollect: true`
  - `verificationRequired: true`
- 已验证发起 real collect 后：
  - 后端自动执行验证
  - 无效示例 Cookie 会直接返回 `status: blocked`
  - 平台账号自动更新为 `cookieStatus: invalid`
- 已验证自动验证失败后：
  - `collect/capabilities` 回退为 `canCollect: false`

### 第九轮增强：state-based diagnostics 与定向提取准备
- worker 新增对 `window.__INITIAL_STATE__` 的定向解析：
  - `collectStateSummary`
  - `extractFromSearchState`
- diagnostics 现在额外返回：
  - `stateSummary.userLoggedIn`
  - `stateSummary.searchKeyword`
  - `stateSummary.currentSearchType`
  - `stateSummary.searchFeedCount`
  - `stateSummary.homeFeedCount`
- 真实采集的提取优先级已调整为：
  1. `search.feeds` 定向提取
  2. 泛化 `initial-state` 提取
  3. DOM note-card 提取
- Cookie 验证逻辑已修正：
  - 不再单独依赖 `user.loggedIn`
  - “登录后查看搜索结果”文案优先级最高
  - 只有明确看到 feed 数量时才算状态层面可用

### 本轮验证
- 已验证 worker `verify` 模式正常返回新的 `diagnostics.stateSummary`
- 已验证当前无效示例 Cookie 下：
  - `reason` 仍为 `login-required`
  - `stateSummary.searchFeedCount = 0`
  - 不会被错误判定为已通过验证

### 第十轮增强：前端真实采集调试信息可视化
- 前端平台账号区域已接入 `verificationMetadata`
- 工作台现在可直接显示：
  - verification `reason`
  - `stateSummary.searchFeedCount`
  - `stateSummary.homeFeedCount`
  - 最新 artifact HTML 路径
- 这样后续使用真实 Cookie 联调时，不需要翻本地 JSON 文件即可判断：
  - 是否仍被登录页拦截
  - 是否 state 已有 feed 但 DOM 还没匹配到
  - 当前 artifact 文件路径在哪里

### 本轮验证
- `modules/virallab/app` build 通过
- `modules/virallab/api` build 通过

### 第八十三轮增强：把 Cookie 获取说明写成更细的界面步骤
- 继续细化顶部帮助弹层里的 `Cookie 指引`，重点改写“如何拿到小红书 Cookie”这一段。
- 现在说明已经明确到：
  - 在开发者工具里点哪个标签
  - 在 Network 面板里需要先做什么动作让请求出现
  - 过滤框里可以搜什么关键词：
    - `xiaohongshu`
    - `edith`
  - 请求列表里优先点哪些请求：
    - `search`
    - `notes`
    - `recommend`
  - 右侧具体看哪个区域：
    - `Headers`
    - `Request Headers`
    - `cookie`
- 目标是把原本偏开发者口吻的描述改成普通用户也能照着操作的步骤说明。

### 本轮验证
- `modules/virallab/app` build 通过

### 第八十四轮增强：创建采集任务后自动提示下一步
- 在“采集任务”区块内新增了一个状态驱动的“下一步怎么做”引导卡。
- 该卡片会根据最近一条采集任务的状态自动变化：
  - 没有任务：提示先创建任务，然后去看“采集任务”和“样本”
  - `pending/running`：提示不要重复点按钮，先等待后台处理完成
  - `completed`：提示先去看“样本”，再看“分析结果”和“最近一次真实工作流”
  - `failed`：提示先看失败原因，再回到平台接入检查 Cookie
- 还补了区块内跳转按钮，直接带用户去对应部分，而不是只给一段静态说明。

### 本轮验证
- `modules/virallab/app` build 通过

### 第八十五轮增强：把主工作区按流程重排成单列
- 对 ViralLab 主工作区做了一轮结构级重排，不再用难读的横向并列布局作为主视图。
- 新布局改成从上到下的流程页：
  1. 平台接入
  2. 创建采集任务
  3. 查看样本
  4. 分析并提炼模式
  5. 生成草稿
- 把当前阶段不必要的信息降级或后移：
  - 顶部工作流摘要和来源诊断不再抢首屏
  - 高级调试信息被收进 `高级信息与调试`
  - provider 对比类信息不再作为主阅读路径的一部分
- 同时增加流程条、步骤编号、步骤说明，确保用户点击“创建任务”后知道接下来该看哪里。
- 本轮也顺手清理了已经不再使用的 overview/provider 统计渲染逻辑。

### 本轮验证
- `modules/virallab/app` build 通过

### 第八十六轮增强：交付前回归测试与文档收口
- 对本轮 UI 重排后的 ViralLab 做了交付前测试，重点覆盖：
  - 前端构建
  - API 构建
  - 健康检查
  - 登录接口
- 已验证：
  - `modules/virallab/app` build 通过
  - `modules/virallab/api` build 通过
  - `GET /api/virallab/health` 返回 `ok: true`
  - `POST /api/virallab/auth/login` 使用 demo 账号返回成功 token
- 同步补齐并更新了：
  - 开发日志
  - 交接文档
  - 中文用户手册
  - 页面内帮助说明

### 第七十四轮增强：为 workflow 增加结论级 verdict
- 本轮继续收口 workflow 诊断，把一组指标压缩成一个可直接读的结论层
- `WorkflowService` 的 `diagnostics` 现在新增：
  - `workflowVerdict`
    - `strong`
    - `usable`
    - `review`
  - `workflowSummary`
- 当前 verdict 主要综合这几类信号：
  - 输入样本平均质量
  - analyses 是否主要走 LLM
  - Pattern 是否为 LLM 且 confidence 是否足够
  - Generate 是否为 LLM 且标题产出是否足够
- 前端 `Latest Real Workflow` 现在会直接显示 verdict badge 和 summary
- 这样 workflow 面板现在是：
  - 先看 verdict
  - 再看细项 diagnostics
  - 再看 Pattern / Generate 快照

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 第六十一轮增强：修正小红书真实筛选逻辑，改为接管页面 `search/notes` 请求参数
- 这轮针对真实用户反馈做了专项排查：
  - 用户在 ViralLab 里选择：
    - `最多点赞`
    - `图文`
    - `一周内`
  - 但抓回来的结果仍然混入明显视频笔记，且顺序与小红书页面不一致
- 排查结论已经确认：
  - 旧逻辑主要是：
    - 用默认搜索页结果采样
    - 再在本地做 `sort/filter`
  - 这会导致两类偏差：
    - 结果顺序不等于小红书真实筛选顺序
    - `图文/视频` 只要分类信号不稳，就会混入错误样本
- 本轮修复：
  - 在 worker 中监听真实的：
    - `/api/sns/web/v1/search/filter`
    - `/api/sns/web/v1/search/notes`
  - 接管浏览器本来就会发出的 `search/notes` 请求
  - 在放行前，把请求体重写成用户选择对应的真实筛选值：
    - 排序依据 `sort_type`
    - 笔记类型 `filter_note_type`
    - 发布时间 `filter_note_time`
    - 同时同步 `note_type`
  - 目前已经确认的真实映射包括：
    - `最多点赞 -> popularity_descending`
    - `图文 -> note_type=2 / 普通笔记`
    - `视频 -> note_type=1 / 视频笔记`
    - `一周内 -> filter_note_time=一周内`
- 这意味着当前自研 collector 已从：
  - `先抓原始结果，再本地猜排序/过滤`
  调整为：
  - `先让小红书真实搜索接口按目标筛选返回，再进入后续详情补全/OCR链`

### 本轮验证
- `node --check modules/virallab/worker/src/run-xiaohongshu-collector.js` 通过
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过
- 用当前有效 cookie 做真实页面验证时，重写 `search/notes` 请求后，页面结果已经明显切换为：
  - 图文结果流
  - 且发布时间收窄到最近一周

### 第八十轮增强：为小红书采集新增图文/视频筛选，并补齐多模态样本结构
- 按新的设计文档先补齐了采集任务参数：
  - `排序依据` 扩展为：
    - `热门`
    - `最新`
    - `最多点赞`
    - `最多评论`
    - `最多收藏`
  - 新增：
    - `笔记类型`
      - `不限`
      - `图文`
      - `视频`
    - `发布时间`
      - `不限`
      - `一天内`
      - `一周内`
      - `半年内`
- 前端 `collectForm` 与后端 `CreateCollectJobDto / CollectRequest` 已全部打通
- Collection job metadata 已开始正式记录：
  - `sortBy`
  - `noteType`
  - `publishWindow`
- 小红书 worker 现在会在最终结果里执行：
  - `图文 / 视频` 分流
  - 发布时间窗口过滤
  - 本地排序重排
- 同时补齐了样本多模态字段：
  - `contentType`
  - `contentFormat`
  - `longImageCandidate`
  - `ocrTextRaw / ocrTextClean`
  - `transcriptText / transcriptSegments`
  - `frameOcrTexts`
  - `resolvedContentText / resolvedContentSource`

### 第八十一轮增强：接入本机 Vision OCR，先打通长图文 OCR 链
- 新增 worker helper：
  - `modules/virallab/worker/src/vision-ocr.swift`
- 当前方案不是依赖外部 OCR 服务，而是直接调用 macOS Vision 框架
- worker 已新增：
  - 下载长图图片到 artifacts 临时目录
  - 调用 Vision OCR
  - 清洗 OCR 文本
  - 回填：
    - `ocrTextRaw`
    - `ocrTextClean`
    - `resolvedContentText`
    - `resolvedContentSource=image-ocr`
- 目前长图触发条件是：
  - 图文
  - 图片数量 >= 2
  - 页面正文较短
- 这条链的目标是优先解决“小红书长图文正文在图片里，页面正文很短”这一类问题

### 第八十二轮增强：为视频链补上页面帧 OCR，并预留 transcript 字段
- 受当前本机环境限制：
  - 没有现成 `ffmpeg`
  - 没有现成 `whisper / faster-whisper`
- 所以视频 V1 先走“可运行版”：
  - 搜索页/弹层打开视频
  - 截取媒体区域帧图
  - 用 Vision OCR 识别画面上的字幕/封面文字
  - 回填：
    - `frameOcrTexts`
    - `transcriptText`
    - `transcriptSegments`
    - `resolvedContentSource=video-frame-ocr`
- 这条链不是最终 ASR 版本，但已经把：
  - 视频元数据
  - 页面帧 OCR 文本
  - 后续 Analyze 可消费的 resolved text
  接进了统一样本结构

### 第八十三轮增强：让后续分析真正吃到 OCR/视频融合后的正文
- `SamplesService` 现在计算质量分时，已经优先使用：
  - `resolvedContentText`
  而不是只看原始 `contentText`
- `AnalyzeService` 从 Prisma 读取 sample 时，也开始优先消费：
  - `parsedPayloadJson.resolvedContentText`
- 这意味着长图 OCR 和视频帧 OCR 不只是“展示字段”，而是已经进入后续分析链

### 本轮验证
- `node --check modules/virallab/worker/src/run-xiaohongshu-collector.js` 通过
- `swift modules/virallab/worker/src/vision-ocr.swift` 通过
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 当前限制
- 视频 V1 目前先走：
  - 页面帧 OCR
  - 页面已有字幕/文案融合
- 还没有接真正的：
  - `Whisper / ASR`
  - 音频流提取
- 小红书搜索页的真实“筛选参数”目前以本地过滤和本地排序为主；后续如果找到更稳定的搜索 query 参数，再进一步下沉到请求层

### 第八十四轮修复：修正“视频被误判成图文”的分类逻辑
- 用户实测发现：
  - 在采集表单里明确选择 `图文`
  - 结果里仍然出现标题明显是“视频日记”的样本
  - UI 还显示成：
    - `1 张图片`
    - `0 个视频`
- 问题根因已确认：
  - 之前的 `video/image` 判定主要依赖 `mediaVideoUrls.length > 0`
  - 但小红书很多视频页只有：
    - `video` DOM 元素
    - `poster`
  - 并没有可复用的视频直链，因此会被误判成图文
- 本轮修复内容：
  - 新增 `hasVideoMedia` 信号
  - 视频判定不再只看 `mediaVideoUrls`
  - 现在会综合：
    - 搜索卡片 DOM 中是否出现 `video`
    - 网络/state 里的 noteType / noteCardType / modelType
    - 弹层和详情页里是否存在 `video` 元素
  - UI 里的视频数量展示也已改为：
    - `mediaVideoUrls.length || (hasVideoMedia ? 1 : 0)`
  - `SamplesService` 和 `AnalyzeService` 的 `contentType/contentFormat` 推断也同步使用 `hasVideoMedia`

### 本轮验证
- `node --check modules/virallab/worker/src/run-xiaohongshu-collector.js` 通过
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 第八十一轮增强：补充中文使用手册与 Cookie 指引
- 新增中文使用手册：
  - `docs/virallab_user_guide_zh.md`
- 手册重点补齐了用户最容易卡住的真实采集环节：
  - 什么是小红书 Cookie
  - 如何通过浏览器开发者工具复制完整 Cookie
  - 如何在 ViralLab 中保存与验证 Cookie
  - Cookie 失效后的正确处理步骤
  - 采集成果应该优先在哪些区域查看：
    - `Collection Jobs`
    - `Samples`
- 同时补充了系统使用顺序、样本质量阅读方式、workflow 的常规使用方式和常见问题说明。

### 第八十二轮增强：把使用说明和 Cookie 指引做进界面
- 在 ViralLab 顶部头部新增两个可直接点击的帮助入口：
  - `使用说明`
  - `Cookie 指引`
- 点击后会打开页面内帮助弹层，而不是让用户自己去找文档文件。
- 当前弹层内容重点覆盖：
  - 系统推荐使用顺序
  - 采集成果应该去哪里看
  - 如何跑完整 workflow
  - 如何从浏览器拿到小红书 Cookie
  - 如何在 ViralLab 中保存并验证 Cookie
  - Cookie 失效后的恢复步骤
- 这次改动的目标是把说明文档产品化，做成商用化风格的页面内帮助能力。

### 本轮验证
- `modules/virallab/app` build 通过
- `modules/virallab/api` build 通过

### 第八十轮增强：取消左侧侧栏，改为顶部头部
- 把 ViralLab 控制台原本的左侧品牌/导航区域改成了真正的顶部头部结构，不再长期占据左侧宽度。
- 顶部头部现在按三段组织：
  - 左侧：品牌标识与产品标题
  - 中间：主导航
  - 右侧：用户、语言切换、退出按钮
- 响应式规则也同步调整：
  - 宽屏默认走顶部横向布局
  - 较窄宽度才自动堆叠，不再保留“伪侧栏”

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 第七十八轮增强：支持在控制台直接查看最新 10 条样本，并完成一次真实 `AI教育` 联调
- 我这轮先把 `Samples` 面板从默认展示 5 条改成了展示最新 10 条，方便直接审看一屏真实样本，而不是只看到一半
- 实际联调了一次：
  - 关键词：`AI教育`
  - 排序：`latest`
  - 目标数：`10`
  - provider：`xiaohongshu-playwright`
- 联调结果：
  - 前端与 API 均正常启动
  - 新建任务 `job_0e805361`
  - 任务失败，不是代码崩溃，而是当前保存的小红书 Cookie 已失效
  - 搜索接口返回 `code=-101`、`msg=无登录信息，或登录信息为空`
  - 失败诊断、截图和 HTML artifact 已经能在控制台里直接看到
- 为了保证这轮仍然“有呈现的地方”，当前控制台可直接查看库里已有的最新 10 条 `AI教育` 样本；本轮未继续伪造新数据

### 本轮验证
- `modules/virallab/app` build 通过
- API 在 `VIRALLAB_ENABLE_REAL_COLLECTOR=true` 下启动通过
- 前端在 `http://127.0.0.1:3200/` 可访问

### 第七十九轮增强：前端控制台改为中英双语，默认中文
- 当前 `ViralLab` 前端工作台已加入双语切换：
  - 默认语言：中文
  - 可切换语言：中文 / English
- 本轮完成内容：
  - 登录页新增语言切换入口
  - 侧边栏新增语言切换入口
  - 主导航、Hero、工作流、样本质量、来源诊断、采集器状态、采集任务、样本、分析、Pattern、生成等主要静态文案已切到双语
  - 顶部统计卡片也已做中英映射，不再只显示英文
  - AI 来源、状态、质量缺口等通用标签已补基础翻译
- 设计原则：
  - 默认中文优先，英文作为切换后的完整可读版本
  - 不去强行翻译用户生成内容、模型输出正文、Pattern 名称等业务内容，以免污染原始结果

### 本轮验证
- `modules/virallab/app` build 通过
- `modules/virallab/api` build 通过

### 第七十七轮增强：新增按最近配置重跑 workflow 的动作
- 本轮开始回到真实闭环运行本身，补了一个可操作能力而不是继续只加展示
- API 新增：
  - `POST /api/virallab/workflow/jobs/rerun-latest`
- 当前行为：
  - 读取最近一条 workflow job 的 metadata
  - 复用其中的：
    - `targetJobId`
    - `providerId`
    - `sampleLimit`
    - `forceReanalyze`
    - `goal / tone / targetAudience`
  - 重新排入一条新的 workflow job
- 前端 `Workflow Jobs` 卡片已新增：
  - `Re-run Latest Workflow` 按钮
- 这样后面反复验证自研采集、Analyze、Pattern、Generate 的改动时，不需要每次手工重新填 scope 参数

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 第七十六轮增强：把 workflow 的关键诊断摘要也持久化到 job metadata
- 本轮继续完善 workflow 的“列表层可读性”，没有新增新的诊断算法
- `WorkflowService` 现在会把这些关键摘要一并写回 completed job metadata：
  - `averageSampleQuality`
  - `llmAnalysisCount`
  - `fallbackAnalysisCount`
  - `localAnalysisCount`
  - `patternSource`
  - `generationSource`
  - `patternConfidence`
- 前端 `Workflow Jobs` 卡片也已经接上其中最关键的几项：
  - 平均样本质量
  - LLM analyses 数
  - pattern source
  - generation source
- 这样列表层现在不只是一个 verdict 标识，而是已经有基本的健康摘要，后面做统计和审计也不需要每次都反查完整 result block

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 第七十五轮增强：把 workflow verdict 写回 job metadata 并显示在列表卡片
- 本轮没有新增新的诊断维度，而是把现有 verdict 下沉到 job 列表层
- `WorkflowService` 现在会在 completed job 的 metadata 中写入：
  - `workflowVerdict`
  - `workflowSummary`
- 前端最上方 `Workflow Jobs` 卡片已经接上这两个字段：
  - 现在列表态就能直接显示：
    - `strong / usable / review`
    - 对应的 summary
- 这样无需打开下面的详细结果区，也能先快速判断最近一次 workflow 的健康度

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 第七十三轮增强：把最近 workflow 的输入样本也高亮出来
- 本轮继续补“最近 workflow 全链路对照”，仍然只改前端映射
- `Pipeline Diagnostics` 现在新增了直达 `#samples` 的链接
- 历史 `Samples` 区块现在也会对最近 workflow 输入样本显示：
  - `latest workflow` badge
  - 高亮边框
- 至此，最近一条 workflow 的四层记录都能在历史区块里自动定位：
  - samples
  - analyses
  - pattern
  - draft

### 本轮验证
- `modules/virallab/app` build 通过
- `modules/virallab/api` build 通过

### 第七十二轮增强：把最近 workflow 对应的 analyses 也高亮出来
- 本轮继续做结果对照，不改后端结构
- 前端 `Latest Real Workflow -> Pipeline Diagnostics` 现在新增了直达 `#analyze` 的链接
- 历史 `Analyses` 区块现在也会对最近 workflow 对应的 analysis 记录显示：
  - `latest workflow` badge
  - 高亮边框
- 这意味着最近一次 pipeline 的三层产物现在都能在历史区块里自动定位：
  - analyses
  - pattern
  - draft

### 本轮验证
- `modules/virallab/app` build 通过
- `modules/virallab/api` build 通过

### 第七十一轮增强：把最近 workflow 结果和历史区块直接关联起来
- 本轮继续做“结果对照”，不改后端结构
- 前端 workflow 快照现在新增了直达链接：
  - `Pattern Snapshot -> #patterns`
  - `Generation Snapshot -> #generated`
- 同时历史区块也已接上结果高亮：
  - `Pattern Library` 中如果某条 pattern 就是最近 workflow 产物，会显示：
    - `latest workflow` badge
    - 高亮边框
  - `Latest Draft` 如果就是最近 workflow 生成的 draft，也会显示同样的 badge 和高亮
- 这一步的目标，是让“刚跑出来的结果”和“历史列表里的对应记录”自动对上，减少人工肉眼比对成本

### 本轮验证
- `modules/virallab/app` build 通过
- `modules/virallab/api` build 通过

### 第十一轮增强：collector debug summary 接口
- 新增接口：
  - `GET /api/virallab/collect/debug-summary`
- 该接口会聚合：
  - 当前小红书平台账号状态
  - 最新一次 verification metadata
  - 最新一条 `collectorMode=real` 的 collection job
- 前端新增 `Collector Debug` 面板
- 工作台现在可以直接看到：
  - latest verification reason
  - `searchFeedCount / homeFeedCount`
  - latest real job status
  - latest screenshot / html artifact 路径

### 本轮验证
- `modules/virallab/app` build 通过
- `modules/virallab/api` build 通过

### 第十二轮增强：网络响应级 diagnostics
- worker 现在会监听小红书搜索相关的 XHR / fetch JSON 响应
- diagnostics 新增：
  - `networkSummary.capturedResponses`
  - `networkSummary.urls`
- 真实采集提取优先级已升级为：
  1. network payload
  2. `search.feeds`
  3. 泛化 `initial-state`
  4. DOM note-card
- 前端 `Collector Debug` 面板已显示：
  - network response count
  - first captured response URL

### 本轮验证
- worker `verify` 模式已返回：
  - `networkSummary.capturedResponses: 1`
  - `networkSummary.urls[0]: https://edith.xiaohongshu.com/api/sns/web/v1/search/recommend?...`
- `modules/virallab/app` build 通过
- `modules/virallab/api` build 通过

### 第十三轮增强：基于搜索 API 返回码的认证判断
- worker 现在会解析搜索接口 JSON 外层结构：
  - `code`
  - `success`
  - `msg`
- `networkSummary` 新增：
  - `responses`
  - `authFailure`
- Cookie 验证现在优先使用搜索接口返回码判断认证状态：
  - 例如 `code: -101`
  - `msg: 无登录信息，或登录信息为空`
- 对应失败原因已升级为：
  - `network-auth-required`
- 前端 `Collector Debug` 面板已显示：
  - API auth failure code
  - API auth failure message

### 本轮验证
- worker `verify` 模式已返回：
  - `reason: network-auth-required`
  - `networkSummary.responses[0].code: -101`
  - `networkSummary.responses[0].msg: 无登录信息，或登录信息为空`
- `modules/virallab/app` build 通过

### 当前限制
- 如果 Cookie 无效或已过期，小红书会落到登录页，当前会返回结构化失败而不是真实样本
- 真实成功样本的抓取还需要有效登录态 Cookie
- Analyzer / Pattern / Generator 仍然是本地模板逻辑，尚未接入真实 LLM
- 持久化仍然是本地 JSON 文件，不是真实数据库

### 下一步建议
1. 用有效小红书 Cookie 做一次真实采集联调，验证 note-card 提取规则
2. 将 collector 执行改成真正的异步任务流，而不是同步请求阻塞
3. 用真实 PostgreSQL 或 SQLite 替换文件存储
4. 引入真实 Analyzer Prompt 和结构化 JSON 输出
5. 引入真实 Pattern 抽取逻辑
6. 引入真实内容生成 Prompt

### 第十四轮增强：接入豆包 LLM 分析与生成
- 新增通用 LLM 客户端：
  - `modules/virallab/api/src/llm/llm.service.ts`
- 复用与 `RiskRadar` 一致的 Ark/OpenAI 兼容配置：
  - `LLM_BASE_URL`
  - `LLM_API_KEY`
  - `LLM_MODEL`
  - `LLM_TIMEOUT_MS`
  - `VIRALLAB_USE_LLM`
- `AnalyzeService` 已改为：
  - 优先调用豆包返回结构化 JSON 分析结果
  - 失败时回退到原有本地规则分析
- `GenerateService` 已改为：
  - 优先调用豆包返回结构化 JSON 内容草稿
  - 失败时回退到原有本地模板生成
- 生成链路补充：
  - 支持单次请求自定义超时
  - 生成超时提升到 45 秒
  - 标签字段增加归一化逻辑，避免模型把多个标签塞成一个字符串
- 环境样例已补充到：
  - `modules/virallab/api/.env.example`

### 本轮验证
- `modules/virallab/api` build 通过
- 直接调用 Ark 接口返回 200
- `POST /api/virallab/analyze/jobs` 已返回真实 LLM 结果：
  - `modelName: ep-m-20250913124021-hnxt6`
  - `promptVersion: analyze.v2.llm`
- `POST /api/virallab/generate/jobs` 已返回真实 LLM 结果：
  - `modelName: ep-m-20250913124021-hnxt6`
  - `promptVersion: generate.v2.llm`
- 生成链路首轮曾触发 20 秒超时，已通过独立超时参数修复

### 当前限制
- Pattern 抽取仍然是本地逻辑，尚未接入真实 LLM
- 持久化仍然是本地 JSON 文件，不是真实数据库
- 真实小红书样本抓取仍然依赖有效 Cookie 才能完成最后联调

### 第十五轮增强：接入豆包 LLM Pattern Engine
- `PatternsService` 已改为优先调用豆包/Ark，从多条 analysis + sample 中抽象 Pattern
- 新增依赖注入：
  - `modules/virallab/api/src/patterns/patterns.module.ts`
  - 复用 `modules/virallab/api/src/llm/llm.service.ts`
- Pattern 抽取现在会向 LLM 请求以下结构化字段：
  - `name`
  - `topic`
  - `description`
  - `hookTemplate`
  - `bodyTemplate`
  - `endingTemplate`
  - `emotionalCore`
  - `trendSummary`
  - `applicableScenarios`
  - `confidenceScore`
- 当 LLM 超时、解析失败或配置缺失时，仍会自动回退到本地 Pattern 模板逻辑

### 本轮验证
- `modules/virallab/api` build 通过
- `POST /api/virallab/patterns/extract` 已返回真实 LLM Pattern：
  - `patternId: pattern_d9200acc`
  - `name: AI教育赛道爆款内容模板`
  - `topic: AI教育赛道内容创作`
  - `confidenceScore: 1`
- 当前 ViralLab 三段 AI 链路已全部具备真实 LLM 分支：
  - `analyze`
  - `patterns`
  - `generate`

### 当前限制
- Pattern 当前尚未记录 `modelName / promptVersion`，仍缺少更完整的审计元数据
- 持久化仍然是本地 JSON 文件，不是真实数据库
- 真实小红书样本抓取仍然依赖有效 Cookie 才能完成最后联调

### 第十六轮增强：AI 结果审计字段与前端来源展示
- 为以下实体补充审计字段：
  - `ViralLabAnalysis`
  - `ViralLabPattern`
  - `ViralLabGeneratedContent`
- 新增字段：
  - `fallbackStatus`
  - `fallbackReason`
- `ViralLabPattern` 额外补齐：
  - `modelName`
  - `promptVersion`
- 状态含义：
  - `llm`：本次结果直接来自豆包/Ark
  - `local-fallback`：尝试调用 LLM 失败，已回退本地逻辑
  - `local-only`：当前结果本来就是本地 MVP 逻辑或历史数据迁移结果
- `store.service.ts` 已加入兼容迁移：
  - 历史 JSON 数据会自动补齐这些字段
- 前端工作台现在会在：
  - `Analyses`
  - `Pattern Library`
  - `Latest Draft`
  这三个区域显示来源状态、模型名和 prompt 版本

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 第七十轮增强：把 Pattern 和 Generate 结果快照并到 workflow 面板
- 本轮继续增强 workflow 结果可读性，没有改采集器或后端数据结构
- 前端 `Latest Real Workflow` 面板现在除了输入样本质量和 diagnostics 外，还会直接展示：
  - `Pattern Snapshot`
    - AI 来源 pill
    - confidence
    - topic
    - source sample 数
    - description
  - `Generation Snapshot`
    - AI 来源 pill
    - title candidate 数
    - 前几个标题候选
    - 前几个标签
    - `coverCopy / generationNotes`
- 这一步的目标，是让一次真实 pipeline 的输入、诊断、Pattern、Generate 结果都集中在一个视图里，不需要再跳到下面单独翻对应区块

### 本轮验证
- `modules/virallab/app` build 通过
- `modules/virallab/api` build 通过

### 第六十九轮增强：为 workflow 增加结果级质量与 AI 来源诊断
- 本轮继续围绕真实验证闭环推进，没有改采集器本体
- `WorkflowService` 现在会在结果层返回一个 `diagnostics` 对象，聚合当前 pipeline 的关键判断信号：
  - `averageSampleQuality`
  - `topSampleQuality`
  - `llmAnalysisCount / fallbackAnalysisCount / localAnalysisCount`
  - `patternSource`
  - `generationSource`
  - `patternConfidence`
  - `generatedTitleCount / generatedTagCount`
- 前端 `Latest Real Workflow` 面板也已同步增强：
  - 除了显示输入样本质量分外
  - 现在还会显示：
    - 本次 analyses 里有多少条是 LLM、fallback、local
    - Pattern 和 Generate 最终来自哪种来源
    - Pattern confidence
    - 生成结果的标题数和标签数
- 这一步的目标是把 workflow 排障做成“输入质量 + AI 来源 + 输出结构”三层一起看，而不是只看最终标题像不像

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 第六十八轮增强：把 workflow 的实际输入样本质量显式展示出来
- 本轮没有继续改采集器，而是把“质量优先选样”真正透传到 workflow 结果层
- `WorkflowService` 现在会在返回的 `samples` 摘要里带上：
  - `qualityScore`
- 前端 `Latest Real Workflow` 面板已同步增强：
  - 展示本次 pipeline 输入样本的平均质量分
  - 展示最高质量样本的分数
  - 直接列出本次参与 pipeline 的前几条样本及对应质量分
- 这一步的目的，是让工作台不再只显示“跑了几条样本”，而是明确告诉你：
  - 这次 Analyze / Pattern / Generate 到底建立在一批什么质量的样本之上

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 第六十六轮增强：按样本质量缺口反向优化自研采集的时间与标签归一化
- 本轮继续聚焦自研主通道 `xiaohongshu-playwright`
- worker 里的全局归一化层已增强：
  - `normalizeTimestampValue()` 现在额外支持：
    - `刚刚 / 刚才`
    - `x分钟前 / x小时前 / x天前`
    - `今天 / 昨天 / 前天`
    - `MM月DD日`
    - `YYYY年MM月DD日`
    - `编辑于 / 发布于 / 发表于` 前缀清洗
- 同时新增统一标签归一化 helper：
  - `normalizeTagValue()`
  - `mergeTags()`
  - 全局版 `extractHashtags()`
  - 全局版 `extractTitleKeywords()`
- 当前这层归一化会过滤掉：
  - 日期型 tag
  - `day23 / 3天前 / 2小时前` 这类时间噪音
  - `视频 / 图文 / 小红书 / 搜索结果` 这类低价值通用词
- 现有采集入口已开始复用这层逻辑：
  - 搜索结果 DOM 卡片
  - `__INITIAL_STATE__` fallback
  - `search.feeds` fallback
  - 搜索页弹层 enrichment
  - note page enrichment 的 tag merge
- 这一步的目标是直接减少当前质量面板里的高频缺口，尤其是：
  - `missing_publish_time`
  - `missing_tags`
  - 以及低质量噪音 tag 对分析结果的干扰

### 本轮验证
- `node --check modules/virallab/worker/src/run-xiaohongshu-collector.js` 通过
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 第六十七轮增强：让 workflow 和 analyze 默认优先吃高质量真实样本
- 本轮把样本质量评分从 `SamplesService` 抽成了共享 helper：
  - `modules/virallab/api/src/samples/sample-quality.ts`
- 当前 `qualityScore / qualityFlags` 不再只是前端展示层能力，而是已经接入后端默认选样逻辑：
  - `AnalyzeService`
    - 默认不再简单取“最新 5 条”
    - 现在会先从最近一批样本中按 `qualityScore` 排序，再用时间做兜底
  - `WorkflowService`
    - `getSamplesForJob()` 不再只看 `likeCount`
    - 现在会优先选择高质量样本，再按点赞和时间排序
- 这一步的目标是提升默认 `Analyze / Pattern / Generate` 的输入质量，减少“随机挑到字段不完整样本”对输出的干扰

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 第六十五轮增强：为自研样本增加质量评分与缺口可视化
- 本轮开发重新聚焦自研主通道 `xiaohongshu-playwright`，没有继续把托管 provider 当成主线
- `SamplesService` 现在会在 API 返回层为每条 sample 计算：
  - `qualityScore`
  - `qualityFlags`
- 当前评分是轻量衍生指标，不依赖 schema migration，主要用于快速判断真实样本是否足够完整，当前会检查：
  - `platformContentId`
  - `authorName / authorId`
  - `publishTime`
  - `contentText / contentSummary`
  - `coverImageUrl`
  - `mediaImageUrls / mediaVideoUrls`
  - `tags`
  - `sourceUrl` 是否为标准 `/explore/` 链接
- 前端控制台也已接上：
  - `Samples` 面板现在会显示每条样本的 `Quality xx/100`
  - 同时展示前 3 个主要缺口 flags
  - 新增 `Sample Quality` 面板，聚合展示：
    - 平均分
    - strong sample 数
    - weak sample 数
    - 当前最常见的质量缺口 flags
- 这一步的目标是让后续自研采集优化有明确靶点，而不是继续靠手工翻样本判断问题

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 第六十四轮增强：给 workflow 补独立 provider 配置表单
- 我这轮继续把 provider 实验做成显式操作，不再隐式借用采集表单：
  - 前端新增 `workflowForm`，当前可配置：
    - `providerId`
    - `sampleLimit`
    - `forceReanalyze`
  - 工作区新增 `Workflow Scope` 面板
  - 现在可以直接在 UI 中选择：
    - `xiaohongshu-playwright`
    - `xiaohongshu-managed`
    然后单独跑 provider-scoped workflow
  - `Run Provider Pipeline` 按钮会把这些显式参数发给：
    - `POST /api/virallab/workflow/jobs`
- 这样后面真正有 managed 样本时，不需要再靠“先切 collect 表单 provider 再点 workflow”这种隐式操作，实验路径更清晰

### 本轮验证
- `modules/virallab/app` build 通过
- `modules/virallab/api` build 通过

### 第六十三轮增强：给 workflow 增加 `providerId` 过滤，支持按采集通道单独跑 pipeline
- 我这轮把 provider 能力继续推到了 workflow 层，不再默认把所有 real 样本混在一起：
  - `WorkflowRequest` 现在新增：
    - `providerId`
  - `createLatestRealPipelineJob()` 会把 `providerId` 写进 workflow job metadata
  - `executeLatestRealPipeline()` 现在会按：
    - `jobId`
    - `providerId`
    一起解析真实来源 job
  - `resolveRealJob()` 已支持 provider 过滤：
    - Prisma 路径
    - JSON fallback 路径
    都会按 `job.metadata.provider` 做筛选
  - `resolveWorkflowResult()` 也会沿着 metadata 中的 `providerId` 复原来源 job
- 前端也已同步接上：
  - 点击 `Run Latest Real Pipeline` 时，现在会把当前采集表单里的 provider 一起带给 workflow
  - `Workflow Jobs` 卡片也会直接显示当前 job 的 `providerId`
- 这样后面一旦跑出：
  - `xiaohongshu-playwright`
  - `xiaohongshu-managed`
  两条 real 通道，就可以分别单独跑 `Analyze / Pattern / Generate`，而不是混成一锅

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 第六十二轮增强：把 managed 质量指标接进控制台，支持 provider 级别质量对比
- 我这轮继续做“可观测性”，重点是 job 级 provider diagnostics：
  - `Job.metadata` 前端类型现在已显式接入：
    - `rawItemCount`
    - `normalizedItemCount`
    - `fallbackItemCount`
    - `fallbackUsed`
    - `linksCaptured`
    - `markdownCaptured`
    - `htmlCaptured`
  - `Collection Jobs` 列表现在会直接显示：
    - normalized item 数
    - fallback item 数
    - 是否触发 fallback
    - links/markdown/html 是否被抓到
  - 同时新增了一个 `Provider Diagnostics` 面板，按 provider 聚合：
    - job 数
    - normalized item 总数
    - fallback item 总数
    - fallback run 次数
- 这样后面只要一跑出 managed collect，就能非常快地判断：
  - XCrawl 的 `json` 是否直接命中
  - 还是在主要依赖 fallback

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 第六十一轮增强：把 provider 来源透到样本层和控制台，用于后续通道质量对比
- 我这轮继续做“可比较性”，让后面 managed provider 一旦联调成功，就能直接在同一界面里对比样本质量：
  - `SamplesService` 现在会根据 sample 对应 job 的 metadata 衍生出：
    - `provider`
  - Prisma 路径现在会：
    - `contentSample.findMany({ include: { job: true } })`
    - 从 job metadata 里读取 provider
  - JSON fallback 路径也做了同样映射
  - 因此 `GET /samples` 和 `GET /samples/:sampleId` 现在都会显式返回 sample 的 provider 来源
- 前端控制台也已同步接上：
  - `Sample` 类型新增 `provider`
  - `Samples` 面板现在会显示：
    - `likes · collectorMode · provider`
  - 同时新增一个 `Sample Sources` 面板，直接统计当前样本来自哪些 provider、各自数量多少
- 这样后面一旦跑出 `xiaohongshu-playwright` 和 `xiaohongshu-managed` 两条通道的样本，就可以直接在控制台层面比较：
  - 样本数量
  - 样本来源
  - 质量差异

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过
- 启动 API 后，历史 `virallab-mvp.json` 已自动补齐新字段
- 本地数据验证示例：
  - analysis: `fallbackStatus=llm`
  - generated content: `fallbackStatus=llm`
  - 历史 pattern: `fallbackStatus=local-only`

### 当前限制
- 旧的历史 Pattern 记录只会被迁移成 `local-only`，不会自动补成真实 LLM 产物
- 持久化仍然是本地 JSON 文件，不是真实数据库
- 真实小红书样本抓取仍然依赖有效 Cookie 才能完成最后联调

### 第十七轮增强：引入 SQLite / Prisma 数据库镜像层
- Prisma schema 已从本地 MVP 角度切换为 SQLite：
  - `modules/virallab/api/prisma/schema.prisma`
- 新增数据库模块：
  - `modules/virallab/api/src/database/database.module.ts`
- `PrismaService` 现在是真实 Prisma Client，并支持开关：
  - `VIRALLAB_ENABLE_DB_MIRROR=true`
- `ViralLabStoreService` 仍然保留 JSON 文件作为主存储，但每次写入后会把完整快照镜像到 SQLite
- 当前镜像覆盖的核心表包括：
  - `User`
  - `UserSession`
  - `PlatformAccount`
  - `CollectionJob`
  - `ContentSample`
  - `AnalysisResult`
  - `Pattern`
  - `PatternSource`
  - `GenerationJob`
  - `GeneratedContent`
  - `AuditLog`
- 新增本地初始化脚本：
  - `modules/virallab/api/package.json`
  - `npm run db:init:sqlite`
- `.gitignore` 已补充 `*.db`

### 本轮验证
- `modules/virallab/api` build 通过
- `npm run prisma:generate` 通过
- `npm run db:init:sqlite` 通过
- 使用 `VIRALLAB_ENABLE_DB_MIRROR=true` 启动 API 成功
- 通过 Prisma Client 查询已确认 SQLite 中有镜像数据：
  - `users: 1`
  - `sessions: 13`
  - `samples: 13`
  - `analyses: 7`
  - `patterns: 2`
  - `contents: 4`

### 当前限制
- 运行时主读写路径仍然是 JSON 文件，数据库当前是 mirror，不是主数据源
- `prisma db push` 在当前环境下仍有 schema engine 报错，因此本地推荐使用 `npm run db:init:sqlite`
- 真实小红书样本抓取仍然依赖有效 Cookie 才能完成最后联调

### 第十八轮增强：部分运行时读取切到 Prisma
- 开启数据库镜像时，以下读取接口现在会优先走 Prisma / SQLite：
  - `GET /api/virallab/samples`
  - `GET /api/virallab/samples/:sampleId`
  - `GET /api/virallab/analyze/results`
  - `GET /api/virallab/analyze/results/:analysisId`
  - `GET /api/virallab/patterns`
  - `GET /api/virallab/patterns/:patternId`
  - `GET /api/virallab/generate/jobs/:jobId`
  - `GET /api/virallab/generate/contents/:contentId`
- 对应服务已新增 Prisma 映射：
  - `samples.service.ts`
  - `analyze.service.ts`
  - `patterns.service.ts`
  - `generate.service.ts`
- `store.service.ts` 已补充启动同步：
  - 当镜像开启时，启动后会把现有 JSON 全量同步一次，避免数据库初始为空

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过
- `npm run db:init:sqlite` 通过
- 开启 `VIRALLAB_ENABLE_DB_MIRROR=true` 后，以下接口已正常返回：
  - `/samples`
  - `/analyze/results`
  - `/patterns`
  - `/generate/contents/content_12dcd279`
- 响应中已包含 Prisma 读出的：
  - `modelName`
  - `promptVersion`
  - `fallbackStatus`
  - `fallbackReason`

### 当前限制
- 目前只有部分读取接口切到了 Prisma
- `auth / platform accounts / collect jobs / overview / debug summary` 仍主要依赖 JSON 文件读取
- 运行时写路径仍然是 JSON 主写 + SQLite mirror

### 第十九轮增强：`auth + platform accounts` 读取切到 Prisma
- `AuthService` 现在在开启镜像时会优先用 Prisma 解析用户会话：
  - `resolveUserFromToken`
  - `me`
- `PlatformService` 现在在开启镜像时会优先用 Prisma 读取平台账号列表
- `verifyXiaohongshuCookie` 的前置账号读取也已改成 Prisma 优先，避免验证时继续强依赖文件读
- 当前策略仍然保持稳妥：
  - 登录、注册、登出、Cookie 保存和验证的写路径仍然走 JSON 主写
  - 但读路径已经优先切到 SQLite / Prisma

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过
- 开启 `VIRALLAB_ENABLE_DB_MIRROR=true` 后验证通过：
  - `GET /api/virallab/auth/me`
  - `GET /api/virallab/platform-accounts`
- `platform-accounts` 返回中已正确包含：
  - `cookieStatus`
  - `verificationMessage`
  - `verificationMetadata`

### 当前限制
- `auth` 的写路径还没有切到 Prisma
- `collect jobs / overview / debug summary` 仍主要依赖 JSON 文件读取
- 运行时写路径整体仍然是 JSON 主写 + SQLite mirror

### 第二十轮增强：`collect + overview + debug summary` 读取切到 Prisma
- 开启数据库镜像时，以下接口现在也会优先走 Prisma / SQLite：
  - `GET /api/virallab/overview`
  - `GET /api/virallab/collect/jobs`
  - `GET /api/virallab/collect/jobs/:jobId`
  - `GET /api/virallab/collect/capabilities`
  - `GET /api/virallab/collect/debug-summary`
- `CollectService` 已新增 Prisma 映射逻辑：
  - collection jobs
  - job details + related samples
  - platform account based capabilities
  - latest real collect job for debug summary
- `OverviewController` 现在在镜像开启时直接从 Prisma count 统计：
  - jobs
  - running jobs
  - samples
  - patterns
  - generated contents

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过
- 开启 `VIRALLAB_ENABLE_DB_MIRROR=true` 后验证通过：
  - `/overview`
  - `/collect/jobs`
  - `/collect/debug-summary`
  - `/collect/capabilities`
- Prisma 读出的响应已正确包含：
  - job metadata
  - cookieStatus / verificationMessage
  - debug summary account diagnostics

### 当前限制
- 运行时写路径仍然是 JSON 主写 + SQLite mirror
- `register / login / logout / save cookie / verify cookie / create collect job` 这些写操作还没切成 Prisma 主写
- 真实小红书样本抓取仍然依赖有效 Cookie 才能完成最后联调

### 第二十一轮增强：`auth + platform accounts` 开始切到 Prisma 主写
- `AuthService` 现在在开启数据库镜像时，以下写操作会优先写入 Prisma：
  - `register`
  - `login`
  - `logout`
- `PlatformService` 现在在开启数据库镜像时，以下写操作会优先写入 Prisma：
  - `saveXiaohongshuCookie`
  - `verifyXiaohongshuCookie`
- 当前仍保留 JSON 同步，以兼容尚未完全切库的模块：
  - Prisma 先写
  - 然后同步回本地 JSON
- 这意味着 ViralLab 已经从“纯 JSON 主写”进入到“部分关键路径 Prisma 主写”阶段

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过
- 开启 `VIRALLAB_ENABLE_DB_MIRROR=true` 后验证通过：
  - `POST /api/virallab/auth/register`
  - `POST /api/virallab/auth/login`
  - `POST /api/virallab/auth/logout`
  - `POST /api/virallab/platform-accounts/xiaohongshu/cookies`
- 新注册用户已同时出现在：
  - SQLite
  - `virallab-mvp.json`
- 保存 Cookie 后，平台账号状态已更新为：
  - `cookieStatus: saved`

### 当前限制
- 目前只有 `auth + platform` 两块关键写路径开始转为 Prisma 主写
- `collect job creation / collector runtime / overview stats` 等其余写路径仍然是 JSON 主写
- 真实小红书样本抓取仍然依赖有效 Cookie 才能完成最后联调

### 第二十二轮增强：`collect` 写路径开始切到 Prisma 主写
- `CollectService` 现在在开启数据库镜像时，以下写操作会优先写入 Prisma：
  - `create collect job`
  - collector job `running/completed/failed` 状态推进
  - mock/real collector 产出的 `samples` 入库
  - collect 相关 `audit logs`
  - `saved -> verified/invalid` 的自动 Cookie 验证更新
- 当前实现方式已经从：
  - JSON 主写 + SQLite mirror
  切到：
  - Prisma 主写
  - 然后同步回 JSON
- 这意味着 `collect` 已经不再只是“读数据库、写文件”，而是正式进入了数据库优先写阶段

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过
- 开启 `VIRALLAB_ENABLE_DB_MIRROR=true` 后验证通过：
  - `POST /api/virallab/auth/login`
  - `POST /api/virallab/collect/jobs`
  - `GET /api/virallab/collect/jobs/:jobId`
- 实测 `collectorMode=mock` 后：
  - SQLite 中 `CollectionJob` 数量递增
  - SQLite 中 `ContentSample` 数量递增
  - SQLite 中 `AuditLog` 数量递增
  - job 状态推进到 `completed`
  - job detail 接口已能正常读回新样本

### 当前限制
- 当前 `collect` 已进入 Prisma 主写，但 JSON 仍然会同步保留，以兼容尚未完全迁移的代码
- 真实小红书样本抓取仍然依赖有效 Cookie 才能完成最后联调
- `store.service.ts` 仍保留全量 mirror 机制，后续还需要进一步收缩，避免和 Prisma 主写路径重复承担职责

### 第二十三轮增强：`analyze + patterns + generate` 开始切到 Prisma 主写
- `AnalyzeService` 现在在开启数据库镜像时，新的 analysis 结果会优先写入 Prisma：
  - `POST /api/virallab/analyze/jobs`
- `PatternsService` 现在在开启数据库镜像时，新的 pattern 与 `PatternSource` 关系会优先写入 Prisma：
  - `POST /api/virallab/patterns/extract`
- `GenerateService` 现在在开启数据库镜像时，新的 generation job 和 generated content 会优先写入 Prisma：
  - `POST /api/virallab/generate/jobs`
- 当前策略已经进一步演进为：
  - Prisma 主写
  - 然后同步回 JSON

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过
- 开启 `VIRALLAB_ENABLE_DB_MIRROR=true` 后验证通过：
  - `POST /api/virallab/analyze/jobs`
  - `POST /api/virallab/patterns/extract`
  - `POST /api/virallab/generate/jobs`
- SQLite 中数据计数已正确增长：
  - `AnalysisResult`
  - `Pattern`
  - `PatternSource`
  - `GenerationJob`
  - `GeneratedContent`

### 当前限制
- 当前核心业务写路径已经大面积切到 Prisma，但 JSON 仍然同步保留
- `store.service.ts` 仍承担全量 mirror 职责，后续应收敛成迁移兜底层而不是主同步层
- 真实小红书样本抓取仍然依赖有效 Cookie 做最后联调

### 第二十四轮增强：收缩 `store.service.ts` 的全量 mirror 职责
- `ViralLabStoreService.write()` 和 `mutate()` 现在默认只写本地 JSON，不再在每次变更后自动整库 mirror 到 Prisma
- 全量 JSON -> Prisma 同步现在被收口到两个位置：
  - 初始化阶段
  - 显式调用 `syncFileToPrisma()`
- 这意味着当前运行时已经从：
  - 每次 `store.write` 都重建整库
  转为：
  - 业务服务各自 Prisma 主写
  - `store` 只负责 JSON 兼容同步
  - 初始化时再做一次兜底同步

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过
- API 启动通过，Prisma 日志已更新为 `Prisma persistence enabled.`
- 在新 store 模型下验证通过：
  - `POST /api/virallab/generate/jobs`
- 验证结果：
  - SQLite 中 `GenerationJob / GeneratedContent` 数量增长
  - `virallab-mvp.json` 中也能查到同一组 `jobId / contentId`

### 当前限制
- 现在虽然已经去掉“每次写 JSON 都全量 mirror”这种高成本路径，但 JSON 仍是兼容层
- 真正完全切掉 JSON 之前，还需要把剩余所有 fallback 写路径盘清楚
- 真实小红书样本抓取仍然依赖有效 Cookie 做最后联调

### 第二十五轮增强：核心创建链路的源数据查找开始直接走 Prisma
- `CollectService.onModuleInit()` 在启用持久化时，恢复 `pending/running` 任务现在直接从 Prisma 查 recoverable jobs
- `AnalyzeService.createJob()` 在启用持久化时，默认样本选择、sample 查找、existing analysis 查找都直接走 Prisma
- `PatternsService.extract()` 在启用持久化时，analysis 查找和 sample 查找都直接走 Prisma
- `GenerateService.createJob()` 在启用持久化时，默认 user 选择和 pattern 查找都直接走 Prisma
- 这意味着当前不仅“写入”已经 Prisma 主写，连创建前的主要源数据决策也已经开始从 JSON 脱离

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过
- API 启动通过
- 启用 `VIRALLAB_ENABLE_DB_MIRROR=true` 后验证通过：
  - `POST /api/virallab/analyze/jobs`
  - `POST /api/virallab/patterns/extract`
  - `POST /api/virallab/generate/jobs`
- 实测返回正常，说明这些链路在新的 Prisma source lookup 下没有被打断

### 当前限制
- 仍有部分 fallback 分支会在 Prisma 不可用时回退到 JSON，这一层还没有彻底删掉
- 某些仅用于本地兼容的 `store.read()` 调用仍然存在，但已经不再承担主要业务路径
- 真实小红书样本抓取仍然依赖有效 Cookie 做最后联调

### 第二十六轮增强：继续收口 `auth + platform` 的 JSON fallback 逻辑
- `AuthService` 现在新增了更明确的 helper：
  - Prisma user lookup
  - Prisma user record -> domain user 映射
  - user/session JSON 同步
  - session JSON 删除
- `PlatformService` 现在新增了更明确的 helper：
  - `resolveUserId()`
  - Prisma platform account -> domain account 映射
  - platform account JSON 同步
  - platform audit log JSON 追加
- 这次改动的重点不是再加功能，而是把运行时“默认 user / account 解析”和“JSON 兼容同步”从散落代码收口到少数 helper，后续继续去 JSON 会更稳

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过
- API 启动通过
- 验证通过：
  - `POST /api/virallab/auth/login`
  - `GET /api/virallab/platform-accounts`
  - `POST /api/virallab/platform-accounts/xiaohongshu/cookies`
- `save cookie` 后确认：
  - SQLite `PlatformAccount` 中数据已更新
  - `virallab-mvp.json` 中同一账号的 `cookieBlob` 也已同步更新

### 当前限制
- 现在 `auth + platform` 的兼容逻辑更集中，但 JSON fallback 仍然存在
- 彻底去掉 JSON 之前，还需要继续清理剩余 fallback 分支，并明确哪些路径只保留给“无数据库模式”
- 真实小红书样本抓取仍然依赖有效 Cookie 做最后联调

### 第二十七轮增强：修复启动阶段 JSON -> Prisma 回填偶发失效
- 我在继续收口 fallback 逻辑时发现了一个真实一致性问题：
  - JSON 里的平台账号 Cookie 已经更新
  - 但新进程启动后，SQLite 可能仍保留旧值
- 根因是：
  - 之前 `collect.onModuleInit()` 改成了 Prisma 直接读取 recoverable jobs
  - 导致 `store.ensureInitialized()` 在某些启动路径下不一定会被触发
  - 从而 JSON -> Prisma 的初始化回填没有稳定执行
- 修复方式：
  - `ViralLabStoreService` 现在实现 `OnModuleInit`
  - 模块启动时会主动执行 `ensureInitialized()`
  - `syncSnapshotToPrisma()` 里也显式确保 Prisma 已连接后再做 bootstrap/backfill sync

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过
- 重启 API 后验证通过：
  - SQLite 中 `PlatformAccount.cookieBlob`
  - `GET /api/virallab/platform-accounts`
- 当前确认：
  - 新进程启动后，SQLite 已正确回填为 JSON 中的最新 `xhs_session=refactor-check;`

### 当前限制
- 现在启动一致性已经修好，但 JSON 仍然是兼容层
- 后续继续迁移时，仍需要逐步明确哪些初始化同步要保留，哪些运行时 fallback 可以彻底移除
- 真实小红书样本抓取仍然依赖有效 Cookie 做最后联调

### 第二十八轮增强：完成首次真实小红书扫码联调并成功落样本
- 本轮完成了真实人工扫码联调：
  - 从独立 Chrome profile 接管已扫码登录的小红书会话
  - 抓取当前有效 Cookie
  - 写入 ViralLab 平台账号
  - 执行 `verify cookie`
  - 发起 `collectorMode=real` 采集任务
- 验证结果：
  - `verify cookie` 成功
  - `cookieStatus` 已更新为 `verified`
  - real collect 任务 `job_caae527d` 成功完成
  - 系统已真实落下一条小红书样本：
    - `sample_717dbde6`
  - 当前提取来源：
    - `extractedFrom: initial-state`
  - 当前真实链路已经继续推进到：
    - `POST /api/virallab/analyze/jobs` 成功分析该真实样本

### 本轮验证
- `POST /api/virallab/platform-accounts/xiaohongshu/verify`
  - 返回 `verified: true`
- `POST /api/virallab/collect/jobs`
  - `collectorMode=real`
  - job 状态推进到 `completed`
- `GET /api/virallab/collect/jobs/job_caae527d`
  - 返回真实 job metadata
  - 返回真实 sample 列表
- SQLite 验证：
  - `CollectionJob(job_caae527d)` 为 `completed`
  - `ContentSample where jobId=job_caae527d` 数量为 `1`
- `POST /api/virallab/analyze/jobs`
  - 已对 `sample_717dbde6` 生成分析结果

### 当前限制
- 这次真实联调已经打穿，但当前只稳定提取到 `1` 条样本，字段内容还比较保守
- 下一步最有价值的是继续增强 `search/notes` 的网络 payload 解析，提升真实样本数量和字段完整度
- JSON 仍然作为兼容层存在

### 第二十九轮增强：强化 `search/notes` 网络 payload 定向提取，真实样本提升到 5 条
- 我进一步分析了真实小红书搜索接口：
  - `search/notes` 的核心结构在 `data.items[].note_card`
- 基于这个真实结构，我重写了 `extractFromNetworkPayloads()` 的优先提取路径：
  - 优先定向解析 `data.items[].note_card`
  - 兼容 `note_card.user / interact_info / cover / image_list / corner_tag_info`
  - 再保留原来的泛化遍历作为兜底
- 这次改动后，真实采集已经从：
  - `extractedCount: 1`
  提升到：
  - `extractedCount: 5`
  - `extractedFrom: network`

### 本轮验证
- `modules/virallab/worker/src/run-xiaohongshu-collector.js` 语法检查通过
- `POST /api/virallab/collect/jobs`
  - `collectorMode=real`
  - 新任务：`job_ba52f894`
- 验证结果：
  - job 状态为 `completed`
  - SQLite 中 `ContentSample where jobId='job_ba52f894'` 数量为 `5`
  - 返回样本标题、作者、互动数据、cover URL 都比上一版完整

### 当前限制
- 当前已经能稳定提 5 条真实样本，但 `contentText / contentSummary / tags` 还偏保守
- 下一步最有价值的是继续吃更深层 note payload，把正文摘要、话题标签、发布时间等字段补完整
- JSON 仍然作为兼容层存在

### 第三十轮增强：新增一键真实工作流接口，并自动继承 RiskRadar 的 Ark 环境
- 我新增了真实链路工作流接口：
  - `POST /api/virallab/workflow/latest-real-pipeline`
- 这个接口会直接基于最近一次 `completed` 的 real collect 任务，串起：
  - `Analyze -> Pattern -> Generate`
- 同时我把 `ViralLab` 的环境加载补成了多文件模式：
  - 优先读 `modules/virallab/api/.env`
  - 缺失时自动继承 `modules/RiskRadar/server/.env`
- 这样 `ViralLab` 在不额外复制密钥的情况下，也能直接复用已有的豆包 / Ark 配置

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过
- `POST /api/virallab/workflow/latest-real-pipeline`
  - 已基于真实任务 `job_ba52f894` 成功返回完整工作流结果
  - 返回 5 条真实样本
  - 新 Pattern：
    - `pattern_f34ae4a8`
    - `modelName=ep-m-20250913124021-hnxt6`
    - `promptVersion=patterns.v2.llm`
    - `fallbackStatus=llm`
  - 新 Generated Content：
    - `content_f68ff7c2`
    - `modelName=ep-m-20250913124021-hnxt6`
    - `promptVersion=generate.v2.llm`
    - `fallbackStatus=llm`
- 额外验证：
  - 直接请求 Ark `/chat/completions` 返回成功
  - 说明 `RiskRadar` 的现有 LLM 配置已可被 `ViralLab` 继承复用

### 当前限制
- `Analyze` 阶段对已存在 analysis 结果会直接复用，因此旧的真实样本仍可能保留历史的 local/fallback 结果
- 下一步最有价值的是：
  - 对真实样本补“重新分析”能力，便于把旧 fallback analysis 升级成 LLM analysis
  - 继续补全真实样本字段完整度

### 第三十一轮增强：新增强制重新分析能力，历史真实样本可升级为 LLM analysis
- 我把 `Analyze` 正式扩成可强制重跑：
  - `POST /api/virallab/analyze/jobs`
  - 新增 `forceReanalyze`
- 行为变成：
  - 默认仍可复用已有 analysis
  - `forceReanalyze=true` 时，会先移除该 sample 旧 analysis，再重新跑分析
- 同时我把真实工作流接口也接上了这个参数：
  - `POST /api/virallab/workflow/latest-real-pipeline`
  - 默认会对真实样本做强制重跑分析
- 前端 `Analyze Latest Samples` 也已改成默认带 `forceReanalyze=true`

### 本轮修复
- `Analyze` LLM 超时已从默认短超时补长到 `45000ms`
- `Pattern Engine` LLM 超时也补长到 `45000ms`
- 修复 JSON -> Prisma 启动回填中的一个一致性问题：
  - 如果旧 Pattern 还引用已被替换掉的 analysis，`PatternSource` 外键会失败
  - 现在 bootstrap sync 会先过滤无效 `analysisId/sampleId`，避免启动崩溃

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过
- 强制重跑真实样本分析：
  - `POST /api/virallab/analyze/jobs`
  - `sample_1b4f50b7 / sample_c9a0bdd1 / sample_02cf9204 / sample_4e13dbb6 / sample_92cd02f1`
  - `forceReanalyze=true`
  - 结果已全部变成：
    - `modelName=ep-m-20250913124021-hnxt6`
    - `promptVersion=analyze.v2.llm`
    - `fallbackStatus=llm`
- Pattern 单独验证：
  - 最新成功 LLM Pattern：
    - `pattern_8b7096e1`
    - `promptVersion=patterns.v2.llm`
    - `fallbackStatus=llm`
- SQLite 验证：
  - 这批真实 sample 的最新 `AnalysisResult` 已是 LLM 版本

### 当前限制
- 整条 `latest-real-pipeline` 在 `forceReanalyze=true` 时会串行跑 5 次分析，再接 Pattern/Generate，耗时会比较长
- 当前更适合把这条能力理解成“演示用真实长链路”，而不是低延迟接口

### 第三十二轮增强：真实工作流改为异步任务接口，前端不再阻塞长请求
- 我给 `workflow` 模块新增了一套异步 job 接口：
  - `GET /api/virallab/workflow/jobs`
  - `GET /api/virallab/workflow/jobs/:workflowJobId`
  - `POST /api/virallab/workflow/jobs`
- 这套 job 当前先走 JSON 兼容层持久化，不扩 Prisma schema，目标是先把“长链路不阻塞请求”做实
- 新增 `workflowJobs` 到本地数据模型，模块启动时会自动恢复 `pending/running` 的 workflow job
- 前端已经改成：
  - 点击 `Run Latest Real Pipeline` 时不再直接等待同步接口
  - 而是先创建 workflow job
  - 再通过 `workflow/jobs` 自动轮询最新任务状态
  - 完成后自动请求 job detail 回填 `Latest Real Workflow`

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过
- `POST /api/virallab/workflow/jobs`
  - 成功返回：
    - `workflow_8d1c774c`
    - `status=pending`
- `GET /api/virallab/workflow/jobs`
  - 已能返回最新 workflow job 列表
- `GET /api/virallab/workflow/jobs/workflow_8d1c774c`
  - 已能返回：
    - `status=running`
    - `progress=10`
    - `targetJobId=job_ba52f894`
    - 以及当前阶段 message

### 当前限制
- 这套异步 workflow job 目前只走 JSON 兼容层，不走 Prisma
- 目前 `running` 状态下的进度颗粒度还比较粗，仍主要是 `pending -> running -> completed/failed`
- 下一步最有价值的是补更细的阶段进度，比如：
  - analyze started/completed
  - pattern started/completed
  - generate started/completed

### 第三十三轮增强：异步 workflow job 现已支持阶段级进度
- 我把 async workflow job 的阶段进度补进去了，不再只显示一个笼统的 `running`
- 当前 workflow metadata 会写出：
  - `stage`
  - `message`
  - `sampleIds`
  - `analysisIds`
  - `patternId`
  - `contentId`
- 已覆盖的阶段包括：
  - `queued`
  - `preparing`
  - `analyzing`
  - `analysis_completed`
  - `extracting_pattern`
  - `pattern_completed`
  - `generating`
  - `completed`
  - `failed`
- 前端 `Workflow Jobs` 卡片也已经接上 `stage` 展示，不再只看百分比

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过
- 新建 workflow job：
  - `workflow_054929d9`
- 详情接口验证：
  - `GET /api/virallab/workflow/jobs/workflow_054929d9`
  - 返回：
    - `status=running`
    - `progress=35`
    - `stage=analyzing`
    - `message=Analyzing 1 samples.`

### 当前限制
- 阶段进度已经有了，但还没有拆得特别细，比如“第几条 sample 正在分析”
- 下一步如果继续做，可以把 analyze 子阶段再拆成：
  - sample 1/5
  - sample 2/5
  - ...

### 第三十四轮增强：analyze 阶段已细分到单 sample 级别
- 我把 `AnalyzeService.createJob()` 扩成支持 sample 级进度回调
- workflow 现在会把 analyze 阶段的 message 更新成：
  - `Analyzing 1/3 · {title}`
  - `Analyzed 1/3 · {title}`
- 同时 analyze 阶段的 progress 也会随着 sample 数推进，而不再固定卡在单一百分比

### 本轮验证
- `modules/virallab/api` build 通过
- 新 workflow job：
  - `workflow_a0bde031`
- 详情接口验证：
  - `GET /api/virallab/workflow/jobs/workflow_a0bde031`
  - 运行中返回：
    - `status=running`
    - `progress=35`
    - `stage=analyzing`
    - `message=Analyzing 1/3 · 硅谷的AI高管们是这么规划孩子未来的~`

### 当前限制
- 目前 sample 级细分只覆盖 `analyzing`
- 下一步如果继续做，可以把 `pattern` 和 `generate` 也拆成更细的子状态

### 第三十五轮增强：补充 generation 完成子状态，并在前端显示产物 id
- 我继续把 workflow 子状态往后半段做细：
  - 新增 `generation_completed`
- 现在在 `generate` 完成后，workflow metadata 会先写入：
  - `patternId`
  - `contentId`
  - `stage=generation_completed`
- 前端 `Workflow Jobs` 卡片也已经补上：
  - `patternId`
  - `contentId`
  这样在轮询阶段，不用等完整结果卡片，也能知道产物已经出来了

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 当前限制
- 现在 workflow 的关键阶段已经基本够用了，但还没有把 `pattern` 阶段再拆到更细的内部步骤

### 第三十六轮增强：继续细分 pattern 阶段
- 我把 `pattern` 阶段再拆成两个更明确的内部状态：
  - `pattern_inputs_ready`
  - `pattern_persisted`
- 现在 workflow 在 `analysis_completed` 之后，会先提示：
  - 已准备好多少条分析结果用于抽 Pattern
- 然后在 Pattern 生成完成后，会再提示：
  - Pattern 已就绪，可以进入生成阶段

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 当前限制
- 目前 workflow 的状态机已经比较完整了，下一步更有价值的方向已经不再是继续拆状态，而是回到真实 sample 字段完整度

### 第三十七轮增强：提升真实小红书样本的发布时间、摘要和标签质量
- 我继续把真实采集器的 network payload 解析往“可直接喂分析链路”的方向推进：
  - 对日期型 corner tag 做了过滤，不再把 `03-04` 这类值写进 `tags`
  - 为 `publishTime` 增加了多字段候选解析，并支持从日期型 tag 回推时间
  - 为无正文场景补了更有信息量的 fallback summary，当前会拼接：
    - 作者
    - 发布时间
    - 点赞 / 评论 / 收藏 / 分享
    - 可用标签
  - 新增标题关键词提取，用于补足搜索接口没有 hashtags 时的标签质量
- 本轮 real collect 联调结果：
  - 新任务：`job_858c24d0`
  - 仍然稳定从 `search/notes` network payload 落下 `5` 条真实样本
  - 新样本的 `publishTime` 已不再是统一当前时间，而是按卡片日期落库
  - `contentSummary` 已从“AI教育 搜索结果摘要”升级为带作者、日期和互动数据的可读摘要
  - 部分样本已能从标题提取出更有意义的 tags：
    - `["视频日记Day23","教育是对下一代的人格影响"]`
    - `["李飞飞","AI太快"]`
    - `["4岁学AI"]`

### 本轮验证
- `node --check modules/virallab/worker/src/run-xiaohongshu-collector.js` 通过
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过
- `collectorMode=real` 新任务 `job_858c24d0` 完成，`extractedCount=5`
- SQLite 样本检查通过，确认：
  - 日期型 tag 已清掉
  - `publishTime` 已落真实日期
  - `contentSummary` 和 `tagsJson` 质量已提升

### 当前限制
- 当前搜索接口这批 `note_card` 仍然大多不直接返回正文，因此摘要仍属于结构化 fallback，不是真实正文摘录
- 标题关键词提取已经比纯 keyword 好，但还没有引入更重的中文关键词算法

### 第三十八轮增强：加入安全版 note detail 补全层，并验证不污染搜索样本
- 我尝试在真实采集器里加了一层 `sourceUrl -> note detail page` 的二次抓取，希望从详情页补正文：
  - 新增 `enrichSamplesFromNotePages(context, samples, keyword)`
  - 会逐条打开已命中的笔记详情页，尝试从页面状态和 DOM 提取：
    - 正文
    - 标签
    - 发布时间
- 联调过程中确认了一个真实风险：
  - 小红书详情页里会混入推荐内容，宽松扫描 state 很容易把“同页推荐笔记”误识别成当前笔记
  - 这会导致标题、作者、发布时间串台
- 所以我把这层补全收紧成“安全模式”：
  - 只允许按 `sourceUrl` 里的 noteId 做匹配
  - 不再用 detail 页覆盖 `title / authorName / publishTime / metrics`
  - 只有当 detail 页标题和原样本标题明显一致、并且拿到了足够长的 detail content 时，才允许把正文补回来
  - 本轮验证结果显示，小红书当前详情页提取还不够可靠，因此系统会自动回退，不污染原搜索样本

### 本轮验证
- 第一次实验任务：`job_ba886aa5`
  - 发现 detail 页宽松提取会污染部分样本，已据此收紧策略
- 安全模式验证任务：`job_8f2e8757`
  - `extractedCount=5`
  - `detailEnrichedCount=0`
  - 5 条样本的标题、作者、发布时间均保持与搜索页一致，没有再出现串台
- 结论：
  - detail enrichment scaffolding 已接好
  - 但当前详情页补正文路径暂时只能“安全回退”，还不能稳定拿到可写入的正文

### 当前限制
- 详情页并不是完全不可访问，但当前页面状态里混入推荐内容，直接递归抓 state 风险很高
- 下一步如果继续做正文补全，应该优先寻找更明确的 note detail API 或更稳的详情页节点，而不是继续扩大 DOM/state 猜测范围

### 第三十九轮增强：把 note detail API 探测正式接入 real collector metadata
- 我没有继续手工实验，而是把 detail API 探测做进了 worker：
  - 新增 `probeDetailApiCandidates(cookieBlob, samples)`
  - 每次 real collect 会自动对前 2 条样本尝试探测 note detail API
  - 当前先探测的候选接口是：
    - `https://edith.xiaohongshu.com/api/sns/h5/v1/note_info?note_id=...`
- 这样每次真实采集任务都会在 metadata 里带出：
  - `detailApiProbe.attempted`
  - `detailApiProbe.targetCount`
  - `detailApiProbe.results[].status`
  - `detailApiProbe.results[].bodySnippet`
- 本轮 real collect 验证任务：
  - `job_46050621`
  - 仍然稳定落下 `5` 条真实样本
  - `detailEnrichedCount=0`
  - 但新增 probe 已成功给出明确结论：
    - 对真实 noteId 调用 `h5/v1/note_info`
    - 当前在现有 PC cookie / header 组合下稳定返回：
      - `HTTP 406`
      - body `{\"code\":-1,\"success\":false}`

### 本轮验证
- `node --check modules/virallab/worker/src/run-xiaohongshu-collector.js` 通过
- `collectorMode=real` 任务 `job_46050621` 完成
- metadata 中已确认出现：
  - `detailApiProbe.attempted=true`
  - `detailApiProbe.targetCount=2`
  - `h5-note-info -> 406`

### 当前限制
- 现在已经确认了“有候选 detail API”，但当前 header/sign 组合还不满足它的要求
- 下一步如果继续推进正文补全，重点应该转到：
  - 识别 `note_info` 所需的额外 header / 签名 / referer 约束
  - 或寻找别的 note detail 接口，而不是继续猜详情页 DOM

### 第四十轮增强：把浏览器自动签名的 note detail 请求一起探测并固化进 metadata
- 我继续增强了 worker 里的 `detailApiProbe`，不再只做“裸 request + Cookie”的 API 探测：
  - 新增 `summarizeJsonishBody(...)`
  - `probeDetailApiCandidates(...)` 现在会同时跑两条路径：
    - `h5-note-info`：沿用当前 `playwrightRequest` 直接请求 detail API
    - `browser-note-info`：直接在真实浏览器上下文里打开 sample `sourceUrl`，捕获页面自动发出的 `note_info` 请求和响应
- 这样每条 probe 结果现在除了状态码和 body snippet 之外，还会带：
  - `parsed.code / parsed.success / parsed.msg / parsed.dataKeys`
  - 对浏览器签名请求，还会带：
    - `requestHeaders.referer`
    - `requestHeaders.x-s`
    - `requestHeaders.x-t`
    - `requestHeaders.x-s-common`
    - `requestHeaders.x-xray-traceid`
    - `requestHeaders.x-b3-traceid`
  - 以及页面级上下文：
    - 当前跳转后的 `locationHref`
    - `title`
    - `_webmsxyw` 是否存在
    - 可能相关的全局 sign keys

### 本轮验证
- `node --check modules/virallab/worker/src/run-xiaohongshu-collector.js` 通过
- 直接用当前真实 Cookie 执行 worker 真实采集验证通过：
  - `status=completed`
  - `extractedCount=5`
  - `detailEnrichedCount=0`
- 新一轮 probe 结论已经更具体：
  - 裸请求 `h5-note-info` 依然稳定返回：
    - `HTTP 406`
    - `{"code":-1,"success":false}`
  - 但浏览器自动签名请求 `browser-note-info` 已经能稳定返回：
    - `HTTP 200`
    - `{"code":0,"success":true,"msg":"成功","data":{"note_type":"video"}}`
  - 也就是说：
    - `note_info` 的确依赖页面生成的签名头
    - 但即使签名通过，当前响应体也还只有极少字段，尚不足以直接补正文
  - 同时页面导航后的全局状态显示：
    - 最终会跳到小红书 `404/不可浏览` 页面
    - 因此“详情页正文补全”当前不只是签名问题，还叠加了笔记可见性限制

### 当前限制
- 现在已经不是“完全打不通 note_info”，而是进入了下一层问题：
  - 需要确认是否存在第二条更完整的 note detail API
  - 或研究浏览器签名头能否被安全重放到别的 detail 接口
- 目前 `browser-note-info` 虽然返回成功，但 `dataKeys` 只见到 `note_type`，仍不足以补回正文、作者详情和完整发布时间

### 第四十一轮增强：把“签名头重放”和“详情页 API 发现”也纳入 detailApiProbe
- 我继续扩展了 worker 的 `detailApiProbe`，这次重点不是多猜接口，而是把“浏览器页内请求”和“离线重放请求”的差异系统化记录下来：
  - 新增 `filterSignedHeaders(...)`
  - `browser-note-info` 现在会额外记录：
    - `discoveredResponses`
    - `signedReplay`
- 当前行为变成：
  - 浏览器打开真实 `sourceUrl`
  - 捕获页面里实际发出的 `note_info` 请求与响应
  - 同时收集该次导航过程中命中的其他 `edith` 接口响应摘要
  - 再把刚抓到的签名头原样重放到 request-context 里，验证是否能复现浏览器结果

### 本轮验证
- `node --check modules/virallab/worker/src/run-xiaohongshu-collector.js` 通过
- 直接用当前真实 Cookie 重新跑 worker 真实采集，结果：
  - `status=completed`
  - `extractedCount=5`
  - `detailEnrichedCount=0`
- probe 现在已经把关键差异暴露得更清楚：
  - direct `h5-note-info`
    - `HTTP 406`
    - `{"code":-1,"success":false}`
  - `browser-note-info`
    - 当前这一轮稳定回到 `HTTP 461`
    - 但 body 是 `{"code":0,"success":true,"msg":"成功","data":{}}`
  - `signed-replay-note-info`
    - 把浏览器抓到的 `x-s / x-t / x-s-common / x-xray-traceid / x-b3-traceid` 原样重放
    - 结果同样是 `HTTP 461`
    - body 仍是 `{"code":0,"success":true,"msg":"成功","data":{}}`
- 同一轮 `discoveredResponses` 里目前能稳定看到的相关接口主要还是：
  - `api/sns/h5/v1/note_info`
  - `api/sns/web/v2/user/me`
  - `api/sns/web/v1/homefeed`
  - `api/sns/web/v1/search/querytrending`
- 没有观察到第二条明显、字段更完整的 note detail API 自动出现

### 当前限制
- 现在可以明确排除一个错误假设：
  - 不是“只要拿到 `x-s / x-t` 就能在离线请求里复现浏览器 detail 数据”
- 当前更接近的结论是：
  - `note_info` 受页面上下文或额外风控条件影响
  - 即使签名头重放成功通过鉴权，也仍可能只拿到空 `data`
- 下一步如果继续推进正文补全，应优先做两类工作：
  - 继续寻找第二条返回字段更完整的 detail API
  - 或尝试在浏览器页内直接发起补充请求，而不是把签名搬到 request-context

### 第四十二轮增强：把“搜索页导航链路”也接进 detailApiProbe
- 我这轮没有继续做一次性实验，而是把“从搜索结果页进入 note”的观察链路正式接进 worker：
  - 新增 `createTrackedResponseCollector(noteId)`
  - 新增 `probeSearchNavigation(context, keyword, target)`
  - `probeDetailApiCandidates(...)` 现在除了：
    - `h5-note-info`
    - `browser-note-info`
  - 还会自动补一条：
    - `search-page-note-route`
- 这条 probe 会：
  - 打开真实搜索页 `search_result`
  - 找到目标 noteId 对应的链接
  - 在同页导航到该笔记
  - 把这条链路中命中的相关 `edith` 接口全部摘要写入 metadata

### 本轮验证
- `node --check modules/virallab/worker/src/run-xiaohongshu-collector.js` 通过
- 再次用当前真实 Cookie 跑 worker 真实采集通过：
  - `status=completed`
  - `extractedCount=5`
- probe 结果已经包含：
  - `h5-note-info`
  - `browser-note-info`
  - `search-page-note-route`
- `search-page-note-route` 最新验证显示：
  - 能成功在搜索页找到目标链接
  - 最终仍回到 `https://www.xiaohongshu.com/explore`
  - 命中的新增接口主要是：
    - `api/sns/web/v1/search/onebox`
    - `api/sns/web/v1/search/filter`
    - `api/sns/web/v1/search/recommend`
    - `api/sns/web/v1/search/notes`
    - `api/sns/web/v1/board/user`
  - 目标 `note_info` 仍是：
    - `HTTP 461`
    - `code=0`
    - `data={}`

### 当前限制
- 搜索页导航链路确实补充出了更多搜索相关接口，但这些接口仍然不提供目标 note 的完整正文详情
- 这意味着当前“真实正文补全”的突破口依然没有变：
  - 要么继续找更深的 note detail API
  - 要么在浏览器页内主动发起后续请求，而不是只观察页面自动请求

### 第四十三轮增强：把“页内主动签名请求”正式接进 browser probe
- 我这轮把浏览器页内主动请求也固化进 `browser-note-info`：
  - probe 现在会在真实页面上下文里直接调用 `window._webmsxyw(url, "GET")`
  - 记录它生成的：
    - `x-s`
    - `x-t`
  - 然后分别用这组头发起：
    - `fetch`
    - `XMLHttpRequest`
- 结果会写入 `browser-note-info.pageSignedFetch`

### 本轮验证
- `node --check modules/virallab/worker/src/run-xiaohongshu-collector.js` 通过
- 重新执行真实 worker 采集，确认 `pageSignedFetch` 已稳定出现在 metadata
- 当前验证结果非常明确：
  - `window._webmsxyw` 确实存在，而且能生成：
    - `x-s`
    - `x-t`
  - 但即便在浏览器页内使用这组签名头主动发起：
    - `fetch`
    - `XHR`
  - `note_info` 仍然返回：
    - `HTTP 406`
    - `{"code":-1,"success":false}`

### 当前限制
- 现在可以进一步排除另一条错误假设：
  - 不是“只要在页内拿到 `_webmsxyw` 生成的 `x-s/x-t`，再自己主动请求，就能拿到 detail 数据”
- 当前最接近的事实是：
  - 页面自动发出的 `note_info` 请求
  - 页内主动 `fetch/XHR`
  - request-context 的签名重放
  - 这三者行为并不等价
- 下一步如果继续推进，重点应该转向：
  - 页面自动请求还额外依赖了什么上下文
  - 或是否存在页面脚本内部的请求封装器/axios interceptor，而不是只靠 `_webmsxyw`

### 第四十四轮增强：验证并固化 `xsec*` 头在页内主动请求中的表现
- 我先检查了页内环境，确认当前页面没有暴露明显的 axios / interceptor / client 封装器：
  - `window.axios` 不存在
  - `fetch` / `XMLHttpRequest` 仍是原生实现
  - 页面中可见的请求相关全局主要是：
    - `_webmsxyw`
    - `xsecappid`
    - `xsecappvers`
    - `xsecplatform`
- 然后我把这层能力正式接进了 `browser-note-info.pageSignedFetch`：
  - 新增：
    - `xsecHeaders`
    - `fetchWithXsecResult`
    - `xhrWithXsecResult`

### 本轮验证
- `node --check modules/virallab/worker/src/run-xiaohongshu-collector.js` 通过
- 页内环境验证结果：
  - `xsecappid = xhs-pc-web`
  - `xsecappvers = 6.1.3`
  - `xsecplatform = Mac OS`
- 重新执行真实 worker 采集后，`pageSignedFetch` 已稳定带出：
  - `generatedHeaders`
  - `xsecHeaders`
  - `fetchWithXsecResult`
  - `xhrWithXsecResult`
- 最新结果很明确：
  - 即使把：
    - `_webmsxyw` 生成的 `x-s / x-t`
    - 再加上 `xsecappid / xsecappvers / xsecplatform`
  - 一起用于页内主动 `fetch/XHR`
  - `note_info` 仍然返回：
    - `HTTP 406`
    - `{"code":-1,"success":false}`

### 当前限制
- 现在又可以排除一个常见猜测：
  - 不是“自动请求只比我们多了 `xsec*` 头”
- 当前最值得继续追的方向仍然是：
  - 页面自动请求还额外依赖了什么运行时上下文
  - 或者它实际走的是更深的内部调用链，而不只是 `_webmsxyw + fetch/XHR`

### 第四十五轮增强：把“自动请求是否绕过 JS fetch/XHR”固化成正式探针
- 我这轮没有继续猜 header，而是直接给新页面预埋了 `fetch/XHR` hook：
  - 在 `browser-note-info` 的专用页面里，通过 `addInitScript` monkey patch：
    - `window.fetch`
    - `XMLHttpRequest.open / setRequestHeader / send`
  - 专门记录命中 `note_info` 时的：
    - `type`
    - `url`
    - `headers`
    - `stack`
- 为了把“自动请求”和“我们自己注入的主动请求”区分开，我新增了：
  - `preSignedJsRequestHooks`
  - `automaticRequestBypassedJsHooks`

### 本轮验证
- `node --check modules/virallab/worker/src/run-xiaohongshu-collector.js` 通过
- 重新执行真实 worker 采集后，`browser-note-info` 现在会稳定带出：
  - `preSignedJsRequestHooks`
  - `automaticRequestBypassedJsHooks`
  - `jsRequestHooks`
- 最新验证结果已经很有指向性：
  - 网络层仍然能看到自动 `note_info`
  - `responseStatus = 461`
  - 但在我们主动发起 `pageSignedFetch` 之前：
    - `preSignedJsRequestHooks = []`
    - `automaticRequestBypassedJsHooks = true`
- 这说明当前页面自动发出的 `note_info` 请求，至少没有走我们能在 JS 层钩到的常规 `fetch/XHR` 路径

### 当前限制
- 到这里，问题边界又缩小了一层：
  - 自动 `note_info` 请求不像是简单的页面业务代码直接调了一次 `fetch/XHR`
- 下一步如果继续推进，优先级最高的方向变成：
  - 继续追浏览器/运行时层面的请求来源
  - 或继续寻找另一个更完整、且更容易主动复现的 detail API

### 第四十六轮增强：把 CDP initiator 栈正式接进 browser probe
- 我这轮引入了 Chromium CDP 的 `Network.requestWillBeSent`，不再只依赖页面级 hook：
  - `browser-note-info` 现在会新增：
    - `cdpInitiators`
    - `automaticRequestStackSummary`
- 这两项会直接记录 `note_info` 请求在浏览器网络层看到的 `initiator` 信息，尤其是：
  - `initiator.type`
  - `stack.callFrames`

### 本轮验证
- `node --check modules/virallab/worker/src/run-xiaohongshu-collector.js` 通过
- 重新执行真实 worker 采集后，`browser-note-info.cdpInitiators` 与 `automaticRequestStackSummary` 已稳定出现
- 最新验证把自动 `note_info` 的来源定得更清楚了：
  - 自动请求不是 parser/preload，而是：
    - `initiator.type = script`
    - `type = XHR`
  - 栈里已经能明确看到：
    - `dispatchXhrRequest`
    - `xhrAdapter`
    - `dispatchRequest`
    - `xhrByBridgeAdapter`
    - `library-axios.4d38c57d.js`
    - `vendor-dynamic.1f7e7d2e.js`
- 也就是说：
  - 小红书页面内部确实存在 axios + bridge adapter 这条请求链
  - 它不是暴露在 `window` 上的普通 axios 对象，但它确实是脚本层发出的请求

### 当前限制
- 这轮同时也修正了上一轮结论的边界：
  - `automaticRequestBypassedJsHooks = true` 仍然成立
  - 但它的含义应该理解为：
    - 自动请求没有走我们在页面里能直接钩到的那层 `fetch/XHR`
    - 并不等于“它不是脚本发出的请求”
- 下一步最值得继续做的是：
  - 追 `vendor-dynamic -> xhrByBridgeAdapter -> axios` 这条链还能不能暴露更完整的 detail 接口
  - 或继续从同一套 axios bridge 请求里找别的 note detail endpoint

### 第四十七轮增强：把在线方案里的关键 cookie 输入检查接进 detailApiProbe
- 按你的要求，我这轮先去查了 GitHub 上已有的小红书签名方案，再决定代码怎么改。
- 公开方案里一个比较直接的参考是：
  - `Cloxl/xhshow`
  - 它把：
    - `a1`
    - `web_session`
    - `webId`
    - `x-s-common`
  - 明确当作核心签名输入来处理
- 基于这个线索，我没有直接引入外部库，而是先把“关键 cookie 是否齐备”做成了 worker 自带检查：
  - 新增 `collectCookieSignatureInputs(cookieBlob)`
  - `detailApiProbe` 现在会输出：
    - `cookieSignatureInputs.requiredKeys`
    - `cookieSignatureInputs.optionalKeys`
    - `cookieSignatureInputs.present`
    - `cookieSignatureInputs.valuesPreview`
    - `cookieSignatureInputs.allRequiredPresent`

### 本轮验证
- `node --check modules/virallab/worker/src/run-xiaohongshu-collector.js` 通过
- 重新执行真实 worker 采集后，`detailApiProbe.cookieSignatureInputs` 已稳定写出
- 当前真实登录态下，在线方案里最关键的这组 cookie 已全部存在：
  - `a1 = present`
  - `web_session = present`
  - `webId = present`
  - 同时还存在：
    - `gid`
    - `abRequestId`
    - `acw_tc`
  - `allRequiredPresent = true`

### 当前限制
- 这轮最大的价值在于排除一个低层猜测：
  - 不是“因为当前登录态缺少基础签名 cookie，所以 detail 请求失败”
- 当前更合理的判断是：
  - 关键 cookie 输入是齐的
  - 问题仍然在：
    - 小红书内部 axios bridge 调用链
    - `note_info` 本身的额外上下文约束
    - 或仍有未发现的 detail endpoint

### 第四十八轮增强：页内重放自动请求的完整签名头
- 继续按在线方案的思路往下落，这次不再只重放 `x-s / x-t`，而是把自动请求里抓到的完整签名头在页内直接重放：
  - `x-s`
  - `x-t`
  - `x-s-common`
  - `x-xray-traceid`
  - `x-b3-traceid`
  - 以及可能存在的 `xsec*`
- 代码上新增到 `browser-note-info.pageSignedFetch`：
  - `fetchWithCapturedHeadersResult`
  - `xhrWithCapturedHeadersResult`

### 本轮验证
- `node --check modules/virallab/worker/src/run-xiaohongshu-collector.js` 通过
- 重新执行真实 worker 采集后，新增字段已稳定写出
- 最新结果非常关键：
  - 之前仅用：
    - `_webmsxyw -> x-s/x-t`
    - 或 `x-s/x-t + xsec*`
  - 主动请求都只能得到：
    - `406`
    - `code=-1`
  - 现在使用“自动请求里抓到的完整签名头”后，页内主动：
    - `fetch`
    - `XHR`
  - 已经都能稳定复现为：
    - `HTTP 461`
    - `{"code":0,"success":true,"msg":"成功","data":{}}`

### 当前限制
- 这轮证明了一件重要的事：
  - `x-s-common` 这类完整签名头确实是关键，公开方案这条线是有效的
- 但它也同时说明：
  - 即使能把主动请求从 `406` 拉到 `461`
  - 当前仍然拿不到完整 detail payload，返回依旧是空 `data`
- 现在更精确的状态是：
  - 基础 cookie 齐
  - 完整签名头可重放
  - 但 `note_info` 仍然受更高一层的可见性或业务约束

### 第四十九轮增强：把 `web/v1/feed` 这类 note detail 候选也纳入正式探测
- 我这轮没有继续拍脑袋猜 header，而是把更像“note 聚合详情口”的候选接口接进了 `detailApiProbe`：
  - `web-feed-note-id`
    - `GET /api/sns/web/v1/feed?note_id=...`
  - `web-feed-source-note-id`
    - `GET /api/sns/web/v1/feed?source_note_id=...`
  - `web-feed-note-id-method-post`
    - `POST /api/sns/web/v1/feed` with `{ note_id }`

### 本轮验证
- `node --check modules/virallab/worker/src/run-xiaohongshu-collector.js` 通过
- 重新执行真实 worker 采集后，新增 probe 已稳定写出
- 当前验证结果：
  - `web-feed-note-id`
    - `404`
    - `404 page not found`
  - `web-feed-source-note-id`
    - `404`
    - `404 page not found`
  - `web-feed-note-id-method-post`
    - `406`
    - `{"code":-1,"success":false}`

### 当前限制
- 这轮的价值是快速排除了又一批常见猜测：
  - `web/v1/feed` 这条显式 `note_id` 入口目前看并不是正确的 note detail 聚合口
- 所以下一步仍应聚焦：
  - 小红书内部 `vendor-dynamic -> xhrByBridgeAdapter -> axios` 链里实际打到的接口
  - 或其他更明确的 detail endpoint，而不是泛泛去试 `feed` 类 URL

### 第五十轮增强：打通搜索页弹层正文补全，真实样本已拿到笔记正文
- 我这轮没有再继续盲猜 detail API，而是先参考了公开实现：
  - GitHub 上的 `iFurySt/RedNote-MCP` 直接从搜索页点开 note 弹层，再从 `#detail-title`、`.note-text` 等 DOM 节点抽正文
- 基于这个思路，我把一条新的受控 enrichment 路径接进了 real collector：
  - 新增 `enrichSamplesFromSearchModal(page, samples, keyword)`
  - 先在搜索页里按 noteId 锁定 `section.note-item`
  - 再点击该 section 里的 `a.cover.mask.ld` 或 `a.title`
  - 打开弹层后，从 `#detail-title`、`#detail-desc .note-text`、作者区和互动区抽取正文、作者、标签和互动数据
  - 仍保留标题一致性和最小正文长度校验，避免把错误弹层内容污染已有样本

### 本轮验证
- 先用独立侦察脚本确认了当前搜索页 DOM 结构：
  - 隐藏的 `/explore/{noteId}` 链接只用于标识 noteId
  - 真正可点击的是同一个 `section.note-item` 里的 `a.cover.mask.ld`
  - 点击后会走 `/search_result/{noteId}?xsec_token=...` 这条搜索页弹层路由
- `node --check modules/virallab/worker/src/run-xiaohongshu-collector.js` 通过
- 用当前真实登录态重新执行 real worker collect 后，结果变为：
  - `status=completed`
  - `extractedCount=5`
  - `modalEnrichment.modalOpenCount=5`
  - `modalEnrichment.detailEnrichedCount=5`
  - 总体 `detailEnrichedCount=5`
- 第一条样本的 `contentText` 已经从搜索摘要升级成真实笔记正文，例如：
  - `从聊天工具变身为能干活的主体，想让孩子不被未来淘汰？带娃下场用AI，死磕这三件事。#AI #趋势 #认知 #教育规划 #哈佛亮爸`

### 当前限制
- 搜索页弹层正文补全已经打通，但这条路径仍然依赖当前搜索结果页面结构：
  - 如果 `section.note-item / a.cover.mask.ld` 结构后面变化，需要继续跟着页面 DOM 调整
- 不过这轮非常关键，因为它把当前最卡的“真实正文补不回来”问题，先用页面弹层路径实打实解掉了

### 第五十一轮增强：把真实样本的媒体资源正式纳入数据模型
- 我这轮继续参考公开实现里的 `.media-container img / video` 抽取思路，把媒体资源从“worker 临时可见”变成了正式样本字段
- 已完成的改动：
  - `ContentSample` 新增：
    - `mediaImageUrlsJson`
    - `mediaVideoUrlsJson`
  - API 类型、新旧 JSON 兼容和 Prisma 同步路径都已补齐：
    - `collector.types.ts`
    - `store/types.ts`
    - `store.service.ts`
    - `collect.service.ts`
    - `samples.service.ts`
    - `mock.collector.ts`
  - real worker 里的搜索页弹层 enrichment 和 detail-page fallback 现在都会采集：
    - `.media-container img`
    - `.media-container video`
    - 并把 video `poster` 合并到图片数组
- 同时修了一个实际问题：
  - 真实弹层里 video 的 `src` 常常是浏览器内部 `blob:` URL
  - 这种值不能复用，所以现在会直接过滤掉
  - 只保留真实可复用的媒体地址

### 本轮验证
- `npm run prisma:generate` 通过
- `modules/virallab/api` build 通过
- `node --check modules/virallab/worker/src/run-xiaohongshu-collector.js` 通过
- 用当前真实登录态再次执行 real worker collect 后：
  - 仍然 `status=completed`
  - 第一条样本已返回：
    - `mediaImageUrls` 为真实 CDN 图片地址
    - `mediaVideoUrls` 不再出现无用的 `blob:` URL
    - `coverImageUrl` 与第一张图片保持一致

### 当前限制
- 这一轮已经把“正文 + 媒体资源”同时打通，但视频直链目前仍不稳定：
  - 当前最安全的做法是保留可用图片资源，过滤掉无意义的 blob video URL
- 如果后面要拿稳定的视频直链，仍需要继续研究页面播放器或更明确的媒体接口

### 第五十二轮增强：前端工作台已展示真实正文与媒体质量
- 我这轮没有继续堆后端字段，而是把已经拿到的真实样本能力接进了 `ViralLab` 控制台
- 前端更新内容：
  - `Samples` 面板现在会直接展示：
    - 标题
    - 关键词
    - 作者
    - 发布时间
    - 正文摘要 / 正文片段
    - 封面图
    - 图片数 / 视频数
    - 原始 source URL
  - `Collection Jobs` 面板现在也会显示：
    - `modal opens`
    - `modal enriched`
    这样可以直接看出搜索页弹层补全到底有没有成功，而不需要再去翻 metadata JSON

### 本轮验证
- `modules/virallab/app` build 通过
- `modules/virallab/api` build 通过
- 新 UI 已与最新样本结构对齐：
  - `contentText`
  - `contentSummary`
  - `authorName`
  - `publishTime`
  - `coverImageUrl`
  - `mediaImageUrls`
  - `mediaVideoUrls`

### 当前限制
- 现在前端已经能把真实样本质量直观看出来，但视频仍然只是“数量可见”，因为可复用视频直链还没有稳定拿到

### 第五十三轮增强：把 noteId、authorId 和规范化发布时间正式落进真实样本
- 我这轮继续做样本基础质量，不再是 UI 层，而是把当前已经能从 real collect 里拿到的稳定标识正式收口：
  - `platformContentId`
  - `authorId`
  - 更稳定的 ISO 化 `publishTime`
- 已完成的改动：
  - `ViralLabSample` 和 `CollectedSampleInput` 新增：
    - `platformContentId`
    - `authorId`
  - API 与持久化链路已补齐：
    - `store/types.ts`
    - `collector.types.ts`
    - `store.service.ts`
    - `collect.service.ts`
    - `samples.service.ts`
    - `mock.collector.ts`
  - real worker 现在会：
    - 从网络样本里直接写出 `noteId -> platformContentId`
    - 从 user 对象里提取 `authorId`
    - 用共享的 `normalizeTimestampValue()` 把搜索页弹层的短日期格式统一为 ISO 字符串

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过
- `node --check modules/virallab/worker/src/run-xiaohongshu-collector.js` 通过

## 2026-03-27 登录故障修复：API 启动依赖的本地 JSON 快照损坏

### 本轮问题定位
- 用户反馈 `demo@virallab.local / demo123456` 无法登录
- 实际排查结果：
  - `http://127.0.0.1:3301/api/virallab/health` 无响应
  - `modules/virallab/api/data/virallab-mvp.json` 已损坏并被截断，`JSON.parse` 失败
  - SQLite 备份库 `modules/virallab/api/prisma/dev.db` 仍然完整，demo 用户仍存在
  - `npm run virallab:api` 通过 `--prefix` 启动时，原有 `process.cwd()` 逻辑拿不到 `modules/virallab/api/.env`

### 本轮修复
- 更新 `modules/virallab/api/src/main.ts`
  - 环境加载新增 `__dirname/../.env` 候选
  - 避免用 `--prefix` 启动时读不到 API 自己的环境文件
- 更新 `modules/virallab/api/src/store/store.service.ts`
  - 为损坏快照增加从持久层恢复的兜底逻辑
- 新增 `modules/virallab/api/.env`
  - 明确本地端口与 JWT 配置
  - 当前将 `VIRALLAB_ENABLE_DB_MIRROR=false`
  - 先绕开旧 SQLite schema 与新 Prisma schema 不一致的问题，优先恢复登录可用性
- 使用现有 SQLite 数据重建：
  - `modules/virallab/api/data/virallab-mvp.json`

### 本轮验证
- API 重新启动成功
- `GET /api/virallab/health` 返回 `{\"ok\":true}`
- `POST /api/virallab/auth/login`
  - `demo@virallab.local / demo123456` 返回 `201`
  - 登录成功并返回 token

### 后续补充修复
- 登录成功后首页仍显示 `500`
- 进一步定位发现：
  - 登录后前端会立即拉取 `collect/jobs`、`samples`、`analyze/results`、`patterns`、`collect/debug-summary`
  - 多个列表接口仍在对 `createdAt` 调用 `localeCompare`
  - 当前恢复出来的本地数据里，部分时间值是数字时间戳，不是字符串
- 本轮已统一修复：
  - `samples.service.ts`
  - `patterns.service.ts`
  - `analyze.service.ts`
  - `collect.service.ts`
  - `workflow.service.ts`
  - 将本地模式下的排序改成统一的时间戳比较函数

### 补充验证
- 登录后继续实测以下接口均返回 `200`
  - `GET /api/virallab/collect/jobs`
  - `GET /api/virallab/samples`
  - `GET /api/virallab/analyze/results`
  - `GET /api/virallab/patterns`
  - `GET /api/virallab/collect/debug-summary`
- 用当前真实登录态再次执行 real worker collect 后，首条样本结果已确认：
  - `platformContentId = 69a6883a000000001a02b3e0`
  - `authorId = 642e876e000000001201368a`
  - `publishTime = 2026-03-03T00:00:00.000Z`

### 当前限制
- 现在样本已经具备稳定的内容 ID、作者 ID 和规范化发布时间，后面做去重、追踪和二次分析会更稳
- 下一步更值得继续做的是：
  - 让分析链路显式使用这些新增字段
  - 继续提升标签质量，而不是只停在标题关键词级别

### 第五十四轮增强：让 Analyze / Pattern 显式吸收真实样本的结构化字段
- 我这轮继续往“高质量分析”推进，不再让 `Analyze / Pattern` 只围绕标题和正文做弱判断：
  - `AnalyzeService` 现在已把下列 sample 字段接入分析输入：
    - `platformContentId`
    - `authorId`
    - `publishTime`
    - `sourceUrl`
    - `coverImageUrl`
    - `mediaImageUrls`
    - `mediaVideoUrls`
  - 同时新增了 `inferContentFormat()`，会把样本识别为：
    - `video-note`
    - `multi-image-note`
    - `single-image-note`
    - `long-text-note`
    - `text-first-note`
  - LLM 分析 prompt 已升级，新增：
    - `author`
    - `publishing`
    - `contentFormat`
    - `media`
  - Analyze 的 prompt 版本已升级为：
    - `analyze.v3.llm`
  - 本地 fallback 分析也已同步吸收这些字段，至少会把内容形态和发布时间信号带进 `trendTags / viralReasons / keyPoints`
  - `PatternsService` 也已同步增强：
    - 传入 `platformContentId`
    - 传入 `contentText`
    - 传入作者与发布时间
    - 传入媒体计数与封面
  - Pattern 的 LLM prompt 版本已升级为：
    - `patterns.v3.llm`
  - 本地 fallback Pattern 也已根据：
    - 是否含视频
    - 是否有时效窗口
    动态调整 `trendSummary / applicableScenarios`

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 当前限制
- 现在 `Analyze / Pattern` 已经能看见更多真实结构化字段，但标签质量本身仍主要来自采集阶段和标题关键词
- 下一步更值得继续做的是：
  - 继续提升样本标签质量
  - 再用这批 richer sample 重跑一轮真实 `Analyze / Pattern / Generate`

### 第五十五轮增强：收口采集层 provider 架构，为托管抓取服务预留接入位
- 我这轮继续做采集层架构收口，不改数据库结构，先把运行时 provider 规范下来：
  - 新增统一的 collector 抽象：
    - `CollectorProviderId`
    - `CollectorContext`
    - `CollectorVerificationResult`
    - `CollectorReadiness`
    - `ViralLabCollectorProvider`
  - 现有采集器已经都挂到这套接口上：
    - `mock-local`
    - `xiaohongshu-playwright`
  - 同时新增了一个托管 provider 预留实现：
    - `xiaohongshu-managed`
    - 当前位置是 stub，明确返回 `provider-not-configured`
    - 用来承接后续 XCrawl / Apify / Bright Data 这类 managed scraping provider
- `CollectService` 已收口 provider 选择逻辑：
  - 新增统一 `getCollectorProvider()`
  - 新增 `buildProviderMetadata()`
  - `runCollectorJob()` 不再直接写死 `mockCollector/xiaohongshuCollector`
  - `createJob()` 已支持可选 `providerId`
  - `getCapabilities()` 现在会同时暴露：
    - `mock`
    - `real`
    - `managed`
- 同时把历史混乱的 provider naming 收口了：
  - mock 结果 metadata 现在统一写成 `mock-local`
  - 不再混用 `mock / mock-collector / mock-local`

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 当前限制
- `xiaohongshu-managed` 目前只是架构预留位，还没有真实第三方服务接入
- 下一步更值得继续做的是：
  - 把前端采集配置面板补上 `providerId`
  - 或直接开始接第一个 managed provider

### 第五十六轮增强：把 provider 架构接到前端采集面板
- 我这轮把采集层 provider 架构真正接到了前端 UI，不再只是后端预留：
  - `collectForm` 现在新增：
    - `providerId`
  - 当用户切换 `collectorMode` 时，前端会自动切换默认 provider：
    - `mock -> mock-local`
    - `real -> xiaohongshu-playwright`
  - real 模式下现在可以在 UI 中直接切换：
    - `xiaohongshu-playwright`
    - `xiaohongshu-managed`
  - `Collector Readiness` 面板现在也已扩成 3 张卡：
    - Mock Collector
    - Real Collector
    - Managed Collector
  - Collection Job 列表现在会直接显示 job metadata 里的 provider id，便于后续区分：
    - 自研 Playwright 采集
    - 未来托管抓取 provider
- 同时补了前端类型与状态收口：
  - `CollectorCapabilities` 现在已包含 `managed`
  - Job metadata 现在已接收 `provider / providerMode`
  - 新增 `selectedProviderEnabled`，统一处理 `mock.ready` 和 `real.enabled` 的差异
- 样式也同步调整：
  - `collector-status-grid` 已扩成 3 列
  - 在较窄视口下会自动降成 1 列

### 本轮验证
- `modules/virallab/app` build 通过
- `modules/virallab/api` build 通过

### 当前限制
- 前端虽然已经能选 `xiaohongshu-managed`，但它当前仍然会得到“provider-not-configured”的受控提示
- 下一步更值得继续做的是：
  - 开始接第一个真实 managed provider

### 第五十七轮增强：把 `xiaohongshu-managed` 从 stub 提升为 XCrawl 风格真实接入
- 这轮我先查了 XCrawl 官方 `Scrape API` 文档，再落代码，没有再盲猜接口：
  - 官方文档确认可用：
    - `POST https://run.xcrawl.com/v1/scrape`
    - `Authorization: Bearer $XCRAWL_API_KEY`
    - 支持 `output.formats=["json"]`
    - 支持 `json.prompt + json_schema`
- 基于这套官方接口，我已把 `xiaohongshu-managed` 从纯 stub 改成真实 HTTP provider：
  - 新实现文件：
    - `modules/virallab/api/src/collect/managed.collector.ts`
  - 当前实现策略：
    - 用小红书 `search_result` 页作为抓取入口
    - 调 XCrawl 的 `scrape` 接口
    - 开启 JS render
    - 用 `json_schema` 约束提取结构
    - 映射回 `CollectedSampleInput`
  - 当前会正式提取：
    - `platformContentId`
    - `title`
    - `contentText`
    - `contentSummary`
    - `authorName`
    - `authorId`
    - `publishTime`
    - `like/comment/collect/share`
    - `tags`
    - `sourceUrl`
    - `coverImageUrl`
    - `mediaImageUrls`
    - `mediaVideoUrls`
- 同时补了 managed provider 的运行配置：
  - `.env.example` 新增：
    - `VIRALLAB_ENABLE_MANAGED_COLLECTOR`
    - `XCRAWL_BASE_URL`
    - `XCRAWL_API_KEY`
    - `XCRAWL_TIMEOUT_MS`
- 后端 real-job 前置校验也已分流：
  - `xiaohongshu-playwright` 仍然依赖本地保存的 Cookie
  - `xiaohongshu-managed` 不再被本地 Cookie 校验误拦
  - 它改为只看 provider 自己的 readiness（是否配置 `XCRAWL_API_KEY` 等）

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 当前限制
- 目前还没有在本机环境中拿到 `XCRAWL_API_KEY`，所以这轮是“代码已接通、待配置后联调”
- 下一步更值得继续做的是：
  - 配上 XCrawl 凭证做一次真实 managed collect 联调

### 第五十八轮增强：提高 `xiaohongshu-managed` 对 XCrawl 返回结构的兼容性
- 我这轮继续做 managed provider 的结果兼容层，重点不是新功能，而是降低首轮联调时“字段名不完全一致就空跑”的风险：
  - `XCrawlScrapeResponse.data.json` 不再只认死板的 `json.items`
  - 当前会自动兼容提取：
    - `items`
    - `results`
    - `notes`
    - `cards`
    - `list`
    - 以及它们的嵌套 `data.*`
  - 计数字段归一化已增强：
    - 支持 `1.2万`
    - 支持 `2.5k`
  - 时间字段归一化已增强：
    - 支持可直接 `Date.parse`
    - 支持 `03-03 / 03/03` 这类短日期
  - 字段映射现在也更宽松：
    - `title / noteTitle / name`
    - `contentText / bodyText / desc / description / content`
    - `authorName / author.name / author.nickname`
    - `authorId / author.id / author.userId / author.uid`
    - `sourceUrl / url / noteUrl / link`
    - `coverImageUrl / cover / coverUrl`
    - `tags / tagList / tag_list`
    - `mediaImageUrls / images / imageUrls`
    - `mediaVideoUrls / videos / videoUrls`
  - 同时新增了 metadata 计数，便于后续联调：
    - `rawItemCount`
    - `normalizedItemCount`

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 当前限制
- 这轮解决的是“返回结构兼容性”，不是线上联调本身；真实联调仍然需要 `XCRAWL_API_KEY`

### 第五十九轮增强：为 `xiaohongshu-managed` 增加 markdown/html/links 二次兜底
- 我这轮继续增强 managed provider，不再让它“只有 json 成功才有样本”：
  - 请求 XCrawl 时，现在除了 `json` 之外，还会显式请求：
    - `markdown`
    - `html`
    - `links`
    - `screenshot`
  - 如果 `json` 抽取没有产出可用 items，当前会自动退回：
    - 从 `links` 中提取 `/explore/{noteId}` 链接
    - 生成骨架样本
    - 用 `markdown/html` 的正文片段填充 `contentSummary`
  - 这样即使远端 `json_schema` 没完全命中，小红书结果页仍然有机会产出：
    - `platformContentId`
    - `title`
    - `sourceUrl`
    - 基础 `contentSummary`
- 同时补了新的 metadata 诊断字段：
  - `fallbackItemCount`
  - `fallbackUsed`
  - `markdownCaptured`
  - `htmlCaptured`
  - `linksCaptured`

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 当前限制
- 这轮增加的是 managed provider 的韧性，不是 live provider 验证；真实联调仍然需要 `XCRAWL_API_KEY`

### 第六十轮增强：补齐 managed fallback 的真实输入，并增加 markdown/html 链接提取
- 我这轮修了一个真实缺口：
  - 之前 `xiaohongshu-managed` 已经会消费 `markdown/html/links` 做 fallback
  - 但 XCrawl 请求里实际上还没把这些 output formats 真正取回来
- 当前已补齐：
  - `output.formats` 现在会正式请求：
    - `json`
    - `markdown`
    - `html`
    - `links`
    - `screenshot`
  - fallback 链路现在除了直接吃 `links` 数组，还会额外从：
    - markdown 里的 `[title](https://www.xiaohongshu.com/explore/...)`
    - html 里的 `<a href=\".../explore/...\">`
    再解析一次 note 链接
- 这意味着即使 XCrawl 没把 `links` 结构化得很理想，只要 markdown/html 里还保留 note link，managed provider 仍然有机会退回出样本骨架

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

### 第六十二轮增强：补齐样本审核元信息展示
- 前端样本卡片现已直接展示：
  - 标题
  - 作者
  - 发布日期（仅年月日）
  - 点赞 / 评论 / 收藏 / 转发
  - 小红书回查提示（优先搜标题前半段 + 作者）
- 目的：
  - 让用户能直接核对 ViralLab 结果与小红书原帖
  - 降低“抓出来的到底是哪条”的认知成本

### 第六十三轮增强：样本区默认收敛到当前任务
- Samples 面板现默认优先展示当前最新采集任务的样本
- 若当前任务没有样本，再回退到全局最新样本
- 同时补上：
  - 点赞/评论/收藏/转发 千分位显示
  - 类型兜底判定（contentType 缺失时，结合 hasVideoMedia / contentFormat / 标题信号推断）

### 第六十四轮增强：接入真实页面筛选点击链
- worker 现已新增 UI click path：
  - 顶部 tab：`全部 / 图文 / 视频`
  - 右上筛选：`综合 / 最新 / 最多点赞 / 最多评论 / 最多收藏`
  - 发布时间：`不限 / 一天内 / 一周内 / 半年内`
- 运行策略：
  - 先点真实页面筛选
  - 再继续抓当前页面结果与详情
  - 请求改写逻辑保留为兜底和对齐层

### 第六十五轮增强：补上扫码登录并自动接管 Cookie 的主流程
- 为了让真实采集更符合普通用户操作习惯，这轮新增了“小红书扫码登录 -> 自动接管 Cookie -> 自动开始抓取”链路
- 后端新增接口：
  - `POST /platform-accounts/xiaohongshu/scan-login/start`
  - `POST /platform-accounts/xiaohongshu/scan-login/complete`
  - `POST /platform-accounts/xiaohongshu/scan-login/cancel`
- API 侧会通过 worker 目录下的 Playwright 依赖打开一个新的小红书扫码窗口
- 用户扫码完成后，系统会自动：
  - 读取浏览器 Cookie
  - 保存当前平台账号 Cookie
  - 调用现有验证逻辑
  - 再由前端自动继续发起本次采集任务
- 前端主流程也同步改成：
  - 第 1 步显示“推荐方式：扫码自动接管”
  - 手动 Cookie 改成备用折叠入口
  - 第 2 步在真实采集场景下，强调“优先使用扫码窗口”

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过
- API 侧已确认可从：
  - `modules/virallab/worker/node_modules/playwright`
  正常加载 Playwright 运行时

## 2026-03-26 继续收敛小红书图文/视频判断与当前任务样本显示

### 本轮完成
- 不再主要依赖标题和正文长度去猜图文/视频，开始把小红书搜索结果原始字段作为主判断来源：
  - 过滤掉 `model_type !== note` 的噪音项
  - 将 `note_card.type`、`video_info`、`video_info_v2`、`model_type` 纳入 `hasVideoMedia` 主判断
- 修正样本页显示逻辑：
  - 样本区默认只显示当前最新采集任务的样本
  - 当前任务没有样本时，不再回退混入旧任务历史结果
- 修正样本卡片：
  - 类型显示改成更明确的 `图文 / 视频 + 内容形态`
  - 当前任务无样本时直接给出中文提示
- 给真实采集 bridge 增加硬超时：
  - `VIRALLAB_REAL_COLLECTOR_TIMEOUT_MS`，默认 120 秒
  - 避免任务长时间卡在 `running`

### 本轮验证
- 直接复查小红书真实 `search/notes` 返回：
  - 在 `AI教育 + 图文 + 最多点赞 + 一周内` 条件下，前 10 条原始返回项大多数为：
    - `model_type = note`
    - `note_card.type = normal`
    - `video_info = false`
    - `image_list` 为多图
- `node --check modules/virallab/worker/src/run-xiaohongshu-collector.js` 通过
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过

## 2026-03-26 模式 A：用户手动筛选后，系统接管当前结果页

### 本轮完成
- 扫码登录流程进一步升级为模式 A：
  - 用户在小红书窗口里手动完成图文/视频、排序、发布时间筛选
  - 系统不再把本地表单筛选当作唯一事实来源
- 扫码窗口现在会监听真实的 `search/notes` 请求，并在完成时回传：
  - `manualSearchPageUrl`
  - `manualSearchRequestData`
- 创建任务时，如果存在这组手动筛选数据：
  - 优先从真实请求里反推出 `sortBy / noteType / publishWindow`
  - worker 继续抓取时优先使用这组真实请求参数
- 前端扫码说明已同步改成“在小红书里亲手筛好，再回来点击完成”

### 本轮验证
- `modules/virallab/api` build 通过
- `modules/virallab/app` build 通过
- `node --check modules/virallab/worker/src/run-xiaohongshu-collector.js` 通过

- 2026-03-27: Fixed scan window launch reliability. Root cause was scan login reusing the system Chrome session, which often only changed an existing tab and looked like “no response.” The flow now launches an isolated Playwright browser profile and activates `Google Chrome for Testing`, verified by direct API test returning a real Xiaohongshu search window.

- 2026-03-27: Removed silent disable state from the scan-login button in the app. Clicking scan login now force-selects real collection + the Xiaohongshu Playwright provider and seeds a default keyword if empty, so users no longer click a seemingly active control that does nothing due to hidden state guards.

- 2026-03-27: Reorganized the ViralLab landing workflow around the new scan-first flow. Removed the redundant “real collector status” card and demoted manual job creation into an advanced section. The main flow is now: platform access -> scan and start collection -> review collection status -> review samples -> analyze/generate. Added a dedicated task-status card so users know to wait for the job state instead of wondering what to do after clicking scan complete.

- 2026-03-27: Fixed the “Scan Complete & Start Collection” flow. Root cause was the API running with VIRALLAB_ENABLE_REAL_COLLECTOR=false, so scan completion returned an immediate collector-disabled failure that users could not see clearly. Also simplified scan completion so it only captures cookies and the current Xiaohongshu result-page state, instead of trying to synchronously verify the collector. The UI now shows workspace status inline in the scan card, and the scan window is kept open until a collection job is actually created.

- 2026-03-27: Fixed a worker bridge path bug for the real Xiaohongshu collector. The API had resolved the worker runner from process.cwd(), which pointed to /Users/jordanwang/YOLO/worker/... when the app was launched from the repo root, so scan completion never created a collection job. The runner path now resolves relative to the collector file itself, pointing correctly to modules/virallab/worker/src/run-xiaohongshu-collector.js.

- 2026-03-27: Added a real scan-to-collection stage model in the ViralLab app. The collection step now tracks the current run instead of loosely following the latest historical job, and the UI exposes a step strip plus a progress bar for: scan complete -> capture login state -> create job -> collect -> done/failed. This reduces the “clicked but nothing happened” confusion after scan completion.

- 2026-03-27: Added worker-backed progress reporting for the Xiaohongshu Playwright collector. The worker now writes stage/progress updates to a temporary progress file, the collector bridge polls that file, and `CollectService` writes live progress metadata (`progressStage`, `progressMessage`, `extractedCount`, `targetCount`) back into the active collection job while it is still running.

- 2026-03-27: Expanded image OCR triggering from multi-image posts to any weak-body image note with at least one image. This specifically addresses the case where Xiaohongshu图文正文 is mostly embedded in a single cover/long image and the old rule (`>= 2` images) skipped OCR entirely, leaving only search-card summaries in the sample list.
