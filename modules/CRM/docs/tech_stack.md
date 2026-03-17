# 技术栈建议

目标原则
- 先内用可快速迭代，后期可 SaaS 化。
- 多租户与品牌隔离优先。
- 多语言与内容国际化（初期中英，后期可扩展）。
- AI 能力可独立服务化。

推荐架构形态
- 前期：模块化单体（易迭代）。
- 中期：按子系统拆服务（CRM / AI 评估 / 新媒体营销）。
- SaaS 化：多租户、计费、审计、合规。

前端
- Web：Next.js (App Router) + TypeScript
- UI：Tailwind + Radix UI
- 表单：React Hook Form + Zod
- 表格与列表：TanStack Table
- 状态：Zustand
- 国际化：next-intl（初期中英），后期扩展语言包

后端
- API：NestJS (TypeScript)
- ORM：Prisma
- Auth：JWT + RBAC + 行级品牌隔离
- 异步任务：BullMQ + Redis
- 搜索：Meilisearch 或 OpenSearch（后期）
- 文件：S3 兼容对象存储

AI 服务
- 独立 AI Service（可拆 microservice）
- 评估与调研：任务队列驱动，结果回写
- 内容生成：多平台模板 + 风格控制 + 合规

数据与分析
- 主库：PostgreSQL
- 事件埋点：PostHog / 自建事件表
- BI：Metabase / Superset（后期）

部署
- 容器化：Docker
- CI/CD：GitHub Actions
- 运行：初期单机，后期上云（K8s or ECS）


多端适配
- 电脑端：完整 CRM Web。
- 手机端：H5 响应式优先，关键流程可用。
- 设计要求：桌面与移动端双适配，核心功能不缺失。


前端与 justright-calendar 对齐
- Vite + React + TypeScript
- Tailwind CSS + Radix UI 组件体系
- shadcn 风格（class-variance-authority, tailwind-merge, clsx）
- 动效：framer-motion / gsap（按需）

