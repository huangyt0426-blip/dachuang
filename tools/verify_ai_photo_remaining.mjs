import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const file = path.resolve('outputs/ai_photo_competition_formal_experiment/AI照片摄影比赛事件正式实验数据表.xlsx');
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(file));
wb.recalculate();
console.log((await wb.inspect({kind:'table',range:'逐帖完整性!A14:J19',include:'values,formulas',tableMaxRows:6,tableMaxCols:10,maxChars:8000})).ndjson);
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:100},summary:'final formula error scan'})).ndjson);
const preview = await wb.render({sheetName:'逐帖完整性',range:'A14:J19',scale:1.5,format:'png'});
await fs.writeFile(path.resolve('outputs/ai_photo_competition_formal_experiment/remaining_verify.png'),new Uint8Array(await preview.arrayBuffer()));
await (await SpreadsheetFile.exportXlsx(wb)).save(file);
