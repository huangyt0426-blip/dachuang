import fs from "node:fs/promises";
import path from "node:path";

const project = process.cwd();
const rawDir = path.join(project, "data", "raw");

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ""; }
    else if (ch === '\n') { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows.filter(r => r.some(Boolean)).map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function writeCsv(rows, columns) {
  return [columns.join(","), ...rows.map(r => columns.map(c => csvEscape(r[c])).join(","))].join("\r\n") + "\r\n";
}

const oldComments = parseCsv(await fs.readFile(path.join(rawDir, "openclaw_rank01_comments_visible.csv"), "utf8"));
const checkpoint = JSON.parse(await fs.readFile(path.join(rawDir, "openclaw_three_posts_comments_checkpoint.json"), "utf8"));
const columns = ["platform", "event_id", "topic", "root_post_id", "node_id", "parent_node_id", "node_type", "created_at", "text_raw", "like_count", "repost_count", "comment_count", "depth", "author_hash", "collected_at"];

const normalized = [];
for (const row of oldComments) normalized.push(row);
for (const [rootId, rows] of Object.entries(checkpoint)) {
  for (const row of rows) normalized.push({
    platform: "weibo",
    event_id: "E02",
    topic: rootId === "QvaA5lE5V" ? "#龙虾一秒可搬空用户隐私信息#" : "#AI龙虾爆火工信部发布高危风险预警#",
    root_post_id: rootId,
    node_id: row.node_id,
    parent_node_id: row.parent_node_id,
    node_type: row.node_type,
    created_at: row.created_at,
    text_raw: row.text_raw,
    like_count: row.like_count ?? 0,
    repost_count: "",
    comment_count: "",
    depth: row.node_type === "reply" ? 2 : 1,
    author_hash: row.author_hash,
    collected_at: "2026-09-11",
    parent_key: row.parent_key ?? "",
  });
}

// Existing rank-1 rows are authoritative; merge newly observed rows without duplicating them.
const unique = new Map();
for (const row of normalized) {
  const base = [row.root_post_id, row.node_type, row.created_at, row.text_raw, row.author_hash].join("|");
  const key = row.root_post_id === "QvbLFdoWo" ? `${base}|${row.node_id}` : base;
  if (!unique.has(key)) unique.set(key, row);
}
const all = [...unique.values()];

// Point rank-1 replies at the already assigned sequential comment node id whenever possible.
const rank1Parents = new Map(all.filter(r => r.root_post_id === "Qv7kAkGNh" && r.node_type === "comment")
  .map(r => [[r.created_at, r.text_raw].join("|"), r.node_id]));
for (const row of all) {
  if (row.root_post_id !== "Qv7kAkGNh" || row.node_type !== "reply" || !row.parent_key) continue;
  const parts = row.parent_key.split("|");
  const timeIndex = parts.findIndex(v => /^\d{2}-\d{1,2}-\d{1,2}\s+\d{2}:\d{2}$/.test(v));
  if (timeIndex >= 0) {
    const match = rank1Parents.get([parts[timeIndex], parts.slice(timeIndex + 1).join("|")].join("|"));
    if (match) row.parent_node_id = match;
  }
}

const comments = all.filter(r => r.node_type === "comment");
const replies = all.filter(r => r.node_type === "reply");
await fs.writeFile(path.join(rawDir, "openclaw_three_posts_comments_visible.csv"), writeCsv(comments, columns), "utf8");
await fs.writeFile(path.join(rawDir, "openclaw_three_posts_replies_visible.csv"), writeCsv(replies, columns), "utf8");

const statusPath = path.join(rawDir, "openclaw_collection_status.csv");
let statuses = parseCsv(await fs.readFile(statusPath, "utf8"));
const byId = new Map(statuses.map(r => [r.post_id, r]));
byId.set("Qv7kAkGNh", { rank: 1, post_id: "Qv7kAkGNh", reported_reposts: 666, reported_comments: 438, reported_likes: 5691, visible_comments_collected: comments.filter(r => r.root_post_id === "Qv7kAkGNh").length, visible_replies_collected: replies.filter(r => r.root_post_id === "Qv7kAkGNh").length, visible_reposts_collected: 491, status: "in_progress", note: "一级评论已续采并合并去重；高热回复串已独立展开采集；平台仍可能折叠、删除或限制展示部分节点" });
byId.set("QvaA5lE5V", { rank: 2, post_id: "QvaA5lE5V", reported_reposts: 219, reported_comments: 203, reported_likes: 2725, visible_comments_collected: 0, visible_replies_collected: 0, visible_reposts_collected: 0, status: "blocked_by_author_visibility", note: "2026-09-11登录状态下桌面页和移动页均显示：由于博主设置，目前内容暂不可见" });
byId.set("QvbLFdoWo", { rank: 3, post_id: "QvbLFdoWo", reported_reposts: 39, reported_comments: 429, reported_likes: 341, visible_comments_collected: comments.filter(r => r.root_post_id === "QvbLFdoWo").length, visible_replies_collected: replies.filter(r => r.root_post_id === "QvbLFdoWo").length, visible_reposts_collected: 0, status: "visible_comments_exhausted", note: "按时间分批滚动至连续多批无新增；大量同作者同时间表情评论按页面data-index保留为独立节点；标称与可见差额记为展示限制/折叠/删除" });
statuses = [...byId.values()].sort((a, b) => Number(a.rank) - Number(b.rank));
const statusColumns = ["rank", "post_id", "reported_reposts", "reported_comments", "reported_likes", "visible_comments_collected", "visible_replies_collected", "visible_reposts_collected", "status", "note"];
await fs.writeFile(statusPath, writeCsv(statuses, statusColumns), "utf8");
console.log(JSON.stringify({ comments: comments.length, replies: replies.length, byPost: Object.fromEntries(["Qv7kAkGNh", "QvaA5lE5V", "QvbLFdoWo"].map(id => [id, { comments: comments.filter(r => r.root_post_id === id).length, replies: replies.filter(r => r.root_post_id === id).length }])) }));
