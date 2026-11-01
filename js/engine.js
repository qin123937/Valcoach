/* 阵容分析引擎 —— 纯函数，不碰 DOM，方便单测/替换
 * 核心思路：英雄能力向量 → 5 人相加 → 跟地图需求向量比 → 覆盖度 + 缺口
 */
(function () {
  /* 8 个维度。注意经济这一维刻意不细分"价格"和"可复用性"两栏：
   * econ 衡量的是"这个英雄在没钱回合还能不能拿出核心道具"，把两件事合在一起——
   *   ① 价格：关键道具买下来要多少信用点（200 以下便宜，300 以上贵）；
   *   ② 可复用性：核心道具是不是免费签名 / 时间恢复 / 击杀重置（这类道具每回合都能再用，等于不花钱）。
   * 所以"免费签名 + 两充能"的控场（幽影黑瘴、蝰蛇毒幕、暮蝶霞染、迷核声波帷幕）econ 给得高，
   * "每回合都要现买"的一次性道具（雷兹彩雷飞溅、钛狐潜袭爬虫等）econ 给得低。
   * 可复用性高的英雄 = 强起/经济局也能打，这正是 econ 这一维要表达的东西。
   */
  const DIMS = [
    { key: 'smoke',     label: '烟 / 视野封锁', short: '烟',   w: 1.35 },
    { key: 'flash',     label: '闪光 / 致盲',   short: '闪',   w: 1.0 },
    { key: 'info',      label: '信息 / 侦查',   short: '信息', w: 1.1 },
    { key: 'control',   label: '硬控 / 打断',   short: '硬控', w: 0.9 },
    { key: 'mobility',  label: '位移 / 机动',   short: '机动', w: 0.9 },
    { key: 'sustain',   label: '治疗 / 续航',   short: '续航', w: 0.5 },
    { key: 'postplant', label: '后手 / 守包',   short: '守包', w: 1.0 },
    { key: 'econ',      label: '经济效率（价格 + 可复用性）', short: '经济', w: 0.7 }
  ];
  const W_SUM = DIMS.reduce((s, d) => s + d.w, 0);

  let byId = {};
  function index() {
    byId = {};
    (window.VD.AGENTS || []).forEach(a => { byId[a.id] = a; });
  }

  function agent(id) { return byId[id] || null; }
  function getMap(id) { return (window.VD.MAPS || []).find(m => m.id === id) || null; }

  function zeroVec() {
    const v = {};
    DIMS.forEach(d => { v[d.key] = 0; });
    return v;
  }

  function sumVec(agents) {
    const v = zeroVec();
    agents.forEach(a => DIMS.forEach(d => { v[d.key] += (a.vec && a.vec[d.key]) || 0; }));
    return v;
  }

  /* 冗余判定倍数：烟值按"一个控场 ≈ 一张图的烟需求"标定（8~10 分），
   * 所以双控场只有约 1.9 倍，不该算冗余；其余维度到 1.55 倍才说明道具真重复了。
   */
  function overRatio(key) { return key === 'smoke' ? 2.0 : 1.55; }

  /* 覆盖度：每个维度 min(1, 供给/需求) 的加权平均 */
  function coverageOf(supply, need) {
    const cov = {};
    let acc = 0;
    DIMS.forEach(d => {
      const n = need[d.key] || 0;
      const c = n <= 0 ? 1 : Math.min(1, supply[d.key] / n);
      cov[d.key] = c;
      acc += c * d.w;
    });
    return { cov, score: Math.round((acc / W_SUM) * 100) };
  }

  function roleCounts(agents) {
    const c = { '决斗': 0, '先锋': 0, '控场': 0, '哨卫': 0 };
    agents.forEach(a => { if (c[a.role] != null) c[a.role]++; });
    return c;
  }

  /* 兼职：有些英雄本职是 A，但在 B 位空缺时能顶一部分（例如蝰蛇顶哨卫）。
   * 只影响"角色结构"的判定与推荐排序，不参与 8 维打分——vec 里她还是控场。 */
  function altCoverage(agents) {
    const out = {};
    (agents || []).forEach(a => (a.alt || []).forEach(x => {
      if (!x || !x.role) return;
      (out[x.role] = out[x.role] || []).push({ agent: a, why: x.why || '' });
    }));
    return out;
  }

  function missingRoles(agents) {
    const c = roleCounts(agents || []);
    return ['控场', '先锋', '哨卫', '决斗'].filter(k => c[k] === 0);
  }

  function altFills(agent, missing) {
    const alt = agent && agent.alt ? agent.alt : [];
    return alt.filter(x => x && missing.indexOf(x.role) >= 0);
  }

  /* 结构分：四个位置齐不齐。推荐时它的优先级高于任何一维数据 */
  function structureOf(agents) {
    const c = roleCounts(agents || []);
    const slots = ['控场', '先锋', '哨卫', '决斗'];
    const missing = slots.filter(k => c[k] === 0);
    let s = (slots.length - missing.length) / slots.length;
    slots.forEach(k => { if (c[k] >= 3) s -= 0.1; });   // 三个人挤一个位置：火力重叠
    return { score: Math.max(0, Math.min(1, s)), counts: c, missing };
  }

  function archetype(agents) {
    const r = roleCounts(agents);
    if (!agents.length) return '空阵容';
    if (r['控场'] >= 2) return '双烟体系';
    if (r['先锋'] >= 2) return '双先锋体系';
    if (r['决斗'] >= 2) return '双决斗体系';
    if (r['哨卫'] >= 2) return '双哨卫体系';
    return '标准 1-1-2 结构';
  }

  function analyze(comp, mapId, side) {
    const map = getMap(mapId);
    const agents = comp.map(agent).filter(Boolean);
    const need = map.need[side];
    const supply = sumVec(agents);
    const { cov, score } = coverageOf(supply, need);

    const dims = DIMS.map(d => {
      const n = need[d.key] || 0;
      const s = supply[d.key];
      const c = cov[d.key];
      let level = 'ok';
      let msg = '';
      // 只有"这张图真的吃这条边"（需求 >= 5）才允许判成结构性缺口，
      // 否则续航这类低需求维度会把结论带偏（例如防守需求 3 分续航）
      if (n >= 5 && c < 0.6) {
        level = 'low';
        msg = '明显不够' + (d.key === 'smoke' ? '，进点没有烟就是硬送' : '');
      } else if (n >= 4 && c < 0.85) {
        level = 'warn';
        msg = '偏弱';
      } else if (n >= 4 && s > n * overRatio(d.key)) {
        level = 'over';
        msg = '冗余，有人的道具和队友重叠了';
      }
      return { key: d.key, label: d.label, short: d.short, supply: s, need: n, cov: c, level, msg, w: d.w };
    });

    const r = roleCounts(agents);
    const roles = [
      { role: '控场', count: r['控场'], level: r['控场'] === 0 ? 'low' : (r['控场'] >= 2 ? 'info' : 'ok'),
        msg: r['控场'] === 0 ? '没有烟位：进点只能硬打，长通道必死' : (r['控场'] >= 2 ? '双烟：进点容错高，但要注意别抢同一个点' : '') },
      { role: '先锋', count: r['先锋'], level: r['先锋'] === 0 ? 'low' : (r['先锋'] >= 2 ? 'info' : 'ok'),
        msg: r['先锋'] === 0 ? '没有信息/闪光：全靠自己听声辨位' : (r['先锋'] >= 2 ? '双先锋：信息和闪充足，火力可能不够' : '') },
      { role: '哨卫', count: r['哨卫'], level: r['哨卫'] === 0 ? 'warn' : 'ok',
        msg: r['哨卫'] === 0 ? '没有哨卫：防守端没人看后路，容易被绕' : '' },
      { role: '决斗', count: r['决斗'], level: r['决斗'] === 0 ? 'warn' : (r['决斗'] >= 3 ? 'warn' : 'ok'),
        msg: r['决斗'] === 0 ? '没有决斗：谁来第一个进点？' : (r['决斗'] >= 3 ? '三个决斗：火力重叠，缺道具支撑' : '') }
    ];

    // 空缺的职责如果有人能兼职，就从"缺口"降级成"提示"：蝰蛇不带哨卫时，至少有人能封拆包
    const alts = altCoverage(agents);
    roles.forEach(role => {
      if (role.count > 0) return;
      const cov = alts[role.role];
      if (!cov || !cov.length) return;
      role.level = 'info';
      role.alt = cov.map(x => x.agent.name).join('、');
      role.msg = `没有专职${role.role}，但 ${role.alt} 能顶一部分：${cov[0].why}`;
    });

    const gaps = dims.filter(d => d.level === 'low').concat(dims.filter(d => d.level === 'warn'));
    const overs = dims.filter(d => d.level === 'over');

    return {
      map, side, agents, supply, need, cov, dims, roles, score,
      archetype: archetype(agents),
      structure: structureOf(agents),
      filled: agents.length,
      gaps, overs,
      verdict: verdictOf(score, agents.length, gaps, roles)
    };
  }

  function verdictOf(score, filled, gaps, roles) {
    if (filled < 5) return { level: 'info', text: `还差 ${5 - filled} 个英雄，先把人选满再看结论` };
    const hard = gaps.filter(g => g.level === 'low');
    const roleFail = roles.filter(r => r.level === 'low');
    if (hard.length === 0 && roleFail.length === 0) return { level: 'good', text: '结构完整，这张图能正常打' };
    if (hard.length >= 2 || roleFail.length >= 1) return { level: 'bad', text: '有结构性缺口，进点或防守会很难受' };
    return { level: 'warn', text: '能用，但有一个明显短板，需要靠枪法或沟通补' };
  }

  /* 第 5 人推荐：只算"边际收益"，并解释原因 */
  function recommend(comp, mapId, side, n) {
    n = n || 3;
    const base = analyze(comp, mapId, side);
    const missing = missingRoles(base.agents);
    const inComp = new Set(comp);
    const out = [];

    (window.VD.AGENTS || []).forEach(a => {
      if (inComp.has(a.id)) return;
      const cand = comp.concat([a.id]).slice(0, 5);
      const res = analyze(cand, mapId, side);

      // 找出这个英雄补得最多的那个维度
      let bestDim = null, bestGain = 0;
      DIMS.forEach(d => {
        const before = Math.min(1, base.supply[d.key] / (base.need[d.key] || 1));
        const after = Math.min(1, res.supply[d.key] / (res.need[d.key] || 1));
        const gain = (after - before) * d.w;
        if (gain > bestGain) { bestGain = gain; bestDim = d; }
      });

      // 能顶一个空缺职责的人往前排一点：缺哨卫时蝰蛇要能被看见（她的本职仍是控场）
      const roleFills = altFills(a, missing);
      const primaryFill = missing.indexOf(a.role) >= 0;     // 本职正好补上空缺
      const fillTier = primaryFill ? 2 : (roleFills.length ? 1 : 0);
      // 阵容完整度的加权：补空位 +8，兼职顶 +3（都很小，但足以压过单项数据）
      const structBonus = primaryFill ? 8 : (roleFills.length ? 3 : 0);
      const delta = res.score - base.score;

      out.push({
        agent: a,
        score: res.score,
        delta,
        rank: delta + structBonus,
        fillTier,
        primaryFill,
        roleFills,
        fillsDim: bestDim ? bestDim.label : null,
        fillsGain: Math.round(bestGain * 100) / 100
      });
    });

    // 先看能不能补结构，再看加权收益，最后看总分
    out.sort((x, y) => (y.fillTier - x.fillTier) || (y.rank - x.rank) || (y.score - x.score));
    return { base, list: out.slice(0, n), structure: base.structure };
  }

  /* 组合拳匹配（内置 combo + 用户自建，自建的由 js/tactics.js 合并进来） */
  function matchCombos(comp, mapId, side) {
    const set = new Set(comp);
    const src = (window.VD.tactics && window.VD.tactics.list) ? window.VD.tactics.list() : (window.VD.COMBOS || []);
    const all = src.filter(c => c.map === mapId && c.side === side);
    const ok = [], near = [];
    all.forEach(c => {
      const missing = c.requires.filter(r => !set.has(r));
      if (missing.length === 0) ok.push({ combo: c });
      else if (missing.length === 1) near.push({ combo: c, missing });
    });
    return { ok, near, total: all.length };
  }

  window.VD.engine = {
    DIMS, agent, getMap, analyze, recommend, matchCombos,
    init: index
  };
})();
