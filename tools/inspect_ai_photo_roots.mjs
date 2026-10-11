import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const file=path.resolve('outputs/ai_photo_competition_formal_experiment/AI照片摄影比赛事件正式实验数据表.xlsx');
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(file));
for(const q of [
 {kind:'table',range:'根帖前20!A1:O20',include:'values,formulas',tableMaxRows:20,tableMaxCols:15},
 {kind:'table',range:'逐帖完整性!A1:J20',include:'values,formulas',tableMaxRows:20,tableMaxCols:10},
 {kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:50}}
]) console.log((await wb.inspect(q)).ndjson);
for(const name of ['评论节点','回复节点','转发节点','排除节点'])console.log(JSON.stringify({name,rows:wb.worksheets.getItem(name).getUsedRange().values.length-1}));
const preview=await wb.render({sheetName:'根帖前20',range:'A1:O20',scale:1});
await fs.writeFile(path.resolve('outputs/ai_photo_competition_formal_experiment/roots_verify.png'),new Uint8Array(await preview.arrayBuffer()));
