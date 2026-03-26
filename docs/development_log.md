# Development Log - AI Marketing System (JustRight Module)

**Author:** Antigravity (AI Assistant)  
**Project:** AI Marketing System  
**Module:** JustRight Calendar  
**Date Range:** 2026-03-12 to 2026-03-13

---

## 📅 2026-03-13
### **Deployment & Cloud Launch (Mission Success) 🚀**
- **Server Deployment**: Successfully deployed the entire system to **8.159.153.134**.
- **Domain & SSL**: 
  - Host: `justright.51winwin.com`
  - Signed by: **Let's Encrypt** via Certbot.
  - Automatic HTTPS redirection enabled.
- **Mobile Compatibility Fix**: Switched `AbortSignal.timeout` to a universal `AbortController` pattern to support older mobile browsers (e.g., iOS Safari). This resolved the issue where mobile calendars appeared empty.
- **Production Build Pipeline**: Resolved TypeScript strict mode errors in `ScheduleList.tsx` that were blocking the remote build process.

### **Refactoring & Infrastructure**
- **Refactored** the project into a **Mono-repo structure**.
  - Current calendar code moved to `modules/justright-calendar`.
  - Created placeholder directories: `core-portal`, `docs`.
  - Added root-level `package.json` for mono-repo management.
- **Git & GitHub Integration**:
  - Initialized repository: `ai-marketing-system`.
  - Pushed code to GitHub: `https://github.com/jordanwang922/ai-marketing-system`.

### **Bug Fixes & System Stability**
- **Fixed White Screen Issue**: Resolved a critical runtime crash where date strings from local storage were not being converted back to `Date` objects.
- **Improved Data Integrity**: Ensured all date manipulations use strict `new Date()` casting for consistency between SQLite and LocalStorage.

---

## 📅 2026-03-12
### **Core Feature: Monthly Schedule List**
- **Implemented** a dedicated "Monthly Schedule List" view.
- **Multi-day Expansion**: Fixed a bug where multi-day events only showed up on the first day.
- **Responsive UI**: Added a scrollable container with a maximum height (85vh) and mobile-friendly touch interactions.

### **Feature: User Management**
- **Dynamic User Creation**: Added functionality to create new users with custom names and unique colors.
- **SQLite Persistence**: Integrated Backend API (`/api/users`) to save newly created users to the `database.sqlite` file.

### **Architecture: Unified Event System**
- **Developed `useEventsUnified` hook**: This hook now acts as the central brain for data, prioritizing SQLite (Backend) -> Firebase (Cloud) -> LocalStorage (Offline).
- **Auto-Refresh**: Configured the grid to automatically refetch data after any operation.

## 📅 2026-03-22
### **RiskRadar 子系统搭建（MVP 框架完成）**
- **新增模块结构**：创建 `modules/RiskRadar` 子系统目录，包含 server/api/db/queue/services/prompts/shared 等基础结构。
- **独立数据库**：新增 SQLite schema（companies/tasks/reports/sources/users）。
- **任务队列**：本地队列轮询 + 任务状态流转（queued/running/done/failed）。
- **API 接口**：`/api/riskradar/evaluate`、`/api/riskradar/task/:id`、`/api/riskradar/report`。
- **LLM 接入（豆包/火山引擎）**：新增 LLM Client，使用 `LLM_BASE_URL/chat/completions` + `Bearer` 鉴权，失败自动降级为本地模板输出。
- **多语言模板**：中英双语 Prompt 模板与输出结构基础搭建。
- **设计文档**：新增 `DOCS/riskradar_design.md`。

## 📅 2026-03-22
### **RiskRadar 功能链路接入（公开搜索 + CRM 联动）**
- **公开搜索**：接入 DuckDuckGo HTML 结果抓取，支持 Jina 文本抽取，写入 sources。
- **CRM 回调**：RiskRadar 完成后回调 CRM `/riskradar/callback`，回写 Lead 并创建通知。
- **Lead 任务映射**：新增 `aiTaskId` / `aiMode` 字段，支持任务回写。
- **CRM 代理接口**：新增 `/riskradar/evaluate`、`/riskradar/task/:id`、`/riskradar/report` 代理调用。
- **前端 AI 页**：新增 RiskRadar 输入面板，支持公司名/国家/模式/语言与结果展示。

## 📅 2026-03-22
### **RiskRadar 本地联调与构建修复**
- **Node 兼容性**：Node 24 编译 `better-sqlite3` 失败，已切换至 Node 22 LTS（Homebrew）。
- **本地联调**：RiskRadar `/health` 与 `evaluate -> task` 链路可跑通（LLM 关闭时回退模板输出）。

## 📅 2026-03-22
### **CRM 回调依赖修复与联调验证**
- **依赖修复**：NotificationsModule 导出 NotificationsService，解决回调控制器依赖注入报错。
- **联调验证**：RiskRadar -> CRM 回调完成后，Lead 状态自动更新并生成通知记录。

## 📅 2026-03-25
### **ViralLab 子系统 MVP 首版落地**
- **设计文档**：新增 `docs/virallab_v1_design.md`
- **模块结构**：新增 `modules/virallab`，包含 `app/api/worker/shared/docs`
- **前端工作台**：新增可联调的 ViralLab 控制台页面，支持 Collection / Samples / Analyze / Patterns / Generate 工作流展示
- **后端 MVP API**：新增本地可运行的 ViralLab API，支持采集任务、样本、分析、Pattern、生成内容链路
- **本地持久化**：引入文件存储 `modules/virallab/api/data/virallab-mvp.json`，先不强依赖正式数据库
- **日志与交接**：新增 `docs/virallab_development_log.md` 和 `docs/virallab_handover.md`
- **第二轮增强**：补上 ViralLab 登录态、本地 token 持久化、退出登录能力，并把采集模块升级成 `mock/real` 双模式结构，支持后续接真实小红书 Collector
- **第三轮增强**：新增 ViralLab 平台账号配置、Cookie 存储、collector readiness 接口，以及 real collector 的 worker bridge 结构
- **第四轮增强**：real collector 已接入 Playwright Chromium，支持小红书搜索页访问、DOM / initial-state 双重提取、结构化 diagnostics 输出、以及截图/HTML artifact 产出
- **端到端验证**：已验证 `auth/login -> 保存 Cookie -> collectorMode=real -> collect/jobs 列表 metadata 回显` 整条链路；无效 Cookie 下系统会稳定返回受控失败，不会崩溃
- **第五轮增强**：采集任务已改成异步执行模型，`POST /collect/jobs` 立即返回 `pending`，前端会自动轮询并显示 `running/completed/failed` 状态变化
- **第六轮增强**：新增小红书 Cookie 验证接口与前端按钮，系统会把 Cookie 标记为 `verified` 或 `invalid`，并记录 `lastVerifiedAt`
- **第七轮增强**：真实采集现在强依赖 `verified` Cookie；未验证或已失效 Cookie 会被前后端同时拦截，避免无效 real collect 任务进入队列
- **第八轮增强**：`saved` 状态的 Cookie 在首次 real collect 时会自动验证；通过则继续采集，失败则立即阻断并更新平台账号状态
- **第九至十三轮增强**：补齐 collector diagnostics、debug summary、network response 监听、搜索 API 认证码判断，系统已经能明确区分页面拦截、state 空数据和 API 鉴权失败
- **第十四轮增强**：接入豆包/火山引擎 Ark 到 ViralLab 的 Analyze / Generate 链路，失败自动回退本地模板；已完成真实接口联调并拿到 `analyze.v2.llm`、`generate.v2.llm` 输出
- **第十五轮增强**：接入豆包/火山引擎 Ark 到 ViralLab 的 Pattern Engine，`patterns/extract` 已能从多条 analysis + sample 抽象真实模板，失败自动回退本地逻辑
- **第十六轮增强**：为 Analyze / Pattern / Generate 结果补充 `fallbackStatus / fallbackReason` 审计字段，并在前端直接展示 `LLM / fallback / local-only` 来源状态
- **第十七轮增强**：为 ViralLab 引入 SQLite / Prisma 数据库镜像层，新增 `db:init:sqlite` 本地建库脚本，当前 JSON 仍是主存储，SQLite 已可承载完整镜像数据
- **第十八轮增强**：开启数据库镜像时，`samples / analyze / patterns / generate detail` 读取接口已优先走 Prisma / SQLite，启动时也会把现有 JSON 自动同步进数据库
- **第十九轮增强**：开启数据库镜像时，`auth/me` 与 `platform-accounts` 也已优先走 Prisma；平台账号验证前置读取同样切到数据库
- **第二十轮增强**：开启数据库镜像时，`overview / collect jobs / collect capabilities / collect debug summary` 也已优先走 Prisma，ViralLab 的主要展示读取接口基本完成切库
- **第二十一轮增强**：开启数据库镜像时，`register / login / logout / save cookie / verify cookie` 已开始走 Prisma 主写，并同步回 JSON 保持兼容
- **第二十二轮增强**：开启数据库镜像时，`collect job creation / collector runtime status / sample insertion / collect audit logs / saved-cookie auto verification` 已开始走 Prisma 主写；经 `collectorMode=mock` 联调验证，任务已能在 SQLite 中完成创建、推进、入样本和写审计日志
- **第二十三轮增强**：开启数据库镜像时，`analyze / patterns / generate` 的创建链路也已开始走 Prisma 主写；经本地联调验证，新 `AnalysisResult / Pattern / PatternSource / GenerationJob / GeneratedContent` 已能正确写入 SQLite
- **第二十四轮增强**：收缩 `store.service.ts` 的全量 mirror 职责，`write/mutate` 默认只写 JSON，整库 JSON -> Prisma 同步仅保留在初始化和显式 `syncFileToPrisma()`；已验证 Prisma 主写链路不受影响，SQLite 与本地 JSON 仍能同步落下新增生成记录
- **第二十五轮增强**：启用持久化时，`collect` 启动恢复、`analyze` 样本查找、`patterns` 的 analysis/sample 查找、`generate` 的 pattern/user 查找也开始直接走 Prisma，创建前的数据决策进一步脱离 JSON
- **第二十六轮增强**：继续收口 `auth + platform` 的兼容逻辑，新增更明确的 user/session/account/audit JSON 同步 helper，并统一平台默认 user 解析；经联调验证，`save cookie` 后 SQLite 与本地 JSON 均能正确更新
- **第二十七轮增强**：修复启动阶段 JSON -> Prisma 回填偶发失效问题。`ViralLabStoreService` 现在会在模块启动时主动初始化，并在 bootstrap sync 前显式连接 Prisma；重启后已验证 SQLite 与 `platform-accounts` 接口会正确回填最新 JSON 中的 Cookie 值
- **第二十八轮增强**：完成首次真实小红书扫码联调。已从独立 Chrome 会话抓取真实 Cookie，`verify cookie` 返回成功，`collectorMode=real` 任务 `job_caae527d` 已完成并真实落下一条样本 `sample_717dbde6`，随后该样本已成功进入 Analyze 链路
- **第二十九轮增强**：定向强化 `search/notes` 网络响应解析，真实采集器已能解析 `data.items[].note_card`。新任务 `job_ba52f894` 已成功从网络层落下 `5` 条真实样本，提取来源从 `initial-state` 提升为 `network`
- **第三十轮增强**：新增 `POST /api/virallab/workflow/latest-real-pipeline`，可基于最近一次真实采集结果一键串起 `Analyze -> Pattern -> Generate`。同时 `ViralLab` 现已支持自动继承 `modules/RiskRadar/server/.env` 中的豆包 / Ark 配置；经联调验证，最新真实工作流已返回真实 LLM Pattern `pattern_f34ae4a8` 与真实 LLM Generated Content `content_f68ff7c2`
- **第三十一轮增强**：新增 `forceReanalyze` 能力，`POST /api/virallab/analyze/jobs` 与 `POST /api/virallab/workflow/latest-real-pipeline` 现可对历史真实样本强制重跑分析。经联调验证，`job_ba52f894` 的 5 条真实样本已成功升级为 `analyze.v2.llm`；同时补长 `Analyze / Pattern` 的 LLM 超时，并修复启动回填时无效 `PatternSource` 外键导致的崩溃
- **第三十二轮增强**：新增异步真实工作流任务接口 `workflow/jobs`，前端 `Run Latest Real Pipeline` 已改为先排队再轮询，不再阻塞一个长 HTTP 请求。当前 workflow job 先走 JSON 兼容层持久化，已验证创建后可返回 `pending` 并推进到 `running`
- **第三十三轮增强**：为 async workflow job 增加阶段级进度，当前详情接口已能返回 `stage=analyzing / extracting_pattern / generating` 等状态；经联调验证，任务 `workflow_054929d9` 运行中已可见 `progress=35`、`stage=analyzing`
- **第三十四轮增强**：把 async workflow 的 `analyzing` 阶段细分到单 sample 级别。经联调验证，任务 `workflow_a0bde031` 运行中已返回 `message=Analyzing 1/3 · 硅谷的AI高管们是这么规划孩子未来的~`
- **第三十五轮增强**：新增 workflow 子状态 `generation_completed`，并在前端 `Workflow Jobs` 卡片中直接展示 `patternId / contentId`，方便在轮询阶段确认产物已经生成
- **第三十六轮增强**：继续细分 workflow 的 Pattern 阶段，新增 `pattern_inputs_ready` 和 `pattern_persisted` 两个中间状态，便于区分“准备抽取”与“已生成可进入下一段”
- **第三十七轮增强**：继续提升真实小红书样本字段质量。真实采集器现已过滤日期型 tag，改进 `publishTime` 解析，并把 `contentSummary` 升级为包含作者、发布时间和互动指标的结构化 fallback；同时新增标题关键词提取来改善 `tagsJson`。经 real collect 任务 `job_858c24d0` 验证，`5` 条真实样本已稳定落库，摘要和标签质量均优于上一批
- **第三十八轮增强**：为真实采集器接入安全版 note detail 二次补全层，开始尝试通过 `sourceUrl` 打开笔记详情页补正文。联调确认详情页 state 会混入推荐内容，因此当前实现已收紧为“只做安全尝试，不覆盖核心元数据”；经任务 `job_8f2e8757` 验证，样本未被污染，`detailEnrichedCount=0`
- **第三十九轮增强**：把 note detail API 探测正式接进 real collector metadata。当前 worker 会对前 2 条真实样本自动探测 `h5/v1/note_info`，并把返回状态写入 job metadata。经任务 `job_46050621` 验证，该接口在现有 PC cookie/header 组合下稳定返回 `HTTP 406` 和 `{\"code\":-1,\"success\":false}`，正文补全的下一步方向因此更加明确
- **第四十轮增强**：继续把 note detail API 侦察做深。worker 里的 `detailApiProbe` 现在除了 direct request 探测外，还会在真实浏览器上下文中捕获页面自动发出的 `note_info` 请求，记录 `x-s / x-t / x-s-common / x-xray-traceid / x-b3-traceid` 等签名头，并解析响应体关键字段。最新验证显示：
  - direct `h5-note-info` 仍为 `HTTP 406`
  - browser-signed `note_info` 已可返回 `HTTP 200`、`code=0`
  - 但当前响应体仍只暴露极少字段（目前确认到 `note_type`），且页面本身可能跳到 `404/当前笔记暂时无法浏览`
  - 这意味着下一步要同时面对“签名重放”和“笔记可见性限制”两层问题
- **第四十一轮增强**：继续把 note detail 诊断收紧。worker 现在会把浏览器抓到的签名头原样重放为 `signed-replay-note-info`，并记录详情页导航中发现的相关 `edith` 接口摘要 `discoveredResponses`。最新验证显示：
  - 浏览器签名头重放到 request-context 后，只能得到 `HTTP 461 + code=0 + data={}`
  - 这说明“拿到 `x-s/x-t`”并不足以脱离页面上下文复现 detail 数据
  - 当前仍未观察到第二条明显、更完整的 note detail API 自动出现
- **第四十二轮增强**：把“搜索页进入 note”的链路也正式纳入 `detailApiProbe`。worker 现在会自动执行 `search-page-note-route`，记录从 `search_result` 导航到目标 note 过程中触发的搜索层接口。最新验证显示新增可见的主要是 `search/onebox`、`search/filter`、`search/recommend`、`search/notes`、`board/user`，但仍没有出现更完整的 note detail API，目标 `note_info` 依旧是 `461 + data={}`
- **第四十三轮增强**：把“页内主动签名请求”也接进了 `browser-note-info`。worker 现在会在页面里直接调用 `_webmsxyw(url, "GET")` 生成 `x-s / x-t`，再分别通过页内 `fetch` 和 `XHR` 主动请求 `note_info`。最新验证显示：虽然 `_webmsxyw` 确实能产出签名头，但这两种页内主动请求仍然是 `406 + code=-1`，说明“页面自动请求”依赖的上下文不止 `_webmsxyw` 本身
- **第四十四轮增强**：继续验证页内可见请求上下文。当前已确认页面没有暴露明显的 axios/interceptor 封装器，只有原生 `fetch/XHR`、`_webmsxyw` 和 `xsecappid/xsecappvers/xsecplatform`。worker 现已把 `xsec*` 头的主动请求测试也接进 `pageSignedFetch`；最新验证显示，即使把 `x-s/x-t + xsec*` 一起带上，页内主动请求 `note_info` 仍然是 `406 + code=-1`
- **第四十五轮增强**：继续缩小自动 `note_info` 请求的来源范围。worker 现在会在 `browser-note-info` 专用页面里预埋 `fetch/XHR` hook，并记录 `preSignedJsRequestHooks` 与 `automaticRequestBypassedJsHooks`。最新验证显示：虽然网络层能看到自动 `note_info`，但在主动 probe 之前 JS hook 为空，`automaticRequestBypassedJsHooks=true`，说明该自动请求至少没有走普通页面脚本可钩到的 `fetch/XHR` 路径
- **第四十六轮增强**：继续把自动请求来源做实。worker 现在会通过 CDP 记录 `note_info` 的 `initiator` 栈摘要。最新验证显示，这个自动请求实际上是 `script` 发起的 `XHR`，而且栈里已经明确出现了小红书打包后的 `library-axios.js`、`vendor-dynamic.js`、`dispatchXhrRequest`、`xhrAdapter`、`xhrByBridgeAdapter` 等函数。这说明它不是“神秘底层请求”，而是走了一条内部 axios bridge 调用链
- **第四十七轮增强**：开始把在线方案的有效线索吸收到本地诊断里。参考 GitHub 上 `Cloxl/xhshow` 这类实现后，worker 新增了 `detailApiProbe.cookieSignatureInputs`，专门检查 `a1 / web_session / webId` 等核心签名 cookie 是否齐备。最新验证显示当前真实登录态下这些关键 cookie 全都存在，说明 detail 失败并不是由基础签名 cookie 缺失引起的
- **第四十八轮增强**：继续把在线方案里的“完整签名头”线索落成代码。worker 现在会在页内用自动请求抓到的完整 header 集合重放 `note_info`，包括 `x-s-common`、`x-xray-traceid`、`x-b3-traceid` 等。最新验证显示：这能把页内主动请求从 `406 + code=-1` 提升到 `461 + code=0 + data={}`，说明完整 header 集合确实有效，但当前仍然拿不到完整 detail 数据
- **第四十九轮增强**：把 `web/v1/feed` 这类常见 note 聚合猜测也正式纳入 `detailApiProbe`。最新验证显示：`GET /feed?note_id` 和 `GET /feed?source_note_id` 都是 `404`，`POST /feed { note_id }` 是 `406`。这意味着当前 `feed` 这条显式入口也不是正确的 detail 解法
- **第五十轮增强**：引入搜索页弹层正文补全。参考 `RedNote-MCP` 这类公开实现后，real collector 新增了 `enrichSamplesFromSearchModal`，会在搜索页里按 noteId 锁定 `section.note-item`，点击 `a.cover.mask.ld / a.title` 打开弹层，并从 `#detail-title`、`#detail-desc .note-text` 等 DOM 节点抽正文。最新真实联调结果：`modalOpenCount=5`、`modalEnrichment.detailEnrichedCount=5`、总体 `detailEnrichedCount=5`，真实样本的 `contentText` 已经从搜索摘要升级为真实笔记正文
- **第五十一轮增强**：继续提升真实样本字段完整度，把媒体资源正式纳入 `ContentSample`。当前样本模型已新增图片/视频数组字段，worker 会从 `.media-container img/video` 抽取媒体资源，并把 video `poster` 合并到图片数组；同时过滤掉无意义的 `blob:` 视频地址。最新真实联调结果显示：样本已包含可复用的 CDN 图片 URL，`coverImageUrl` 与第一张图片一致
- **第五十二轮增强**：补齐前端样本展示。`Samples` 面板现在会直接显示真实样本的作者、发布时间、正文片段、封面图、媒体数量和 source URL；`Collection Jobs` 也新增了 `modal opens / modal enriched` 展示，方便直接判断搜索页弹层补全是否成功
- **第五十三轮增强**：继续补真实样本的基础标识质量。当前样本已经正式新增 `platformContentId` 和 `authorId`，并把搜索页弹层拿到的短日期统一规范化为 ISO `publishTime`。最新真实联调结果显示，首条样本已带回稳定的 `noteId`、作者 ID 和标准化发布时间
- **第五十四轮增强**：让 `Analyze / Pattern` 正式吸收真实样本的结构化字段。当前分析输入已经新增 `platformContentId / authorId / publishTime / sourceUrl / coverImageUrl / mediaImageUrls / mediaVideoUrls`，并新增 `contentFormat` 判断；Pattern 提取也已同步吸收这些 richer sample 字段。Analyze prompt 已升级到 `analyze.v3.llm`，Pattern prompt 已升级到 `patterns.v3.llm`；本地 fallback 也会根据内容形态与时效信号动态调整输出。经验证，`modules/virallab/api` 与 `modules/virallab/app` build 均通过
- **第五十五轮增强**：继续收口 ViralLab 采集层架构。当前已新增统一 provider 抽象和 provider id 体系，现有 `mock-local` 与 `xiaohongshu-playwright` 已挂到统一 collector contract 上，同时预留了 `xiaohongshu-managed` 作为未来 XCrawl/托管抓取服务的接入位。`CollectService` 现已通过 `getCollectorProvider()` 统一选择 provider，`createJob()` 支持可选 `providerId`，`getCapabilities()` 也新增了 `managed` 能力位。经验证，API 与 App build 均通过
- **第五十六轮增强**：把 provider 架构接到了前端采集面板。当前 `collectForm` 已新增 `providerId`，real 模式下可直接选择 `xiaohongshu-playwright` 或 `xiaohongshu-managed`；`Collector Readiness` 面板也已扩成 `Mock / Real / Managed` 三张卡，Collection Job 列表会直接显示 provider id。经验证，API 与 App build 均通过
- **第五十七轮增强**：把 `xiaohongshu-managed` 从预留 stub 提升为 XCrawl 风格真实接入。当前 managed provider 已会基于关键词构造小红书 `search_result` URL，调用官方 `POST /scrape` 接口，开启 JS rendering，并使用 `json.prompt + json_schema` 约束返回结构，然后映射回 `CollectedSampleInput`。同时 `.env.example` 已新增 `VIRALLAB_ENABLE_MANAGED_COLLECTOR / XCRAWL_BASE_URL / XCRAWL_API_KEY / XCRAWL_TIMEOUT_MS`，且 real-job 前置校验已分流，managed provider 不再被本地 Cookie 校验误拦。经验证，API 与 App build 均通过
- **第五十八轮增强**：继续提高 `xiaohongshu-managed` 的结果兼容性。当前它已不再只认 `json.items`，而是能兼容 `items/results/notes/cards/list` 及嵌套 `data.*` 结构；同时补强了别名字段映射、`1.2万/2.5k` 计数解析、短日期归一化，并在 metadata 中新增 `rawItemCount / normalizedItemCount` 以便后续联调。经验证，API 与 App build 均通过
- **第五十九轮增强**：继续增强 `xiaohongshu-managed` 的二次兜底能力。当前它在请求 XCrawl 时已同时索取 `json / markdown / html / links / screenshot`；如果 `json` 没有提取出可用 items，会自动退回到 `links + markdown/html` 路径，从 `/explore/{noteId}` 链接生成骨架样本并用文本片段填充 `contentSummary`。同时 metadata 新增 `fallbackItemCount / fallbackUsed / markdownCaptured / htmlCaptured / linksCaptured`。经验证，API 与 App build 均通过
- **第六十轮增强**：修复 managed fallback 的真实输入缺口。当前 `xiaohongshu-managed` 已不只是“会消费 markdown/html/links”，而是会真实向 XCrawl 请求这些 output formats；同时 fallback 也已新增直接从 markdown 链接和 html anchor 中提取 `/explore/{noteId}`，不再只依赖远端 `links` 数组。经验证，API 与 App build 均通过
- **第六十一轮增强**：把 provider 来源透到样本层和控制台。当前 `GET /samples` 与 `GET /samples/:sampleId` 都会基于父 collection job metadata 衍生 `provider` 字段，前端 `Samples` 面板也已显示 sample provider，并新增 `Sample Sources` 面板统计各 provider 的样本数量。经验证，API 与 App build 均通过
- **第六十二轮增强**：把 managed 质量指标接进控制台。当前 `Collection Jobs` 已能显示 `normalizedItemCount / fallbackItemCount / fallbackUsed / linksCaptured / markdownCaptured / htmlCaptured`，并新增 `Provider Diagnostics` 面板按 provider 聚合 job 数、normalized item 总数和 fallback run 次数。经验证，API 与 App build 均通过
- **第六十三轮增强**：把 provider 能力推进到 workflow。当前 `latest-real-pipeline` 已支持 `providerId` 过滤，workflow job metadata 会保留 provider 选择，来源 real job 的解析与结果回填也会按 provider 做筛选；前端点击 `Run Latest Real Pipeline` 时，会把当前采集 provider 一并带入 workflow。经验证，API 与 App build 均通过
- **第六十四轮增强**：给 workflow 增加独立 provider 配置表单。当前前端已新增 `Workflow Scope` 面板，可显式配置 `providerId / sampleLimit / forceReanalyze`，并通过 `Run Provider Pipeline` 按钮直接发起 provider-scoped workflow，不再隐式依赖 collect form 的当前 provider。经验证，API 与 App build 均通过
- **第六十五轮增强**：重新把重心拉回自研主通道，新增样本质量评分体系。当前 `SamplesService` 会为每条 sample 在 API 返回层派生 `qualityScore / qualityFlags`，检查 `platformContentId / author / publishTime / 正文摘要长度 / cover / media / tags / canonical sourceUrl` 等关键字段；前端 `Samples` 面板已显示每条样本的质量分和主要缺口，并新增 `Sample Quality` 聚合面板来显示平均分、strong/weak 样本数和最高频缺口。经验证，API 与 App build 均通过
- **第六十六轮增强**：开始按 `qualityFlags` 反向优化自研采集。当前 worker 已增强全局时间与标签归一化逻辑：`normalizeTimestampValue()` 现已支持 `刚刚/昨天/x小时前/MM月DD日/YYYY年MM月DD日` 等真实发布时间文本，并新增统一的 tag 合并与清洗 helper，过滤日期型/通用型噪音 tag，同时补入 title keywords 和 hashtags。该逻辑已应用到 DOM 卡片、`__INITIAL_STATE__`、`search.feeds`、搜索页弹层 enrichment 和 note page tag merge。经验证，worker `node --check`、API build、App build 均通过
- **第六十七轮增强**：把样本质量评分接进后端默认选样逻辑。当前已新增共享 helper `api/src/samples/sample-quality.ts`，并让 `AnalyzeService` 的默认分析样本改为“最近一批里优先选高质量样本”，同时让 `WorkflowService` 的 job sample 选择改为“qualityScore -> likeCount -> recency”。这样 `Analyze / Pattern / Generate` 默认会更稳定地吃到字段更完整的真实样本。经验证，API 与 App build 均通过
- **第六十八轮增强**：把 workflow 的实际输入样本质量透传到结果层和工作台。当前 `WorkflowService` 返回的 sample summaries 已新增 `qualityScore`，前端 `Latest Real Workflow` 面板会直接显示本次 pipeline 输入样本的平均质量分、最高质量样本分，以及参与样本各自的质量分。这样可以直接区分“模型输出问题”和“上游样本质量问题”。经验证，API 与 App build 均通过
- **第六十九轮增强**：继续把 workflow 做成可诊断闭环。当前 `WorkflowService` 已新增结果级 `diagnostics` 聚合，返回输入样本平均分、analysis 的 `llm/local-fallback/local-only` 数量、pattern/generate 来源、pattern confidence，以及生成标题数和标签数；前端 `Latest Real Workflow` 面板也已同步显示这些指标。这样可以从“输入质量 + AI 来源 + 输出丰富度”三层一起看 pipeline 表现。经验证，API 与 App build 均通过
- **第七十轮增强**：把 workflow 面板继续升级为结果快照视图。当前前端已在 `Latest Real Workflow` 中新增 `Pattern Snapshot` 和 `Generation Snapshot`，直接展示 Pattern 的来源、confidence、topic、description，以及 Generate 的来源、标题候选、标签和 `coverCopy/generationNotes`。这样一次真实 pipeline 的输入、诊断和关键输出都能在一个区块里完成审核。经验证，App 与 API build 均通过
- **第七十一轮增强**：把最近 workflow 结果与历史区块正式关联起来。当前 workflow 快照中已新增直达 `#patterns` 和 `#generated` 的锚点；同时历史 `Pattern Library` 和 `Latest Draft` 会对最近 workflow 产物显示 `latest workflow` badge 和高亮边框。这样不需要再手工对 id，就能知道历史区块里哪条记录来自刚跑完的 pipeline。经验证，App 与 API build 均通过
- **第七十二轮增强**：继续补齐 workflow 的结果对照链路。当前 `Pipeline Diagnostics` 已新增直达 `#analyze` 的锚点，历史 `Analyses` 区块也会对最近 workflow 对应的 analysis 记录显示 `latest workflow` badge 和高亮边框。这样最近一条 workflow 的 analyses、pattern、draft 三层产物都能在历史区块里自动定位。经验证，App 与 API build 均通过
- **第七十三轮增强**：补齐最近 workflow 的输入样本对照。当前 `Pipeline Diagnostics` 已新增直达 `#samples` 的锚点，历史 `Samples` 区块也会对最近 workflow 输入样本显示 `latest workflow` badge 和高亮边框。至此，最近一条 workflow 的 `samples -> analyses -> pattern -> draft` 四层都能在历史区块里自动定位。经验证，App 与 API build 均通过
- **第七十四轮增强**：把 workflow 诊断继续压缩成结论层。当前 `WorkflowService` 的 diagnostics 已新增 `workflowVerdict` 与 `workflowSummary`，会综合样本质量、analysis LLM 占比、pattern source/confidence、generate source 和标题产出情况给出 `strong / usable / review` 三档 verdict；前端 `Latest Real Workflow` 面板也已显示该 verdict badge。经验证，API 与 App build 均通过
- **第七十五轮增强**：把 workflow verdict 下沉到 job 列表层。当前 completed workflow job 的 metadata 已会持久化 `workflowVerdict / workflowSummary`，前端最上方 `Workflow Jobs` 卡片也已直接显示 verdict 和 summary。这样不必先展开详细结果区，就能知道最近一次 workflow 是 `strong / usable / review`。经验证，API 与 App build 均通过
- **第七十六轮增强**：继续把 workflow 结果摘要下沉到 job metadata。当前 completed workflow job 已额外持久化 `averageSampleQuality / llmAnalysisCount / fallbackAnalysisCount / localAnalysisCount / patternSource / generationSource / patternConfidence` 等关键摘要，前端 `Workflow Jobs` 卡片也已显示其中最核心的几项。这样列表层不只是 verdict 标签，而是已经有基础健康摘要可读。经验证，API 与 App build 均通过
- **第七十七轮增强**：补上 workflow 的重跑动作。当前 API 已新增 `POST /workflow/jobs/rerun-latest`，会直接复用最近一条 workflow job 里记录的 `targetJobId / providerId / sampleLimit / forceReanalyze / goal / tone / targetAudience` 重新排一条新任务；前端 `Workflow Jobs` 卡片也已新增 `Re-run Latest Workflow` 按钮。这样后面验证自研链路的改动时，不需要每次手工重新填写 workflow scope。经验证，API 与 App build 均通过
- **第七十八轮增强**：把样本主展示面板扩成最新 10 条，便于直接审核一整屏真实样本。同时完成了一次真实 `AI教育` latest 10 联调，任务 `job_0e805361` 已明确暴露出当前存储的小红书 Cookie 失效问题：搜索接口返回 `code=-101`、`msg=无登录信息，或登录信息为空`。这轮没有伪造新数据，而是确认现有失败诊断链路可用，并保留已有 `AI教育` 样本作为当前展示内容。经验证，前端 build 通过，API 在 `VIRALLAB_ENABLE_REAL_COLLECTOR=true` 下启动通过
- **第七十九轮增强**：前端控制台改为中英双语，并将默认语言切换为中文。当前登录页和已登录工作台侧边栏均已支持 `中文 / EN` 切换；主导航、工作流、质量诊断、采集器状态、采集任务、样本、分析、Pattern、生成和顶部统计卡片等主要静态界面文案已完成双语化。业务原始内容与模型输出保持原文，不做强翻译。经验证，前端 build 与 API build 均通过
