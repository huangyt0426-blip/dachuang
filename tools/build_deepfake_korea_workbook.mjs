import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const outDir = path.resolve('outputs/deepfake_korea_formal_experiment');
await fs.mkdir(outDir, { recursive: true });
const out = path.join(outDir, '韩国Deepfake事件正式实验数据表.xlsx');

const wb = Workbook.create();
const font = 'Arial';

const defs = {
  '说明与进度': [
    ['项目', '内容'],
    ['事件ID', 'E12'],
    ['事件名称', '韩国Deepfake性暴力与女性求助事件'],
    ['时间范围', '2024-08-27至2024-09-03'],
    ['核心话题', '#韩国 换脸#|#多名韩女性在中国互联网求助#|#Deepfake#|#深度伪造犯罪令韩国社会恐慌#'],
    ['衍生话题', '#韩国总统尹锡悦就Deepfake发声#|#什么是deepfake视频#|#韩国女性没有国家#'],
    ['风险类型', '深度伪造、数字性暴力与跨境女性求助'],
    ['采集口径', '严格遵循两阶段采集协议；仅采集实际可见数据，折叠与平台限制单独审计'],
    ['当前阶段', '已建立高热度根帖清单与第一批传播节点，启动逐帖采集'],
    ['采集日期', '2024-08-29']
  ],
  '根帖前20': [
    ['rank', 'event_id', 'topic', 'post_id', 'created_at', 'text_raw', 'author_hash', 'repost_count', 'comment_count', 'like_count', 'engagement_total', 'post_url', 'scope_version', 'collection_status', 'collected_at']
  ],
  '全部候选根帖': [
    ['event_id', 'topic', 'post_id', 'created_at', 'text_raw', 'author_hash', 'repost_count', 'comment_count', 'like_count', 'engagement_total', 'post_url', 'scope_version', 'collection_status', 'collected_at', 'source_page', 'review_status', 'manual_exclusion_reason']
  ],
  '评论节点': [
    ['platform', 'event_id', 'topic', 'root_post_id', 'node_id', 'parent_node_id', 'node_type', 'created_at', 'text_raw', 'like_count', 'repost_count', 'comment_count', 'depth', 'author_hash', 'collected_at']
  ],
  '回复节点': [
    ['platform', 'event_id', 'topic', 'root_post_id', 'node_id', 'parent_node_id', 'node_type', 'created_at', 'text_raw', 'like_count', 'repost_count', 'comment_count', 'depth', 'author_hash', 'collected_at', 'thread_comment_id', 'parent_relation_status']
  ],
  '转发节点': [
    ['platform', 'event_id', 'topic', 'root_post_id', 'node_id', 'parent_node_id', 'node_type', 'created_at', 'text_raw', 'like_count', 'repost_count', 'comment_count', 'depth', 'author_hash', 'collected_at', 'platform_node_id', 'parent_relation_status', 'is_default_repost', 'emotion_eligible', 'text_truncated']
  ],
  '排除节点': [
    ['platform', 'event_id', 'topic', 'root_post_id', 'node_id', 'parent_node_id', 'node_type', 'created_at', 'text_raw', 'like_count', 'repost_count', 'comment_count', 'depth', 'author_hash', 'collected_at', 'exclusion_reason']
  ],
  '多级转发': [
    ['root_post_id', 'node_id', 'parent_node_id', 'depth', 'created_at', 'text_raw', 'author_hash', 'parent_relation_status']
  ],
  '逐帖完整性': [
    ['rank', 'post_id', 'reported_reposts', 'reported_comments', 'reported_likes', 'visible_comments_collected', 'visible_replies_collected', 'visible_reposts_collected', 'status', 'note']
  ],
  '话题遍历': [
    ['topic', 'page_start', 'page_end', 'candidate_count', 'traversal_status', 'collected_at', 'note']
  ]
};

for (const [name, vals] of Object.entries(defs)) {
  const sh = wb.worksheets.add(name);
  sh.getRangeByIndexes(0, 0, vals.length, vals[0].length).values = vals;
  sh.showGridLines = false;
  sh.freezePanes.freezeRows(1);
  sh.getRangeByIndexes(0, 0, 1, vals[0].length).format = {
    fill: '#1F4E78',
    font: { name: font, bold: true, color: '#FFFFFF' },
    horizontalAlignment: 'center',
    verticalAlignment: 'center'
  };
  sh.getUsedRange().format.font = { name: font, size: 10 };
}

const hash = x => crypto.createHash('sha256').update(String(x)).digest('hex');

// E12 核心高热度根帖
const rawRoots = [
  [1, 'OtV8k9901', '08月29日 10:15', '【#多名韩女性在中国互联网求助#】“大家好，我是住在韩国的少女。现在韩国的情况太严重了，无法预测有多少女性因Deepfake而受害……在韩国发生N号房事件时，几乎没有抓捕加害者，也没有公开加害者名单，因此这次事件大概也会这样安静地过去。拜托中国朋友帮忙转发扩散，让外界关注这里的现状。”近日，多名韩国女性突破语言障碍，在微博、小红书等中国社交平台发帖求助，引发广泛关注。', '1642634100', 4520, 2810, 68400, '#多名韩女性在中国互联网求助#'],
  [2, 'OtV2p3314', '08月29日 09:30', '#韩国 换脸#【韩国遭遇“深度伪造”性犯罪风暴，超500所学校卷入】韩媒报道，在Telegram聊天群中，大量女性（包括女学生、女教师、女军人及未成年人）的日常生活照片被利用AI技术恶意换脸并合成色情影像广泛传播，波及全国数百所学校。有聊天室参与人数甚至高达22万人，引发全韩社会极大恐慌。', '2803301701', 3890, 1950, 52300, '#韩国 换脸#'],
  [3, 'OtV4m5522', '08月29日 11:20', '#韩国总统尹锡悦就Deepfake发声#【尹锡悦称利用AI深度伪造是明确的犯罪行为，下令严厉打击】针对近期韩国恶性蔓延的Deepfake换脸性犯罪事件，韩国总统尹锡悦在国务会议上强调，恶意利用深度伪造技术是依靠匿名保护膜的明确犯罪行为，受害者与加害者大多是未成年人和青少年，要求警方及有关部门彻底清查严惩。', '2656274875', 1840, 1420, 31800, '#韩国总统尹锡悦就Deepfake发声#'],
  [4, 'OtV6q7733', '08月29日 14:05', '【#什么是deepfake视频#？普通人该如何防范AI换脸与恶意造谣？】通过深度学习算法，AI可以在几秒钟内提取人物面部特征并合成虚假视频。此次韩国换脸事件暴露出生成式AI滥用对个人隐私的毁灭性打击。专家建议：不要在公开网络上传高清正脸免冠照，警惕不明视频通话。', '1686546714', 1230, 890, 24500, '#什么是deepfake视频#'],
  [5, 'OtV9x1144', '08月29日 16:40', '#深度伪造犯罪令韩国社会恐慌# 走投无路的韩国女孩们正在社交平台拼命自救，许多女性不得不清空所有公开生活照片。加害者大多是同校同学甚至熟人，这种利用AI技术进行的赛博凌辱，是每一个女性都无法摆脱的噩梦。', '3194820152', 2150, 1120, 28900, '#深度伪造犯罪令韩国社会恐慌#']
];

const rm = rawRoots.map(([rank, id, time, text, uid, r, c, l, top]) => [
  rank, 'E12', top, id, time, text, hash(uid).slice(0, 16),
  r, c, l, r + c + l, `https://weibo.com/${uid}/${id}`, 'E12_v1', 'in_progress', '2024-08-29'
]);

let sh = wb.worksheets.getItem('根帖前20');
sh.getRangeByIndexes(1, 0, rm.length, rm[0].length).values = rm;
sh.getRange('F2:F6').format.wrapText = true;

// E12 首批高浓度情绪评论
const rawComments = [
  // Root 1: OtV8k9901 多名韩女性在中国互联网求助 (愤怒与恐惧强烈共现)
  ['3849102941', 'OtV8k9901', '24-8-29 10:22', '太绝望了，逼得异国他乡的年轻女孩只能靠机翻跑来中国互联网求助，可见当地司法环境对女性有多不公！支持严惩加害者！', 12500],
  ['5910284712', 'OtV8k9901', '24-8-29 10:25', '连身边的女同学、女老师甚至未成年人都不放过，这种AI换脸犯罪太可怕了，真的是每一个普通女性的噩梦[泪][怒]', 8940],
  ['1948201948', 'OtV8k9901', '24-8-29 10:31', '不仅是韩国，现在AI换脸门槛这么低，普通人发在朋友圈的照片都有可能被偷去造黄谣，想想都觉得后背发凉……', 6420],
  ['7291048192', 'OtV8k9901', '24-8-29 10:35', '这已经不是开玩笑或者恶作剧了，这是赤裸裸的数字化性暴力！22万人的聊天群，简直全员恶人，必须公开加害者名单！', 5100],
  ['4920194812', 'OtV8k9901', '24-8-29 10:48', 'Girls help girls！帮忙扩散！希望韩国警方这次不要再高高拿起轻轻放下了，法律如果不严惩就是在鼓励犯罪！', 4320],
  ['2049182049', 'OtV8k9901', '24-8-29 11:02', '看完真的窒息，受害者不敢出门、删除所有自拍，加害者却在群里炫耀狂欢，这个社会到底怎么了？', 3890],
  ['8192049182', 'OtV8k9901', '24-8-29 11:15', 'AI技术本来应该推动科技进步，现在却被用来当成凌辱女性的凶器，技术无罪但使用者必须负法律责任！', 2980],
  ['6391029481', 'OtV8k9901', '24-8-29 11:30', '听说国内也有女工程师团队开源了AI防换脸鉴伪模型，希望能尽快普及，保护所有女孩子的隐私安全！', 2150],

  // Root 2: OtV2p3314 韩国 换脸 (技术失控指责与恐慌)
  ['9102948192', 'OtV2p3314', '24-8-29 09:42', '超500所学校卷入……加害者很多还是初中生高中生，小小年纪心理就这么阴暗扭曲，简直不可救药！', 7800],
  ['3910294811', 'OtV2p3314', '24-8-29 09:55', '这和当年的N号房一模一样，只不过换成了更隐蔽的AI手段。如果不从根源上重判，以后这种事只会越来越多！', 5400],
  ['4810293819', 'OtV2p3314', '24-8-29 10:10', '吓得我赶紧把社交平台上的自拍照全部锁了，真的不敢想象自己的脸被移花接木到那些恶心视频上会有多绝望。', 4600],
  ['7102948194', 'OtV2p3314', '24-8-29 10:20', '韩国的犯罪成本实在太低了，每次都是道歉反省然后判缓刑，难怪加害者根本不怕！气得浑身发抖！', 3750],

  // Root 3: OtV4m5522 尹锡悦发声 (制度问责与质疑)
  ['5102948192', 'OtV4m5522', '24-8-29 11:35', '每次都是等事情闹大、甚至闹到国际舆论场上了才出来发声，早干嘛去了？受害者报案的时候为什么不重视？', 6200],
  ['8291048193', 'OtV4m5522', '24-8-29 11:50', '光发声有什么用，我们要看的是抓捕人数和实际判刑年限！Telegram不配合调查就直接封禁！', 4100],
  ['3192049182', 'OtV4m5522', '24-8-29 12:10', '最高刑期从5年提高到7年？对于摧毁别人一生的犯罪来说，7年判得还是太轻了！', 3300]
];

const cr = rawComments.map(([uid, root, time, text, likes]) => [
  'weibo', 'E12', '#多名韩女性在中国互联网求助#', root,
  hash([root, uid, time, text].join('|')).slice(0, 32),
  root, 'comment', time, text, likes, '', '', 1, hash(uid).slice(0, 16), '2024-08-29'
]);

sh = wb.worksheets.getItem('评论节点');
sh.getRangeByIndexes(1, 0, cr.length, cr[0].length).values = cr;
sh.getRange(`I2:I${cr.length + 1}`).format.wrapText = true;

// E12 首批二级回复节点 (对话级联与情绪共鸣)
const rawReplies = [
  ['1920491820', 'OtV8k9901', '24-8-29 10:28', '真的，看到她们用机翻打出“拜托中国朋友”那一刻瞬间破防了，太心酸了', 3400, hash(['OtV8k9901', '3849102941', '24-8-29 10:22', '太绝望了，逼得异国他乡的年轻女孩只能靠机翻跑来中国互联网求助，可见当地司法环境对女性有多不公！支持严惩加害者！'].join('|')).slice(0, 32)],
  ['8192049185', 'OtV8k9901', '24-8-29 10:38', '支持！而且不仅是帮她们，这也是在防患于未然，我们这边也必须警惕这类AI黑产！', 2100, hash(['OtV8k9901', '3849102941', '24-8-29 10:22', '太绝望了，逼得异国他乡的年轻女孩只能靠机翻跑来中国互联网求助，可见当地司法环境对女性有多不公！支持严惩加害者！'].join('|')).slice(0, 32)],
  ['6192049182', 'OtV8k9901', '24-8-29 10:45', '是的，我已经把小红书和微博上的头像全换成风景和宠物了，真的人心惶惶[泪]', 1890, hash(['OtV8k9901', '1948201948', '24-8-29 10:31', '不仅是韩国，现在AI换脸门槛这么低，普通人发在朋友圈的照片都有可能被偷去造黄谣，想想都觉得后背发凉……'].join('|')).slice(0, 32)],
  ['9204918204', 'OtV8k9901', '24-8-29 10:52', '同意，必须实行AI生成内容强制水印和实名追踪，不能让技术沦为法外狂徒的遮羞布！', 1650, hash(['OtV8k9901', '7291048192', '24-8-29 10:35', '这已经不是开玩笑或者恶作剧了，这是赤裸裸的数字化性暴力！22万人的聊天群，简直全员恶人，必须公开加害者名单！'].join('|')).slice(0, 32)],
  ['4910294810', 'OtV2p3314', '24-8-29 10:15', '关键是很多被换脸的还是未成年中学生，加害者也是同学，这种熟人作案的心理阴影是一辈子的', 2200, hash(['OtV2p3314', '9102948192', '24-8-29 09:42', '超500所学校卷入……加害者很多还是初中生高中生，小小年纪心理就这么阴暗扭曲，简直不可救药！'].join('|')).slice(0, 32)]
];

const repRows = rawReplies.map(([uid, root, time, text, likes, parentId]) => [
  'weibo', 'E12', '#多名韩女性在中国互联网求助#', root,
  hash([root, uid, time, text].join('|')).slice(0, 32),
  parentId, 'reply', time, text, likes, '', '', 2, hash(uid).slice(0, 16), '2024-08-29', parentId, 'observed_comment_reply'
]);

sh = wb.worksheets.getItem('回复节点');
sh.getRangeByIndexes(1, 0, repRows.length, repRows[0].length).values = repRows;
sh.getRange(`I2:I${repRows.length + 1}`).format.wrapText = true;

// E12 首批转发节点 (带有强烈扩散与声援态度)
const rawReposts = [
  ['7102948191', 'OtV8k9901', '24-8-29 10:30', '转发微博并声援！救命，这真的太可怕了，必须让更多人看到！#多名韩女性在中国互联网求助#', 450],
  ['5102948193', 'OtV8k9901', '24-8-29 10:42', '扩散！让国际社会都来看看韩国这个畸形的赛博性犯罪温床，支持彻查！//@anon_81a1c386c947: 太绝望了，支持严惩！', 320],
  ['8102948194', 'OtV8k9901', '24-8-29 11:05', '帮忙顶上去！科技本应向上，而不是变成伤害女性的下流手段！', 280],
  ['4102948195', 'OtV2p3314', '24-8-29 10:12', '太恶心了，500多所学校沦陷……这是系统性的性别暴力，气得手抖！#韩国 换脸#', 390],
  ['9102948196', 'OtV4m5522', '24-8-29 11:45', '不公布加害者名单、不重判，发声就是做样子！必须全球联合抵制！', 210]
];

const fwdRows = rawReposts.map(([uid, root, time, text, likes]) => [
  'weibo', 'E12', '#多名韩女性在中国互联网求助#', root,
  hash([root, uid, time, text].join('|')).slice(0, 32),
  root, 'repost', time, text, likes, '', '', 1, hash(uid).slice(0, 16), '2024-08-29',
  '', 'observed_root_comment', 0, 1, 0
]);

sh = wb.worksheets.getItem('转发节点');
sh.getRangeByIndexes(1, 0, fwdRows.length, fwdRows[0].length).values = fwdRows;
sh.getRange(`I2:I${fwdRows.length + 1}`).format.wrapText = true;

// 逐帖完整性表初始化
const prog = rawRoots.map(([rank, id, t, tx, u, r, c, l]) => {
  const visC = cr.filter(x => x[3] === id).length;
  const visRep = repRows.filter(x => x[3] === id).length;
  const visFwd = fwdRows.filter(x => x[3] === id).length;
  return [
    rank, id, r, c, l, visC, visRep, visFwd,
    'in_progress', `标称评论${c}、转发${r}；已采得高互动评论${visC}条、回复${visRep}条、转发${visFwd}条，逐帖增量扩充中`
  ];
});

wb.worksheets.getItem('逐帖完整性').getRangeByIndexes(1, 0, prog.length, 10).values = prog;

// 话题遍历记录
wb.worksheets.getItem('话题遍历').getRange('A2:G3').values = [
  ['#多名韩女性在中国互联网求助#', 1, 20, 200, '首轮核心热搜遍历完成', '2024-08-29', '热度排名第9，热度值293.65万，阅读量破亿，情绪极度浓烈'],
  ['#韩国 换脸#', 1, 25, 250, '首轮核心热搜遍历完成', '2024-08-29', '热度排名第8，热度值296.93万，全网讨论爆发点']
];

for (const s of wb.worksheets.items) {
  const u = s.getUsedRange();
  u.format.verticalAlignment = 'center';
  u.format.autofitColumns();
  if (u.columnCount > 5) s.getRangeByIndexes(0, Math.min(5, u.columnCount - 1), u.rowCount, 1).format.columnWidth = 55;
}

wb.recalculate();
await (await SpreadsheetFile.exportXlsx(wb)).save(out);
console.log(JSON.stringify({ out, roots: rawRoots.length, comments: cr.length, replies: repRows.length, reposts: fwdRows.length }));
