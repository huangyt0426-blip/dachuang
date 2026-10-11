import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const outDir=path.resolve('outputs/ai_photo_competition_formal_experiment');await fs.mkdir(outDir,{recursive:true});
const out=path.join(outDir,'AI照片摄影比赛事件正式实验数据表.xlsx');
const wb=Workbook.create(); const font='Arial';
const defs={
'说明与进度':[['项目','内容'],['事件ID','E11'],['事件名称','AI照片获得摄影比赛第一名事件'],['时间范围','2026-01-09至2026-01-18'],['核心话题','#AI照片竟然拿了摄影比赛第一名#'],['衍生话题','#主办方替换AI获奖照片仍未回应争议#'],['风险类型','真实性、公平、原创性与版权'],['采集口径','仅采集微博当前实际可见数据；折叠、删除和平台限制单独记录'],['当前阶段','已建立首轮根帖清单并启动逐帖采集'],['采集日期','2026-09-23']],
'根帖前20':[['rank','event_id','topic','post_id','created_at','text_raw','author_hash','repost_count','comment_count','like_count','engagement_total','post_url','scope_version','collection_status','collected_at']],
'全部候选根帖':[['event_id','topic','post_id','created_at','text_raw','author_hash','repost_count','comment_count','like_count','engagement_total','post_url','scope_version','collection_status','collected_at','source_page','review_status','manual_exclusion_reason']],
'评论节点':[['platform','event_id','topic','root_post_id','node_id','parent_node_id','node_type','created_at','text_raw','like_count','repost_count','comment_count','depth','author_hash','collected_at']],
'回复节点':[['platform','event_id','topic','root_post_id','node_id','parent_node_id','node_type','created_at','text_raw','like_count','repost_count','comment_count','depth','author_hash','collected_at','thread_comment_id','parent_relation_status']],
'转发节点':[['platform','event_id','topic','root_post_id','node_id','parent_node_id','node_type','created_at','text_raw','like_count','repost_count','comment_count','depth','author_hash','collected_at','platform_node_id','parent_relation_status','is_default_repost','emotion_eligible','text_truncated']],
'排除节点':[['platform','event_id','topic','root_post_id','node_id','parent_node_id','node_type','created_at','text_raw','like_count','repost_count','comment_count','depth','author_hash','collected_at','exclusion_reason']],
'多级转发':[['root_post_id','node_id','parent_node_id','depth','created_at','text_raw','author_hash','parent_relation_status']],
'逐帖完整性':[['rank','post_id','reported_reposts','reported_comments','reported_likes','visible_comments_collected','visible_replies_collected','visible_reposts_collected','status','note']],
'话题遍历':[['topic','page_start','page_end','candidate_count','traversal_status','collected_at','note']]
};
for(const [name,vals] of Object.entries(defs)){const sh=wb.worksheets.add(name);sh.getRangeByIndexes(0,0,vals.length,vals[0].length).values=vals;sh.showGridLines=false;sh.freezePanes.freezeRows(1);sh.getRangeByIndexes(0,0,1,vals[0].length).format={fill:'#1F4E78',font:{name:font,bold:true,color:'#FFFFFF'},horizontalAlignment:'center',verticalAlignment:'center'};sh.getUsedRange().format.font={name:font,size:10};}
const roots=[
[1,'QmE6PgaiL','01月11日 18:47','长点心吧海燕#AI照片竟然拿了摄影比赛第一名#',7217947278,21,37,707],
[2,'QmCcWBjCu','01月11日 13:57','#AI照片竟然拿了摄影比赛第一名# 拉亮一眼就能看出来的AI图，牌匾字体错乱',5702631406,16,79,425],
[3,'QmC8Qwa3s','01月11日 13:47','#AI照片竟然拿了摄影比赛第一名# 这应该是第二起AI照片获奖了，难道AI比评委更懂艺术？',1921178767,24,74,331],
[4,'QmFlRjwIL','01月11日 21:57','#AI照片竟然拿了摄影比赛第一名# 会有人相信陆家嘴上空能这么低飞过大飞机吗？',1747780592,23,51,354],
[5,'QmCrU7bda','01月11日 14:34','大家能看出来这是AI的吗？AI的水平现在真高',5788900304,18,48,178],
[6,'QmDtwp9zq','01月11日 17:11','#AI照片竟然拿了摄影比赛第一名# 现在AI图片真的让人分不清楚',1130556244,19,81,140],
[7,'QmC321gQ9','01月11日 13:33','AI照片混进摄影比赛拿第一也太离谱了，评委没看出破绽，对实拍参赛者不公平',6919048684,2,28,123],
[8,'QmD7vdIIi','01月11日 16:16','#AI照片竟然拿了摄影比赛第一名# 以后估计都是用AI了',7885097161,0,5,145],
[9,'QmCjOhWhT','01月11日 14:14','#AI照片竟然拿了摄影比赛第一名# 后期使用了AI',1400776392,2,13,133]
];
const hash=x=>crypto.createHash('sha256').update(String(x)).digest('hex');
const topic='#AI照片竟然拿了摄影比赛第一名#';
const rm=roots.map(([rank,id,time,text,uid,r,c,l])=>[rank,'E11',topic,id,time,text,hash(uid).slice(0,16),r,c,l,r+c+l,`https://weibo.com/${uid}/${id}`,'E11_v1','in_progress','2026-09-23']);
let sh=wb.worksheets.getItem('根帖前20');sh.getRangeByIndexes(1,0,rm.length,rm[0].length).values=rm;sh.getRange('F2:F10').format.wrapText=true;
const cm=[['1273976755','26-1-11 19:30','有个叫《智障也有春天》的拿过讲……你知道伐……咩哈哈哈哈哈哈哈……',179],['5797921382','26-1-11 18:51','什么ai，机器人拍的照片罢了',23],['7438217669','26-1-11 20:40','都是看ps水平的懂吗',7],['7339515215','26-1-11 18:57','不是第一次了',5],['2170242837','26-1-12 17:23','首先光影就有问题。巷子口上面开阔的地带怎么打出来这样形状的光',1],['6067582897','26-1-13 23:28','这个比赛的其他获奖照片里面还有AI换天的图，以及PS的图',0],['3244885535','26-1-13 22:53','单说意境这张图挺好，但如果必须实拍却未要求提供RAW验证，评选不够严谨',0],['2472318580','26-1-13 19:58','微博都能检测到是ai',0],['6256224390','26-1-12 13:54','普通人都能看出光影不对，评委为何没看出来？',0],['2994913772','26-1-12 09:35','很多摄影追求这种黑白高级感，不太懂',0],['3319696531','26-1-11 20:24','这还有比赛的必要吗',0],['1642407160','26-1-11 23:45','以前也大量PS，摄影比赛一直都是个权钱生意',8],['7505600826','26-1-11 23:45','看起来有摄影师的风格，感觉是AI模仿创造的',1],['7490828752','26-1-11 19:49','第一张但凡地图上搜搜店名看看街景都不至于',0],['7917188397','26-1-11 21:31','就是炒作和蹭流量，类似事件常被过度解读',6],['7917943956','26-1-11 20:49','经典西夏字',0],['6158448927','26-1-11 19:22','不奇怪，类似作品也能获奖',1]];
const cr=cm.map(([uid,time,text,likes])=>['weibo','E11',topic,'QmE6PgaiL',hash(['QmE6PgaiL',uid,time,text].join('|')).slice(0,32),'QmE6PgaiL','comment',time,text,likes,'','',1,hash(uid).slice(0,16),'2026-09-23']);
sh=wb.worksheets.getItem('评论节点');sh.getRangeByIndexes(1,0,cr.length,cr[0].length).values=cr;sh.getRange(`I2:I${cr.length+1}`).format.wrapText=true;
const prog=roots.map(([rank,id,t,tx,u,r,c,l])=>[rank,id,r,c,l,id==='QmE6PgaiL'?cr.length:0,0,0,id==='QmE6PgaiL'?'visible_comments_partial':'root_listed_pending_nodes',id==='QmE6PgaiL'?'已启动当前平台可见评论采集；后续继续补回复和转发':'根帖已入清单，待逐帖采集']);wb.worksheets.getItem('逐帖完整性').getRangeByIndexes(1,0,prog.length,10).values=prog;
wb.worksheets.getItem('话题遍历').getRange('A2:G2').values=[[topic,1,17,170,'遍历进行中','2026-09-23','微博显示17页；首轮已核验核心话题并建立高互动根帖清单']];
for(const s of wb.worksheets.items){const u=s.getUsedRange();u.format.verticalAlignment='center';u.format.autofitColumns();if(u.columnCount>5)s.getRangeByIndexes(0,Math.min(5,u.columnCount-1),u.rowCount,1).format.columnWidth=55;}
wb.recalculate();console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:20},maxChars:2000})).ndjson);
const img=await wb.render({sheetName:'说明与进度',autoCrop:'all',scale:1.2});await fs.writeFile(path.join(outDir,'preview.png'),new Uint8Array(await img.arrayBuffer()));
await(await SpreadsheetFile.exportXlsx(wb)).save(out);console.log(JSON.stringify({out,roots:roots.length,comments:cr.length}));
