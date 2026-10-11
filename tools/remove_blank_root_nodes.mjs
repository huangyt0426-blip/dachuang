import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const file = 'C:/Users/28178/Documents/ChatGPT/大创/outputs/ai_photo_competition_formal_experiment/AI照片摄影比赛事件正式实验数据表.xlsx';
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(file));
const sheets = ['评论节点', '回复节点', '转发节点', '排除节点'];
const removed = {};

for (const name of sheets) {
  const ws = wb.worksheets.getItem(name);
  const values = ws.getUsedRange().values;
  const header = values[0];
  const rootCol = header.indexOf('root_post_id');
  const kept = [header, ...values.slice(1).filter((row) => String(row[rootCol] ?? '').trim() !== '')];
  removed[name] = values.length - kept.length;
  ws.getUsedRange().clear();
  ws.getRangeByIndexes(0, 0, kept.length, header.length).values = kept;
}

await (await SpreadsheetFile.exportXlsx(wb)).save(file);
console.log(JSON.stringify({ removed, file }));
