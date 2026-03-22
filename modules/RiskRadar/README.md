# RiskRadar

RiskRadar 是 AI 驱动的企业尽调与风险评估子系统，作为 CRM 的“AI评估”功能入口。

## 目录结构
- `server/`：服务端与任务队列
- `prompts/`：Prompt 模板
- `shared/`：通用常量与结构
- `docs/`：子系统文档

## 运行（待补充）
1. Node 版本：建议使用 Node 22 LTS（Node 24 会导致 `better-sqlite3` 编译失败）
2. 安装依赖：`cd server && npm install`
3. 配置 `.env`（参考 `.env.example`）
4. 启动：`npm run dev`
