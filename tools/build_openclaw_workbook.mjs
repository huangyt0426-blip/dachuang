import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const project = process.cwd();
const outputDir = path.join(project, "outputs", "openclaw_formal_experiment");
const previewDir = path.join(outputDir, "previews");
await fs.mkdir(previewDir, { recursive: true });

const workbook = Workbook.create();
const summary = workbook.worksheets.add("说明与进度");
summary.showGridLines = false;
summary.getRange("A1:D1").merge();
summary.getRange("A1").values = [["OpenClaw事件正式实验数据工作簿"]];
summary.getRange("A1:D1").format = {
  fill: "#17365D",
  font: { bold: true, color: "#FFFFFF", size: 16 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
summary.getRange("A3:B12").values = [
  ["指标", "当前值"],
  ["冻结范围版本", "openclaw_scope_v1"],
  ["核心话题数", 5],
  ["去重候选根帖", 654],
  ["最终热度根帖", 20],
  ["排名1可见一级评论", 216],
  ["排名1可见回复", 66],
  ["当前有效评论", 529],
  ["排名1可见转发", 491],
  ["多级转发候选", 98],
];
summary.getRange("A3:B3").format = { fill: "#D9EAF7", font: { bold: true, color: "#17365D" } };
summary.getRange("A14:D20").values = [
  ["传播层级口径", "定义", "是否进入结构病毒性", "备注"],
  ["根帖", "事件话题下的原始微博", "是", "每个级联唯一根节点"],
  ["一级转发", "直接转发根帖，或未观察到转发链", "仅父节点明确时", "父节点不可见时不虚构关系"],
  ["二级及更深转发候选", "文本含 //@上一用户: 的可见转发", "否，除非父节点恢复", "截图所示记录属于此类"],
  ["已恢复多级转发", "引用正文与另一可见转发唯一、精确匹配", "是", "父节点写入 inferred_parent_node_id"],
  ["评论回复", "在某条评论下展开的回复", "评论树单独计算", "不得与微博转发树混合"],
  ["默认转发微博", "无新增语义的“转发微博”", "可计传播规模，不用于情绪训练", "当前242条"],
];
summary.getRange("A14:D14").format = { fill: "#D9EAF7", font: { bold: true, color: "#17365D" } };
summary.getRange("A22:D27").values = [
  ["限制/状态", "说明", "处理", "后续动作"],
  ["排名1评论回复", "已展开并采集高热回复串，仍可能存在折叠/删除", "仅声称平台可见范围", "后续继续补充其他回复串"],
  ["排名2根帖", "博主设置导致桌面页和移动页均不可见", "记录为平台可见性阻断", "不虚构、不绕过平台限制"],
  ["转发父节点", "491条中53条通过正文匹配恢复", "其余保持未知", "父节点覆盖充分后再算SV"],
  ["隐私", "作者只保留SHA-256截断标识", "不导出Cookie", "论文公开前再次脱敏"],
  ["BERT", "当前不训练", "等待至少10根帖和1500—2000条双人标注", "采集与标注并行"],
];
summary.getRange("A22:D22").format = { fill: "#FCE4D6", font: { bold: true, color: "#843C0C" } };
summary.getRange("A1:D27").format.wrapText = true;
summary.getRange("A1:D27").format.verticalAlignment = "top";
summary.getRange("A:A").format.columnWidth = 24;
summary.getRange("B:B").format.columnWidth = 58;
summary.getRange("C:C").format.columnWidth = 24;
summary.getRange("D:D").format.columnWidth = 42;
summary.freezePanes.freezeRows(1);

const sources = [
  ["根帖前20", "data/processed/openclaw_top20_roots_final.csv"],
  ["本轮新增根帖", "data/processed/openclaw_current_batch_roots.csv"],
  ["全部候选根帖", "data/processed/openclaw_all_candidate_roots_ranked.csv"],
  ["评论节点", "data/raw/openclaw_all_comments_effective.csv"],
  ["回复节点", "data/raw/openclaw_all_replies_effective.csv"],
  ["转发节点", "data/raw/openclaw_all_reposts_visible.csv"],
  ["排除节点", "data/raw/openclaw_excluded_nodes.csv"],
  ["多级转发", "data/processed/openclaw_rank01_multilevel_reposts.csv"],
  ["逐帖完整性", "data/raw/openclaw_collection_status.csv"],
  ["话题遍历", "data/raw/openclaw_topic_traversal_status.csv"],
];

for (const [sheetName, relativePath] of sources) {
  const csvText = await fs.readFile(path.join(project, relativePath), "utf8");
  const imported = await Workbook.fromCSV(csvText, { sheetName: "Imported" });
  const matrix = imported.worksheets.getItem("Imported").getUsedRange().values;
  const sheet = workbook.worksheets.add(sheetName);
  sheet.getRangeByIndexes(0, 0, matrix.length, matrix[0].length).values = matrix;
  sheet.showGridLines = false;
  sheet.freezePanes.freezeRows(1);
  const used = sheet.getUsedRange();
  const header = used.getRow(0);
  header.format = {
    fill: "#17365D",
    font: { bold: true, color: "#FFFFFF" },
    wrapText: true,
    verticalAlignment: "center",
  };
  used.format.verticalAlignment = "top";
  const headerValues = header.values[0];
  for (let col = 0; col < headerValues.length; col++) {
    const name = String(headerValues[col] ?? "");
    const column = used.getColumn(col);
    let width = 16;
    if (["text_raw", "text_preview", "note", "manual_exclusion_reason"].includes(name)) width = 68;
    else if (["post_url", "source_file", "topic", "topics"].includes(name)) width = 38;
    else if (["created_at", "created_at_parsed", "collected_at", "checked_at"].includes(name)) width = 20;
    else if (["post_id", "node_id", "parent_node_id", "inferred_parent_node_id", "author_hash"].includes(name)) width = 22;
    column.format.columnWidth = width;
    if (width >= 38) column.format.wrapText = true;
  }
  const usedRows = used.values.length;
  if (usedRows > 1) {
    const numericHeaders = new Set(["rank", "repost_count", "comment_count", "like_count", "engagement_total", "depth", "inferred_depth"]);
    for (let col = 0; col < headerValues.length; col++) {
      if (numericHeaders.has(String(headerValues[col]))) {
        used.getColumn(col).format.numberFormat = "#,##0";
      }
    }
  }
}

workbook.recalculate();

for (const sheetName of ["说明与进度", ...sources.map(([name]) => name)]) {
  const sheet = workbook.worksheets.getItem(sheetName);
  const used = sheet.getUsedRange();
  const previewRows = Math.min(25, used.values.length);
  const previewCols = Math.min(12, used.values[0]?.length ?? 1);
  const endCol = String.fromCharCode(64 + Math.min(previewCols, 26));
  const preview = await workbook.render({ sheetName, range: `A1:${endCol}${previewRows}`, scale: 1, format: "png" });
  await fs.writeFile(path.join(previewDir, `${sheetName}.png`), new Uint8Array(await preview.arrayBuffer()));
}

const inspection = await workbook.inspect({
  kind: "table",
  sheetId: "根帖前20",
  range: "A1:H8",
  include: "values,formulas",
  tableMaxRows: 8,
  tableMaxCols: 8,
  maxChars: 4000,
});
await fs.writeFile(path.join(outputDir, "inspection.ndjson"), inspection.ndjson, "utf8");
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
await fs.writeFile(path.join(outputDir, "formula_errors.ndjson"), errors.ndjson, "utf8");

const output = await SpreadsheetFile.exportXlsx(workbook);
const outputPath = path.join(outputDir, "OpenClaw正式实验数据表_评论补采.xlsx");
await output.save(outputPath);
console.log(JSON.stringify({ output: outputPath, sheets: 11 }));
