/* 亚海悬城（Ascent）—— 首期"深做"的图
 * need: 与英雄 vec 同单位（5 人合计），表示"这张图这条边需要多少分"
 * 数值是我按常见打法给的基线，可在本文件里直接改。
 */
window.VD = window.VD || {};

VD.MAPS = [
  {
    id: 'ascent',
    name: '亚海悬城',
    en: 'Ascent',
    sites: ['A', 'B'],
    note: '双点 + 一条必须争夺的中路。A 大和 B 长都是长通道，信息位价值极高；CT 出生点连通两点，所以"封 CT 烟"几乎是所有进攻的起手。',
    need: {
      /* econ 一维按"5 人合计的道具预算"标定，不是单人量级：
       * 旧值 10 / 11 相当于两个人就能填满，经济几乎从不成为短板；
       * 一度试过 16 / 17，偏严（常见阵容也会擦线）。
       * 现在 14 / 15 —— 常见阵容（合计 15~19）满覆盖，合计 13 以下才擦线，
       * 全选"每回合现买"的英雄（合计 10~11）才会被判"偏弱"，8 以下才判硬缺口。 */
      attack: { smoke: 10, flash: 7, info: 8, control: 5, mobility: 8, sustain: 2, postplant: 7, econ: 14 },
      defend: { smoke: 8, flash: 5, info: 10, control: 8, mobility: 5, sustain: 3, postplant: 10, econ: 15 }
    },
    callouts: {
      attack: ['A 大', 'A 大厅', 'A 点', '天堂', '发电机', '酒窖', '树屋', '中路', '中庭', '中连', 'B 大', 'B 点', '市场'],
      defend: ['A 点', '天堂', 'A 小', '发电机', '中路', '中连', 'CT 出生点', 'B 点', '市场', 'B 大', 'B 后']
    }
    /* 点位名统一用国服叫法；地图图直接用 valorant-api.com 的官方俯视图，
     * 想换成本地截图就在这个对象里加 localMap: 'assets/ascent-map.png' */
  }
];

/* 组合拳（combo）：一个 combo = 一串按时间排序的技能，用来完成一次"进点 / 守点 / 回防"
 * requires 里的英雄必须都在你的阵容里，这条 combo 才算"可用"
 */
VD.COMBOS = [
  /* ================= 进攻 ================= */
  {
    id: 'a-exec-brim-sova-jett',
    map: 'ascent', site: 'A', side: 'attack',
    title: 'A 点双烟速攻',
    requires: ['brimstone', 'sova', 'jett'],
    difficulty: 2,
    steps: [
      { t: 0, agent: 'brimstone', ability: '空投烟幕', target: 'A 大出口 + 天堂', why: '两颗烟同时切掉正面枪线和天堂高点，进点的人只面对点内 1~2 个角度' },
      { t: 1.5, agent: 'sova', ability: '寻敌箭', target: 'A 点内侧墙（反弹进点）', why: '扫出点内站位，队友照着扫到的位置打' },
      { t: 2.5, agent: 'jett', ability: '逐风', target: '发电机 / 点内箱后', why: '烟里第一个进，占住不被扫到的那个角' },
      { t: 4, agent: 'brimstone', ability: '燃烧榴弹', target: '默认包点', why: '下包后直接烧包，逼对手放弃拆包角度' }
    ],
    win_condition: '两颗烟 + 一支箭把 A 点变成"只能从酒窖/发电机补防"的局部战场，5 打 2 拿下。',
    countered_by: ['对手奇乐/零提前在 A 大放陷阱', '对面双烟反封 A 大'],
    source: '常见职业打法（双烟 + 信息位 + 单决斗）'
  },
  {
    id: 'b-exec-omen-breach-raze',
    map: 'ascent', site: 'B', side: 'attack',
    title: 'B 点铁臂强开',
    requires: ['omen', 'breach', 'raze'],
    difficulty: 3,
    steps: [
      { t: 0, agent: 'omen', ability: '黑瘴', target: 'B 大出口 / CT', why: '封住 B 长正面和 CT 补防线' },
      { t: 1, agent: 'breach', ability: '山崩地陷', target: 'B 点箱子区', why: '穿墙震荡，把点内贴箱的人震出来' },
      { t: 2, agent: 'breach', ability: '闪点爆破', target: 'B 点内', why: '穿墙闪，接着震荡的 1 秒窗口进' },
      { t: 3, agent: 'raze', ability: '彩雷飞溅', target: '市场口 / 默认包点', why: '清掉补防和贴包的角度' },
      { t: 4, agent: 'raze', ability: '惊喜翻腾', target: '点内高点', why: '跳位占高，避免被市场反打' }
    ],
    win_condition: '震荡 + 闪光 + 爆破三连，在对手还没反应过来时把 B 点变成 5 打 3。',
    countered_by: ['对手在 B 大提前架枪', '钢锁阻域屏障封 B 大'],
    source: '窄道强开思路（穿墙道具优先）'
  },
  {
    id: 'mid-split-b',
    map: 'ascent', site: 'B', side: 'attack',
    title: '中路夹 B',
    requires: ['omen', 'kayo', 'cypher'],
    difficulty: 3,
    steps: [
      { t: 0, agent: 'omen', ability: '黑瘴', target: '中庭 / 中连', why: '先拿中路控制权，切断 A 点支援' },
      { t: 2, agent: 'cypher', ability: '战术监控', target: '中连', why: '看住 A 点回防的人' },
      { t: 5, agent: 'kayo', ability: '零点嗅探', target: '市场', why: '压制市场方向的技能并标记' },
      { t: 6, agent: 'kayo', ability: '闪存过载', target: '市场口', why: '从中路进市场前先闪' },
      { t: 7, agent: 'omen', ability: '黑瘴', target: 'B 点 CT 侧', why: '第二颗烟封 B 点补防' }
    ],
    win_condition: '从中路切进市场，B 点防守方两头受敌；A 点的人被摄像头和中路烟卡住。',
    countered_by: ['对手开局就抢中路', 'K/O 零点嗅探被提前打掉'],
    source: '中路控制流（Ascent 的核心矛盾就是中路）'
  },
  {
    id: 'fake-a-go-b',
    map: 'ascent', site: 'B', side: 'attack',
    title: '假 A 真 B',
    requires: ['sova', 'jett', 'brimstone'],
    difficulty: 2,
    steps: [
      { t: 0, agent: 'sova', ability: '寻敌箭', target: 'A 点 / 天堂', why: '给对方"要打 A"的信息，逼他们调人' },
      { t: 2, agent: 'jett', ability: '瞬云', target: 'A 大', why: '假装封 A 大，做全套' },
      { t: 8, agent: 'brimstone', ability: '空投烟幕', target: 'B 大 + CT', why: '真正开打：两颗烟直接切 B' },
      { t: 10, agent: 'sova', ability: '雷击箭', target: 'B 点箱子', why: '清点内贴箱位' }
    ],
    win_condition: '骗走 1~2 个人之后用 5 打 3 打 B，是最省道具的赢法。',
    countered_by: ['对手零/奇乐有全图信息（摄像头/警报）', '对面不跟你转'],
    source: '信息差打法（依赖对方上当）'
  },
  {
    id: 'slow-default-market',
    map: 'ascent', site: 'A', side: 'attack',
    title: '慢打控市场',
    requires: ['cypher', 'viper', 'sova'],
    difficulty: 2,
    steps: [
      { t: 0, agent: 'cypher', ability: '战术监控', target: 'A 大外侧', why: '看住 A 大的绕后和贴身' },
      { t: 3, agent: 'viper', ability: '毒幕', target: '中路 → 市场', why: '用一条长墙把中路和 B 切开' },
      { t: 10, agent: 'sova', ability: '寻敌箭', target: '市场', why: '扫出市场里的人' },
      { t: 25, agent: 'viper', ability: '蛇吻', target: '默认包点', why: '下包后封拆包' }
    ],
    win_condition: '把节奏拖到 0:40 再动手，靠信息和墙逼对面先动，抓他们的轮转失误。',
    countered_by: ['对面打快攻抢先手', '我方经济被拖崩'],
    source: '慢节奏默认（适合枪法稳、道具多的队伍）'
  },
  {
    id: 'tejo-clear-a',
    map: 'ascent', site: 'A', side: 'attack',
    title: '钛狐隔墙清点',
    requires: ['tejo', 'omen', 'raze'],
    difficulty: 2,
    steps: [
      { t: 0, agent: 'tejo', ability: '潜袭爬虫', target: 'A 点', why: '先探点，确认有没有人贴角' },
      { t: 2, agent: 'omen', ability: '黑瘴', target: 'A 大 + 天堂', why: '双烟切视野' },
      { t: 3, agent: 'tejo', ability: '精准投放', target: '点内默认包点', why: '隔着墙点名，逼走贴包的人' },
      { t: 5, agent: 'raze', ability: '惊喜翻腾', target: '发电机', why: '跳位进点，占高点' }
    ],
    win_condition: '不用对枪就把点内的人逼出来，进点时对面已经是残血/换位状态。',
    countered_by: ['对手提前离开导弹落点', '没有烟保护时导弹位会被架'],
    source: '隔墙清点（Tejo 上线后的主流打法）'
  },
  {
    id: 'gekko-eco-a',
    map: 'ascent', site: 'A', side: 'attack',
    title: '没钱也能打的 A 点',
    requires: ['gekko', 'clove', 'jett'],
    difficulty: 1,
    steps: [
      { t: 0, agent: 'clove', ability: '整蛊', target: 'A 大 + 天堂', why: '两颗烟先切视野，便宜' },
      { t: 1, agent: 'gekko', ability: '炫晕光波', target: 'A 点内', why: '致盲后还能捡回来，省技能' },
      { t: 3, agent: 'jett', ability: '逐风', target: '点内箱后', why: '进点占位' },
      { t: 5, agent: 'gekko', ability: '嗨爆全场', target: '默认包点', why: '下包后封拆包，同样可回收' }
    ],
    win_condition: '靠"可回收技能"把经济差吃掉，半场经济局也能正常打。',
    countered_by: ['对面禁灭能拆你的回收装置', '烟少，怕对面贴脸'],
    source: '经济局打法（Gekko/Clove 的可复用道具）'
  },

  /* ================= 防守 ================= */
  {
    id: 'def-b-double-lock',
    map: 'ascent', site: 'B', side: 'defend',
    title: 'B 点双锁',
    requires: ['killjoy', 'cypher'],
    difficulty: 2,
    steps: [
      { t: 0, agent: 'cypher', ability: '战术监控', target: 'B 大', why: '第一层信息：谁从 B 长过来' },
      { t: 0, agent: 'killjoy', ability: '自动哨兵', target: 'B 点入口', why: '第二层信息，触发即震荡' },
      { t: 0, agent: 'killjoy', ability: '哨戒炮台', target: '市场角落', why: '看住市场补防角度' },
      { t: 0, agent: 'cypher', ability: '震慑绊线', target: 'B 点箱子间', why: '束缚进点第一个人' }
    ],
    win_condition: '对面要么拆道具（花时间），要么撞进来被束缚+哨戒炮台打成 1 换 2。',
    countered_by: ['对手禁灭/雷兹直接拆装置', '对面用大招强开'],
    source: '双哨卫守点（Ascent B 点经典）'
  },
  {
    id: 'def-a-retake-smoke',
    map: 'ascent', site: 'A', side: 'defend',
    title: 'A 点回防双烟',
    requires: ['brimstone', 'viper', 'kayo'],
    difficulty: 3,
    steps: [
      { t: 0, agent: 'brimstone', ability: '空投烟幕', target: 'A 点包点 + 天堂', why: '回防前先切掉架枪位' },
      { t: 1, agent: 'viper', ability: '毒幕', target: 'A 大 → 点内', why: '把 A 大和点切开，防补枪' },
      { t: 3, agent: 'kayo', ability: '闪存过载', target: '点内', why: '双闪逼对手背身' },
      { t: 5, agent: 'brimstone', ability: '燃烧榴弹', target: '默认包点', why: '拆包前先烧包' }
    ],
    win_condition: '回防时对面看不到你从哪来，5 秒内完成拆包。',
    countered_by: ['对面已经架好天堂', '烟被对面穿烟预瞄'],
    source: '回防标准流程（先烟后闪再拆）'
  },
  {
    id: 'def-postplant-molly',
    map: 'ascent', site: 'A', side: 'defend',
    title: '守包：双火封拆',
    requires: ['brimstone', 'viper'],
    difficulty: 1,
    steps: [
      { t: 0, agent: 'brimstone', ability: '燃烧榴弹', target: '默认包点', why: '第一波拆包窗口直接烧掉' },
      { t: 12, agent: 'viper', ability: '蛇吻', target: '默认包点', why: '等对面硬拆时补第二波' },
      { t: 20, agent: 'brimstone', ability: '燃烧榴弹', target: '包点另一角', why: '拆包时间不够，逼对手放弃' }
    ],
    win_condition: '对面拆包时间总共只有 7 秒，两波火就能吃掉 5 秒以上。',
    countered_by: ['对面先清掉道具位', '对手用烟骗火'],
    source: '守包基本功（时间就是分数）'
  },
  {
    id: 'def-counter-exec-a',
    map: 'ascent', site: 'A', side: 'defend',
    title: '反制 A 点强开',
    requires: ['sova', 'breach', 'jett'],
    difficulty: 3,
    steps: [
      { t: 0, agent: 'sova', ability: '雷击箭', target: 'A 大出口', why: '对面挤在 A 大时一发震荡直接打断节奏' },
      { t: 1, agent: 'breach', ability: '山崩地陷', target: 'A 大', why: '穿墙震荡补伤害和硬直' },
      { t: 2, agent: 'breach', ability: '闪点爆破', target: 'A 大', why: '穿墙闪，反打窗口' },
      { t: 3, agent: 'jett', ability: '逐风', target: '点内高点', why: '抢回高点，别让对面站住' }
    ],
    win_condition: '把对面堵在 A 大里打，5 打 5 变成 5 打 3 的防守。',
    countered_by: ['对面分散进点', '我方道具全交在错误的时机'],
    source: '反强开（守方主动出击）'
  },
  {
    id: 'def-mid-control',
    map: 'ascent', site: 'A', side: 'defend',
    title: '开局抢中路',
    requires: ['sova', 'omen', 'cypher'],
    difficulty: 2,
    steps: [
      { t: 0, agent: 'sova', ability: '寻敌箭', target: '中庭', why: '开局第一件事：确认中路有没有人' },
      { t: 1, agent: 'omen', ability: '黑瘴', target: '中庭', why: '一颗烟把中路变成单向信息' },
      { t: 2, agent: 'cypher', ability: '战术监控', target: '中连', why: '长期看住 A 点回防路线' },
      { t: 20, agent: 'omen', ability: '黑瘴', target: 'B 大', why: '中局根据信息补烟' }
    ],
    win_condition: '中路拿到信息就等于拿到整张图：对面打哪边你都能提前 5 秒知道。',
    countered_by: ['对面也用双烟抢中路', '摄像头被拆'],
    source: '中路优先（Ascent 的胜负手）'
  },
  {
    id: 'def-viper-wall-a',
    map: 'ascent', site: 'A', side: 'defend',
    title: '蝰蛇墙切 A 点',
    requires: ['viper', 'killjoy'],
    difficulty: 2,
    steps: [
      { t: 0, agent: 'viper', ability: '毒幕', target: 'A 大 → 天堂', why: '一条墙把 A 点切成两半，对面进点就掉血' },
      { t: 0, agent: 'killjoy', ability: '自动哨兵', target: 'A 大', why: '墙后放警报，撞墙的人被标记' },
      { t: 0, agent: 'killjoy', ability: '纳米蜂群', target: '默认包点', why: '守包' },
      { t: 30, agent: 'viper', ability: '瘴云', target: 'A 点', why: '墙关掉后补一颗毒烟' }
    ],
    win_condition: '对面要么穿墙掉血，要么绕路浪费 10 秒，进攻节奏直接崩。',
    countered_by: ['对面先用闪光/震荡逼你收墙', '墙上限时间内没打出优势'],
    source: '区域控制（Viper 墙的经典用法）'
  },
  {
    id: 'def-ult-trade',
    map: 'ascent', site: 'B', side: 'defend',
    title: '大招换命：狂猎之怒 + 惊雷卷地',
    requires: ['sova', 'breach', 'raze'],
    difficulty: 3,
    steps: [
      { t: 0, agent: 'breach', ability: '惊雷卷地', target: 'B 大', why: '先把进点的人全部击飞/震荡' },
      { t: 1, agent: 'sova', ability: '狂猎之怒', target: 'B 大 → B 点', why: '三段能量波覆盖退路' },
      { t: 3, agent: 'raze', ability: '晚安焰火', target: 'B 点入口', why: '收残血' }
    ],
    win_condition: '两个大招就能把一次 5 人强开打成 5 打 1，是最划算的大招交换。',
    countered_by: ['对面有免控（禁灭大招）', '大招被打断'],
    source: '大招经济（用大招换掉对面一波进攻）'
  }
];
