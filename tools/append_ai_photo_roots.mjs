import path from 'node:path';
import crypto from 'node:crypto';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const file=path.resolve('outputs/ai_photo_competition_formal_experiment/AI照片摄影比赛事件正式实验数据表.xlsx');
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(file));
const hash=x=>crypto.createHash('sha256').update(String(x)).digest('hex').slice(0,16);
const topic='#AI照片竟然拿了摄影比赛第一名#', collected='2026-09-23';
const incoming=[
['2030935042','QmCBluhVw','01月11日 14:57','刺激，AI照片拿到摄影比赛第一名，获奖图拉高曝光可见明显字体错乱等Bug',72,233,416],
['3509300853','QmLojwAyS','01月12日 13:20','主办方替换AI获奖照片仍未回应争议',121,18,137],
['1168377245','QmED7rZaD','01月11日 20:07','如果以后拼脑力拼不过AI，是不是只能拼体力了？',4,39,195],
['1734918104','QmCy0gtgJ','01月11日 14:49','AI是一把双刃剑，深度伪造可能破坏信息真实性并引发信任危机',11,65,101],
['3780537534','QmE4yxrZM','01月11日 18:42','不是评委不专业，是AI太专业了，评委跟不上社会发展',24,49,97],
['2707480475','QmCdki12U','01月11日 13:58','AI增加视觉巧思，但这类摄影比赛的意义已经打了折扣',1,27,132],
['5957947374','QmCd3hsQl','01月11日 13:57','AI普及后类似情况还会出现，应加强审核标准和流程',9,38,90],
['2554757470','QmDVZmv3T','01月11日 18:21','现在AI做出来的东西有时真挺像样',17,26,88],
['1704262600','QmCDxpUZs','01月11日 15:03','AI照片拿到摄影比赛第一名，反映AI技术的强大',3,14,98],
['1721284411','QmC7FFLwF','01月11日 13:44','摄影比赛评审应确认RAW及拍摄过程图片是否合理',0,4,57],
['5132930861','QmCcwhjPz','01月11日 13:56','华住高端酒店摄影大赛第一名作品被发现为AI图，质疑活动方及专业评委',12,108,201],
['1363450462','QmCb9fDJp','01月11日 13:53','又是疑似AI图获得摄影比赛第一名，询问图片是否为AI生成',4,17,63],
['1528023654','QmDlUEXL5','01月11日 16:52','认为获奖照片一眼假，并讨论AI风景图与真实摄影的差异',25,61,95],
['2772978773','QmCcN6Rkn','01月11日 13:57','认为AI已经出神入化，两张图片很难分辨',31,19,51],
['2468412425','QmCvbC9tc','01月11日 14:42','讨论AI写真与真实相机摄影之间的矛盾',0,47,13],
['2194868354','QmCwIuuCR','01月11日 14:46','主张AI照片应单设比赛，不应与普通照片混合评比',29,76,330],
['1890556350','QmCGuwCXX','01月11日 15:10','讨论AI对劳动、知识、创造和社会规则的重构',3,8,32],
['1898587152','QmDsG79DW','01月11日 17:09','认为AI取代人类摄影具有讽刺意味',57,68,243],
['5600433880','QmCzujbvS','01月11日 14:53','询问获奖AI照片由哪个软件制作',21,61,580],
['7571178115','QmDZ7aWIr','01月11日 18:28','普通人都能看出AI痕迹，质疑专业评委为何没有发现',0,1,62],
['1751714412','QmCq7BelI','01月11日 14:30','报道主办方替换AI获奖照片但尚未回应争议',43,33,86],
['5991999201','QmCLQvKiP','01月11日 15:23','担忧真假难辨的AI图片和视频影响生活，建议强制水印',5,19,82],
['1719156677','QmBU98WO6','01月11日 13:11','建议摄影比赛完善RAW文件、公示和工具复查流程',0,6,15],
['2099300141','QmD9igFTT','01月11日 16:21','讨论摄影与AI生成艺术在审美和创作方式上的区别',1,2,27],
['2728749874','QmEu1pH4U','01月11日 19:45','认为若无AI标识已难以分辨AI照片',6,59,91],
['1250954022','QmFf5pRn5','01月11日 21:41','建议赛事明确AI作品规则并保存完整创作过程证明',0,0,46],
['2002020501','QmCgnFmA6','01月11日 14:06','总结AI获奖照片事件及其对真实性、公平和评审机制的争议',17,72,124],
['3891666028','QmCQ0DxNg','01月11日 15:33','认为AI可以参加摄影比赛并讨论技术趋势',0,24,11],
];
const rs=wb.worksheets.getItem('根帖前20'), rm=rs.getUsedRange().values, rh=rm[0];
const roots=rm.slice(1).map(r=>Object.fromEntries(rh.map((h,i)=>[h,r[i]])));
for(const [uid,id,created,text,reposts,comments,likes] of incoming)if(!roots.some(r=>r.post_id===id))roots.push({rank:0,event_id:'E11',topic,post_id:id,created_at:created,text_raw:text,author_hash:hash(uid),repost_count:reposts,comment_count:comments,like_count:likes,engagement_total:reposts+comments+likes,post_url:`https://weibo.com/${uid}/${id}`,scope_version:'E11_v2',collection_status:'pending',collected_at:collected});
roots.sort((a,b)=>Number(b.engagement_total)-Number(a.engagement_total)||String(a.post_id).localeCompare(String(b.post_id))); roots.forEach((r,i)=>r.rank=i+1);
const oldRows=rm.length-1,newRows=roots.length;if(newRows>oldRows)for(let i=oldRows;i<newRows;i++)rs.getRangeByIndexes(i+1,0,1,rh.length).copyFrom(rs.getRangeByIndexes(Math.max(1,oldRows),0,1,rh.length),'all');
rs.getRangeByIndexes(1,0,newRows,rh.length).values=roots.map(o=>rh.map(k=>o[k]??''));
if(oldRows>newRows)rs.getRangeByIndexes(newRows+1,0,oldRows-newRows,rh.length).clear({applyTo:'contents'});
const ps=wb.worksheets.getItem('逐帖完整性'),pm=ps.getUsedRange().values,ph=pm[0],existing=new Map(pm.slice(1).map(r=>[r[ph.indexOf('post_id')],Object.fromEntries(ph.map((h,i)=>[h,r[i]]))]));
for(const r of roots){const p=existing.get(r.post_id);if(p?.status)r.collection_status=p.status;}rs.getRangeByIndexes(1,0,newRows,rh.length).values=roots.map(o=>rh.map(k=>o[k]??''));
const progress=roots.map(r=>existing.get(r.post_id)||{rank:r.rank,post_id:r.post_id,reported_reposts:r.repost_count,reported_comments:r.comment_count,reported_likes:r.like_count,visible_comments_collected:0,visible_replies_collected:0,visible_reposts_collected:0,status:'pending',note:'待采集'});progress.forEach((p,i)=>p.rank=i+1);
const oldP=pm.length-1;if(progress.length>oldP)for(let i=oldP;i<progress.length;i++)ps.getRangeByIndexes(i+1,0,1,ph.length).copyFrom(ps.getRangeByIndexes(Math.max(1,oldP),0,1,ph.length),'all');
ps.getRangeByIndexes(1,0,progress.length,ph.length).values=progress.map(o=>ph.map(k=>o[k]??''));
wb.recalculate();await(await SpreadsheetFile.exportXlsx(wb)).save(file);console.log(JSON.stringify({rootCount:roots.length,top:roots.slice(0,5).map(r=>[r.rank,r.post_id,r.engagement_total])}));
