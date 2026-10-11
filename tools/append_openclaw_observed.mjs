import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const dir=path.resolve('outputs/openclaw_formal_experiment');
const file=path.join(dir,'OpenClaw正式实验数据表.xlsx');
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(file));
const previewDir=path.join(dir,'previews');
await fs.mkdir(previewDir,{recursive:true});
if(process.argv.includes('--inspect')){
 console.log((await wb.inspect({kind:'sheet',include:'id,name',maxChars:4000})).ndjson);
 for(const name of ['评论节点','回复节点','转发节点','逐帖完整性'])console.log(JSON.stringify({name,rows:wb.worksheets.getItem(name).getUsedRange().values.length,header:wb.worksheets.getItem(name).getUsedRange().values[0]}));
 const img=await wb.render({sheetName:'评论节点',range:'D1:J5',scale:1.5});
 await fs.writeFile(path.join(previewDir,'补采前.png'),new Uint8Array(await img.arrayBuffer()));
 process.exit(0);
}
const inputFile=path.resolve('tools/openclaw_observed_input.json');
let input;if(process.argv.includes('--stdin')||process.argv.includes('--stdin-gzip')){const {createInterface}=await import('node:readline');const rl=createInterface({input:process.stdin,terminal:false});const s=await new Promise((resolve,reject)=>{rl.once('line',resolve);rl.once('error',reject)});rl.close();const decoded=process.argv.includes('--stdin-gzip')?(await import('node:zlib')).gunzipSync(Buffer.from(s.trim(),'base64')).toString('utf8'):s;input=JSON.parse(decoded);}else input=JSON.parse(await fs.readFile(inputFile,'utf8'));
if(input.rows){input.groups=[...new Set(input.rows.map(r=>r[0]))].map(root=>{const rows=input.rows.filter(r=>r[0]===root);const cs=rows.filter(r=>r[1]==='comment');return{root,note:input.notes?.[root],rows:rows.map(r=>[r[1],r[2],r[3],r[4],r[5],r[1]==='reply'?cs.findIndex(c=>c[4]===r[6]):null,r[7]])};});}
const collected=new Date().toISOString().slice(0,10);
const hash=x=>crypto.createHash('sha256').update(String(x)).digest('hex');
const anon=text=>String(text).replace(/@([^:：\s/@]+)/g,(_,name)=>'@anon_'+hash(name).slice(0,12));
const stripped=text=>String(text).replace(/回复@[^:：]+[:：]/g,'').replace(/\[[^\]]*\]/g,'').replace(/[\p{Extended_Pictographic}\p{Emoji_Component}\p{P}\p{S}\s\u200b-\u200f\ufeff]/gu,'');
const names=['评论节点','回复节点','转发节点','排除节点'];
const before=new Map();
for(let i=0;i<wb.worksheets.items.length;i++){const sh=wb.worksheets.getItemAt(i);before.set(sh.name,JSON.stringify({values:sh.getUsedRange().values,formulas:sh.getUsedRange().formulas}));}
const matrices=Object.fromEntries(names.map(n=>[n,wb.worksheets.getItem(n).getUsedRange().values]));
const added=Object.fromEntries(names.map(n=>[n,[]]));
const rootTopics=new Map(wb.worksheets.getItem('根帖前20').getUsedRange().values.slice(1).map(r=>{const h=wb.worksheets.getItem('根帖前20').getUsedRange().values[0];return[r[h.indexOf('post_id')],r[h.includes('topics')?h.indexOf('topics'):h.indexOf('topic')]];}));
const known=new Set();const knownLocation=new Map();
for(const name of names){const [h,...rows]=matrices[name];for(let i=0;i<rows.length;i++){const r=rows[i];const k=[r[h.indexOf('root_post_id')],r[h.indexOf('node_type')],r[h.indexOf('author_hash')],String(r[h.indexOf('created_at')]),String(r[h.indexOf('text_raw')]).replace(/\s+/g,'')].join('|');known.add(k);knownLocation.set(k,{name,row:i+1,header:h});}}
const observations=[];
for(const group of input.groups){
 const root=group.root;
 const comments=group.rows.filter(r=>r[0]==='comment');
 const cids=comments.map(r=>hash([root,'comment',r[1],r[2],anon(r[3])].join('|')).slice(0,32));
 for(const row of group.rows){
  const [type,uid,time,raw,likes,parentIndex,platformId,reportedReplyCount]=row;
  const text=anon(raw),author=hash(uid).slice(0,16);
  const key=[root,type,author,time,text.replace(/\s+/g,'')].join('|');
  if(known.has(key)){if(type==='comment'&&Number(reportedReplyCount)>0){const loc=knownLocation.get(key);if(loc?.name==='评论节点'){const ci=loc.header.indexOf('comment_count');if(ci>=0)wb.worksheets.getItem('评论节点').getRangeByIndexes(loc.row,ci,1,1).values=[[Number(reportedReplyCount)]];}}continue;}
  known.add(key);
  const id=platformId||hash([root,type,uid,time,text].join('|')).slice(0,32);
  const indirect=type==='reply'&&/^回复@/.test(raw);
  const chained=type==='repost'&&/\/\/@/.test(raw);
  const parent=type==='comment'?root:type==='reply'&&!indirect?cids[parentIndex]||'':type==='repost'&&!chained?'':'';
  const record={platform:'weibo',event_id:'E02',topic:rootTopics.get(root)||'',root_post_id:root,node_id:id,parent_node_id:parent,node_type:type,created_at:time,text_raw:text,like_count:Number(likes)||0,repost_count:'',comment_count:type==='comment'&&Number(reportedReplyCount)>0?Number(reportedReplyCount):'',depth:type==='comment'?1:type==='reply'&&!indirect&&parent?2:'',author_hash:author,collected_at:collected,thread_comment_id:type==='reply'?cids[parentIndex]||'':'',parent_relation_status:type==='reply'?(indirect?'thread_known_direct_parent_unknown':'observed_comment_reply'):type==='repost'?(chained?'quoted_chain_parent_unknown':'direct_parent_unverified'):'observed_root_comment',platform_node_id:platformId||'',is_default_repost:type==='repost'&&/^(转发微博|轉發微博|Repost)$/i.test(raw.trim())?1:0};
  const onlyTopic=!stripped(String(raw).replace(/#[^#]+#/g,''));
  const excluded=type!=='repost'&&(!stripped(raw)||onlyTopic);
  const sheet=excluded?'排除节点':type==='comment'?'评论节点':type==='reply'?'回复节点':'转发节点';
  if(excluded){record.exclusion_reason=!stripped(raw)?'pure_emoji_or_symbol':'pure_topic';record.manual_exclusion_reason=!stripped(raw)?'纯表情或符号，跳过情绪语料':'纯话题标签，跳过情绪语料';}
  record.text_truncated=/\.\.\.全文$/.test(raw)?1:0;
  record.emotion_eligible=record.is_default_repost||onlyTopic||record.text_truncated?0:1;
  added[sheet].push(record);observations.push(record);
 }
}
for(const name of names){
 const [oldHeader,...oldRows]=matrices[name];
 const needed=name==='回复节点'?['thread_comment_id','parent_relation_status']:name==='转发节点'?['platform_node_id','parent_relation_status','is_default_repost','emotion_eligible','text_truncated']:[];
 const header=[...oldHeader,...needed.filter(k=>!oldHeader.includes(k))];
 const sh=wb.worksheets.getItem(name);
 if(header.length>oldHeader.length){sh.getRangeByIndexes(0,oldHeader.length,1,header.length-oldHeader.length).copyFrom(sh.getRangeByIndexes(0,oldHeader.length-1,1,1),'all');sh.getRangeByIndexes(0,0,1,header.length).values=[header];}
 if(added[name].length){const start=oldRows.length+1;for(let j=0;j<added[name].length;j++)sh.getRangeByIndexes(start+j,0,1,oldHeader.length).copyFrom(sh.getRangeByIndexes(Math.max(1,start-1),0,1,oldHeader.length),'all');sh.getRangeByIndexes(start,0,added[name].length,header.length).values=added[name].map(o=>header.map(k=>o[k]??''));sh.getRangeByIndexes(start,header.indexOf('text_raw'),added[name].length,1).format.wrapText=true;sh.getRangeByIndexes(start,0,added[name].length,header.length).format.autofitRows();}
}
const progress=wb.worksheets.getItem('逐帖完整性');const pm=progress.getUsedRange().values;const ph=pm[0];
for(const group of input.groups){let row=pm.findIndex(r=>r[ph.indexOf('post_id')]===group.root);const r=row>0?[...pm[row]]:Array(ph.length).fill('');if(row<1){row=pm.length;const rm=wb.worksheets.getItem('根帖前20').getUsedRange().values;const rh=rm[0];const rr=rm.slice(1).find(v=>v[rh.indexOf('post_id')]===group.root);r[ph.indexOf('post_id')]=group.root;for(const [dest,src] of [['rank','rank'],['reported_reposts','repost_count'],['reported_comments','comment_count'],['reported_likes','like_count']])r[ph.indexOf(dest)]=rr?.[rh.indexOf(src)]??'';pm.push(r);progress.getRangeByIndexes(row,0,1,ph.length).copyFrom(progress.getRangeByIndexes(row-1,0,1,ph.length),'all');}for(const [type,sheet,col] of [['comment','评论节点','visible_comments_collected'],['reply','回复节点','visible_replies_collected'],['repost','转发节点','visible_reposts_collected']]){const m=wb.worksheets.getItem(sheet).getUsedRange().values;const h=m[0];r[ph.indexOf(col)]=m.slice(1).filter(v=>v[h.indexOf('root_post_id')]===group.root).length;}r[ph.indexOf('status')]=input.statuses?.[group.root]||'in_progress';r[ph.indexOf('note')]=group.note||'已补采当前平台可见数据；标称数与可见数差额按平台折叠、删除或展示限制记录';progress.getRangeByIndexes(row,0,1,ph.length).values=[r];}
const summary=wb.worksheets.getItem('说明与进度');summary.getRange('B10').values=[[wb.worksheets.getItem('评论节点').getUsedRange().values.length-1]];
wb.recalculate();
for(const [name,v] of before)if(![...names,'逐帖完整性','说明与进度'].includes(name)&&JSON.stringify({values:wb.worksheets.getItem(name).getUsedRange().values,formulas:wb.worksheets.getItem(name).getUsedRange().formulas})!==v)throw Error('Unexpected change: '+name);
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:30},maxChars:2000})).ndjson);
const commentSheet=wb.worksheets.getItem('评论节点');const end=commentSheet.getUsedRange().values.length;
const preview=await wb.render({sheetName:'评论节点',range:`D${Math.max(1,end-4)}:J${end}`,scale:1.5});await fs.writeFile(path.join(previewDir,'本轮补采.png'),new Uint8Array(await preview.arrayBuffer()));
try{await fs.access(file+'.before_20260917.bak');}catch{await fs.copyFile(file,file+'.before_20260917.bak');}
await(await SpreadsheetFile.exportXlsx(wb)).save(file);
const check=await SpreadsheetFile.importXlsx(await FileBlob.load(file));for(const name of names)if(check.worksheets.getItem(name).getUsedRange().values.length!==wb.worksheets.getItem(name).getUsedRange().values.length)throw Error('Saved row mismatch');
const batchPath=path.resolve('data/raw/openclaw_batch_20260917_anonymized.json');let previous=[];try{previous=JSON.parse(await fs.readFile(batchPath,'utf8')).nodes;}catch{}await fs.writeFile(batchPath,JSON.stringify({collected_at:collected,nodes:[...previous,...observations]},null,2));
const csvFiles={'评论节点':'openclaw_all_comments_effective.csv','回复节点':'openclaw_all_replies_effective.csv','转发节点':'openclaw_all_reposts_visible.csv','排除节点':'openclaw_excluded_nodes.csv','逐帖完整性':'openclaw_collection_status.csv'};
for(const [name,csv] of Object.entries(csvFiles)){const matrix=check.worksheets.getItem(name).getUsedRange().values;const quote=v=>/[",\r\n]/.test(String(v??''))?'"'+String(v??'').replace(/"/g,'""')+'"':String(v??'');await fs.writeFile(path.resolve('data/raw',csv),matrix.map(r=>r.map(quote).join(',')).join('\n')+'\n','utf8');}
if(!process.argv.includes('--stdin'))await fs.unlink(inputFile);
console.log(JSON.stringify({added:Object.fromEntries(names.map(n=>[n,added[n].length])),totals:Object.fromEntries(names.map(n=>[n,check.worksheets.getItem(n).getUsedRange().values.length-1])),file}));
