import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const file=path.resolve('outputs/ai_photo_competition_formal_experiment/AI照片摄影比赛事件正式实验数据表.xlsx');
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(file));
const roots=wb.worksheets.getItem('根帖前20'), rm=roots.getUsedRange().values, rh=rm[0];
const progress=wb.worksheets.getItem('逐帖完整性').getUsedRange().values, ph=progress[0];
const statusById=new Map(progress.slice(1).filter(r=>r[ph.indexOf('post_id')]).map(r=>[r[ph.indexOf('post_id')],r[ph.indexOf('status')]]));
for(let i=1;i<rm.length;i++){const id=rm[i][rh.indexOf('post_id')];if(!statusById.has(id))continue;const row=[...rm[i]];row[rh.indexOf('collection_status')]=statusById.get(id);roots.getRangeByIndexes(i,0,1,rh.length).values=[row];}
await(await SpreadsheetFile.exportXlsx(wb)).save(file);
console.log(JSON.stringify({synced:statusById.size,file}));
