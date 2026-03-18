# 交接摘要（最新）

更新时间
- 2026-03-18

当前状态
- MVP 已完成并可用（迭代增强中）
- 覆盖：线索、未分配线索池、专家库、轻咨询、组织/用户、日志、通知、AI 评估列表、表单入库（弹窗）
- 前端：最小管理台 + 中英切换 + 移动端适配
- 已验证：主列表隐藏未分配；层级可见性符合“上级可见、同级不可见、下级不可见上级”

关键入口
- 前端管理台：`/Users/jordanwang/YOLO/ai-marketing-system/modules/CRM/app`
- API 服务：`/Users/jordanwang/YOLO/ai-marketing-system/modules/CRM/api`
- 文档入口：`/Users/jordanwang/YOLO/ai-marketing-system/modules/CRM/docs/README.md`
- 运行指南：`/Users/jordanwang/YOLO/ai-marketing-system/modules/CRM/docs/mvp_runbook.md`

已完成阶段
- P0 ~ P8 全部完成（见 `dev_plan.md`）

未完成 / 后续增强
- RBAC 权限真实生效（当前为最小占位）
- 轻咨询邮件流（收发、转写、自动回复）
- AI 评估接入真实检索与异步任务
- 前端正式 UI（非表单管理台）

注意事项
- API 使用 PostgreSQL，需先 migrate
- 运行前端需指定 API 地址（默认 `http://localhost:3100`）
- 最新迁移：新增 AI 评估字段、轻咨询价格/需求字段、最新跟进时间字段
