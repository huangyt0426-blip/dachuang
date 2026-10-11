import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const file = path.resolve('outputs/ai_photo_competition_formal_experiment/AI照片摄影比赛事件正式实验数据表.xlsx');
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(file));
for (const range of ['根帖前20!A1:O50', '逐帖完整性!A1:J50']) {
  console.log((await wb.inspect({kind:'table', range, include:'values,formulas', tableMaxRows:50, tableMaxCols:15, maxChars:30000})).ndjson);
}
