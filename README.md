# AI 风险情绪异质性研究

本仓库用于构建 AI 风险语料库，并微调 `google-bert/bert-base-chinese` 输出：

`P = [P(anger), P(fear)]`

两个标签相互独立，允许一条文本同时包含愤怒与恐惧，也允许两者均不包含。这样不会把中性、悲伤、讽刺等文本强制归入 Anger/Fear。

## 当前研究状态（2026-10-11）

已完成：

- OpenClaw 安全预警事件的候选根帖、评论、回复和转发可见数据整理；
- AI 照片获得摄影比赛第一名事件的 37 条根帖逐帖检查；
- 两个事件的正式实验工作簿，均区分标称互动量与平台实际可见节点；
- 面向多标签 Anger/Fear 的清洗、人工标注、分组切分、BERT 微调、概率推理和传播指标计算代码。

当前尚未训练正式模型。下一步按 [`docs/next_steps.md`](docs/next_steps.md) 执行：先从两个事件抽取统一标注批次，完成双人标注和一致性检验，再进行第一次 BERT 微调；随后采集韩国 Deepfake 性暴力事件并训练跨事件最终模型。

## 研究流程

1. 按 `data/raw/schema.csv` 组织匿名化原始文本，保留来源、事件、时间和互动指标。
2. 运行清洗与去重，生成待标注样本。
3. 两名标注者独立标注 `anger`、`fear`，冲突样本交由第三人仲裁。
4. 按 `root_post_id` 分组切分 train/validation/test，禁止同一根帖下文本泄漏到不同集合。
5. 微调 BERT，报告每类 Precision、Recall、F1、Macro-F1 与概率校准结果。

## 环境

建议直接使用 Google Colab（无本地 NVIDIA GPU 时更省时），或安装 Python 3.10/3.11 后执行：

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

## 目录说明

- `data/raw/`：已匿名化的原始采集数据与字段模式；
- `data/interim/`、`data/processed/`：清洗、汇总及建模中间数据；
- `outputs/`：OpenClaw 和 AI 摄影比赛两份正式实验工作簿；
- `src/ai_risk_emotion/`：数据清洗、标注、BERT 训练、预测与传播分析代码；
- `docs/`：采集规范、标注指南、事件与关键词表、后续计划；
- `tools/`：工作簿构建、增量写入和核验脚本；
- `notebooks/`：可直接在 Google Colab 运行的流程样例。

## 数据格式

训练文件至少包含：

- `text`：清洗后的文本；
- `anger`：0/1；
- `fear`：0/1；
- `event_id`：事件编号，用于防止事件泄漏。

原始采集表还应保存 `platform`、`post_id`、`parent_id`、`created_at`、`like_count`、`comment_count`、`repost_count`、`url_hash` 等字段。公开研究数据中不要保存用户名、手机号或原始 Cookie。

## 运行

```powershell
python -m src.ai_risk_emotion.normalize_collection --posts data/raw/openclaw_topic_posts_ranked.csv --nodes data/raw/openclaw_rank01_comments_visible.csv --output-dir data/interim/openclaw
python -m src.ai_risk_emotion.annotation prepare --input data/interim/openclaw/nodes.csv --output data/annotations/batch_001.csv --sample-size 500
python -m src.ai_risk_emotion.split_data --input data/processed/labeled.csv --output-dir data/processed/splits --group-column root_post_id
python -m src.ai_risk_emotion.train --train data/processed/train.csv --validation data/processed/validation.csv --output outputs/bert-base-chinese
python -m src.ai_risk_emotion.batch_predict --input data/interim/openclaw/nodes.csv --model outputs/bert-base-chinese --output data/processed/predictions.csv
python -m src.ai_risk_emotion.analyze --posts data/interim/openclaw/posts.csv --nodes data/interim/openclaw/nodes.csv --predictions data/processed/predictions.csv --output-dir outputs/analysis
```

零基础操作顺序、字段解释和验收点见 [`docs/implementation_guide.md`](docs/implementation_guide.md)。Colab 可直接运行版本见 [`notebooks/ai_risk_pipeline_colab.ipynb`](notebooks/ai_risk_pipeline_colab.ipynb)。

## 合规边界

优先使用平台开放接口、公开数据集或用户自行导出的数据。不要把 Cookie 提交到仓库；如后续确需登录态，只通过本机环境变量或忽略的 `.env` 注入，并遵守平台条款、频率限制、个人信息保护与研究伦理要求。
