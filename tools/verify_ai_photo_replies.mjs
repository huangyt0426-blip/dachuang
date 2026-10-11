import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const file = path.resolve('outputs/ai_photo_competition_formal_experiment/AI照片摄影比赛事件正式实验数据表.xlsx');
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(file));
wb.recalculate();
for (const query of [
  { kind: 'table', range: '回复节点!A60:Q72', include: 'values,formulas', tableMaxRows: 13, tableMaxCols: 17 },
  { kind: 'table', range: '转发节点!A130:T142', include: 'values,formulas', tableMaxRows: 13, tableMaxCols: 20 },
  { kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 50 } },
]) console.log((await wb.inspect(query)).ndjson);
const preview = await wb.render({ sheetName: '回复节点', range: 'A60:Q72', scale: 1 });
await fs.writeFile(path.resolve('outputs/ai_photo_competition_formal_experiment/reply_verify.png'), new Uint8Array(await preview.arrayBuffer()));
const repostPreview = await wb.render({ sheetName: '转发节点', range: 'A130:T142', scale: 1 });
await fs.writeFile(path.resolve('outputs/ai_photo_competition_formal_experiment/repost_verify.png'), new Uint8Array(await repostPreview.arrayBuffer()));
