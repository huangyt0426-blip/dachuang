import fs from "node:fs/promises";
import path from "node:path";

const project = process.cwd();
const raw = path.join(project, "data", "raw");
const processed = path.join(project, "data", "processed");

function parseCsv(text) {
  const rows=[]; let row=[], field="", quoted=false;
  for(let i=0;i<text.length;i++){const ch=text[i];if(quoted){if(ch==='"'&&text[i+1]==='"'){field+='"';i++;}else if(ch==='"')quoted=false;else field+=ch;}else if(ch==='"')quoted=true;else if(ch===','){row.push(field);field="";}else if(ch==='\n'){row.push(field.replace(/\r$/, ""));rows.push(row);row=[];field="";}else field+=ch;}
  if(field||row.length){row.push(field);rows.push(row);} const head=rows.shift();
  return rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(head.map((h,i)=>[h,r[i]??""])));
}
const esc=v=>/[",\r\n]/.test(String(v??""))?`"${String(v??"").replaceAll('"','""')}"`:String(v??"");
const csv=(rows,cols)=>[cols.join(','),...rows.map(r=>cols.map(c=>esc(r[c])).join(','))].join('\r\n')+'\r\n';
const readCsv=async p=>parseCsv(await fs.readFile(p,'utf8'));

const batch=JSON.parse(await fs.readFile(path.join(raw,'openclaw_additional_posts_nodes_20260911.json'),'utf8'));
const oldComments=await readCsv(path.join(raw,'openclaw_three_posts_comments_visible.csv'));
const oldReplies=await readCsv(path.join(raw,'openclaw_three_posts_replies_visible.csv'));
const oldReposts=await readCsv(path.join(processed,'openclaw_rank01_reposts_hierarchy.csv'));
const cols=["platform","event_id","topic","root_post_id","node_id","parent_node_id","node_type","created_at","text_raw","like_count","repost_count","comment_count","depth","author_hash","collected_at"];
const normalize=(r,type)=>({platform:'weibo',event_id:'E02',topic:'#AI龙虾爆火工信部发布高危风险预警#',root_post_id:r.root_post_id,node_id:r.node_id,parent_node_id:r.parent_node_id||r.root_post_id,node_type:type||r.node_type,created_at:r.created_at,text_raw:r.text_raw??'',like_count:r.like_count??0,repost_count:'',comment_count:'',depth:(type||r.node_type)==='reply'?2:1,author_hash:r.author_hash,collected_at:'2026-09-11'});
const batchRows=Object.values(batch.nodes).flat();
const comments=[...oldComments,...batchRows.filter(r=>r.node_type==='comment').map(r=>normalize(r,'comment'))];
const replies=[...oldReplies,...batchRows.filter(r=>r.node_type==='reply').map(r=>normalize(r,'reply'))];
const reposts=[...oldReposts,...batchRows.filter(r=>r.node_type==='repost').map(r=>normalize(r,'repost'))];

function pureExpression(text){const s=String(text??'').trim();if(!s)return true;if(/^(\[[^\]]+\]\s*)+$/.test(s))return true;const rest=s.replace(/\[[^\]]+\]/g,'').replace(/[\p{Extended_Pictographic}\uFE0F\u200D\s\p{P}\p{S}]/gu,'');return rest.length===0;}
const excluded=[];
const effectiveComments=comments.filter(r=>{if(pureExpression(r.text_raw)){excluded.push({...r,exclusion_reason:'pure_emoji_or_symbol'});return false;}return true;});
const effectiveReplies=replies.filter(r=>{if(pureExpression(r.text_raw)){excluded.push({...r,exclusion_reason:'pure_emoji_or_symbol'});return false;}return true;});
const unique=(rows,keyFn)=>[...new Map(rows.map(r=>[keyFn(r),r])).values()];
const commentOut=unique(effectiveComments,r=>r.node_id||[r.root_post_id,r.node_type,r.created_at,r.text_raw,r.author_hash].join('|'));
const replyOut=unique(effectiveReplies,r=>r.node_id||[r.root_post_id,r.node_type,r.created_at,r.text_raw,r.author_hash].join('|'));
const repostOut=unique(reposts,r=>r.node_id||[r.root_post_id,r.created_at,r.text_raw,r.author_hash].join('|'));
await fs.writeFile(path.join(raw,'openclaw_all_comments_effective.csv'),csv(commentOut,cols),'utf8');
await fs.writeFile(path.join(raw,'openclaw_all_replies_effective.csv'),csv(replyOut,cols),'utf8');
await fs.writeFile(path.join(raw,'openclaw_all_reposts_visible.csv'),csv(repostOut,cols),'utf8');
await fs.writeFile(path.join(raw,'openclaw_excluded_nodes.csv'),csv(excluded,[...cols,'exclusion_reason']),'utf8');

const candidates=await readCsv(path.join(processed,'openclaw_all_candidate_roots_ranked.csv'));
const wanted=Object.keys(batch.meta).filter(id=>id!=='QvazQEzkL');
const roots=candidates.filter(r=>wanted.includes(r.post_id));
roots.unshift({rank:'replacement-original',event_id:'E02',topic:'#AI龙虾爆火工信部发布高危风险预警#',post_id:'QvazQEzkL',created_at:'03月08日 20:09',text_raw:'【#单身小伙用龙虾做出AI女友#】8日，杭州，单身的小严用“龙虾”做了一个AI女友，能聊天、提醒喝水：“像真人一样给你提供情绪价值！”',author_hash:'d34b2eb0e597b5b4',repost_count:259,comment_count:18,like_count:275,engagement_total:552,post_url:'https://weibo.com/2286092114/QvazQEzkL',scope_version:'openclaw_scope_v1',collection_status:'collected_visible',collected_at:'2026-09-11'});
const rootCols=[...new Set(roots.flatMap(r=>Object.keys(r)))];
await fs.writeFile(path.join(processed,'openclaw_current_batch_roots.csv'),csv(roots,rootCols),'utf8');

const status=await readCsv(path.join(raw,'openclaw_collection_status.csv'));
const statusCols=["rank","post_id","reported_reposts","reported_comments","reported_likes","visible_comments_collected","visible_replies_collected","visible_reposts_collected","status","note"];
const byId=new Map(status.map(r=>[r.post_id,r]));
for(const [id,m] of Object.entries(batch.meta)){const rows=batch.nodes[id]||[];const c=rows.filter(r=>r.node_type==='comment'&&!pureExpression(r.text_raw)).length;const q=rows.filter(r=>r.node_type==='reply'&&!pureExpression(r.text_raw)).length;const p=rows.filter(r=>r.node_type==='repost').length;byId.set(id,{rank:id==='QvazQEzkL'?'replacement-original':'batch',post_id:id,reported_reposts:m.reported_reposts,reported_comments:m.reported_comments,reported_likes:m.reported_likes,visible_comments_collected:c,visible_replies_collected:q,visible_reposts_collected:p,status:'visible_collection_complete',note:'按时间采集评论并遍历可见转发；仅声称平台可见数据，纯表情/纯符号节点不进入有效语料'});}
const qvb=byId.get('QvbLFdoWo');if(qvb){qvb.status='excluded_wrong_repost_root';qvb.note='该记录为余干融媒转载帖，402条可见评论均为纯表情刷屏，已从有效语料排除；中国蓝新闻原帖改用QvazQEzkL';qvb.visible_comments_collected=0;}
await fs.writeFile(path.join(raw,'openclaw_collection_status.csv'),csv([...byId.values()],statusCols),'utf8');
console.log(JSON.stringify({effective_comments:commentOut.length,effective_replies:replyOut.length,reposts:repostOut.length,excluded:excluded.length,batch_roots:roots.length}));
