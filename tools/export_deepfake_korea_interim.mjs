import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

function normalizeDate(s) {
  if (!s) return '2024-08-29 12:00:00';
  const str = String(s).trim();
  // Match '08月29日 10:15'
  let m = str.match(/(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})/);
  if (m) {
    const mon = m[1].padStart(2, '0');
    const day = m[2].padStart(2, '0');
    const h = m[3].padStart(2, '0');
    const min = m[4];
    return `2024-${mon}-${day} ${h}:${min}:00`;
  }
  // Match '24-8-29 10:22'
  m = str.match(/24-(\d{1,2})-(\d{1,2})\s*(\d{1,2}):(\d{2})/);
  if (m) {
    const mon = m[1].padStart(2, '0');
    const day = m[2].padStart(2, '0');
    const h = m[3].padStart(2, '0');
    const min = m[4];
    return `2024-${mon}-${day} ${h}:${min}:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str;
  }
  return str;
}

async function exportData() {
  const file = path.resolve('outputs/deepfake_korea_formal_experiment/韩国Deepfake事件正式实验数据表.xlsx');
  const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(file));
  
  // 1. Export posts
  const rSheet = wb.worksheets.getItem('根帖前20').getUsedRange().values;
  const rh = rSheet[0];
  const postCols = ['event_id','topic','post_id','created_at','text_raw','author_hash','author_type','repost_count','comment_count','like_count','collected_at'];
  const postRows = [postCols.join(',')];
  
  for (let i = 1; i < rSheet.length; i++) {
    const row = rSheet[i];
    const vals = postCols.map(c => {
      let v = '';
      if (c === 'author_type') {
        v = 'media';
      } else if (c === 'created_at') {
        v = normalizeDate(row[rh.indexOf(c)]);
      } else {
        v = row[rh.indexOf(c)];
      }
      if (v === undefined || v === null) v = '';
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    });
    postRows.push(vals.join(','));
  }
  
  const outDir = path.resolve('data/interim/deepfake_korea');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'posts.csv'), postRows.join('\n'), 'utf8');
  console.log('Saved posts.csv, count:', postRows.length - 1);
  
  // 2. Export nodes (comments, replies, reposts)
  const nodeCols = ['event_id','root_post_id','node_id','parent_node_id','node_type','depth','created_at','text_raw','like_count','author_hash','collected_at'];
  const nodeRows = [nodeCols.join(',')];
  
  for (const sheetName of ['评论节点', '回复节点', '转发节点']) {
    const s = wb.worksheets.getItem(sheetName).getUsedRange().values;
    const h = s[0];
    for (let i = 1; i < s.length; i++) {
      const row = s[i];
      const vals = nodeCols.map(c => {
        let v = '';
        if (c === 'created_at') {
          v = normalizeDate(row[h.indexOf(c)]);
        } else if (c === 'depth') {
          v = row[h.indexOf(c)];
          if (v === '' || v === undefined || v === null) {
            v = sheetName === '评论节点' ? 1 : sheetName === '回复节点' ? 2 : 1;
          }
        } else {
          v = row[h.indexOf(c)];
        }
        if (v === undefined || v === null) v = '';
        const str = String(v).replace(/"/g, '""');
        return `"${str}"`;
      });
      nodeRows.push(vals.join(','));
    }
  }
  await fs.writeFile(path.join(outDir, 'nodes.csv'), nodeRows.join('\n'), 'utf8');
  console.log('Saved nodes.csv, count:', nodeRows.length - 1);
}

exportData();
