/* 战术库：内置组合拳（data/ascent.js 的 VD.COMBOS）+ 用户自建（存在本机）
 *
 * 自建战术只影响"这套阵容能打出哪些套路 / AI 看到了什么"，不参与任何数值打分。
 * 校验在这里做一遍：英雄 id 必须存在、技能名必须和该英雄的技能一字不差、
 * 步骤必须有落点。requires（必要条件）由步骤里的英雄自动推导，避免写岔。
 */
(function () {
  const KEY = 'vd.combos.v1';
  const SIDES = ['attack', 'defend'];
  const MAPS = ['ascent'];

  let user = [];          // 用户自建，数组顺序 = 保存顺序
  let persistOk = true;   // localStorage 能不能写（file:// 下可能有浏览器禁掉）

  function isStr(x) { return typeof x === 'string' && x.trim().length > 0; }
  function clip(s, n) { return String(s == null ? '' : s).trim().slice(0, n); }

  function agentById(id) {
    const list = window.VD.AGENTS || [];
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function newId() {
    return 'user-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5);
  }

  /* 校验 + 规整。返回 {ok:true, combo} 或 {ok:false, err} */
  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return { ok: false, err: '不是一个对象' };

    const title = clip(raw.title, 40);
    if (!title) return { ok: false, err: '缺名称' };

    const side = SIDES.indexOf(raw.side) >= 0 ? raw.side : 'attack';
    const site = raw.site === 'B' ? 'B' : 'A';
    const map = MAPS.indexOf(raw.map) >= 0 ? raw.map : 'ascent';
    const difficulty = Math.min(3, Math.max(1, parseInt(raw.difficulty, 10) || 2));

    const stepsIn = Array.isArray(raw.steps) ? raw.steps : [];
    if (!stepsIn.length) return { ok: false, err: '至少要有一个步骤' };

    const steps = [];
    for (let i = 0; i < stepsIn.length; i++) {
      const s = stepsIn[i] || {};
      const a = agentById(s.agent);
      if (!a) return { ok: false, err: '第 ' + (i + 1) + ' 步的英雄不存在：' + (s.agent || '(空)') };
      const names = (a.abilities || []).map(function (x) { return x.name; });
      if (names.indexOf(s.ability) < 0) {
        return { ok: false, err: '第 ' + (i + 1) + ' 步：' + a.name + ' 没有「' + (s.ability || '(空)') + '」，可选：' + names.join(' / ') };
      }
      const target = clip(s.target, 40);
      if (!target) return { ok: false, err: '第 ' + (i + 1) + ' 步缺「打到哪」' };
      steps.push({
        t: Math.max(0, Number(s.t) || 0),
        agent: a.id,
        ability: s.ability,
        target: target,
        why: clip(s.why, 160)
      });
    }

    /* requires 自动推导：步骤里出现过的英雄，顺序按首次出现 */
    const requires = [];
    steps.forEach(function (s) { if (requires.indexOf(s.agent) < 0) requires.push(s.agent); });

    let countered = [];
    if (Array.isArray(raw.countered_by)) countered = raw.countered_by;
    else if (isStr(raw.countered_by)) countered = String(raw.countered_by).split(/[\n；;]/);
    countered = countered.map(function (x) { return clip(x, 60); }).filter(Boolean).slice(0, 6);

    return {
      ok: true,
      combo: {
        id: isStr(raw.id) ? raw.id : newId(),
        map: map,
        site: site,
        side: side,
        title: title,
        requires: requires,
        difficulty: difficulty,
        steps: steps,
        win_condition: clip(raw.win_condition, 240),
        countered_by: countered,
        source: clip(raw.source, 60) || '自建',
        origin: 'user'
      }
    };
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(user));
      persistOk = true;
    } catch (e) {
      persistOk = false;   // 存不进就只在本页有效，界面上会提示
    }
    return persistOk;
  }

  function load() {
    user = [];
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return;
      arr.forEach(function (r) {
        const n = normalize(r);
        if (n.ok) user.push(n.combo);
      });
    } catch (e) { /* 坏了就当没有 */ }
  }

  /* 内置 + 自建 */
  function list() {
    return (window.VD.COMBOS || []).concat(user);
  }

  function upsert(combo) {
    const i = user.findIndex(function (c) { return c.id === combo.id; });
    if (i >= 0) user[i] = combo; else user.push(combo);
    const ok = save();
    window.dispatchEvent(new Event('vd:tactics'));
    return ok;
  }

  function remove(id) {
    const n = user.length;
    user = user.filter(function (c) { return c.id !== id; });
    const ok = save();
    if (user.length !== n) {
      window.dispatchEvent(new Event('vd:tactics'));
      return ok;
    }
    return ok;
  }

  function exportJSON() {
    return JSON.stringify(user, null, 2);
  }

  /* 从粘贴的 JSON 导入：接受数组，或 {combos:[...]}；返回 {ok, added, errs} */
  function importJSON(text) {
    let data;
    try {
      data = JSON.parse(String(text || '').trim());
    } catch (e) {
      return { ok: false, added: 0, errs: ['JSON 解析失败：' + e.message] };
    }
    let arr = [];
    if (Array.isArray(data)) arr = data;
    else if (data && Array.isArray(data.combos)) arr = data.combos;
    else return { ok: false, added: 0, errs: ['要一个数组，或者 {"combos": [...]}'] };

    const errs = [];
    let added = 0;
    arr.forEach(function (r, i) {
      const n = normalize(r);
      if (!n.ok) { errs.push('第 ' + (i + 1) + ' 条：' + n.err); return; }
      upsert(n.combo);
      added++;
    });
    if (added) window.dispatchEvent(new Event('vd:tactics'));
    return { ok: added > 0, added: added, errs: errs };
  }

  load();

  window.VD = window.VD || {};
  window.VD.tactics = {
    KEY: KEY,
    list: list,
    mine: function () { return user.slice(); },
    normalize: normalize,
    upsert: upsert,
    remove: remove,
    exportJSON: exportJSON,
    importJSON: importJSON,
    persistOk: function () { return persistOk; }
  };
})();
