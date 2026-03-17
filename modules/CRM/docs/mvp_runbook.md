# MVP 运行指南（含登录）

目标
- 本指南用于本地跑通 CRM MVP（API + 前端管理台 + 登录）。

前置条件
- Node.js 18+（建议 20）
- PostgreSQL（本地或远程）

步骤
1. 配置数据库
   - 在 `/Users/jordanwang/YOLO/ai-marketing-system/modules/CRM/api/.env` 中设置 `DATABASE_URL`。
   - 在同一文件可设置 `JWT_SECRET`（不设置会用默认值）。

2. 初始化数据库
   - 进入 `/Users/jordanwang/YOLO/ai-marketing-system/modules/CRM/api`
   - 运行 `npm install`
   - 运行 `npx prisma migrate dev --name init`（如已有迁移则用最新迁移名）
   - 运行 `npx prisma generate`

3. 初始化管理员账号
   - 进入 `/Users/jordanwang/YOLO/ai-marketing-system/modules/CRM/api`
   - 运行 `node scripts/seed_admin.js`
   - 记录输出的账号密码

4. 启动 API
   - 运行 `npm run start:dev`
   - API 监听 `http://localhost:3100`

5. 启动前端
   - 进入 `/Users/jordanwang/YOLO/ai-marketing-system/modules/CRM/app`
   - 运行 `npm install`
   - 运行 `npm run dev -- --host`
   - 访问 `http://localhost:5173`

登录
- 使用 seed 输出的管理员账号登录
- 登录后即可创建团队、用户、线索、专家、轻咨询

权限说明（MVP）
- 非 member：可分配公共线索、合并线索、重置他人密码
- 成员：仅可查看自己的线索

常见问题
- 报错 401：请确认已登录且 token 有效
- 报错 500：请确认数据库已迁移，API 已正确连接数据库
