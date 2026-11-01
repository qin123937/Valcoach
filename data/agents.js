/* 英雄数据（国服译名优先；技能名以国服为准，个别可能随版本微调，可直接在本文件修改）
 * 30 位英雄，对齐国服官网 game-data 与无畏契约 BWIKI（2026-11 核对）。
 * vec: 8 维能力向量。烟是 0~10（一个控场 ≈ 一张图的烟需求），其余 7 维是 0~5。含义见 js/engine.js 顶部 DIMS。
 * 其中 econ（经济）不单设"可复用性"一维，而是把道具价格和可复用性合在一起：免费签名 / 时间恢复 / 击杀重置 = 便宜，每回合现买的一次性道具 = 贵。
 * 说明：这是"人工校对层"，不是 Riot 官方数据。调数值就能调推荐结果。
 */
window.VD = window.VD || {};

VD.ROLES = ['决斗', '先锋', '控场', '哨卫'];

VD.AGENTS = [
  /* ---------- 决斗 ---------- */
  {
    id: 'jett', name: '捷风', en: 'Jett', role: '决斗',
    vec: { smoke: 2, flash: 0, info: 0, control: 0, mobility: 5, sustain: 0, postplant: 1, econ: 3 },
    adds: ['高速进点', '一张烟', '残局收割'],
    tip: '亚海悬城 A 大/B 长的第一进点手，绕后和抢中路都靠她。',
    abilities: [
      { name: '瞬云', tag: '烟', note: '一颗小烟，可临时封枪线' },
      { name: '凌空', tag: '位移', note: '上高台/躲枪线' },
      { name: '逐风', tag: '位移', note: '瞬间突进，进点核心' },
      { name: '飓刃', tag: '大招', note: '无弹道飞刀，进点/残局' }
    ]
  },
  {
    id: 'phoenix', name: '不死鸟', en: 'Phoenix', role: '决斗',
    vec: { smoke: 2, flash: 3, info: 0, control: 0, mobility: 2, sustain: 3, postplant: 2, econ: 3 },
    adds: ['自愈', '曲球闪光', '火墙封视野'],
    tip: '单点作战强，但需要队友补信息；火墙能临时切开点位。',
    abilities: [
      { name: '火冒三丈', tag: '视封', note: '一道火墙，挡视线' },
      { name: '火热手感', tag: '伤害', note: '地面火，守包/清角' },
      { name: '闪光曲球', tag: '闪光', note: '左/右曲球闪' },
      { name: '再火一回', tag: '大招', note: '标记后满血复活' }
    ]
  },
  {
    id: 'reyna', name: '芮娜', en: 'Reyna', role: '决斗',
    vec: { smoke: 0, flash: 2, info: 0, control: 0, mobility: 1, sustain: 3, postplant: 0, econ: 2 },
    adds: ['击杀续航', '致盲球'],
    tip: '吃队友的信息和烟，纯 solo 阵容里容易哑火。',
    abilities: [
      { name: '噬尽', tag: '续航', note: '吃魂回血' },
      { name: '逐散', tag: '位移', note: '吃魂短暂无敌位移' },
      { name: '睥睨', tag: '致盲', note: '可被打掉的致盲眼' },
      { name: '女皇旨令', tag: '大招', note: '攻速/换弹强化' }
    ]
  },
  {
    id: 'raze', name: '雷兹', en: 'Raze', role: '决斗',
    vec: { smoke: 0, flash: 0, info: 1, control: 1, mobility: 2, sustain: 0, postplant: 4, econ: 2 },
    adds: ['爆破清点', '守包/阻止拆包', '位移跳'],
    tip: '亚海悬城 B 点箱子后、A 点发电机都能用惊喜翻腾（爆破包）清。',
    abilities: [
      { name: '花车巡游', tag: '信息', note: '会追人的小机器人' },
      { name: '惊喜翻腾', tag: '位移', note: '跳位/炸伤害' },
      { name: '彩雷飞溅', tag: '伤害', note: '清角/守包' },
      { name: '晚安焰火', tag: '大招', note: '一发清点' }
    ]
  },
  {
    id: 'yoru', name: '夜露', en: 'Yoru', role: '决斗',
    vec: { smoke: 1, flash: 2, info: 2, control: 1, mobility: 5, sustain: 0, postplant: 1, econ: 2 },
    adds: ['不请自来绕后', '出其不意骗信息', '攻其不备'],
    tip: '需要队友配合假打，单排容易变成"传送送人头"。',
    abilities: [
      { name: '出其不意', tag: '信息', note: '假脚步骗枪线' },
      { name: '攻其不备', tag: '闪光', note: '弹出式闪光' },
      { name: '不请自来', tag: '位移', note: '放门再传' },
      { name: '神鬼不觉', tag: '大招', note: '无敌穿场' }
    ]
  },
  {
    id: 'neon', name: '霓虹', en: 'Neon', role: '决斗',
    vec: { smoke: 0, flash: 0, info: 0, control: 2, mobility: 5, sustain: 0, postplant: 1, econ: 3 },
    adds: ['极限机动', '高速通道阻隔', '闪电弹球'],
    tip: '进点速度最快，但拿信息全靠队友。',
    abilities: [
      { name: '充能疾驰', tag: '位移', note: '滑铲/加速' },
      { name: '高速通道', tag: '阻隔', note: '两道墙切点' },
      { name: '闪电弹球', tag: '控制', note: '弹墙震荡' },
      { name: '超限暴走', tag: '大招', note: '电磁射线' }
    ]
  },
  {
    id: 'iso', name: '壹决', en: 'Iso', role: '决斗',
    vec: { smoke: 1, flash: 0, info: 0, control: 1, mobility: 1, sustain: 2, postplant: 0, econ: 2 },
    adds: ['护盾/续航', '可摧毁墙体', '单挑能力'],
    tip: '偏"打过点"的决斗，队伍没烟没闪时不好用。',
    abilities: [
      { name: '决斗通牒', tag: '控制', note: '拉人单挑' },
      { name: '稳态剥离', tag: '控制', note: '穿墙易伤' },
      { name: '战斗心流', tag: '续航', note: '护盾' },
      { name: '绝对屏障', tag: '大招', note: '可摧毁能量墙' }
    ]
  },

  /* ---------- 先锋 ---------- */
  {
    id: 'sova', name: '猎枭', en: 'Sova', role: '先锋',
    vec: { smoke: 0, flash: 0, info: 5, control: 1, mobility: 0, sustain: 0, postplant: 3, econ: 3 },
    adds: ['远程寻敌箭', '穿墙雷击箭', '大招清点'],
    tip: '亚海悬城信息位的默认答案，A 大、B 长、中路的箭点极多。',
    abilities: [
      { name: '枭型无人机', tag: '信息', note: '可操控侦查' },
      { name: '雷击箭', tag: '伤害', note: '反弹点位，清包/清角' },
      { name: '寻敌箭', tag: '信息', note: '反弹后扫描' },
      { name: '狂猎之怒', tag: '大招', note: '穿墙三段能量波' }
    ]
  },
  {
    id: 'breach', name: '铁臂', en: 'Breach', role: '先锋',
    vec: { smoke: 0, flash: 4, info: 1, control: 4, mobility: 0, sustain: 0, postplant: 1, econ: 3 },
    adds: ['穿墙闪光', '穿墙震荡', '强开点'],
    tip: '打近点/窄道最强，B 大、A 大这种一条道尤其好用。',
    abilities: [
      { name: '闪点爆破', tag: '闪光', note: '穿墙致盲' },
      { name: '山崩地陷', tag: '控制', note: '穿墙震荡' },
      { name: '剧震余波', tag: '伤害', note: '穿墙伤害' },
      { name: '惊雷卷地', tag: '大招', note: '大范围击飞' }
    ]
  },
  {
    id: 'skye', name: '斯凯', en: 'Skye', role: '先锋',
    vec: { smoke: 0, flash: 4, info: 3, control: 1, mobility: 0, sustain: 2, postplant: 0, econ: 3 },
    adds: ['可操控闪光', '狗探路', '群体治疗'],
    tip: '闪光能"拐弯"，进点前可以先清两个角。',
    abilities: [
      { name: '引路之隼', tag: '闪光', note: '可操控闪光鹰' },
      { name: '辟林之虎', tag: '信息', note: '可操控探路兽' },
      { name: '愈生之息', tag: '续航', note: '群体治疗' },
      { name: '追猎之灵', tag: '大招', note: '追踪敌人' }
    ]
  },
  {
    id: 'kayo', name: 'K/O', en: 'KAY/O', role: '先锋',
    vec: { smoke: 0, flash: 4, info: 2, control: 1, mobility: 0, sustain: 0, postplant: 2, econ: 3 },
    adds: ['压制技能', '双闪', '大招禁技能'],
    tip: '打"技能型"阵容（双烟/双先锋）特别好用，亚海悬城很常见。',
    abilities: [
      { name: '碎片溢出', tag: '压制', note: '压制范围内技能' },
      { name: '闪存过载', tag: '闪光', note: '右键可短投' },
      { name: '零点嗅探', tag: '信息', note: '压制+标记' },
      { name: '无效命令', tag: '大招', note: '全图压制，倒地可复活' }
    ]
  },
  {
    id: 'fade', name: '黑梦', en: 'Fade', role: '先锋',
    vec: { smoke: 0, flash: 0, info: 4, control: 3, mobility: 0, sustain: 0, postplant: 1, econ: 3 },
    adds: ['标记+束缚', '致聋', '视野收缩'],
    tip: '信息+硬控一体，适合配一个纯闪光位。',
    abilities: [
      { name: '幽爪', tag: '控制', note: '束缚+致聋' },
      { name: '诡眼', tag: '信息', note: '标记敌人' },
      { name: '黯兽', tag: '信息', note: '追人+视野收缩' },
      { name: '夜临', tag: '大招', note: '大范围标记致聋' }
    ]
  },
  {
    id: 'gekko', name: '盖可', en: 'Gekko', role: '先锋',
    vec: { smoke: 0, flash: 3, info: 2, control: 2, mobility: 0, sustain: 1, postplant: 3, econ: 5 },
    adds: ['技能可回收', '致盲', '大招束缚'],
    tip: '经济效率全英雄最高之一，适合"没钱也能打"的阵容。',
    abilities: [
      { name: '顽皮搭档', tag: '信息', note: '可回收的侦查宠' },
      { name: '炫晕光波', tag: '致盲', note: '可回收' },
      { name: '嗨爆全场', tag: '伤害', note: '可回收，守包强' },
      { name: '无敌超鲨', tag: '大招', note: '束缚范围内敌人' }
    ]
  },
  {
    id: 'tejo', name: '钛狐', en: 'Tejo', role: '先锋',
    vec: { smoke: 0, flash: 0, info: 3, control: 2, mobility: 0, sustain: 0, postplant: 4, econ: 2 },
    adds: ['制导导弹清点', '标记', '守包'],
    tip: '能隔着墙点名清点，配合烟打"清空再进"。',
    abilities: [
      { name: '潜袭爬虫', tag: '信息', note: '探点/标记' },
      { name: '特快专递', tag: '控制', note: '弹射眩晕' },
      { name: '精准投放', tag: '伤害', note: '地图点名导弹' },
      { name: '末日审判', tag: '大招', note: '大范围轰炸' }
    ]
  },

  /* ---------- 控场 ---------- */
  {
    id: 'brimstone', name: '炼狱', en: 'Brimstone', role: '控场',
    vec: { smoke: 9, flash: 0, info: 0, control: 0, mobility: 0, sustain: 1, postplant: 5, econ: 4 },
    adds: ['三连烟', '燃烧榴弹守包', '振奋信标'],
    tip: '亚海悬城最稳的主烟位：A 大 + 天堂两颗烟一套带走。',
    abilities: [
      { name: '振奋信标', tag: '增益', note: '射速/移速buff' },
      { name: '燃烧榴弹', tag: '守包', note: '阻止拆包核心' },
      { name: '空投烟幕', tag: '烟', note: '地图点烟，一次三颗' },
      { name: '天基光束', tag: '大招', note: '大范围清点' }
    ]
  },
  {
    id: 'omen', name: '幽影', en: 'Omen', role: '控场',
    vec: { smoke: 10, flash: 3, info: 0, control: 1, mobility: 3, sustain: 0, postplant: 1, econ: 4 },
    adds: ['远程烟', '穿墙致盲', '传送换边'],
    tip: '双烟阵容的另一半，偏"灵活补位"，能自己给自己打闪。',
    abilities: [
      { name: '践影', tag: '位移', note: '短距传送' },
      { name: '黑瘴', tag: '烟', note: '远程放烟，可回收次数' },
      { name: '暗魇', tag: '致盲', note: '穿墙致盲' },
      { name: '离魂', tag: '大招', note: '全图传送' }
    ]
  },
  {
    id: 'viper', name: '蝰蛇', en: 'Viper', role: '控场',
    vec: { smoke: 8, flash: 0, info: 0, control: 2, mobility: 0, sustain: 0, postplant: 4, econ: 4 },
    adds: ['长墙切割', '毒幕守包', '持续区域'],
    // 兼职：本职是控场，但毒幕切点和蛇吻守包能顶一部分哨卫的活，缺哨卫时可以把她当半个哨卫用
    alt: [{ role: '哨卫', why: '毒幕能切掉一条进点路线，蛇吻能封拆包、逼对面等毒散' }],
    tip: '适合"守包/拖时间"型阵容，进攻端需要队友补闪；队里没哨卫时，她的毒幕和蛇吻能顶半个哨卫。',
    abilities: [
      { name: '瘴云', tag: '烟', note: '有毒烟团' },
      { name: '毒幕', tag: '阻隔', note: '一道长墙' },
      { name: '蛇吻', tag: '守包', note: '易伤+伤害' },
      { name: '蝰腹', tag: '大招', note: '大片毒雾' }
    ]
  },
  {
    id: 'astra', name: '星礈', en: 'Astra', role: '控场',
    vec: { smoke: 10, flash: 0, info: 0, control: 3, mobility: 0, sustain: 0, postplant: 2, econ: 3 },
    adds: ['全球烟', '星体震荡', '可同时控多点'],
    tip: '上限最高、下限最低的烟位，需要预判和沟通。',
    abilities: [
      { name: '重力之阱', tag: '控制', note: '放置星体后引爆，把敌人往中心拉' },
      { name: '新星脉冲', tag: '控制', note: '震荡星体' },
      { name: '星云', tag: '烟', note: '星体变烟' },
      { name: '宇宙分裂', tag: '大招', note: '全图分割墙' }
    ]
  },
  {
    id: 'harbor', name: '海神', en: 'Harbor', role: '控场',
    vec: { smoke: 9, flash: 0, info: 0, control: 2, mobility: 0, sustain: 1, postplant: 1, econ: 3 },
    adds: ['移动水墙', '推进式烟', '水盾'],
    tip: '适合"一路推过去"的快攻，防守端不如双烟稳。',
    abilities: [
      { name: '狂潮', tag: '烟', note: '可移动的烟墙' },
      { name: '乱涌', tag: '阻隔', note: '推进水墙' },
      { name: '海盾', tag: '烟', note: '长距离烟' },
      { name: '怒涛', tag: '大招', note: '范围轰炸' }
    ]
  },
  {
    id: 'clove', name: '暮蝶', en: 'Clove', role: '控场',
    vec: { smoke: 8, flash: 0, info: 0, control: 1, mobility: 1, sustain: 2, postplant: 2, econ: 4 },
    adds: ['死后放烟', '自愈', '复活'],
    tip: '死后还能放烟，残局和守包很烦人；但缺硬控。',
    abilities: [
      { name: '虹吸', tag: '续航', note: '击杀后回血/加速' },
      { name: '整蛊', tag: '烟', note: '烟团，死后也能放' },
      { name: '霞染', tag: '控制', note: '减速+致聋' },
      { name: '化蝶', tag: '大招', note: '复活自己' }
    ]
  },

  /* ---------- 哨卫 ---------- */
  {
    id: 'cypher', name: '零', en: 'Cypher', role: '哨卫',
    vec: { smoke: 1, flash: 0, info: 5, control: 2, mobility: 0, sustain: 0, postplant: 4, econ: 4 },
    adds: ['全图信息', '陷阱束缚', '牢笼封点'],
    tip: '亚海悬城 B 点的镇场之王，一个摄像头能锁住整条 B 长。',
    abilities: [
      { name: '震慑绊线', tag: '控制', note: '束缚+暴露' },
      { name: '赛博囚笼', tag: '烟', note: '可当烟用' },
      { name: '战术监控', tag: '信息', note: '可标记' },
      { name: '神经取析', tag: '大招', note: '读取敌人位置' }
    ]
  },
  {
    id: 'killjoy', name: '奇乐', en: 'Killjoy', role: '哨卫',
    vec: { smoke: 0, flash: 0, info: 3, control: 3, mobility: 0, sustain: 0, postplant: 5, econ: 4 },
    adds: ['自动哨兵+哨戒炮台双锁', '蜂群阻止拆包', '大招封点'],
    tip: '守包最强的哨卫之一，纳米蜂群 + 哨戒炮台能把拆包逼掉。',
    abilities: [
      { name: '自动哨兵', tag: '信息', note: '发现敌人触发' },
      { name: '纳米蜂群', tag: '守包', note: '手雷式伤害区' },
      { name: '哨戒炮台', tag: '守包', note: '自动开火' },
      { name: '全面封锁', tag: '大招', note: '大范围禁锢' }
    ]
  },
  {
    id: 'sage', name: '贤者', en: 'Sage', role: '哨卫',
    vec: { smoke: 0, flash: 0, info: 0, control: 2, mobility: 0, sustain: 5, postplant: 3, econ: 2 },
    adds: ['治疗+复活', '冰墙封路', '减速'],
    tip: '唯一能复活的英雄，但进攻端几乎不提供信息。',
    abilities: [
      { name: '玉城', tag: '阻隔', note: '冰墙' },
      { name: '薄冰', tag: '控制', note: '减速区' },
      { name: '逢春', tag: '续航', note: '治疗队友' },
      { name: '再起', tag: '大招', note: '复活一名队友' }
    ]
  },
  {
    id: 'chamber', name: '尚勃勒', en: 'Chamber', role: '哨卫',
    vec: { smoke: 0, flash: 0, info: 1, control: 1, mobility: 3, sustain: 0, postplant: 3, econ: 3 },
    adds: ['大狙守点', '闪转自如拉枪线', '贵宾限行减速'],
    tip: '要枪法支撑；亚海悬城的中路和 A 天堂很适合架狙。',
    abilities: [
      { name: '金牌猎头', tag: '输出', note: '自带手枪' },
      { name: '闪转自如', tag: '位移', note: '放两个锚点互换' },
      { name: '贵宾限行', tag: '控制', note: '可当信息用' },
      { name: '孤高火力', tag: '大招', note: '一枪一个的大狙' }
    ]
  },
  {
    id: 'deadlock', name: '钢锁', en: 'Deadlock', role: '哨卫',
    vec: { smoke: 0, flash: 0, info: 2, control: 4, mobility: 0, sustain: 0, postplant: 3, econ: 3 },
    adds: ['声感陷阱', '阻域屏障', '大招拖人'],
    tip: '窄道封锁极强，B 大/A 大这种单通道很吃她。',
    abilities: [
      { name: '声感陷阱', tag: '控制', note: '触发震荡' },
      { name: '阻域屏障', tag: '阻隔', note: '封路' },
      { name: '重力捕网', tag: '控制', note: '迫蹲+减速' },
      { name: '断魂索道', tag: '大招', note: '拖走一名敌人' }
    ]
  },
  {
    id: 'vyse', name: '维斯', en: 'Vyse', role: '哨卫',
    vec: { smoke: 0, flash: 2, info: 2, control: 3, mobility: 0, sustain: 0, postplant: 3, econ: 3 },
    adds: ['致盲花', '藤蔓阻隔', '禁园锁枪'],
    tip: '防守端很全面：能致盲、能封路、能禁枪。',
    abilities: [
      { name: '裁断', tag: '控制', note: '剪断技能/减速' },
      { name: '弧光玫瑰', tag: '致盲', note: '可主动引爆' },
      { name: '剃刀藤蔓', tag: '阻隔', note: '穿行受伤+减速' },
      { name: '铁棘禁园', tag: '大招', note: '禁用主武器' }
    ]
  },
  {
    id: 'veto', name: '禁灭', en: 'Veto', role: '哨卫',
    vec: { smoke: 0, flash: 0, info: 2, control: 3, mobility: 3, sustain: 2, postplant: 2, econ: 2 },
    adds: ['破坏敌方装置', '短距传送', '免控大招'],
    tip: '专门拆对手道具（摄像头/陷阱/蜂群），对信息型阵容有反制价值。',
    abilities: [
      { name: '噬源体', tag: '反制', note: '摧毁敌方装置' },
      { name: '涡流折跃', tag: '位移', note: '互动传送' },
      { name: '裂变残片', tag: '控制', note: '束缚+致聋' },
      { name: '完全进化', tag: '大招', note: '免控+治疗' }
    ]
  },

  /* ---------- 后补的新英雄（按上线顺序追加，role 字段决定分组，数组顺序不影响界面） ---------- */
  {
    id: 'waylay', name: '幻棱', en: 'Waylay', role: '决斗',
    vec: { smoke: 0, flash: 2, info: 1, control: 3, mobility: 5, sustain: 1, postplant: 2, econ: 3 },
    adds: ['两段冲刺', '无敌回溯', '区域干扰'],
    tip: '没有烟也没有闪，全靠位移硬进点：两段冲刺先手，回溯技能给自己一次“撤回”，适合吃到情报后强开。',
    abilities: [
      { name: '光棱闪爆', tag: '控制', note: '光簇落地爆炸，干扰+减速' },
      { name: '光速飞跃', tag: '位移', note: '两段冲刺，第一段会升空' },
      { name: '溯流回光', tag: '位移', note: '留一道光束，8 秒内可回溯且穿行无敌' },
      { name: '时光修罗场', tag: '大招', note: '光线领域干扰敌人，自己加速' }
    ]
  },
  {
    id: 'miks', name: '迷核', en: 'Miks', role: '控场',
    vec: { smoke: 8, flash: 1, info: 1, control: 3, mobility: 1, sustain: 3, postplant: 2, econ: 5 },
    adds: ['选点烟', '震荡/治疗切换', '队友增益'],
    tip: '两发只要 100 的选点烟，还能给队友加作战强化、在震荡和治疗之间切换；单控场烟量稍紧，双控场很稳。',
    abilities: [
      { name: '电音脉冲', tag: '控制', note: '投出声波脉冲，可在震荡/治疗间切换' },
      { name: '共振谐律', tag: '增益', note: '锁队友加【作战强化】和移速' },
      { name: '声波帷幕', tag: '烟', note: '地图选点放烟，两充能' },
      { name: '音脉强袭', tag: '大招', note: '前推音波，击退+致聋+减速' }
    ]
  },
  {
    id: 'hush', name: '遐思', en: 'Hush', role: '决斗',
    vec: { smoke: 0, flash: 4, info: 1, control: 4, mobility: 4, sustain: 0, postplant: 2, econ: 3 },
    adds: ['可控闪光', '拉人震荡', '大招浮空'],
    tip: '第 30 位决斗：被动【念力】能隔空捡枪、远程开关门和拆包器；可控闪光 + 拉人震荡适合配合进点，大招能把范围内的敌人强制浮空。',
    abilities: [
      { name: '身随念动', tag: '位移', note: '投锚点后拉向锚点，空中可短暂悬停' },
      { name: '灵光一念', tag: '闪光', note: '可控闪光，能引导轨迹或预存再放' },
      { name: '念落星移', tag: '控制', note: '震荡球把范围内敌人拉向中心' },
      { name: '万念皆空', tag: '大招', note: '释放重力念力球，范围内敌人强制浮空' }
    ]
  }
];
