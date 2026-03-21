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
