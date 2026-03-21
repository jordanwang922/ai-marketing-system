# RiskRadar 子系统设计方案（MVP）

## 1. 目标与边界
- 目标：在 CRM 内“AI评估”按钮触发 RiskRadar，对输入公司进行尽调评估，支持三种模式并入库可复用。
- 边界：前期使用公开搜索 + 摘要，商业数据源后续接入；任务异步执行，完成后通知。
- 设计原则：可独立拆分、认证入口可替换、内部数据结构稳定。

## 2. 目录结构
```
modules/RiskRadar
  server/
    api/            # HTTP 接口层
    db/             # SQLite 与迁移
    queue/          # 本地任务队列
    services/       # 数据抓取/摘要/AI/评分
    i18n/           # 中英模板
  prompts/          # Prompt 模板
  shared/           # Schema/类型/常量
  docs/
```

## 3. 内部调用函数（CRM → RiskRadar）
统一入口：
```
evaluateCompany(companyName, country = "中国", mode = "quick|standard|deep", locale = "zh-CN|en-US", userContext)
```
行为：
- 创建任务记录
- 入队异步任务
- 返回 `task_id` 与 `status`
- 任务完成后通知 CRM 弹屏

## 4. API 设计（内部模块调用）
- `POST /api/riskradar/evaluate`
  - 入参：company_name, country, mode, locale, user_id, tenant_id
  - 返回：task_id, status, created_at
- `GET /api/riskradar/task/:id`
  - 返回：status, progress, result_summary
- `GET /api/riskradar/report?company_name=...&country=...`
  - 返回：最近一次报告（若存在）
 - `POST /riskradar/callback`（CRM 侧）
   - 由 RiskRadar 调用，回写评估结果并触发通知

## 5. 输出结构（统一基础 + 模式扩展）
**基础字段（所有模式）**
- company_name
- country
- mode
- risk_level
- confidence_score
- summary
- recommendation
- key_risks

**扩展字段**
- quick：是否建议继续沟通
- standard：团队背景、舆情分析、风险项
- deep：财务能力推断、商业模式、行业地位、多源验证

## 6. 任务队列（本地版）
- SQLite 记录任务状态
- Worker 轮询 `queued` 任务
- 状态：queued → running → done/failed
- 结果写入 reports 表
- 完成后调用 CRM 通知接口/事件

## 7. 数据库（独立 SQLite）
- 文件：`modules/RiskRadar/server/db/riskradar.sqlite`
- 核心表：
  - `tasks`：任务状态、时间、用户
  - `reports`：评估结果 JSON、语言、生成时间
  - `companies`：公司索引
  - `sources`：数据来源记录
  - `users`：与 CRM user/tenant 映射

## 8. 多语言策略
- i18n 维护 `zh-CN` 与 `en-US` 模板
- 输出随 locale 切换
- 数据来源摘要原文可保留

## 9. 公开搜索（当前版本）
- 默认使用 DuckDuckGo HTML 结果 + 可选 Jina 文本抽取
- 可通过环境变量开关与限流

## 10. 回调与通知
- RiskRadar 任务完成后向 CRM 回调
- CRM 根据 `aiTaskId` 回写 Lead 评估信息，并创建通知

## 11. 未来扩展
- 接入商业数据源（天眼查/企查查/Crunchbase 等）
- 任务队列替换为 Redis/RabbitMQ
- 付费订阅与额度控制
- 独立部署的鉴权入口
