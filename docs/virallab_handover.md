# ViralLab Handover

## Current State

ViralLab now has a runnable local MVP inside:

- [modules/virallab](/Users/jordanwang/YOLO/ai-marketing-system/modules/virallab)

It is no longer just a scaffold. The local MVP can already demonstrate:

1. create collection job
2. generate Xiaohongshu samples
3. analyze samples
4. extract a pattern
5. generate a draft

In addition, the `real` Xiaohongshu collector now launches Playwright and produces structured diagnostics plus screenshot/HTML artifacts for debugging.
Collection jobs now run asynchronously inside the API process, so the create-job request returns immediately and the UI can poll job state.
Platform accounts can now verify whether a saved Xiaohongshu cookie is still valid before running real collection.
Real collection is now explicitly blocked unless the saved cookie has reached `verified` state.
Exception: a newly saved cookie in `saved` state will now be auto-verified on the first real collection attempt.

## Important Paths

- Frontend app:
  - [App.tsx](/Users/jordanwang/YOLO/ai-marketing-system/modules/virallab/app/src/App.tsx)
- API entry:
  - [main.ts](/Users/jordanwang/YOLO/ai-marketing-system/modules/virallab/api/src/main.ts)
- File-backed store:
  - [store.service.ts](/Users/jordanwang/YOLO/ai-marketing-system/modules/virallab/api/src/store/store.service.ts)
- Platform account API:
  - [platform.service.ts](/Users/jordanwang/YOLO/ai-marketing-system/modules/virallab/api/src/platform/platform.service.ts)
- Real collector bridge:
  - [xiaohongshu.collector.ts](/Users/jordanwang/YOLO/ai-marketing-system/modules/virallab/api/src/collect/xiaohongshu.collector.ts)
  - [run-xiaohongshu-collector.js](/Users/jordanwang/YOLO/ai-marketing-system/modules/virallab/worker/src/run-xiaohongshu-collector.js)
- API module map:
  - [app.module.ts](/Users/jordanwang/YOLO/ai-marketing-system/modules/virallab/api/src/app.module.ts)
- Design doc:
  - [virallab_v1_design.md](/Users/jordanwang/YOLO/ai-marketing-system/docs/virallab_v1_design.md)
- Dev log:
  - [virallab_development_log.md](/Users/jordanwang/YOLO/ai-marketing-system/docs/virallab_development_log.md)

## How To Run

Install:

```bash
npm install --prefix modules/virallab/app
npm install --prefix modules/virallab/api
npm install --prefix modules/virallab/worker
```

Run API:

```bash
npm run virallab:api
```

Run frontend:

```bash
npm run virallab:app
```

Run worker:

```bash
npm run virallab:worker
```

Enable real collector in API:

```bash
cd modules/virallab/api
cp .env.example .env
# then set VIRALLAB_ENABLE_REAL_COLLECTOR=true
```

Install Playwright browser once:

```bash
cd modules/virallab/worker
npx playwright install chromium
```

## MVP Storage

The current MVP uses local JSON persistence instead of a real DB.

Data file:

- `modules/virallab/api/data/virallab-mvp.json`

This is intentional for speed. It removes the need for immediate database setup and lets the full flow be demoed locally.

## Database Mirror

- ViralLab now has an SQLite / Prisma mirror path for local persistence evolution
- Main schema:
  - `modules/virallab/api/prisma/schema.prisma`
- Prisma runtime module:
  - `modules/virallab/api/src/database/database.module.ts`
  - `modules/virallab/api/src/prisma.service.ts`
- Mirror behavior:
  - JSON file remains the source of truth for runtime reads/writes
  - after every write, `store.service.ts` mirrors the latest snapshot into SQLite
  - when mirror is enabled, startup also syncs the existing JSON snapshot into SQLite once
- Enable it with:
  - `VIRALLAB_ENABLE_DB_MIRROR=true`
  - `DATABASE_URL=file:./prisma/dev.db`
- Local DB bootstrap:
  - `cd modules/virallab/api`
  - `npm run prisma:generate`
  - `npm run db:init:sqlite`
- Current note:
  - `prisma db push` is still unreliable in this environment due a schema engine error
  - `db:init:sqlite` is the working local bootstrap path

## Demo User

- email: `demo@virallab.local`
- password: `demo123456`

The frontend now has a working login flow and local token persistence. The default demo account is enough to explore the full local MVP.

## Known Gaps

- Collector now has two modes:
  - `mock`: runnable local MVP mode
  - `real`: Playwright collector body exists, but real success still depends on a valid Xiaohongshu login cookie
- Collection execution is now async, but still runs in-process instead of a dedicated queue worker
- Analyzer now prefers Doubao/Ark JSON output and falls back to local rules on failure
- Pattern extraction now prefers Doubao/Ark JSON output and falls back to local templates on failure
- Generator now prefers Doubao/Ark JSON output and falls back to local templates on failure
- No queue system yet
- DB mirror exists, and some runtime reads now use Prisma when mirror is enabled:
  - auth session resolution / `auth/me`
  - platform account list
  - overview stats
  - collect jobs / job detail
  - collect capabilities
  - collect debug summary
  - samples list/detail
  - analysis list/detail
  - pattern list/detail
  - generation job/detail endpoints
- Some runtime writes are now Prisma-first when mirror is enabled:
  - auth register / login / logout
  - platform cookie save / verify
- Frontend now has local auth flow, but deep route protection is still incomplete

## LLM Integration

- Shared LLM client:
  - `modules/virallab/api/src/llm/llm.service.ts`
- Env vars:
  - `VIRALLAB_USE_LLM=true`
  - `LLM_BASE_URL`
  - `LLM_API_KEY`
  - `LLM_MODEL`
  - `LLM_TIMEOUT_MS`
- ViralLab currently reuses the same Ark-compatible configuration shape as `RiskRadar`
- Verified live behavior:
  - `POST /api/virallab/analyze/jobs` can return `promptVersion: analyze.v2.llm`
  - `POST /api/virallab/patterns/extract` can return an LLM-derived pattern object
  - `POST /api/virallab/generate/jobs` can return `promptVersion: generate.v2.llm`
  - when Ark is slow or unavailable, both endpoints degrade back to the local MVP implementation instead of failing hard
- Generation specifically needed a longer timeout budget than analysis; the current code uses a per-request 45s timeout for generation calls
- Pattern extraction currently uses a 30s timeout budget

## AI Auditability

- Analyses, patterns, and generated contents now expose:
  - `modelName`
  - `promptVersion`
  - `fallbackStatus`
  - `fallbackReason`
- `fallbackStatus` meanings:
  - `llm`: direct Ark/Doubao output
  - `local-fallback`: LLM call was attempted but the system returned the local fallback output
  - `local-only`: local MVP output or historical migrated record
- Historical file-backed records are normalized on startup by `store.service.ts`, so older local data will not break the frontend
- Frontend surfaces these fields directly in the Analyze / Pattern / Generate panels

## Real Collector Debugging

- Worker artifacts:
  - `modules/virallab/worker/artifacts/*.png`
  - `modules/virallab/worker/artifacts/*.html`
- Cookie verification endpoint:
  - `POST /api/virallab/platform-accounts/xiaohongshu/verify`
- Real collection guardrail:
  - `POST /api/virallab/collect/jobs` with `collectorMode=real` is blocked when cookie status is only `saved` or already `invalid`
  - except that `saved` now triggers one automatic verification attempt first
- Frontend debug surface:
  - platform account cards now expose verification reason, state feed counts, and latest artifact path
  - a dedicated `Collector Debug` panel now aggregates the latest verification and latest real collect job
  - the panel now also shows captured network response count and the first matched search API URL
  - it now also exposes search API auth failure code/message when available
- When `collectorMode=real` fails, the collection job metadata now includes:
  - `reason`
  - `diagnostics.title`
  - `diagnostics.href`
  - `diagnostics.bodyTextSample`
  - `diagnostics.stateSummary`
  - selector counts
  - artifact paths
- Current verified behavior with an invalid cookie:
  - Playwright launches successfully
  - cookie verification returns `login-required`
  - platform account is marked `invalid`
  - capabilities report `canCollect: false`
  - real collect is blocked before queueing after the auto-verification attempt fails
  - collector reaches Xiaohongshu search page
  - collector returns `no-cards-extracted` instead of crashing
  - screenshot and HTML artifacts are written for diagnosis
  - diagnostics now include `searchFeedCount/homeFeedCount` so later tuning can distinguish state-level empty feeds from DOM extraction failures

## Recommended Next Work

1. Replace file storage with real DB-backed persistence
2. Test `collectorMode=real` with a valid Xiaohongshu cookie and refine note extraction rules against real cards
3. Move the in-process async collector execution to a dedicated queue/worker flow
4. Persist full prompt/request logs for auditability
5. Reduce the remaining JSON mirror responsibilities inside `store.service.ts` now that `auth + platform + collect` are Prisma-first
6. Test `collectorMode=real` with a valid Xiaohongshu cookie and refine note extraction rules against real cards
7. Extend auth from local MVP session handling to real protected workflow
8. Add filtering and sorting by `fallbackStatus` in the frontend

## Latest Migration Status

- Prisma-first writes now cover:
  - auth register / login / logout
  - platform cookie save / verify
  - collect job creation
  - collect job runtime status changes
  - collect sample insertion
  - collect audit log insertion
  - auto-verification status updates for saved Xiaohongshu cookies
- JSON is still synchronized after these writes so the existing MVP file store stays compatible during migration
- Verified on `collectorMode=mock`:
  - `POST /api/virallab/collect/jobs` returns `pending`
  - background runner advances the job to `completed`
  - new rows appear in SQLite:
    - `CollectionJob`
    - `ContentSample`
    - `AuditLog`
  - `GET /api/virallab/collect/jobs/:jobId` reads the completed job and new samples back successfully
- Prisma-first writes now also cover:
  - analyze result creation
  - pattern creation
  - pattern source relation creation
  - generation job creation
  - generated content creation
- Verified on local mode:
  - `POST /api/virallab/analyze/jobs` inserts new `AnalysisResult` rows
  - `POST /api/virallab/patterns/extract` inserts new `Pattern` and `PatternSource` rows
  - `POST /api/virallab/generate/jobs` inserts new `GenerationJob` and `GeneratedContent` rows
- `store.service.ts` has now been reduced from "always full mirror after each write" to a compatibility layer:
  - `write()` and `mutate()` now default to JSON-only persistence
  - full snapshot sync to Prisma only happens during initialization or explicit `syncFileToPrisma()`
  - this prevents Prisma-first runtime writes from repeatedly rebuilding the full SQLite dataset
- Source-of-truth lookup has also moved further toward Prisma:
  - collector recovery on startup now reads recoverable jobs from Prisma
  - analyze job creation now resolves samples/existing analyses from Prisma
  - pattern extraction now resolves analyses/samples from Prisma
  - generation job creation now resolves pattern/user from Prisma
- Auth and platform compatibility logic is now more centralized:
  - auth JSON synchronization is handled by dedicated user/session helpers
  - platform JSON synchronization is handled by dedicated account/audit helpers
  - default user resolution for platform flows now goes through a shared `resolveUserId()` helper
- Startup consistency fix:
  - `ViralLabStoreService` now initializes itself on module startup
  - JSON -> Prisma bootstrap sync is now reliably triggered even after collector startup recovery moved to Prisma reads
  - Prisma bootstrap sync explicitly ensures the Prisma client is connected first
- Real Xiaohongshu login has now been validated end-to-end:
  - a real scanned login session was attached from an isolated Chrome profile
  - cookie capture succeeded
  - cookie verification succeeded
  - a real collect job completed successfully
  - one real sample was inserted into `ContentSample`
  - the real sample was then analyzed successfully through the analyze API
- Real collector extraction quality has now improved:
  - `search/notes` payload structure was inspected directly
  - network extraction now parses `data.items[].note_card`
  - real collect has improved from 1 inserted sample to 5 inserted samples on the same keyword flow
- A new real-workflow shortcut now exists:
  - `POST /api/virallab/workflow/latest-real-pipeline`
  - it takes the latest completed real collect job and runs:
    - analyze
    - pattern extraction
    - generation
  - this is intended to remove manual API choreography during real-data demos
- ViralLab now also auto-loads LLM configuration from:
  - `modules/virallab/api/.env`
  - and falls back to `modules/RiskRadar/server/.env`
  - this allows Ark / Doubao reuse without duplicating credentials
- Verified latest real workflow result:
  - based on real job `job_ba52f894`
  - Pattern output is now returning from Ark LLM:
    - `pattern_f34ae4a8`
    - `promptVersion=patterns.v2.llm`
    - `fallbackStatus=llm`
  - Generated content output is also returning from Ark LLM:
    - `content_f68ff7c2`
    - `promptVersion=generate.v2.llm`
    - `fallbackStatus=llm`
- Remaining gap after this round:
  - old real samples that were analyzed before LLM env inheritance still keep historical fallback/local analyses
  - if needed, add a forced re-analyze path for real samples
- Forced re-analyze is now implemented:
  - `POST /api/virallab/analyze/jobs`
  - body now supports `forceReanalyze=true`
  - when enabled, old analyses for the same sample are removed before rebuilding
- The real workflow now also uses forced re-analysis by default unless explicitly disabled:
  - `POST /api/virallab/workflow/latest-real-pipeline`
  - `forceReanalyze` defaults to `true`
- Verified result:
  - the 5 real samples from `job_ba52f894` were re-analyzed successfully through Ark
  - latest analysis rows now show:
    - `promptVersion=analyze.v2.llm`
    - `fallbackStatus=llm`
- Additional persistence fix:
  - startup JSON -> Prisma sync now filters invalid `PatternSource` references
  - this prevents bootstrap crashes when old patterns still point at superseded analyses
- Real workflow is now available in async form:
  - `POST /api/virallab/workflow/jobs`
  - `GET /api/virallab/workflow/jobs`
  - `GET /api/virallab/workflow/jobs/:workflowJobId`
- This async workflow layer currently uses the JSON compatibility store only
- Verified behavior:
  - creating a workflow job returns `pending` immediately
  - the job then transitions to `running`
  - detail responses expose:
    - source real collect job id
    - stage message
    - eventual pattern/content ids when completed
- Frontend behavior has been updated accordingly:
  - `Run Latest Real Pipeline` now queues an async workflow job
  - the console refresh loop now watches workflow jobs as well as collect jobs
- Async workflow jobs now expose stage-level progress in metadata:
  - `stage`
  - `message`
  - `sampleIds`
  - `analysisIds`
  - `patternId`
  - `contentId`
- Verified running-state example:
  - `workflow_054929d9`
  - `status=running`
  - `progress=35`
  - `stage=analyzing`
  - `message=Analyzing 1 samples.`
- Analyze-stage granularity is now finer:
  - workflow messages now include sample index and title
  - example:
    - `workflow_a0bde031`
    - `message=Analyzing 1/3 · 硅谷的AI高管们是这么规划孩子未来的~`
- Generate-stage output signaling is now also better:
  - workflow metadata now includes `patternId` and `contentId` as soon as generation finishes
  - a dedicated `generation_completed` stage now exists before the final `completed`
  - frontend workflow cards render those ids directly
- Pattern-stage signaling is now also more granular:
  - `pattern_inputs_ready`
  - `pattern_persisted`
- Real sample field quality has also been improved:
  - network payload parsing now filters date-like tags such as `03-04`
  - publish time resolution now checks multiple note-card time fields and can fall back to date-like tag parsing
  - fallback summaries now include:
    - author
    - publish date
    - like / comment / collect / share counts
    - tags when available
  - title-based keyword extraction now supplements missing hashtags for search-note samples
- Latest verification run:
  - real collect job `job_858c24d0` completed successfully
  - still extracted `5` samples from `search/notes`
  - sample quality improved versus the earlier `job_ba52f894` batch:
    - no date-only tags persisted
    - `publishTime` reflects note dates
    - summaries are now readable structured fallbacks instead of generic `AI教育 搜索结果摘要`
- A safe note-detail enrichment layer now exists in the worker:
  - it opens each matched `sourceUrl` and attempts to read note detail content
  - however, Xiaohongshu detail pages currently mix target-note and recommendation state, so naive enrichment can corrupt titles/authors
  - the implementation was tightened so that:
    - note detail matching is constrained by noteId from `sourceUrl`
    - detail pages do not override `title / authorName / publishTime / metrics`
    -正文 is only accepted when the detail title and the original sample title clearly align
- Latest safety verification:
  - exploratory run `job_ba886aa5` exposed the corruption risk and informed the tighter guardrails
  - safe-mode run `job_8f2e8757` completed with:
    - `extractedCount=5`
    - `detailEnrichedCount=0`
  - result: search-sample integrity was preserved and no fields were polluted by the detail-page pass
- Detail API probing is now built into the real collector itself:
  - worker metadata now includes `detailApiProbe`
  - current probe target:
    - `edith.xiaohongshu.com/api/sns/h5/v1/note_info?note_id=...`
- Verified probe run:
  - real collect job `job_46050621`
  - still extracted `5` samples successfully
  - `detailApiProbe` probed the first 2 note ids
  - current result is consistent:
    - `h5-note-info` returns `HTTP 406`
    - body snippet: `{\"code\":-1,\"success\":false}`
- This is useful because the blocker is now more concrete:
  - the issue is no longer “we do not know where note detail may live”
  - it is now “we have a candidate detail API, but our current PC cookie/header combination is insufficient for it”
- Detail API diagnostics are now richer:
  - the worker probes both:
    - direct request-context `h5-note-info`
    - browser-context `browser-note-info`
  - browser-context probing captures the signed request headers actually emitted by the page, including:
    - `x-s`
    - `x-t`
    - `x-s-common`
    - `x-xray-traceid`
    - `x-b3-traceid`
- Latest direct worker verification after this change:
  - real collect still completed with `extractedCount=5`
  - direct `h5-note-info` still returned `406`
  - browser-context `note_info` now consistently returned:
    - `HTTP 200`
    - `code=0`
    - `success=true`
    - but only minimal `dataKeys`, currently just `note_type`
- Important nuance:
  - even when browser-signed `note_info` succeeds, the page itself may still redirect to a Xiaohongshu `404 / 当前笔记暂时无法浏览` screen
  - so the current blocker is now two-part:
    - request signing requirements
    - note/page visibility restrictions
- Detail probing now also tests whether browser-captured signed headers can be replayed outside the page:
  - `detailApiProbe` now includes:
    - `discoveredResponses`
    - `signedReplay`
- Latest result:
  - replaying the browser-captured `x-s / x-t / x-s-common / x-xray-traceid / x-b3-traceid` in request-context does not reproduce richer detail data
  - the replay currently returns:
    - `HTTP 461`
    - `code=0`
    - `success=true`
    - `data={}`
- This sharpens the conclusion:
  - signed headers alone are not enough to reproduce the browser’s detail behavior
  - page context / runtime state appears to matter
  - and no second richer detail API has yet been observed during note-page navigation
- Search-page routing is now also probed automatically:
  - `detailApiProbe` now includes `search-page-note-route`
  - this opens the keyword search page, finds the target note link, and records the related `edith` responses while routing from search results into the note
- Latest search-route observation:
  - it discovers additional search-layer APIs such as:
    - `search/onebox`
    - `search/filter`
    - `search/recommend`
    - `search/notes`
    - `board/user`
  - but it still does not expose a richer note-detail payload
  - target `note_info` remains `461` with empty `data`
- Browser probe now also includes an active page-context signed request test:
  - `browser-note-info.pageSignedFetch`
  - it calls `window._webmsxyw(url, "GET")` inside the page
  - then retries `note_info` via both:
    - `fetch`
    - `XMLHttpRequest`
- Latest verified result:
  - `_webmsxyw` does generate `x-s / x-t`
  - but page-context active requests still return:
    - `HTTP 406`
    - `{\"code\":-1,\"success\":false}`
- This matters because it narrows the problem again:
  - the browser’s automatic request path is not equivalent to simply “generate `x-s/x-t` and call fetch”
- Page-environment findings are now clearer:
  - no obvious `axios` or exposed interceptor object has been found on `window`
  - the visible request-relevant globals are mainly:
    - native `fetch`
    - native `XMLHttpRequest`
    - `_webmsxyw`
    - `xsecappid`
    - `xsecappvers`
    - `xsecplatform`
- `browser-note-info.pageSignedFetch` now also tests `xsec*` explicitly:
  - it records:
    - `xsecHeaders`
    - `fetchWithXsecResult`
    - `xhrWithXsecResult`
- Latest result:
  - even with `x-s / x-t + xsecappid / xsecappvers / xsecplatform`, active page-context requests still return `406`
- We now also explicitly test whether the automatic `note_info` request ever passes through JS-layer `fetch/XHR`:
  - the browser probe page installs hooks for:
    - `window.fetch`
    - `XMLHttpRequest`
  - it records:
    - `preSignedJsRequestHooks`
    - `jsRequestHooks`
    - `automaticRequestBypassedJsHooks`
- Latest verified result:
  - network still sees the automatic `note_info`
  - but before our own active probe runs:
    - `preSignedJsRequestHooks = []`
    - `automaticRequestBypassedJsHooks = true`
- Practical implication:
  - the automatic request is not obviously going through a normal JS `fetch/XHR` call path we can intercept from page script
- CDP initiator tracing now gives a more precise picture:
  - `browser-note-info` now includes:
    - `cdpInitiators`
    - `automaticRequestStackSummary`
- Latest verified result:
  - the automatic `note_info` request is actually:
    - `initiator.type = script`
    - request `type = XHR`
  - stack frames clearly include Xiaohongshu’s bundled request path:
    - `dispatchXhrRequest`
    - `xhrAdapter`
    - `dispatchRequest`
    - `xhrByBridgeAdapter`
    - `library-axios.4d38c57d.js`
    - `vendor-dynamic.1f7e7d2e.js`
- Important nuance:
  - so the automatic request is not “non-script magic”
  - it is script-driven, but through an internal bundled axios/bridge layer that our page-level hook did not capture cleanly
- I also used online GitHub references to tighten the local diagnostics rather than guessing:
  - a useful public reference was:
    - `Cloxl/xhshow`
  - it treats `a1`, `web_session`, `webId`, and `x-s-common` as key signature inputs
- Based on that, the worker now records `detailApiProbe.cookieSignatureInputs`
- Latest verified result for the current real login state:
  - required signature cookies are all present:
    - `a1`
    - `web_session`
    - `webId`
  - optional but useful cookies are also present:
    - `gid`
    - `abRequestId`
    - `acw_tc`
  - `allRequiredPresent = true`
- This is useful because it rules out another basic failure mode:
  - the current detail problem is not simply “missing fundamental signing cookies”
- The online-signing clue around full header sets also proved useful:
  - `browser-note-info.pageSignedFetch` now retries `note_info` with the full captured automatic request headers, not just `x-s / x-t`
  - this includes:
    - `x-s-common`
    - `x-xray-traceid`
    - `x-b3-traceid`
    - plus `xsec*` when available
- Latest verified result:
  - page-context `fetch/XHR` with only generated `x-s/x-t` still yielded `406`
  - page-context `fetch/XHR` with the full captured automatic headers now yields:
    - `HTTP 461`
    - `code=0`
    - `success=true`
    - but still `data={}`
- Practical implication:
  - complete header replay matters
  - but header replay alone still does not unlock a full note detail payload
- Additional candidate-detail probing now also covers `web/v1/feed`-style endpoints:
  - `GET /api/sns/web/v1/feed?note_id=...`
  - `GET /api/sns/web/v1/feed?source_note_id=...`
  - `POST /api/sns/web/v1/feed` with `{ note_id }`
- Latest verified result:
  - both GET variants return `404`
  - the POST variant returns `406`
- Practical implication:
  - this common “feed-by-note-id” guess does not currently look like the correct detail endpoint either
- A more practical path is now in place for body extraction:
  - the worker now tries `enrichSamplesFromSearchModal(page, samples, keyword)` before the older detail-page fallback
  - this path was informed by public DOM-based implementations such as `RedNote-MCP`
  - it works by:
    - locating `section.note-item` that contains the hidden `/explore/{noteId}` marker
    - clicking the visible `a.cover.mask.ld` or `a.title` trigger inside that section
    - extracting body text from the search-page note modal using selectors like `#detail-title` and `#detail-desc .note-text`
- Latest verified result with the current real login state:
  - `modalEnrichment.modalOpenCount = 5`
  - `modalEnrichment.detailEnrichedCount = 5`
  - overall `detailEnrichedCount = 5`
  - real samples now contain full note body text instead of only search-result summaries
- Practical implication:
  - real body extraction is now working through the search-page modal route
  - the next detail-related work no longer blocks on `note_info`
  - further API reverse-engineering can continue in parallel as a robustness improvement, not as the only body-extraction path
- The sample model now also stores media resources formally:
  - `ContentSample` has been extended with:
    - `mediaImageUrlsJson`
    - `mediaVideoUrlsJson`
  - corresponding API/store paths have been updated so these arrays survive:
    - Prisma mirror
    - JSON compatibility layer
    - sample listing and collect job detail responses
- Real-worker extraction now captures:
  - `.media-container img`
  - `.media-container video`
  - video `poster` values are also merged into the image array
- One practical cleanup was added:
  - browser-local `blob:` video URLs are now filtered out
  - only reusable media URLs are kept
- Latest verified result:
  - real samples now include usable CDN image URLs
  - `coverImageUrl` aligns with the first extracted image
  - `mediaVideoUrls` no longer contain meaningless `blob:` entries
- The app shell has now been updated to expose these richer samples directly:
  - the `Samples` panel now shows:
    - author
    - publish time
    - body excerpt
    - cover image
    - media counts
    - source URL
  - the `Collection Jobs` panel also shows modal-enrichment counters:
    - `modal opens`
    - `modal enriched`
- Practical implication:
  - the user can now evaluate real sample quality directly in the console
  - no JSON inspection is required to confirm whether body enrichment is working
- Real samples now also carry stable platform identifiers:
  - `platformContentId` is now filled from the Xiaohongshu note id
  - `authorId` is now extracted from the upstream user object when available
  - modal-route publish times are normalized into ISO strings before persistence
- Latest verified result for the first real sample:
  - `platformContentId = 69a6883a000000001a02b3e0`
  - `authorId = 642e876e000000001201368a`
  - `publishTime = 2026-03-03T00:00:00.000Z`
- Practical implication:
  - deduplication, source tracking, and future per-author analysis are now on firmer ground
- Analyze and Pattern no longer treat samples as title/body-only inputs:
  - `AnalyzeService` now pulls these additional sample fields into the LLM payload and local fallback:
    - `platformContentId`
    - `authorId`
    - `publishTime`
    - `sourceUrl`
    - `coverImageUrl`
    - `mediaImageUrls`
    - `mediaVideoUrls`
  - a new `inferContentFormat()` helper now classifies the sample as:
    - `video-note`
    - `multi-image-note`
    - `single-image-note`
    - `long-text-note`
    - `text-first-note`
  - the Analyze LLM payload now explicitly includes:
    - `author`
    - `publishing`
    - `contentFormat`
    - `media`
  - Analyze prompt version has been bumped to:
    - `analyze.v3.llm`
- Pattern extraction now also consumes richer sample context:
  - `PatternsService` now passes through:
    - `platformContentId`
    - `contentText`
    - `authorName/authorId`
    - `publishTime`
    - `sourceUrl`
    - media counters and cover image
  - Pattern prompt version has been bumped to:
    - `patterns.v3.llm`
  - the local fallback pattern builder now also considers:
    - whether the sample set is video-heavy
    - whether the set carries explicit freshness/timing signals
- Latest build verification:
  - `modules/virallab/api` build passed
  - `modules/virallab/app` build passed
- Practical implication:
  - future Pattern and Generate quality is less dependent on title/body alone
  - the next worthwhile step is to improve upstream sample tag quality and then rerun the real pipeline on the richer sample set
- The collection layer has now been standardized around provider abstractions:
  - a shared collector contract now exists for:
    - `collect()`
    - `verifyCookie()`
    - `getReadiness()`
  - current concrete provider ids are:
    - `mock-local`
    - `xiaohongshu-playwright`
    - `xiaohongshu-managed`
- Practical effect of this provider refactor:
  - `CollectService` no longer hardcodes only `mock` vs `playwright`
  - job creation can now accept a `providerId`
  - job metadata is now normalized around provider ids
  - capabilities now expose a third slot:
    - `managed`
  - this slot is currently a stub and intentionally returns `provider-not-configured`
- Why this matters:
  - it creates a clean landing zone for future managed scraping integrations such as XCrawl-like services
  - it also reduces the risk of further collector logic turning into more `if/else` branching as more providers are introduced
- Latest build verification:
  - `modules/virallab/api` build passed
  - `modules/virallab/app` build passed
- The app shell now exposes the provider abstraction directly:
  - the collection form now carries `providerId`
  - switching `collectorMode` also switches the default provider:
    - `mock -> mock-local`
    - `real -> xiaohongshu-playwright`
  - the UI can now explicitly choose:
    - `xiaohongshu-playwright`
    - `xiaohongshu-managed`
  - the readiness panel now shows three cards:
    - Mock Collector
    - Real Collector
    - Managed Collector
  - collection jobs now surface the selected provider id in the list view
- Practical implication:
  - the managed-provider path is now visible and testable from the UI, even though the backend implementation is still a stub
  - the next implementation step can focus on plugging in a real managed provider instead of wiring more frontend/backoffice plumbing
- `xiaohongshu-managed` is no longer a pure stub:
  - it now implements a real XCrawl-style HTTP integration in:
    - `/Users/jordanwang/YOLO/ai-marketing-system/modules/virallab/api/src/collect/managed.collector.ts`
  - current runtime model:
    - builds a Xiaohongshu `search_result` URL from the keyword
    - calls XCrawl `POST /scrape`
    - enables JS rendering
    - uses `json.prompt + json_schema`
    - maps the remote JSON result back into `CollectedSampleInput`
- Config that now exists for this provider:
  - `VIRALLAB_ENABLE_MANAGED_COLLECTOR`
  - `XCRAWL_BASE_URL`
  - `XCRAWL_API_KEY`
  - `XCRAWL_TIMEOUT_MS`
- Real-job gating has also been split correctly:
  - `xiaohongshu-playwright` still requires the local saved Xiaohongshu cookie
  - `xiaohongshu-managed` no longer gets blocked by local-cookie verification
  - it now depends on provider readiness instead
- Current status:
  - code path exists
  - API/app builds pass
  - live validation still requires a real `XCRAWL_API_KEY`
- Managed-provider normalization has now been made more tolerant:
  - the code no longer assumes XCrawl will always return `json.items`
  - it now extracts arrays from:
    - `items`
    - `results`
    - `notes`
    - `cards`
    - `list`
    - including nested `data.*`
  - field normalization is also broader now:
    - title/body/author/source/tag/media aliases are all handled more defensively
  - count parsing now understands values like:
    - `1.2万`
    - `2.5k`
  - metadata now records:
    - `rawItemCount`
    - `normalizedItemCount`
- Practical implication:
  - the first live XCrawl integration test is less likely to fail just because the remote JSON shape differs from the initial ideal schema
- Managed-provider fallback behavior has also been strengthened:
  - the XCrawl request now asks for:
    - `json`
    - `markdown`
    - `html`
    - `links`
    - `screenshot`
  - if structured JSON extraction produces no usable items, the provider now falls back to:
    - extracting Xiaohongshu `/explore/{id}` links from `links`
    - generating skeletal samples from those links
    - filling `contentSummary` from markdown/html text snippets
  - new metadata now records:
    - `fallbackItemCount`
    - `fallbackUsed`
    - `markdownCaptured`
    - `htmlCaptured`
    - `linksCaptured`
- Practical implication:
  - even if XCrawl's `json_schema` extraction underperforms, the managed provider now has a second route to avoid returning a completely empty result set
- A real gap has also been closed:
  - the provider now truly requests `markdown/html/links` from XCrawl, instead of only having fallback code that expected them
  - markdown and html are now also scanned directly for `/explore/{noteId}` links, so the fallback path does not depend solely on the remote `links` array being well-formed
- Provider visibility has now been pushed down to the sample layer:
  - `SamplesService` now derives a `provider` field for each sample from the parent collection-job metadata
  - this works in both:
    - Prisma-backed reads
    - JSON compatibility reads
  - the app now shows this provider in the `Samples` panel and also aggregates source counts in a `Sample Sources` panel
- Practical implication:
  - once `xiaohongshu-managed` starts producing live samples, the console can immediately compare provider-origin mix and sample volume without extra debug tooling
- Job-level provider diagnostics are now also visible in the app:
  - `Collection Jobs` now surfaces managed-provider quality indicators such as:
    - `normalizedItemCount`
    - `fallbackItemCount`
    - `fallbackUsed`
    - `linksCaptured`
    - `markdownCaptured`
    - `htmlCaptured`
  - the workspace also now includes a `Provider Diagnostics` panel that aggregates these metrics per provider
- Practical implication:
  - once XCrawl credentials are added, we can immediately tell whether managed collection quality is coming from structured JSON extraction or mostly from fallback paths
- Provider-awareness has now also reached the workflow layer:
  - workflow requests can now carry `providerId`
  - latest-real-pipeline jobs persist that provider choice in workflow metadata
  - source-job resolution now filters by provider when requested
  - workflow result hydration also preserves that provider selection
- Practical implication:
  - once both `xiaohongshu-playwright` and `xiaohongshu-managed` produce real jobs, we can run separate Analyze/Pattern/Generate pipelines for each provider instead of mixing their samples
- The app now exposes this workflow scoping explicitly:
  - a dedicated `Workflow Scope` panel now controls:
    - `providerId`
    - `sampleLimit`
    - `forceReanalyze`
  - this is separate from the collection form, so provider-scoped experiments no longer depend on hidden coupling to the current collect-form selection
- Sample quality scoring is now visible end-to-end for the self-hosted path:
  - `SamplesService` derives:
    - `qualityScore`
    - `qualityFlags`
  - this is computed at API response time, so no schema migration was required
  - current checks focus on the fields that matter most for self-built Xiaohongshu quality:
    - stable content id
    - author identity
    - publish time
    -正文/摘要长度
    - cover/media presence
    - tags presence
    - canonical `/explore/` source URL
- The app now surfaces this quality layer directly:
  - each sample card shows `Quality xx/100`
  - top missing-field flags are displayed inline
  - a new `Sample Quality` panel aggregates:
    - average score
    - strong sample count
    - weak sample count
    - most common quality gaps
- Practical implication:
  - the next round of self-hosted collector work can target the highest-frequency missing fields instead of manually inspecting raw samples one by one
- The self-hosted collector now has a stronger normalization layer aimed directly at those quality gaps:
  - publish-time parsing now supports:
    - `刚刚 / 刚才`
    - `x分钟前 / x小时前 / x天前`
    - `今天 / 昨天 / 前天`
    - `MM月DD日`
    - `YYYY年MM月DD日`
    - common prefixes such as `编辑于 / 发布于 / 发表于`
  - tag normalization is now shared across collection paths:
    - generic low-value words are filtered
    - date-like tags are filtered
    - title keywords and hashtags are merged in a controlled way
  - this has been applied to:
    - DOM-card extraction
    - `__INITIAL_STATE__` fallback
    - `search.feeds` fallback
    - search-modal enrichment
    - note-page tag merging
- Practical implication:
  - the `Sample Quality` panel should now become a reliable guide for the next self-hosted tuning round, instead of only reflecting raw collector variance
- Quality scoring is now also used for backend sample selection, not only UI display:
  - a shared helper now lives in:
    - `api/src/samples/sample-quality.ts`
  - `AnalyzeService` now chooses default samples by quality-first ordering instead of only taking the most recent 5
  - `WorkflowService` now chooses job samples by:
    - `qualityScore`
    - then `likeCount`
    - then recency
- Practical implication:
  - default Analyze/Pattern/Generate runs should now be more stable because incomplete low-signal samples are deprioritized before they ever reach the LLM
- That quality-first selection is now also visible at the workflow result layer:
  - workflow sample summaries now include `qualityScore`
  - the app shows:
    - average selected-sample quality
    - top selected-sample quality
    - the quality score of each displayed workflow input sample
- Practical implication:
  - when a workflow output looks weak, the operator can now quickly distinguish:
    - weak prompt/model behavior
    - versus weak upstream sample quality
- Workflow diagnostics now also include AI-source health:
  - result payloads now carry a `diagnostics` object with:
    - average/top sample quality
    - counts of `llm / local-fallback / local-only` analyses
    - pattern source
    - generation source
    - pattern confidence
    - generated title/tag counts
- Practical implication:
  - the operator can now judge a weak pipeline run across three layers:
    - input sample quality
    - AI fallback behavior
    - output richness
- Workflow diagnostics now also expose a verdict layer:
  - `strong`
  - `usable`
  - `review`
  plus a short `workflowSummary`
- Practical implication:
  - the operator can scan the latest workflow panel in two passes:
    - first-pass decision via verdict
    - second-pass inspection via detailed diagnostics
- That verdict is now also persisted into workflow-job metadata:
  - completed jobs now carry:
    - `workflowVerdict`
    - `workflowSummary`
- the top `Workflow Jobs` card can therefore show health immediately, without waiting for the operator to inspect the lower result block
- Workflow-job metadata now also persists a lightweight diagnostics summary:
  - average sample quality
  - analysis breakdown counts
  - pattern/generate source
  - pattern confidence
- Practical implication:
  - list-level views and future stats/filters can reuse these values without needing to rehydrate the full result object every time
- A rerun action now exists for workflow validation:
  - API:
    - `POST /workflow/jobs/rerun-latest`
  - behavior:
    - reuses the latest workflow job's stored scope and generation parameters
    - enqueues a fresh workflow job
- Practical implication:
  - repeated validation of the self-hosted pipeline no longer requires manually re-entering provider/sampleLimit/reanalyze settings
- The workflow panel is now also a compact result-review surface:
  - `Pattern Snapshot` shows:
    - source type
    - confidence
    - topic
    - source-sample count
    - description
  - `Generation Snapshot` shows:
    - source type
    - title-candidate count
    - top title candidates
    - top tags
    - cover-copy / generation notes
- Practical implication:
  - a single workflow run can now be reviewed in one place without scrolling down to separate pattern/draft sections
- The latest workflow result is now directly linked back to the historical sections:
  - workflow snapshots now include anchor links to:
    - `#patterns`
    - `#generated`
  - the historical pattern/draft cards now highlight the record that matches the latest workflow result
- Practical implication:
  - operators no longer need to manually compare ids across sections just to find which historical item came from the most recent pipeline run
- That historical-linking now also includes analyses:
  - the workflow diagnostics block links directly to `#analyze`
  - matching analysis cards now show the same `latest workflow` marker and highlight treatment used by patterns/drafts
- Practical implication:
  - the latest workflow's:
    - analyses
    - pattern
    - draft
  can now all be traced visually through the historical sections without manual id matching
- This linking now also includes the workflow input samples:
  - diagnostics now link directly to `#samples`
  - matching sample cards show the same `latest workflow` marker/highlight treatment
- Practical implication:
  - the full latest workflow chain is now visually traceable end-to-end:
    - samples -> analyses -> pattern -> draft
- Live test note:
  - one real collection run for `AI教育` latest 10 was executed against `xiaohongshu-playwright`
  - job id: `job_0e805361`
  - outcome: failed because the currently stored Xiaohongshu cookie is no longer accepted by the search API
  - current API-level signal:
    - `code=-101`
    - `msg=无登录信息，或登录信息为空`
  - the failure is already surfaced in the existing `Collection Jobs` UI along with artifact paths
- UI note:
  - the `Samples` panel now renders the latest 10 samples instead of only 5
  - this is the main place to review the newest `AI教育` sample set once the cookie is refreshed
- Bilingual UI note:
  - the ViralLab web console is now bilingual with a client-side language toggle
  - default locale is Chinese (`zh`)
  - supported locales:
    - Chinese
    - English
  - the toggle exists in both:
    - auth page
    - logged-in header
  - major static console copy is translated, while raw business payloads (sample titles, generated drafts, pattern descriptions, model outputs) intentionally remain source-authentic
- Layout note:
  - the old left sidebar has been removed as a persistent column
  - the logged-in shell now uses a top header so the main dashboard area gets the full width
  - header structure:
    - brand/title on the left
    - nav in the middle
    - user, locale switch, and logout on the right
- User guidance note:
  - added a dedicated Chinese user guide:
    - `docs/virallab_user_guide_zh.md`
  - this guide now documents:
    - how to log in
    - how to capture a valid Xiaohongshu cookie from the browser
    - how to save and verify the cookie in ViralLab
    - what to do when the cookie expires
    - where to review collection outcomes:
      - `Collection Jobs`
      - `Samples`
- In-app help note:
  - the logged-in header now exposes two direct help entries:
    - `使用说明`
    - `Cookie 指引`
  - both open an in-app modal instead of sending users to an external document first
  - this is now the primary end-user guidance surface for:
    - system usage flow
    - cookie capture steps
    - cookie recovery after expiration
    - where collection results should be reviewed
  - the cookie capture section has since been expanded with more explicit user-facing steps:
    - click `Network`
    - trigger or refresh requests
    - filter by `xiaohongshu` or `edith`
    - inspect `Headers -> Request Headers -> cookie`
- Collection UX note:
  - the collection panel now includes a dedicated next-step guidance card directly below the create-job form
  - this card changes based on the latest collection job state:
    - queued/running
    - completed
    - failed
  - the goal is to make it obvious what the user should do immediately after clicking `创建任务`
- Layout restructuring note:
  - the main logged-in workspace has been restructured into a single vertical flow instead of the old multi-column reading order
  - primary order is now:
    1. platform access
    2. collection
    3. samples
    4. analysis/pattern
    5. draft generation
  - secondary and advanced diagnostics have been demoted into a later collapsible block so the main path is easier for end users to follow
- Latest verification note:
  - post-refactor checks completed successfully for the current state:
    - frontend build
    - API build
    - health endpoint
    - demo login endpoint
  - verified responses:
    - `GET /api/virallab/health` -> `ok: true`
    - `POST /api/virallab/auth/login` with demo account -> success token returned
- Collection-filter note:
  - collection form now exposes three production-facing search controls:
    - `排序依据`
      - `热门`
      - `最新`
      - `最多点赞`
      - `最多评论`
      - `最多收藏`
    - `笔记类型`
      - `不限`
      - `图文`
      - `视频`
    - `发布时间`
      - `不限`
      - `一天内`
      - `一周内`
      - `半年内`
  - these values are now forwarded through:
    - app collect form
    - API create-job DTO
    - collection job metadata
    - Xiaohongshu worker payload
- Xiaohongshu multimodal note:
  - Xiaohongshu samples are no longer treated as one flat text type
  - current sample shape now carries:
    - `contentType`
      - `image`
      - `video`
    - `contentFormat`
      - `single-image-note`
      - `multi-image-note`
      - `long-image-note`
      - `video-note`
    - OCR / video enrichment fields:
      - `ocrTextRaw`
      - `ocrTextClean`
      - `transcriptText`
      - `transcriptSegments`
      - `frameOcrTexts`
      - `resolvedContentText`
      - `resolvedContentSource`
- OCR implementation note:
  - V1 long-image OCR is now wired through a local macOS Vision helper:
    - `modules/virallab/worker/src/vision-ocr.swift`
  - worker behavior:
    - download candidate long-image assets
    - run Vision OCR locally
    - clean the OCR output
    - promote OCR text into `resolvedContentText`
  - this is intended for Xiaohongshu long-image notes where page body text is weak but images contain the real payload
- Video implementation note:
  - the environment currently does not have:
    - `ffmpeg`
    - `whisper`
    - `faster-whisper`
  - so video V1 is intentionally implemented as:
    - page/modal playback context
    - frame screenshots
    - Vision OCR on captured frames
    - transcript placeholder derived from visible frame text
  - this means:
    - `frameOcrTexts` is live
    - `transcriptText / transcriptSegments` are now populated from frame OCR when available
    - true ASR is still a follow-up phase, not finished in this round
- Analysis-chain note:
  - OCR/video resolved text is now consumed downstream
  - `SamplesService` quality scoring already prefers `resolvedContentText`
  - `AnalyzeService` now prefers Prisma `parsedPayloadJson.resolvedContentText` over raw `contentText`
  - implication:
    - long-image OCR and video frame OCR now affect both:
      - sample review quality
      - later analysis inputs
- Video-classification fix note:
  - an important Xiaohongshu classification bug was identified from real usage:
    - some obvious video posts were still showing up under `图文`
    - UI could show `1 张图片 · 0 个视频` even for a video diary post
  - root cause:
    - previous video detection relied too heavily on `mediaVideoUrls.length`
    - many Xiaohongshu videos expose a `video` element and poster image, but not a reusable direct video URL
  - current fix:
    - introduced `hasVideoMedia`
    - content type inference now uses:
      - DOM `video` presence
      - state/network note type hints
      - modal/detail page video element presence
    - UI video count now falls back to `hasVideoMedia`
  - implication:
    - note type filtering and sample rendering should now be much closer to the user’s real expectation when selecting `图文` vs `视频`
- Real filter-routing fix note:
  - another deeper mismatch was confirmed from live Xiaohongshu testing:
    - ViralLab form selections such as:
      - `最多点赞`
      - `图文`
      - `一周内`
    - did not previously guarantee the same result set as the real Xiaohongshu page
  - root cause:
    - the worker mostly relied on:
      - default search page payloads
      - then local sort/filter after extraction
    - this is not equivalent to Xiaohongshu’s own search pipeline
  - current fix:
    - the worker now captures real search filter definitions from:
      - `/api/sns/web/v1/search/filter`
    - and intercepts browser-originated:
      - `/api/sns/web/v1/search/notes`
    - before the request is sent, it rewrites:
      - `sort`
      - `note_type`
      - `filters`
    - using Xiaohongshu’s own real filter ids/tags
  - confirmed mappings from live traffic:
    - `图文 -> note_type=2 / 普通笔记`
    - `视频 -> note_type=1 / 视频笔记`
    - `最多点赞 -> popularity_descending`
    - `一周内 -> filter_note_time=一周内`
  - implication:
    - collection is now much closer to:
      - “ask Xiaohongshu for the filtered result set”
    - instead of:
      - “pull default results and guess locally afterward”

- Sample-review UX note:
  - sample cards now surface:
    - title
    - author
    - publish date (date-only)
    - likes / comments / collects / shares
    - Xiaohongshu search hint
  - this was added to let operators verify a sample against the original Xiaohongshu post without manually parsing the raw URL first

- Sample list scope note:
  - the Samples panel now prioritizes samples from the latest collection job
  - this reduces confusion between newly filtered results and older historical jobs
  - numeric engagement counters are also formatted with thousands separators

- UI-driven filter note:
  - the Xiaohongshu worker now applies filters in two layers:
    - primary: click the real page controls (`图文/视频`, `筛选`, `最多点赞`, `一周内`, etc.)
    - secondary: keep request-body rewrite as a fallback alignment layer
  - this was added to follow the product principle that the collector should match what the human user sees on the Xiaohongshu page as closely as possible

- Scan-login note:
  - a new user-facing login path is now available for the self-hosted Xiaohongshu collector
  - instead of forcing users to manually copy cookies, the flow is now:
    - fill collection filters first
    - open Xiaohongshu scan window
    - scan and complete login
    - click `扫码完成并开始抓取`
    - ViralLab captures cookies, verifies them, then automatically creates the current collection job
  - new API endpoints:
    - `POST /platform-accounts/xiaohongshu/scan-login/start`
    - `POST /platform-accounts/xiaohongshu/scan-login/complete`
    - `POST /platform-accounts/xiaohongshu/scan-login/cancel`
  - implementation detail:
    - API side dynamically loads Playwright from:
      - `modules/virallab/worker/node_modules/playwright`
    - this avoids introducing a second Playwright installation in the API package
  - product implication:
    - scan login is now the recommended path
    - manual cookie paste remains available as a fallback only

- Image vs video classification note:
  - do not trust title length or body length as the primary classifier
  - the collector now prioritizes Xiaohongshu search result raw fields:
    - `model_type`
    - `note_card.type`
    - `video_info`
    - `video_info_v2`
  - noise items where `model_type !== note` are now filtered before mapping into samples
  - this directly addresses earlier false positives caused by rec-query or weak heuristic classification

- Current-task-only samples note:
  - the `Samples` panel no longer falls back to old historical results when the newest job has no samples yet
  - users now see only the latest run's samples, or an explicit empty-state message for that run

- Real collector timeout note:
  - the worker bridge now has a hard timeout via `VIRALLAB_REAL_COLLECTOR_TIMEOUT_MS`
  - default is 120 seconds
  - if the Xiaohongshu worker stalls in later enrichment stages, the job should fail explicitly instead of staying `running` indefinitely

- Mode A note:
  - the preferred Xiaohongshu flow is now:
    - fill keyword
    - open scan window
    - manually finish filters inside Xiaohongshu
    - return and click `扫码完成并开始抓取`
  - scan completion now captures:
    - the current result page URL
    - the latest real `search/notes` request payload
  - collection jobs can now carry:
    - `manualSearchPageUrl`
    - `manualSearchRequestData`
  - when present, these become the source of truth for:
    - sort
    - note type
    - publish window
  - this is intended to reduce mismatch between what the user sees in Xiaohongshu and what ViralLab collects

- Login outage note:
  - a local outage occurred because `modules/virallab/api/data/virallab-mvp.json` became truncated/corrupted
  - symptom:
    - API health endpoint was unreachable
    - login failed even with the correct demo password
  - confirmed root cause:
    - API startup depended on parsing the local JSON snapshot
    - the JSON file was no longer valid
  - current fix:
    - API env loading now includes `modules/virallab/api/.env` even when started via `npm --prefix`
    - the JSON snapshot has been rebuilt from the existing SQLite backup
    - local API is currently configured with `VIRALLAB_ENABLE_DB_MIRROR=false` to avoid crashing on the older SQLite schema
  - current known-good login:
    - email: `demo@virallab.local`
    - password: `demo123456`
  - future cleanup still needed:
    - either migrate `prisma/dev.db` up to the current schema
    - or formally separate runtime JSON mode and Prisma mode instead of mixing them

- Post-login 500 note:
  - after the login outage was fixed, the UI could still show `{"statusCode":500,"message":"Internal server error"}`
  - this was not an auth failure
  - root cause:
    - several local-mode list endpoints still sorted with `createdAt.localeCompare(...)`
    - rebuilt local snapshot data contained numeric timestamps in some records
  - affected endpoints included:
    - `collect/jobs`
    - `samples`
    - `analyze/results`
    - `patterns`
    - `collect/debug-summary`
  - current fix:
    - local-mode sorting now uses timestamp-safe comparisons instead of assuming `createdAt` is always a string

- 2026-03-27: Fixed scan window launch reliability. Root cause was scan login reusing the system Chrome session, which often only changed an existing tab and looked like “no response.” The flow now launches an isolated Playwright browser profile and activates `Google Chrome for Testing`, verified by direct API test returning a real Xiaohongshu search window.

- 2026-03-27: Removed silent disable state from the scan-login button in the app. Clicking scan login now force-selects real collection + the Xiaohongshu Playwright provider and seeds a default keyword if empty, so users no longer click a seemingly active control that does nothing due to hidden state guards.

- 2026-03-27: Reorganized the ViralLab landing workflow around the new scan-first flow. Removed the redundant “real collector status” card and demoted manual job creation into an advanced section. The main flow is now: platform access -> scan and start collection -> review collection status -> review samples -> analyze/generate. Added a dedicated task-status card so users know to wait for the job state instead of wondering what to do after clicking scan complete.

- 2026-03-27: Fixed the “Scan Complete & Start Collection” flow. Root cause was the API running with VIRALLAB_ENABLE_REAL_COLLECTOR=false, so scan completion returned an immediate collector-disabled failure that users could not see clearly. Also simplified scan completion so it only captures cookies and the current Xiaohongshu result-page state, instead of trying to synchronously verify the collector. The UI now shows workspace status inline in the scan card, and the scan window is kept open until a collection job is actually created.

- 2026-03-27: Fixed a worker bridge path bug for the real Xiaohongshu collector. The API had resolved the worker runner from process.cwd(), which pointed to /Users/jordanwang/YOLO/worker/... when the app was launched from the repo root, so scan completion never created a collection job. The runner path now resolves relative to the collector file itself, pointing correctly to modules/virallab/worker/src/run-xiaohongshu-collector.js.

- 2026-03-27: The scan-first collection flow now has a dedicated runtime stage model in the UI. The app tracks the current collection job id created from scan completion, so step 2 follows this run only and no longer silently falls back to whichever historical job is first in the list.

- 2026-03-27: Xiaohongshu Playwright collection now reports live worker progress back into the collection job record. Progress metadata includes:
  - `progressStage`
  - `progressMessage`
  - `extractedCount`
  - `targetCount`
  This supports a visible progress bar and stage strip in the scan-first workflow.

- 2026-03-27: Image OCR is no longer limited to posts with 2+ images. Weak-body image notes with even a single image now enter OCR, because real Xiaohongshu图文 often stores most of the正文 inside one cover/long image. This is an important quality fix for sample body extraction.

- 2026-03-27: The scan-first entry flow no longer pre-fills a default keyword. The user now searches directly inside Xiaohongshu after opening the scan window, while ViralLab only retains `抓取数量` as the main input on the primary card. This better matches the intended “manual filter in Xiaohongshu, then capture the current result page” product flow.

- 2026-03-27: Historical collection jobs are now hidden during an active scan-first run until a real new job is created. This prevents old failed/completed jobs from being misread as the result of the latest scan session. The UI also exposes collection-job `创建时间` more prominently to make task recency obvious.

- 2026-03-27: Scan-first UI polish: default target count is now 10, the scan card inputs are compact, and frontend request errors now display as readable messages instead of raw `{statusCode:500}` payloads.

- 2026-03-27 16:04 扫码流程补充：scan-login/complete 成功后即使 refreshAll 暂时失败，也继续创建 collect job；前端不再向用户暴露裸 500 JSON。

- 2026-03-27 16:06 第 4 步分析报错排查结论：问题不是分析逻辑，而是 ViralLab 运行时未读到豆包配置。已把 LLM 配置补进 modules/virallab/api/.env，并重启 API；实测 analyze/jobs 重新走到豆包，前端应不再显示 LLM config missing。

- 2026-03-27 17:12 广告识别器已正式进入产品主链：
  - 位置：
    - 样本抓取完成
    - 广告识别
    - 非广告进入正式样本库
    - 广告进入广告库
  - 识别维度：
    - `isAd`
    - `confidence`
    - `commercialIntentScore`
    - `adType`
    - `brandNames / productNames / institutionNames / serviceNames`
    - `adSignals`
    - `reasoning`
  - 用户可在前端直接配置：
    - `System Prompt`
    - `User Prompt`
    - `threshold`
  - 运营意义：
    - 强广告可用高阈值过滤
    - 软广可用低阈值识别
    - 广告内容进入独立库，便于后续做竞争对手/品牌研究

- 2026-03-27 17:13 配图建议与 AI 图片生成已接入 Draft：
  - 生成稿不再只有文字
  - 现在还会产出：
    - `imageSuggestions`
      - 标题
      - 描述
      - Prompt
      - 风格
      - 宽高比
  - 前端支持：
    - 生成 AI 图片
    - 重新生成 AI 图片
    - 已生成图片预览

- 当前已知限制：
  - `OPENAI_API_KEY` 尚未配置，因此 AI 图片按钮目前会返回明确的 400 提示，而不是生成真实图片
  - 广告识别器模块已接入采集链，但要真正看到广告被过滤、广告库持续积累，仍需要继续跑更多真实样本

- 本轮实测结论：
  - 登录正常
  - 扫码窗口启动正常，默认打开小红书首页
  - 广告识别器配置读取正常
  - 广告识别器配置保存正常
  - Analyze / Pattern / Generate 链可继续跑通
  - Generate 已能返回配图建议
