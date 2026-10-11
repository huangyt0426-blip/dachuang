# AI 风险情绪异质性：小白执行手册

## 先理解四张表

1. `posts.csv`：每行是一条热搜话题下的根微博，保存转发、评论、点赞快照。
2. `nodes.csv`：每行是一条根微博、转发、评论或回复，父节点用于还原传播树。
3. `labeled.csv`：人工填写 Anger/Fear 标签的训练数据。
4. `predictions.csv`：BERT 为每条节点文本输出的愤怒和恐惧概率。

最终分析程序将生成级联指标、时间窗口、交互指标、假设检验和风险分级表。

## 第 1 步：准备环境

没有 NVIDIA 显卡时使用 Google Colab。仅验证数据和指标时，本地 Python 3.10/3.11 即可：

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

## 第 2 步：整理采集数据

按照 `data/raw/posts_schema.csv` 和 `data/raw/nodes_schema.csv` 填写。重要规则：

- 所有作者使用 SHA-256 匿名编号；
- 评论与转发必须填写 `root_post_id`；
- 能确定父节点时填写 `parent_node_id`，不能确定时留空；
- 评论和转发分别标记，不能把评论当转发边；
- 页面标称数量与实际采集数量分别保存。

将当前已有OpenClaw表转换为统一格式：

```powershell
python -m src.ai_risk_emotion.normalize_collection `
  --posts data/raw/openclaw_topic_posts_ranked.csv `
  --nodes data/raw/openclaw_rank01_comments_visible.csv `
  --output-dir data/interim/openclaw
```

当前评论文件只有第1帖的可见一级评论，所以只能计算交互描述，尚不能计算转发结构病毒性。

## 第 3 步：生成标注表

```powershell
python -m src.ai_risk_emotion.annotation prepare `
  --nodes data/interim/openclaw/nodes.csv `
  --output data/processed/annotation_500.csv `
  --size 500
```

复制两份，分别交给标注员A和B。每人独立填写：

- `anger`：0或1；
- `fear`：0或1；
- `relevant`：是否与AI风险相关；
- 责任对象、回避、信息搜索、反讽和风险类型等辅助字段。

检查一致性：

```powershell
python -m src.ai_risk_emotion.annotation agreement `
  --annotator-a data/processed/annotator_a.csv `
  --annotator-b data/processed/annotator_b.csv
```

最低Kappa应达到0.75；未达到时先修订标注规则，不要立即扩大标注。

## 第 4 步：分组切分数据

仲裁完成后生成包含 `text, anger, fear, event_id, root_post_id` 的最终标注表：

```powershell
python -m src.ai_risk_emotion.split_data `
  --input data/processed/labeled_final.csv `
  --output-dir data/processed/splits `
  --group-column root_post_id
```

同一根微博下的文本只会进入一个数据集，防止泄漏。

## 第 5 步：在 Colab 微调 BERT

```bash
python -m src.ai_risk_emotion.train \
  --train data/processed/splits/train.csv \
  --validation data/processed/splits/validation.csv \
  --output outputs/bert-ai-risk
```

验收目标：Macro-F1不低于0.75，Anger/Fear单类F1原则上不低于0.70。

## 第 6 步：预测全部传播文本

```bash
python -m src.ai_risk_emotion.batch_predict \
  --input data/interim/all_events/nodes.csv \
  --model outputs/bert-ai-risk \
  --output data/processed/predictions.csv
```

## 第 7 步：计算指标和检验假设

```powershell
python -m src.ai_risk_emotion.analyze `
  --posts data/interim/all_events/posts.csv `
  --nodes data/interim/all_events/nodes.csv `
  --predictions data/processed/predictions.csv `
  --output-dir outputs/analysis `
  --frequency 6h `
  --dominance-threshold 0.60
```

主要输出：

- `cascade_metrics.csv`：H1拓扑指标；
- `temporal_metrics.csv`、`h2_next_window_tests.csv`：H2时间指标；
- `interaction_metrics.csv`、`h3_interaction_tests.csv`：H3交互指标；
- `time_windows.csv`：每6小时的情绪与传播变化；
- `risk_windows.csv`、`entropy_weights.csv`：满足30个窗口后输出熵权—ABC结果。

## 第 8 步：稳健性检验

把主导阈值依次改为0.55、0.60和0.65运行三次。三个版本结论方向一致，才能写“结果稳健”。

时间窗口还要比较：

- 主分析：6小时；
- 补充分析：12小时；
- 数据稀疏事件：1天。

## 不能越过的结论边界

- 没有父节点的数据不能计算完整结构病毒性；
- 累计互动数不能计算半衰期，必须使用节点时间形成新增互动曲线；
- 只有三个整体事件时不能直接做ABC，至少需要30个事件时间窗口；
- 结果表述为“相关”或“存在显著差异”，不能直接写成因果关系。
