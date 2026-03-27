# ViralLab V1 设计文档

## 1. 文档目标

本文档用于定义 `ViralLab（爆款实验室）` 的 V1 产品与技术方案，目标是先把小红书场景下的 `采集 -> 解析 -> 分析 -> Pattern 抽象 -> 生成` 全链路打通，并且从第一天起按“未来可独立售卖的子系统”设计。

本文档关注：

- 产品定位与边界
- 用户流程与页面设计
- 模块拆分与系统架构
- 数据库设计
- API 设计
- 开发阶段划分
- V1 刻意不做的内容

本文档不关注：

- 视觉稿与品牌设计细节
- 抖音视频解析细节实现
- 复杂的计费和企业权限系统

---

## 2. 项目定义

### 2.1 项目名称

- 中文名：`爆款实验室`
- 英文名：`ViralLab`

### 2.2 产品定义

`ViralLab` 不是单纯的采集工具，也不是单纯的 AI 写作工具，而是一个“爆款内容理解与生产系统”。

它的核心任务是：

1. 采集某个主题下的热门内容样本
2. 结构化拆解这些内容为什么会爆
3. 从多个爆款样本中抽象出共性 Pattern
4. 基于 Pattern 生成新的内容草稿
5. 持续沉淀知识库与可复用模板

### 2.3 V1 目标

V1 聚焦小红书，先打通“图文优先、视频可解析”的内容闭环：

- 支持用户登录后创建采集任务
- 支持按关键词采集热门样本
- 支持采集前按：
  - 笔记类型
  - 发布时间
  - 排序依据
  做筛选
- 支持对小红书内容按类型分流：
  - 图文
  - 视频
- 支持解析笔记文本、标题、标签、互动数据、媒体信息
- 支持对长图文补 OCR 文本识别链
- 支持对视频补：
  - transcript 转写
  - frame OCR
  - 多模态文本融合
- 支持 AI 结构化分析爆款因子
- 支持从样本集合中提取 Pattern
- 支持生成新的小红书内容草稿
- 支持将样本、分析、Pattern、生成结果沉淀到独立数据库

### 2.4 产品定位

ViralLab 当前放在主项目中一个子目录开发，但产品定位上必须视为独立系统：

- 有自己的登录态和用户体系
- 有自己的数据库和业务表
- 有自己的后台 API
- 有自己的前端页面和业务流程
- 后续可以独立部署、独立售卖

与主系统的关系是：

- 当前可共享仓库与基础设施
- 不强依赖主系统业务表
- 后续可以通过统一门户接入，但不依附于主系统存在

---

## 3. 核心业务逻辑

### 3.1 端到端链路

V1 主链路如下：

1. 用户登录 ViralLab
2. 用户输入关键词、平台、采集数量、排序方式、笔记类型、发布时间范围
3. 系统创建采集任务
4. 采集模块抓取小红书样本
5. 采集模块根据内容类型分流：
   - 图文采集链
   - 视频采集链
6. 图文链对普通图文直接抽正文，对长图文触发 OCR 文本识别
7. 视频链完成页面播放抓流或音频提取，并执行 transcript + frame OCR
8. 系统对样本进行标准化清洗和内容融合
9. 分析模块对每篇样本做结构化爆款分析
10. 用户选择若干分析结果生成 Pattern
11. Pattern Engine 提炼共性模式
12. 用户输入生成目标
13. 生成模块输出新的小红书内容草稿
14. 所有过程数据回存知识库

### 3.2 核心价值链

ViralLab 的价值不在“抓到了内容”，而在：

- 把爆款内容转成结构化资产
- 把结构化资产转成可复用 Pattern
- 把 Pattern 转成新的可生产内容

### 3.3 爆款三层模型

V1 的分析模型采用三层结构：

1. 结构层
- 开头钩子
- 内容展开逻辑
- 结尾收束方式

2. 情绪层
- 焦虑
- 爽感
- 认同
- 反差
- 希望感

3. 热点层
- 时间节点
- 平台趋势
- 行业趋势
- 社会关注点

### 3.4 Pattern 的定义

Pattern 不是单篇内容摘要，而是多个爆款样本共同具备的复用结构。

示例：

- `痛点式开头 + 三点拆解 + 解决方案结尾`
- `反常识钩子 + 个人案例 + 方法总结`
- `数据冲击开头 + 原因分析 + 行动建议`

Pattern 必须满足：

- 来源可追溯
- 可解释
- 可被生成模块直接消费
- 不复制原文

---

## 4. 用户与使用场景

### 4.1 核心用户

V1 面向以下用户：

- 内容创业者
- 小红书运营
- 品牌内容团队
- 内容代运营团队
- 达人辅助团队

### 4.2 典型使用场景

#### 场景 A：找某个赛道近期爆款规律

用户输入 `AI教育`，系统采集热门样本并输出：

- 热门标题结构
- 高频情绪类型
- 主要内容套路
- 常见结尾方式

#### 场景 B：基于爆款规律生成新笔记

用户选择一组样本和一个 Pattern，输入自己的产品或观点，系统输出：

- 标题候选
- 正文草稿
- 封面文案建议
- 标签建议

#### 场景 C：沉淀某赛道知识库

用户长期采集 `副业`、`AI工具`、`宝妈创业` 等主题，系统持续累积：

- 样本库
- 分析库
- Pattern 库
- 生成记录库

---

## 5. 产品边界

### 5.1 V1 要做

- 独立登录
- 小红书采集
- 文本内容解析
- AI 结构化分析
- Pattern 抽象
- 小红书图文生成
- 任务记录与知识库沉淀
- 基础后台管理能力

### 5.2 V1 不做

- 抖音视频解析
- 自动发布到平台
- 复杂团队协作和审批流
- 完整 SaaS 订阅扣费
- 多租户企业组织架构
- 多平台统一内容编排
- 推荐流实时监控

### 5.3 为什么刻意收缩

V1 的目标是建立最小可运行闭环，而不是一次性把商业系统做满。真正需要先验证的是：

- 用户是否愿意持续采集与分析
- Pattern 是否足够有价值
- 生成结果是否真的提升创作效率

---

## 6. 信息架构与页面流程

### 6.1 页面结构

V1 前端建议包含以下页面：

1. 登录页
2. 首页 / Dashboard
3. 采集任务页
4. 样本库页
5. 分析结果页
6. Pattern 库页
7. 内容生成页
8. 生成记录页
9. 设置页
10. 管理页（可后置，V1 可做简化版）

### 6.2 用户主流程

#### 流程 1：首次使用

1. 用户注册或登录
2. 进入 Dashboard
3. 点击“新建采集任务”
4. 输入关键词、数量、排序方式
5. 提交任务并进入任务详情
6. 等待采集完成
7. 查看样本列表
8. 触发分析
9. 进入分析结果页
10. 选择样本生成 Pattern
11. 使用 Pattern 生成内容

#### 流程 2：日常使用

1. 登录进入 Dashboard
2. 查看近期采集任务和 Pattern
3. 直接复用已有 Pattern
4. 输入新的产品信息或主题目标
5. 快速生成内容草稿

### 6.3 各页面职责

#### 登录页

职责：

- 用户注册
- 用户登录
- 忘记密码

V1 建议：

- 邮箱登录或手机号登录二选一
- 优先使用邮箱 + 密码

#### Dashboard

职责：

- 展示最近任务
- 展示最近生成内容
- 展示高频关键词
- 展示常用 Pattern

V1 不需要做复杂 BI，只要让用户能快速回到工作流。

#### 采集任务页

职责：

- 创建采集任务
- 查看任务执行状态
- 查看错误日志

表单字段建议：

- 平台：固定 `xiaohongshu`
- 关键词
- 排序方式：`热门` / `最新`
- 数量上限
- 备注

#### 样本库页

职责：

- 查看采集到的内容样本
- 筛选关键词、时间、标签、互动量
- 查看单条内容详情

#### 分析结果页

职责：

- 展示每条内容的结构化分析结果
- 标记高价值样本
- 批量选择样本提取 Pattern

#### Pattern 库页

职责：

- 查看抽象好的模式
- 查看来源样本
- 查看适用场景
- 进入生成页面

#### 内容生成页

职责：

- 选择 Pattern
- 输入生成需求
- 输出标题、正文、封面文案、标签建议

#### 生成记录页

职责：

- 保存每次生成结果
- 支持复制、再生成、收藏

#### 设置页

职责：

- 账户信息
- Cookie 管理说明
- 默认生成参数
- 安全设置

---

## 7. 产品模块拆分

### 7.1 认证与账户模块

负责：

- 注册
- 登录
- 会话管理
- 账户资料

V1 原则：

- 自己维护 `users` 表
- 使用 JWT 或 Session 都可
- 不依赖主项目用户表

### 7.2 采集模块 Collector

负责：

- 根据关键词执行小红书采集
- 处理人工扫码登录与 Cookie 复用
- 根据筛选条件定位目标内容集合
- 对图文和视频内容分流
- 返回标准化样本数据

输入：

- 平台
- 关键词
- 排序方式
- 笔记类型
- 发布时间范围
- 数量

输出：

- 标题
- 正文摘要
- 内容类型
- 内容格式
- 发布时间
- 点赞/收藏/评论等互动指标
- 标签
- URL
- 作者信息
- 图片数组
- 视频数组
- OCR 文本
- transcript 文本
- frame OCR 文本
- 融合后的正文主文本

### 7.3 解析模块 Parser

负责：

- 从采集原始结果中抽取结构化字段
- 做文本清洗和标准化
- 统一不同来源字段格式
- 对长图文执行 OCR 清洗
- 对视频内容执行多模态融合前处理

V1 的 Parser 不再只处理纯文本，而是统一处理三类正文来源：

- 页面正文
- 图片 OCR 文本
- 视频 transcript / frame OCR 文本

### 7.4 分析模块 Analyzer

负责：

- 基于 Prompt 或规则对每篇样本做结构化爆款分析

输出字段建议：

- hookType
- structureType
- emotionTags
- rhythmType
- trendTags
- targetAudience
- sellingPoints
- viralReasons
- riskNotes

### 7.5 模式抽象模块 Pattern Engine

负责：

- 从多篇分析结果中提取共性结构
- 形成可复用的 Pattern

输出字段建议：

- patternName
- hookTemplate
- bodyTemplate
- endingTemplate
- emotionalCore
- applicableTopics
- sourceSampleIds
- confidenceScore

### 7.6 生成模块 Generator

负责：

- 基于 Pattern 和用户输入生成新内容

V1 输出：

- 标题候选 3 到 5 个
- 正文草稿 1 到 3 版
- 封面文案建议
- 标签建议
- 风格说明

### 7.7 知识库模块 Knowledge Base

负责：

- 管理样本、分析、Pattern、生成记录
- 支持后续二次检索与复用

### 7.8 后台管理模块 Admin

负责：

- 查看采集任务
- 查看失败任务
- 查看用户反馈
- 手动下线异常 Pattern 或内容

V1 可以只做接口，不急着做完整后台 UI。

---

## 8. 系统架构设计

### 8.1 仓库内建议目录

建议在当前 mono-repo 中新增：

```text
modules/
  virallab/
    app/        # 前端
    api/        # 后端
    worker/     # 异步任务与采集任务
    shared/     # 类型、常量、DTO
    docs/       # 子系统补充文档
```

### 8.2 架构原则

1. 前后端分离
2. 采集与分析走异步任务
3. 业务数据库独立
4. 共享基础设施，不共享业务耦合
5. 为后续独立部署保留边界

### 8.3 逻辑架构

```text
Frontend App
  -> ViralLab API
      -> Auth Service
      -> Task Service
      -> Sample Service
      -> Analysis Service
      -> Pattern Service
      -> Generation Service
      -> Knowledge Service
      -> DB
      -> Queue / Worker
          -> Collector
          -> Analyzer
          -> Pattern Engine
          -> Generator
```

### 8.4 同步与异步边界

同步请求适合：

- 登录
- 查询任务
- 查看样本
- 查看分析结果
- 发起生成

异步任务适合：

- 采集任务
- 批量分析
- 批量 Pattern 抽象
- 大批量内容生成

### 8.5 V1 技术建议

结合现有仓库，V1 建议：

- 前端：React + TypeScript
- 后端：Node.js + Express 或 NestJS
- 数据库：PostgreSQL 优先，若要快可先 SQLite，但不推荐
- 队列：BullMQ / 简化任务表轮询均可
- 浏览器自动化：Playwright
- AI 调用：统一封装 LLM Client

建议结论：

- 如果是为了快速上线演示：可先 `API + DB + Worker` 简化实现
- 如果是为了未来单卖：数据库建议直接上 PostgreSQL

---

## 9. 数据模型设计

### 9.1 设计原则

- 所有业务表归属于 ViralLab
- 样本、分析、Pattern、生成结果必须可追溯
- 采集任务与内容资产分离
- 尽量保留原始数据与结构化结果双份存储

### 9.2 主要实体

- 用户 `users`
- 会话 `user_sessions`
- 采集任务 `collection_jobs`
- 原始样本 `content_samples`
- 内容分析 `analysis_results`
- 模式库 `patterns`
- Pattern 来源映射 `pattern_sources`
- 生成任务 `generation_jobs`
- 生成内容 `generated_contents`
- 平台账号配置 `platform_accounts`
- 操作日志 `audit_logs`

### 9.3 表设计

#### users

```text
id
email
password_hash
display_name
status
last_login_at
created_at
updated_at
```

说明：

- V1 不做组织与团队表
- 先按单用户拥有全部资产处理

#### user_sessions

```text
id
user_id
token_hash
expired_at
created_at
updated_at
```

#### platform_accounts

```text
id
user_id
platform
account_name
cookie_blob
cookie_status
last_verified_at
created_at
updated_at
```

说明：

- 用于保存小红书登录 Cookie
- 仅服务采集，不代表平台官方账号接入

#### collection_jobs

```text
id
user_id
platform
keyword
sort_by
target_count
status
progress
started_at
finished_at
error_message
metadata_json
created_at
updated_at
```

状态建议：

- pending
- running
- completed
- failed
- cancelled

#### content_samples

```text
id
job_id
user_id
platform
keyword
platform_content_id
title
content_text
content_summary
author_name
author_id
publish_time
like_count
comment_count
collect_count
share_count
tags_json
source_url
cover_image_url
raw_payload_json
parsed_payload_json
status
created_at
updated_at
```

说明：

- `raw_payload_json` 存原始采集结果
- `parsed_payload_json` 存解析后的结构化字段

#### analysis_results

```text
id
sample_id
user_id
analysis_version
hook_type
structure_type
emotion_tags_json
rhythm_type
trend_tags_json
target_audience_json
viral_reasons_json
key_points_json
risk_notes_json
summary
model_name
prompt_version
raw_result_json
created_at
updated_at
```

#### patterns

```text
id
user_id
name
topic
description
hook_template
body_template
ending_template
emotional_core
trend_summary
applicable_scenarios_json
confidence_score
status
created_at
updated_at
```

#### pattern_sources

```text
id
pattern_id
sample_id
analysis_id
created_at
```

#### generation_jobs

```text
id
user_id
pattern_id
topic
goal
tone
target_audience
status
error_message
created_at
updated_at
```

#### generated_contents

```text
id
job_id
user_id
pattern_id
platform
title_candidates_json
body_text
cover_copy
tags_json
generation_notes
model_name
prompt_version
raw_result_json
status
created_at
updated_at
```

#### audit_logs

```text
id
user_id
action
target_type
target_id
payload_json
created_at
```

### 9.4 V1 表关系

```text
users
  -> collection_jobs
  -> content_samples
  -> analysis_results
  -> patterns
  -> generation_jobs
  -> generated_contents

collection_jobs
  -> content_samples

content_samples
  -> analysis_results

patterns
  -> pattern_sources
  -> generation_jobs
  -> generated_contents
```

---

## 10. API 设计

### 10.1 API 设计原则

- 前台 API 与后台 API 分离
- 资源命名清晰
- 长任务返回 jobId
- 所有 AI 结果保留版本信息

### 10.2 认证相关

#### `POST /api/virallab/auth/register`

创建账户

#### `POST /api/virallab/auth/login`

登录并返回 token

#### `POST /api/virallab/auth/logout`

退出登录

#### `GET /api/virallab/auth/me`

获取当前用户信息

### 10.3 采集任务相关

#### `POST /api/virallab/collect/jobs`

创建采集任务

请求体：

```json
{
  "platform": "xiaohongshu",
  "keyword": "AI教育",
  "sortBy": "hot",
  "targetCount": 20
}
```

返回：

```json
{
  "jobId": "cj_xxx",
  "status": "pending"
}
```

#### `GET /api/virallab/collect/jobs`

获取任务列表

#### `GET /api/virallab/collect/jobs/:jobId`

获取任务详情

#### `POST /api/virallab/collect/jobs/:jobId/start`

触发任务执行

#### `POST /api/virallab/collect/jobs/:jobId/cancel`

取消任务

### 10.4 样本库相关

#### `GET /api/virallab/samples`

查询样本列表

筛选参数：

- keyword
- platform
- jobId
- tag
- dateFrom
- dateTo

#### `GET /api/virallab/samples/:sampleId`

获取样本详情

### 10.5 分析相关

#### `POST /api/virallab/analyze/jobs`

批量创建分析任务

```json
{
  "sampleIds": ["s1", "s2", "s3"]
}
```

#### `GET /api/virallab/analyze/results`

查询分析结果列表

#### `GET /api/virallab/analyze/results/:analysisId`

查看单条分析结果

### 10.6 Pattern 相关

#### `POST /api/virallab/patterns/extract`

从多个分析结果提取 Pattern

```json
{
  "analysisIds": ["a1", "a2", "a3", "a4"]
}
```

#### `GET /api/virallab/patterns`

查看 Pattern 列表

#### `GET /api/virallab/patterns/:patternId`

查看 Pattern 详情

#### `POST /api/virallab/patterns/:patternId/archive`

归档 Pattern

### 10.7 生成相关

#### `POST /api/virallab/generate/jobs`

基于 Pattern 发起内容生成

```json
{
  "patternId": "p_xxx",
  "platform": "xiaohongshu",
  "topic": "AI帮老师备课",
  "goal": "生成一篇适合教育博主发布的小红书笔记",
  "tone": "专业但易懂",
  "targetAudience": "宝妈和中小学老师"
}
```

#### `GET /api/virallab/generate/jobs/:jobId`

获取生成任务状态

#### `GET /api/virallab/generated-contents`

查询生成记录

#### `GET /api/virallab/generated-contents/:contentId`

查看生成内容详情

### 10.8 平台账号相关

#### `POST /api/virallab/platform-accounts/xiaohongshu/cookies`

上传或更新 Cookie

#### `GET /api/virallab/platform-accounts`

查看平台账号状态

### 10.9 管理相关

#### `GET /api/virallab/admin/jobs`

查看所有采集任务

#### `GET /api/virallab/admin/reports`

查看异常报告

#### `POST /api/virallab/admin/patterns/:patternId/disable`

禁用 Pattern

---

## 11. 采集模块设计

### 11.1 目标

在不接入官方开放 API 的前提下，用浏览器自动化完成小红书搜索与样本提取。

### 11.2 采集输入

- 关键词
- 排序方式
- 笔记类型
- 发布时间范围
- 数量
- 用户 Cookie

### 11.3 采集输出

- 标题
- 正文或摘要
- note type
- content format
- 标签
- 发布时间
- 点赞/评论/收藏
- 详情链接
- 作者信息
- 图片数组
- 视频数组
- OCR 原文
- transcript
- frame OCR
- resolved content text

### 11.4 技术方案

- Playwright 驱动浏览器
- 支持人工扫码登录一次后复用 Cookie
- 服务端按任务执行抓取
- 对采集频率做限速控制
- 小红书采集前支持显式筛选：
  - 笔记类型：不限 / 图文 / 视频
  - 发布时间：不限 / 一天内 / 一周内 / 半年内
  - 排序依据：综合 / 最新 / 最多点赞 / 最多评论 / 最多收藏

### 11.5 内容分流方案

采集层不再把所有小红书结果当成同一种内容，而是先分流：

#### 11.5.1 图文采集链

图文进一步分两类：

- 普通图文
  - 正文主要存在于页面正文区域
  - 图片作为辅助信息
- 长图文
  - 正文主要存在于图片
  - 页面正文很短，甚至为空

长图文判断信号：

- 页面正文长度过短
- 图片数量偏多
- 图片长宽比明显偏长
- 标题和正文表达不完整但图片中承载主要信息

长图文处理流程：

1. 抽取图片 URL
2. 下载图片
3. 对图片执行 OCR
4. 按图片顺序拼接原始 OCR 文本
5. 清洗去噪与分段
6. 生成：
   - `ocr_text_raw`
   - `ocr_text_clean`
   - `resolved_content_text`

#### 11.5.2 视频采集链

视频不只抓标题和简介，而是走多模态解析链：

1. 采集元数据
   - 标题
   - 作者
   - 发布时间
   - 时长
   - 互动数据
   - 封面
   - 标签
2. 获取可播放视频上下文
   - 优先拿直链或媒体流
   - 拿不到直链时，采用页面内播放
3. 执行音频转写
   - 通过 Whisper / ASR 转成 transcript
4. 执行关键帧抽样
   - 抽封面帧、章节帧、字幕密集帧
5. 对关键帧执行 OCR
6. 融合 transcript 与 frame OCR，生成：
   - `transcript_raw`
   - `transcript_segments`
   - `frame_texts`
   - `resolved_content_text`

### 11.6 风险与约束

- 平台反爬策略变化
- 页面结构变化导致解析失效
- Cookie 失效导致任务失败
- 视频直链未必稳定可得
- 长图 OCR 质量受图片清晰度影响
- 视频转写质量受背景音和剪辑方式影响

### 11.7 V1 防御策略

- 所有采集逻辑集中在 Collector 层
- 关键选择器集中配置
- 任务失败时记录错误截图和错误信息
- 限流和随机等待
- 图文 / 视频使用不同解析器，避免互相污染
- transcript / OCR / 页面正文分开保存，避免后续混淆

---

## 12. 分析模块设计

### 12.1 分析目标

对单篇内容输出结构化爆款原因，而不是生成一段泛泛评价。

### 12.2 分析维度

- 开头钩子类型
- 内容结构类型
- 情绪触发点
- 节奏特征
- 热点关联点
- 目标人群
- 转化驱动点
- 爆款原因总结

### 12.3 输出格式要求

必须结构化，建议统一为 JSON。

示例：

```json
{
  "hookType": "pain-point",
  "structureType": "problem-solution-list",
  "emotionTags": ["anxiety", "hope"],
  "rhythmType": "fast-opening-stable-body",
  "trendTags": ["ai-tools", "education"],
  "targetAudience": ["teachers", "parents"],
  "viralReasons": [
    "开头直接打中目标人群焦虑",
    "结构清晰易读",
    "选题贴近近期平台热点"
  ],
  "summary": "这是一篇典型的焦虑切入型教育工具推荐内容。"
}
```

### 12.4 Prompt 原则

- 禁止只给摘要
- 强制输出固定字段
- 强制指出为什么可能会爆
- 强制避免“空泛营销话术”

---

## 13. Pattern Engine 设计

### 13.1 目标

从多条分析结果中提取可复用的共性结构。

### 13.2 输入

- 至少 3 到 10 条分析结果

### 13.3 输出

- Pattern 名称
- 适用话题
- 开头模板
- 主体结构模板
- 结尾模板
- 核心情绪
- 来源样本

### 13.4 质量标准

Pattern 必须：

- 不是拼接原文
- 能解释为什么成立
- 能被生成模块直接使用

### 13.5 V1 策略

V1 不做自动聚类和复杂 embedding 检索，先使用：

- 用户手动选择样本
- LLM 做结构归纳

这样更快验证 Pattern 的业务价值。

---

## 14. 生成模块设计

### 14.1 输入

- Pattern
- 用户主题
- 用户产品/服务信息
- 目标受众
- 语气风格

### 14.2 输出

小红书场景：

- 标题 3 到 5 个
- 正文 1 到 3 个版本
- 封面文案 1 到 2 个
- 标签建议

### 14.3 生成约束

- 不直接复制来源内容
- 保持结构借鉴而非原文复刻
- 输出可直接编辑发布

### 14.4 V1 生成模式

建议支持两个模式：

1. 快速生成
- 输入少
- 快速给结果

2. 精准生成
- 输入更多背景
- 输出更贴近具体业务

---

## 15. 权限与账号设计

### 15.1 V1 权限模型

V1 只做单用户权限即可：

- 普通用户：只能访问自己的任务与资产
- 管理员：可查看全局任务、问题数据

### 15.2 为什么不先做组织

如果一开始做多组织、多成员、协作空间，会显著拖慢 V1。当前更重要的是验证核心工作流而不是 SaaS 管理复杂度。

---

## 16. 非功能设计

### 16.1 性能

- 任务列表分页
- 样本列表分页
- 长任务异步化

### 16.2 可观测性

必须记录：

- 采集成功率
- 采集失败原因
- 分析耗时
- 生成耗时
- 各类任务状态分布

### 16.3 安全

- 密码加密存储
- Cookie 加密或最少受控存储
- 管理接口鉴权
- 敏感日志脱敏

### 16.4 可维护性

- Prompt 版本化
- 采集选择器集中化
- 各模块接口清晰分层

---

## 17. 开发阶段划分

### 17.1 Phase 0：基础搭建

目标：

- 建立 `modules/virallab` 基础目录
- 初始化前端、后端、数据库
- 搭好登录和基础布局

交付：

- 可登录系统
- 空 Dashboard
- 基础数据库迁移

### 17.2 Phase 1：采集闭环

目标：

- 跑通小红书采集任务

交付：

- 创建采集任务
- 查看任务状态
- 样本库展示

### 17.3 Phase 2：分析闭环

目标：

- 跑通样本分析

交付：

- 分析任务接口
- 分析结果页
- 标准化分析 JSON

### 17.4 Phase 3：Pattern 闭环

目标：

- 支持从多个样本分析提取 Pattern

交付：

- Pattern 抽取接口
- Pattern 库页面
- 来源样本回溯

### 17.5 Phase 4：生成闭环

目标：

- 支持基于 Pattern 生成小红书内容

交付：

- 内容生成接口
- 生成页面
- 生成记录页

### 17.6 Phase 5：上线前收口

目标：

- 做错误处理、日志、权限、体验细节

交付：

- 失败态
- 任务重试
- 基础后台
- 部署文档

---

## 18. 建议的开发优先级

### 18.1 必须先做

1. 独立用户体系
2. 采集任务链路
3. 样本库
4. 分析接口与分析结果结构
5. Pattern 提取
6. 内容生成

### 18.2 可以延后

1. 后台完整 UI
2. 团队与组织
3. 订阅扣费
4. 多平台扩展
5. 自动发布
6. 高级搜索和推荐

### 18.3 故意延后的理由

这些能力不是 V1 的价值验证核心。真正核心的是：

- 能不能稳定采到高价值样本
- 分析能不能足够结构化
- Pattern 有没有复用价值
- 生成结果能不能真的帮用户写内容

---

## 19. 关键风险与解决思路

### 19.1 风险：平台采集不稳定

解决：

- 选择器集中管理
- Cookie 复用
- 限流与失败重试
- 记录错误截图

### 19.2 风险：AI 分析输出不稳定

解决：

- 强制 JSON Schema
- 增加结果校验层
- 关键字段缺失时重试

### 19.3 风险：Pattern 质量不高

解决：

- 强制最少样本数
- 引导用户手动挑样本
- 输出 Pattern 时要求解释性字段

### 19.4 风险：生成内容过度像原文

解决：

- Prompt 中明确禁止复写原文
- 保留来源追溯
- 增加相似度检测作为后续能力

### 19.5 风险：系统一开始做太重

解决：

- V1 只做小红书
- V1 不做组织和订阅
- V1 先把工作流做通

---

## 20. V1 验收标准

V1 完成的最低标准如下：

1. 用户可以注册、登录并进入系统
2. 用户可以新建一个小红书采集任务
3. 系统可以采集并展示至少一批样本
4. 用户可以对样本发起分析并看到结构化结果
5. 用户可以选择多条分析结果生成 Pattern
6. 用户可以基于 Pattern 生成一篇新的小红书内容草稿
7. 所有样本、分析、Pattern、生成结果都被保存到独立数据库

---

## 21. V2 展望

V2 可以扩展：

- 抖音视频解析
- 小红书 / 抖音共用的视频多模态处理管线
- Whisper / ASR 升级策略
- 视频帧分析增强
- 多平台支持
- 更强的 Pattern 检索
- 自动选题推荐
- 团队协作
- SaaS 订阅

但这些都建立在 V1 已验证核心价值的前提上。

---

## 22. 最终结论

`ViralLab V1` 的正确做法不是做成一个“大而全的营销 SaaS”，而是做成一个可独立售卖的、聚焦小红书的“爆款内容理解与生成引擎”。

第一阶段只需要把以下闭环做到足够稳定：

`采集 -> 分析 -> Pattern -> 生成 -> 沉淀`

这条链路一旦跑通，后续无论是扩平台、做团队化、做订阅化，还是从主系统里独立出去，都会更顺。

---

## 23. 小红书扫码登录与自动接管流程

为了避免用户手工查找和粘贴 Cookie，V1 现已补充一条面向正式用户的扫码登录链路。

### 23.1 目标

用户在系统内先填写采集条件，再通过一个按钮打开小红书扫码窗口。扫码完成后，系统自动：

1. 接管浏览器 Cookie
2. 保存到当前平台账号
3. 验证当前登录态
4. 直接发起本次采集任务

### 23.2 推荐交互流程

1. 用户先填写：
   - 关键词
   - 排序依据
   - 笔记类型
   - 发布时间
   - 抓取数量
2. 用户点击：`打开小红书扫码窗口`
3. 系统打开新的小红书浏览器窗口
4. 用户扫码并确认页面已登录
5. 用户回到 ViralLab，点击：`扫码完成并开始抓取`
6. 系统自动接管 Cookie，并立即开始抓取当前这次任务

### 23.3 产品原则

- 扫码登录是主路径
- 手动粘贴 Cookie 是备用路径
- 用户不需要理解 Cookie 结构
- 用户只需要理解：
  - 先填采集条件
  - 再扫码
  - 再点击完成

### 23.4 技术实现

- 后端新增扫描会话接口：
  - `POST /platform-accounts/xiaohongshu/scan-login/start`
  - `POST /platform-accounts/xiaohongshu/scan-login/complete`
  - `POST /platform-accounts/xiaohongshu/scan-login/cancel`
- 扫码窗口由 API 侧通过 Playwright 打开
- Cookie 捕获后复用现有平台账号保存与验证逻辑
- 验证成功后由前端自动继续调用：
  - `POST /collect/jobs`

### 23.5 边界说明

- 该流程优先服务：
  - `真实采集`
  - `xiaohongshu-playwright`
- 托管 provider 与 mock provider 不依赖扫码流程
- 若扫码方式异常，用户仍可退回手动 Cookie 方式

---

## 24. 小红书模式 A：用户手动筛选，系统接管当前结果页

为降低筛选误差、减少对小红书前端细节的本地猜测，V1 继续收敛到模式 A：用户亲手在小红书页面完成筛选，系统只接管当前已经筛好的结果页继续抓取。

### 24.1 设计目标

- 让“图文 / 视频、排序、发布时间”的最终决定权回到用户手里
- 让系统尽量少猜，尽量使用小红书真实页面与真实请求参数
- 降低“ViralLab 里选的是图文，但抓下来混入视频”的概率

### 24.2 推荐流程

1. 用户在 ViralLab 中先填写：
   - 关键词
   - 抓取数量
2. 用户点击：`打开小红书扫码窗口`
3. 用户在小红书真实页面中亲手完成：
   - 扫码登录
   - 选择图文 / 视频
   - 选择排序方式
   - 选择发布时间
4. 用户确认当前结果页就是自己想抓的页面
5. 用户回到 ViralLab，点击：`扫码完成并开始抓取`
6. 系统自动接管：
   - 当前 Cookie
   - 当前结果页 URL
   - 当前页面最近一次真实 `search/notes` 请求参数
7. 后端按这组真实参数继续抓取，不再优先依赖本地映射

### 24.3 技术策略

- 扫码窗口页面会监听真实的 `search/notes` 请求
- 会话完成时回传：
  - `manualSearchPageUrl`
  - `manualSearchRequestData`
- 创建任务时，若存在这组数据：
  - 优先用它反推出 `sortBy / noteType / publishWindow`
  - worker 继续抓取时优先使用这组真实请求参数
- 原有的本地筛选映射仍保留，但降级为兜底方案

### 24.4 为什么优先选择模式 A

- 更符合第一性原理
- 更符合用户心理模型：用户看到什么，系统就抓什么
- 相比系统自动模拟筛选，更容易对齐小红书真实结果
- 更便于后续复用到抖音等平台

---

## 25. 广告识别器（Ad Detector）

广告识别器现在作为 ViralLab 的独立模块存在，不再是临时过滤逻辑。它的目标不是简单“删广告”，而是把商业内容与非商业内容分流，并沉淀成独立的竞争情报库。

### 25.1 广告定义

统一采用以下判定标准：

- 凡是以品牌、产品、课程、机构推荐和转化为主要目的的内容，都视为广告型内容

### 25.2 处理链路

整体链路为：

- 样本抓取完成
- 广告识别
- 非广告进入正式样本库
- 广告进入广告库

处理规则：

- 如果不是广告：
  - 计入本次有效样本数
  - 继续用于 Analyze / Pattern / Generate
- 如果是广告：
  - 不计入本次有效样本数
  - 进入广告库
  - 提取品牌 / 产品 / 机构 / 服务名称
  - 记录广告理由和商业意图强度

### 25.3 商业意图强度与阈值

广告识别器增加独立参数：

- `commercialIntentScore`：0-100

同时支持运营级阈值配置：

- 例如阈值设为 `80`：
  - 只过滤强广告
- 阈值设为 `30`：
  - 连较软的软文也会被拦截出来

最终判定逻辑：

- `isAd = true` 当且仅当：
  - 模型明确判断是广告，或
  - `commercialIntentScore >= threshold`

### 25.4 Prompt 配置化

广告识别器包含两个可编辑 prompt：

- `System Prompt`
- `User Prompt`

前端交互方式：

- 点击按钮进入编辑
- 修改后点击保存
- 后续所有广告识别按最新保存的 prompt 执行

这样广告识别策略可以由运营侧持续微调，不需要每次改代码。

### 25.5 广告库

广告库不是垃圾桶，而是独立的竞争情报库，后续可用于：

- 识别当前赛道里高频投放的品牌 / 产品 / 机构
- 分析哪些商业内容在做爆款结构
- 反向参考竞争对手的种草逻辑

核心存储分两层：

1. `ad_samples`
   - 广告样本本身
2. `ad_entities`
   - 广告涉及的品牌 / 产品 / 机构 / 服务实体

### 25.6 前端功能

主界面新增：

- 广告识别器配置卡片
  - 是否启用
  - 阈值
  - System Prompt
  - User Prompt
- 广告库列表
  - 标题
  - 商业意图强度
  - 广告类型
  - 实体名称
  - 理由说明

---

## 26. 小红书图文生成的配图建议与 AI 图片生成

为了让生成稿更接近真正可发布的小红书图文，生成模块除了文字内容外，还需要给出配图执行方案。

### 26.1 生成结果新增内容

每次生成稿除了：

- 标题候选
- 正文
- 封面文案
- 标签

还需要新增：

- `imageSuggestions`
  - 每张图的标题
  - 每张图的说明
  - 每张图的详细生成提示词
  - 视觉风格
  - 宽高比

### 26.2 AI 图片生成

每条图片建议旁边提供：

- `生成 AI 图片`
- `重新生成 AI 图片`

点击后使用图像生成接口生成真实图片资产，并把生成结果挂回当前草稿下。

### 26.3 设计原则

- 图片提示词要足够详细，可以直接给 AI 生成图使用
- 不默认只生成卡通图，要允许：
  - 信息图
  - 写实照片感
  - 科技感封面
  - 实拍风格
- 图片建议必须与正文主题和内容结构匹配

---

## 27. 长图文 OCR 与视频文字提取

ViralLab 的内容提取不能只停留在搜索卡片摘要，而要尽量还原笔记真实正文。针对小红书图文与视频，V1 先落两条“文字优先”链路。

### 27.1 长图文 OCR

适用场景：

- 图文笔记正文很短
- 图片数量较多
- 或者只有 1 张图，但正文主要写在图里

处理逻辑：

1. 抓到图文样本后，先看页面正文长度
2. 若正文偏弱，则对图片做 OCR
3. OCR 不只处理多图，也处理“单图弱正文”场景
4. 将：
   - 页面正文
   - OCR 原文
   - OCR 清洗文
   合并成 `resolvedContentText`

核心字段：

- `ocrTextRaw`
- `ocrTextClean`
- `resolvedContentText`
- `resolvedContentSource`

### 27.2 视频文字提取

V1 先不把视频关键帧截图作为主产品能力，而是先把视频里的“主要文字”提出来。

处理逻辑：

1. 识别为视频后，进入视频文字链
2. 在视频详情页尝试播放视频
3. 在多个时间点抽取页面可见字幕、封面大字、叠加文本
4. 对视频画面做多帧 OCR
5. 合并：
   - 视频封面文字
   - 可见字幕文本
   - 多帧 OCR 结果
   形成 `transcriptText`
6. 再将 `transcriptText` 与页面正文、摘要合并成 `resolvedContentText`

核心字段：

- `transcriptText`
- `transcriptSegments`
- `frameOcrTexts`
- `resolvedContentText`

### 27.3 后续升级方向

后续可继续增强：

- Whisper / ASR 音频转写
- 关键帧截图输出
- 视频多模态摘要
- 抖音复用同一条视频文字处理管线
