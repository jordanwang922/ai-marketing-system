# 文档与交接规范

文档更新规则
1. 任何设计变更必须同步更新设计文档。
2. 任何功能开发必须在开发日志中记录。
3. 任何重要决策必须记录到对应文档与日志。

交接规则
1. 新 AI 入场必须先读 `project_intro.md`。
2. 再读 `handover/next_actions.md` 了解当前任务。
3. 继续开发时必须更新 `handover/dev_log.md`。

开发日志归档规则
1. `handover/dev_log.md` 达到 500 行必须归档。
2. 归档文件命名格式：`handover/archive/dev_log_YYYY-MM-DD_partN.md`。
3. 归档后清空并从新日志开始记录。
4. 归档记录必须在 `handover/archive/README.md` 更新索引。

进度状态规则
- 每项功能必须标注状态：`planned`、`in_progress`、`blocked`、`done`。
- `handover/next_actions.md` 中必须保持最新状态。
