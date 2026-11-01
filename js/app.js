/* 界面逻辑：状态 → 渲染。无框架、无依赖，file:// 直接打开可用。 */
(function () {
  const E = window.VD.engine;
  const MAP = 'ascent';
  const LS_KEY = 'vd.comp.v1';
  const LS_AI = 'vd.ai.v1';

  const state = {
    side: 'attack',
    comp: [],
    expanded: {}
  };

  /* ---------- 持久化 ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.comp && Array.isArray(s.comp)) state.comp = s.comp.slice(0, 5);
        if (s.side === 'attack' || s.side === 'defend') state.side = s.side;
      }
    } catch (e) { /* 忽略 */ }
  }
  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ comp: state.comp, side: state.side })); } catch (e) {}
  }

  /* ---------- 小工具 ---------- */
  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ROLE_CLS = { '决斗': 'r-duel', '先锋': 'r-init', '控场': 'r-cont', '哨卫': 'r-sent' };

  /* ---------- 渲染：5 个位置 ---------- */
  function renderSlots() {
    const box = $('#slots');
    box.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const id = state.comp[i];
      const a = id ? E.agent(id) : null;
      const slot = el('button', 'slot' + (a ? ' filled ' + ROLE_CLS[a.role] : ''));
      if (a) {
        const as = a.asset || {};
        slot.innerHTML = `
          ${as.icon
            ? `<span class="slot-avatar has-img"><img src="${esc(as.icon)}" alt="${esc(a.name)}"></span>
               <span class="slot-name">${esc(a.name)}</span>`
            : `<span class="slot-avatar">${esc(a.name)}</span>`}
          <span class="slot-role">${as.roleIcon ? `<img class="role-ic" src="${esc(as.roleIcon)}" alt="">` : ''}${esc(a.role)}</span>
          <span class="slot-x">移除</span>`;
        slot.title = `${a.name}（${a.en}）· ${a.role}\n${a.adds.join(' / ')}`;
        slot.onclick = () => { state.comp.splice(i, 1); refresh(); };
      } else {
        slot.innerHTML = `<span class="slot-empty">+ 选人</span>`;
        slot.onclick = () => { $('#pool').scrollIntoView({ behavior: 'smooth', block: 'center' }); };
      }
      box.appendChild(slot);
    }
    const meta = $('#comp-meta');
    if (state.comp.length === 5) {
      const res = E.analyze(state.comp, MAP, state.side);
      meta.innerHTML = `<span class="tag">${esc(res.archetype)}</span><span class="muted">阵容已满 · 覆盖度 ${res.score}</span>`;
    } else {
      meta.innerHTML = `<span class="muted">还差 ${5 - state.comp.length} 个英雄（可以先选 4 个，看第 5 人推荐）</span>`;
    }
  }

  /* ---------- 渲染：雷达图 ---------- */
  function polar(cx, cy, r, i, n) {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  }

  function renderRadar(dims) {
    const n = dims.length;
    const cx = 160, cy = 138, R = 96;
    const rings = [0.25, 0.5, 0.75, 1].map(f => {
      const pts = dims.map((_, i) => polar(cx, cy, R * f, i, n).join(',')).join(' ');
      return `<polygon points="${pts}" class="ring${f === 1 ? ' ring-outer' : ''}"/>`;
    }).join('');

    const spokes = dims.map((_, i) => {
      const [x, y] = polar(cx, cy, R, i, n);
      return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" class="spoke"/>`;
    }).join('');

    const covPts = dims.map((d, i) => polar(cx, cy, R * Math.max(0.04, d.cov), i, n).join(',')).join(' ');
    const labels = dims.map((d, i) => {
      const [x, y] = polar(cx, cy, R + 20, i, n);
      const anchor = Math.abs(x - cx) < 8 ? 'middle' : (x > cx ? 'start' : 'end');
      const cls = d.level === 'low' ? 'lb-low' : d.level === 'warn' ? 'lb-warn' : d.level === 'over' ? 'lb-over' : '';
      return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${anchor}" class="radar-label ${cls}">${esc(d.short)} ${Math.round(d.cov * 100)}</text>`;
    }).join('');

    $('#radar').innerHTML = `
      <svg viewBox="0 0 320 276" class="radar-svg" role="img" aria-label="覆盖度雷达图">
        ${rings}${spokes}
        <polygon points="${covPts}" class="cov"/>
        ${labels}
      </svg>`;
  }

  /* ---------- 渲染：体检明细 ---------- */
  function renderDims(dims) {
    const box = $('#dims');
    box.innerHTML = dims.map(d => `
      <li class="dim ${d.level}">
        <span class="dim-name">${esc(d.label)}</span>
        <span class="dim-bar"><i style="width:${Math.min(100, Math.round(d.cov * 100))}%"></i></span>
        <span class="dim-num">${d.supply}/${d.need}</span>
      </li>`).join('');
  }

  /* ---------- 渲染：结论 / 缺口 ---------- */
  function renderVerdict(res) {
    const v = res.verdict;
    const st = res.structure || { missing: [], score: 1 };
    $('#verdict').innerHTML = `<div class="verdict ${v.level}">${esc(v.text)}</div>
      <div class="score-line"><b>${res.score}</b><span>/ 100 覆盖度</span><em>${esc(res.archetype)}</em><span class="muted xs">· 位置 ${4 - st.missing.length}/4</span></div>`;

    const gaps = res.gaps;
    $('#gaps').innerHTML = gaps.length
      ? gaps.map(g => `<li class="gap ${g.level}"><b>${esc(g.label)}</b> 只有 ${g.supply}/${g.need} ${g.msg ? '· ' + esc(g.msg) : ''}</li>`).join('')
      : `<li class="gap ok">没有明显缺口</li>`;

    $('#roles').innerHTML = res.roles
      .filter(r => r.msg)
      .map(r => `<li class="gap ${r.level}"><b>${r.alt ? esc(r.role) + ' 空缺' : esc(r.role) + ' × ' + r.count}</b> ${esc(r.msg)}</li>`).join('')
      || `<li class="gap ok">结构正常</li>`;
  }

  /* ---------- 渲染：组合拳 ---------- */
  function renderCombos(matched) {
    const box = $('#combos');
    $('#combo-count').textContent = `可用 ${matched.ok.length} 条 / 本图共 ${matched.total} 条`;

    if (state.comp.length < 2) {
      box.innerHTML = `<p class="muted">先选几个英雄，再来看能打出什么套路。</p>`;
      return;
    }

    let html = '';
    if (matched.ok.length) {
      html += matched.ok.map(({ combo }) => comboCard(combo)).join('');
    } else {
      html += `<p class="muted">你这套阵容暂时匹配不到任何组合拳 —— 说明缺的不是数值，是"能连起来的道具"。</p>`;
    }

    if (matched.near.length) {
      html += `<div class="near"><h4>差一个英雄就能用</h4><ul>` +
        matched.near.slice(0, 6).map(({ combo, missing }) => {
          const m = E.agent(missing[0]);
          return `<li><b>${esc(combo.title)}</b> —— 补上 <span class="pill">${esc(m ? m.name : missing[0])}</span> 就能打</li>`;
        }).join('') + `</ul></div>`;
    }
    box.innerHTML = html;

    box.querySelectorAll('details').forEach(d => {
      d.open = !!state.expanded[d.dataset.id];
      d.addEventListener('toggle', () => { state.expanded[d.dataset.id] = d.open; });
    });
  }

  function comboCard(c) {
    const stars = '★'.repeat(c.difficulty) + '☆'.repeat(3 - c.difficulty);
    const mine = c.origin === 'user';
    const steps = c.steps.map(s => {
      const a = E.agent(s.agent);
      return `<li>
        <span class="t">${s.t}s</span>
        <span class="who ${a ? ROLE_CLS[a.role] : ''}">${esc(a ? a.name : s.agent)}</span>
        <span class="ab">${esc(s.ability)}</span>
        <span class="tg">→ ${esc(s.target)}</span>
        <div class="why">${esc(s.why)}</div>
      </li>`;
    }).join('');
    const reqs = c.requires.map(id => {
      const a = E.agent(id);
      return `<span class="pill ${a ? ROLE_CLS[a.role] : ''}">${esc(a ? a.name : id)}</span>`;
    }).join(' ');
    return `<details class="combo" data-id="${esc(c.id)}">
      <summary>
        <span class="combo-title">${esc(c.title)}${mine ? ' <span class="pill user">自建</span>' : ''}</span>
        <span class="combo-req">${reqs}</span>
        <span class="combo-diff" title="难度">${stars}</span>
      </summary>
      <div class="combo-body">
        <ol class="steps">${steps}</ol>
        <p class="win"><b>赢在哪：</b>${esc(c.win_condition || '—')}</p>
        <p class="counter"><b>会被什么破：</b>${esc((c.countered_by || []).join('；') || '—')}</p>
        ${c.source ? `<p class="src">来源：${esc(c.source)}</p>` : ''}
        ${mine ? `<div class="combo-edit">
          <button class="ghost slim" data-edit-tactic="${esc(c.id)}">编辑</button>
          <button class="ghost slim" data-del-tactic="${esc(c.id)}">删除</button>
        </div>` : ''}
      </div>
    </details>`;
  }

  /* ---------- 渲染：第 5 人推荐 ---------- */
  function renderPicks(rec) {
    const box = $('#picks');
    const note = $('#pick-note');
    const st = rec && rec.structure;
    if (note) {
      note.textContent = (st && st.missing.length)
        ? `先补位置：还缺 ${st.missing.join(' / ')}`
        : '位置齐了，按边际收益排序';
    }
    if (state.comp.length >= 5) {
      if (note) note.textContent = st && st.missing.length ? `位置还缺 ${st.missing.join(' / ')}（先移除一个再推荐）` : '阵容已满';
      box.innerHTML = `<p class="muted">阵容已满。想换人就把上面某个英雄移除，这里会重新推荐。</p>`;
      return;
    }
    box.innerHTML = rec.list.map((p, i) => {
      const a = p.agent;
      const alt = p.roleFills && p.roleFills.length ? p.roleFills[0] : null;
      const fillRole = p.primaryFill ? a.role : null;
      return `<div class="pick ${ROLE_CLS[a.role]}">
        <div class="pick-head">
          <span class="pick-rank">#${i + 1}</span>
          ${a.asset && a.asset.icon ? `<img class="pick-ic" src="${esc(a.asset.icon)}" alt="">` : ''}
          <b>${esc(a.name)}</b><span class="muted">${esc(a.role)}</span>
          ${fillRole ? `<span class="pill fill">补${esc(fillRole)}位</span>` : ''}
          ${alt ? `<span class="pill alt" title="${esc(alt.why)}">可顶${esc(alt.role)}</span>` : ''}
          <span class="delta ${p.delta > 0 ? 'up' : p.delta < 0 ? 'down' : ''}">${p.delta >= 0 ? '+' : ''}${p.delta}</span>
        </div>
        <div class="pick-why">补 <b>${esc(p.fillsDim || '—')}</b>${fillRole ? ` · 补${esc(fillRole)}位` : ''}${alt ? ` · 兼${esc(alt.role)}位` : ''} · ${esc(a.adds.join(' / '))}</div>
        <div class="pick-tip">${esc(a.tip)}</div>
        <button class="btn-sm" data-add="${esc(a.id)}">加入阵容</button>
      </div>`;
    }).join('') || `<p class="muted">没有可推荐的英雄了。</p>`;

    box.querySelectorAll('[data-add]').forEach(b => {
      b.onclick = () => { addAgent(b.dataset.add); };
    });
  }

  /* ---------- 渲染：英雄池 ---------- */
  function renderPool() {
    const box = $('#pool');
    const groups = { '决斗': [], '先锋': [], '控场': [], '哨卫': [] };
    window.VD.AGENTS.forEach(a => { (groups[a.role] || groups['决斗']).push(a); });

    box.innerHTML = Object.keys(groups).map(role => `
      <div class="pool-group">
        <h4 class="${ROLE_CLS[role]}">${esc(role)}</h4>
        <div class="pool-row">
          ${groups[role].map(a => {
            const picked = state.comp.includes(a.id);
            const as = a.asset || {};
            const alts = a.alt && a.alt.length ? a.alt.map(x => x.role).join('、') : '';
            return `<div class="agent ${ROLE_CLS[a.role]} ${picked ? 'picked' : ''}" data-id="${esc(a.id)}" role="button" tabindex="0"
              title="${esc(a.name + '（' + a.en + '）\n' + a.adds.join(' / ') + '\n' + a.tip + (alts ? '\n兼职：' + alts : ''))}">
              ${as.icon
                ? `<img class="agent-ic" src="${esc(as.icon)}" alt="${esc(a.name)}" loading="lazy">`
                : `<span class="agent-ic letter">${esc(a.name.slice(0, 1))}</span>`}
              <span class="agent-name">${esc(a.name)}</span>
              <span class="agent-en">${esc(a.en)}</span>
              ${alts ? `<span class="agent-alt" title="缺${esc(alts)}时可以顶一部分">兼</span>` : ''}
              <button class="agent-info" data-sheet="${esc(a.id)}" title="英雄档案：头像 / 技能原文">i</button>
            </div>`;
          }).join('')}
        </div>
      </div>`).join('');

    box.querySelectorAll('.agent').forEach(b => {
      b.onclick = (ev) => {
        const t = ev.target.closest ? ev.target.closest('[data-sheet]') : null;
        if (t) { ev.stopPropagation(); openSheet(t.dataset.sheet); return; }
        toggleAgent(b.dataset.id);
      };
    });
  }

  function toggleAgent(id) {
    const i = state.comp.indexOf(id);
    if (i >= 0) { state.comp.splice(i, 1); }
    else if (state.comp.length < 5) { state.comp.push(id); }
    else { flash('阵容已满，先点上面的位置移除一个'); return; }
    refresh();
  }
  function addAgent(id) {
    if (state.comp.includes(id)) return;
    if (state.comp.length >= 5) { flash('阵容已满'); return; }
    state.comp.push(id);
    refresh();
  }

  /* ---------- 官方地图（valorant-api.com 的 displayIcon 就是游戏里那张俯视小地图） ---------- */
  function mapShot(m) {
    const art = (window.VD.assets && window.VD.assets.map(MAP)) || (m && m.asset) || null;
    // 想换成自己截的图：在 data/ascent.js 的地图对象里加 localMap: 'assets/ascent-map.png'
    const url = (m && m.localMap) || (art && art.icon) || '';
    const empty = `<div class="map-shot-empty">官方地图还没加载到
        <span class="muted xs">—— 这张图来自 valorant-api.com，需要联网拉一次（之后缓存在本机 7 天）</span></div>`;
    if (!url) return `<div class="map-shot pending">${empty}</div>`;
    return `<div class="map-shot">
        <a href="${url}" target="_blank" rel="noopener" title="点开看原尺寸">
          <img src="${url}" alt="${esc(m.name)} 官方地图" loading="lazy"
            onerror="this.closest('.map-shot').classList.add('failed')">
        </a>
        <div class="map-shot-hint">官方地图 · 点位名用国服叫法，见上方说明</div>
        ${empty}
      </div>`;
  }

  let bannerSig = '';

  /* ---------- 地图横幅（有资产就用官方图，没有就纯文字） ---------- */
  function renderMapBanner() {
    const box = $('#map-banner');
    if (!box) return;
    const m = E.getMap(MAP);
    const art = (window.VD.assets && window.VD.assets.map(MAP)) || null;
    const splash = art && art.splash;
    // 资产到位前后各渲染一次就够，阵容变化时不要重建 <img>（会闪一下）
    const sig = `${MAP}|${splash ? 1 : 0}|${art && art.icon ? 1 : 0}`;
    if (sig === bannerSig && box.innerHTML) return;
    bannerSig = sig;
    box.style.backgroundImage = splash
      ? `linear-gradient(90deg, rgba(15,25,35,.97) 0%, rgba(15,25,35,.82) 48%, rgba(15,25,35,.35) 100%), url("${splash}")`
      : '';
    box.innerHTML =
      `<div class="map-banner-in">
        <div class="map-banner-l">
          <div class="map-banner-t"><b>${esc(m.name)}</b><span>${esc(m.en)}</span>
            <span class="muted xs">双点 · 中路必争</span></div>
          <p class="map-banner-note">${esc(m.note)}</p>
        </div>
        ${mapShot(m)}
      </div>`;
  }

  /* ---------- 英雄档案 ---------- */
  // 接口的 slot → 游戏里的按键，方便玩家对上是哪个键
  const SLOT_KEY = { Ability1: 'C', Ability2: 'Q', Grenade: 'E', Ultimate: 'X', Passive: '被动' };
  function openSheet(id) {
    const a = E.agent(id);
    if (!a) return;
    const as = a.asset || {};
    const apiAbs = (as.abilities && as.abilities.length) ? as.abilities : [];

    $('#sheet-body').innerHTML = `
      <div class="sheet-top">
        ${as.full ? `<img class="sheet-portrait" src="${esc(as.full)}" alt="${esc(a.name)}">` : ''}
        <div class="sheet-id">
          <h2>${esc(a.name)} <small>${esc(a.en)}</small></h2>
          <div class="sheet-role">${as.roleIcon ? `<img class="role-ic" src="${esc(as.roleIcon)}" alt="">` : ''}${esc(a.role)}</div>
          ${as.roleDesc ? `<p class="muted xs">${esc(as.roleDesc)}</p>` : ''}
          <div class="sheet-tags">${a.adds.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>
          ${a.alt && a.alt.length ? `<p class="sheet-alt">兼职：${a.alt.map(x => `<b>${esc(x.role)}</b>——${esc(x.why)}`).join('；')}</p>` : ''}
          <p class="sheet-tip">${esc(a.tip)}</p>
        </div>
      </div>
      <h3>技能 <small>国服名称</small></h3>
      <div class="sheet-abs">${a.abilities.map(x => `
        <div class="sheet-ab">
          <span class="ab-dot"></span>
          <div class="sheet-ab-t">
            <b>${esc(x.name)}</b><span class="tag xs">${esc(x.tag)}</span>
            <p>${esc(x.note)}</p>
          </div>
        </div>`).join('')}</div>
      ${apiAbs.length ? `<details class="sheet-api">
        <summary>官方技能原文（接口返回 ${apiAbs.length} 条，台服译名，名字和上面不一样）</summary>
        <div class="sheet-abs">${apiAbs.map(x => `
        <div class="sheet-ab">
          ${x.icon ? `<img src="${esc(x.icon)}" alt="" loading="lazy">` : '<span class="ab-dot"></span>'}
          <div class="sheet-ab-t">
            <b>${esc(x.name)}</b>${x.slot ? `<span class="muted xs">${esc(SLOT_KEY[x.slot] || x.slot)}</span>` : ''}
            <p>${esc(x.desc)}</p>
          </div>
        </div>`).join('')}</div>
      </details>` : ''}
      ${as.desc ? `<h3>官方简介</h3><p class="muted xs">${esc(as.desc)}</p>` : ''}
      <p class="muted xs">技能名一律用国服叫法（本项目整理）；「官方技能原文」里的中文是 valorant-api.com 返的台服译名，只作补充，不影响任何计算。</p>`;

    $('#sheet').classList.add('open');
    $('#sheet').setAttribute('aria-hidden', 'false');
  }
  function closeSheet() {
    $('#sheet').classList.remove('open');
    $('#sheet').setAttribute('aria-hidden', 'true');
  }

  /* ---------- 调参数：英雄 8 维向量 ----------
   * data/agents.js 里的 vec 是"默认值"，打开页面时先快照一份；
   * 用户在面板里改的数字只存本机 localStorage 'vd.vec.v2'，不动源文件。
   * 想固定下来就点「导出 JSON」，把数字抄回 data/agents.js。
   */
  const VEC_KEY = 'vd.vec.v2'; // v2：烟的标定从 0~5 改成 0~10，旧的覆盖值不再沿用
  let VEC_DEFAULT = null;
  let vecOverride = {};
  let vecTimer = null;

  function maxVec(key) { return key === 'smoke' ? 10 : 5; } // 烟按"一个控场 ≈ 8~10 分"标定
  function clampVec(x, key) {
    const n = Number(x);
    if (!isFinite(n)) return 0;
    return Math.max(0, Math.min(maxVec(key), Math.round(n * 2) / 2)); // 允许 0.5 档
  }

  function snapshotVec() {
    const snap = {};
    window.VD.AGENTS.forEach(a => { snap[a.id] = Object.assign({}, a.vec); });
    return snap;
  }

  function loadVec() {
    if (!VEC_DEFAULT) VEC_DEFAULT = snapshotVec();
    vecOverride = {};
    try {
      const raw = localStorage.getItem(VEC_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p === 'object' && !Array.isArray(p)) vecOverride = p;
      }
    } catch (e) { /* localStorage 被禁：本次只调内存 */ }
    applyVec();
  }

  function applyVec() {
    window.VD.AGENTS.forEach(a => {
      const base = VEC_DEFAULT[a.id] || {};
      const over = vecOverride[a.id] || {};
      const v = {};
      E.DIMS.forEach(d => {
        v[d.key] = clampVec(over[d.key] != null ? over[d.key] : base[d.key], d.key);
      });
      a.vec = v;
    });
  }

  function saveVec() {
    try { localStorage.setItem(VEC_KEY, JSON.stringify(vecOverride)); } catch (e) {}
  }

  function setVec(id, key, raw) {
    const val = clampVec(raw, key);
    const base = (VEC_DEFAULT[id] || {})[key];
    if (!vecOverride[id]) vecOverride[id] = {};
    if (base === val) delete vecOverride[id][key];
    else vecOverride[id][key] = val;
    if (!Object.keys(vecOverride[id]).length) delete vecOverride[id];

    applyVec();
    saveVec();

    const row = document.querySelector(`.tune-row[data-row="${id}"]`);
    if (row) row.classList.toggle('dirty', !!vecOverride[id]);

    const st = $('#tune-status');
    if (st) {
      const n = Object.keys(vecOverride).length;
      st.textContent = n ? `已改动 ${n} 个英雄` : '当前全部是默认值';
    }

    clearTimeout(vecTimer);
    vecTimer = setTimeout(refresh, 120); // 连续输入时只重算一次
  }

  function resetAgentVec(id) {
    delete vecOverride[id];
    applyVec();
    saveVec();
    renderTune();
    refresh();
  }

  function resetAllVec() {
    vecOverride = {};
    applyVec();
    saveVec();
    renderTune();
    refresh();
    flash('所有英雄已恢复默认数值');
  }

  function exportVec() {
    const out = {};
    Object.keys(vecOverride).forEach(id => {
      out[id] = {};
      E.DIMS.forEach(d => { out[id][d.key] = vecOverride[id][d.key]; });
    });
    const text = JSON.stringify(out, null, 2);
    const pre = $('#tune-json');
    pre.hidden = false;
    pre.textContent =
      '// 只有被改过的英雄会出现在这里。想固定下来就把对应数值抄进 data/agents.js 的 vec\n' +
      (Object.keys(out).length ? text : '// 当前没有任何改动');
    if (Object.keys(out).length && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => flash('已导出，并复制到剪贴板'),
        () => flash('已导出到下方文本框')
      );
    } else {
      flash(Object.keys(out).length ? '已导出到下方文本框' : '当前没有改动');
    }
  }

  function renderTune() {
    const box = $('#tune-body');
    if (!box) return;

    const groups = { '决斗': [], '先锋': [], '控场': [], '哨卫': [] };
    window.VD.AGENTS.forEach(a => { (groups[a.role] || groups['决斗']).push(a); });

    const head = `<div class="tune-row tune-head">
        <span class="tune-name">英雄 <em>${E.DIMS.length} 维</em></span>
        <span class="tune-inputs">${E.DIMS.map(d => `<span class="tune-h" title="${esc(d.label)}">${esc(d.short)}</span>`).join('')}</span>
        <span class="tune-op">默认</span>
      </div>`;

    const body = Object.keys(groups).map(role => `
      <h4 class="tune-g ${ROLE_CLS[role]}">${esc(role)}</h4>
      ${groups[role].map(a => `
        <div class="tune-row ${ROLE_CLS[a.role]} ${vecOverride[a.id] ? 'dirty' : ''}" data-row="${esc(a.id)}">
          <span class="tune-name">${esc(a.name)}<i>${esc(a.en)}</i></span>
          <span class="tune-inputs">${E.DIMS.map(d => `<input type="number" min="0" max="${d.key === 'smoke' ? 10 : 5}" step="0.5"
              inputmode="decimal" data-agent="${esc(a.id)}" data-key="${esc(d.key)}"
              value="${a.vec[d.key]}" title="${esc(a.name)} · ${esc(d.label)}">`).join('')}</span>
          <span class="tune-op"><button class="tune-undo" data-reset-agent="${esc(a.id)}" title="这个英雄恢复默认">↺</button></span>
        </div>`).join('')}
    `).join('');

    box.innerHTML = head + body;

    const n = Object.keys(vecOverride).length;
    const st = $('#tune-status');
    if (st) st.textContent = n ? `已改动 ${n} 个英雄` : '当前全部是默认值';
  }

  function openTune() {
    renderTune();
    $('#tune-json').hidden = true;
    $('#tune').classList.add('open');
    $('#tune').setAttribute('aria-hidden', 'false');
  }
  function closeTune() {
    $('#tune').classList.remove('open');
    $('#tune').setAttribute('aria-hidden', 'true');
  }

  /* ---------- 战术面板：自建组合拳 ---------- */
  let tacticDraft = null;   // 正在编辑的草稿；null = 看列表

  function allCallouts() {
    const m = E.getMap(MAP);
    const out = [];
    if (m && m.callouts) {
      ['attack', 'defend'].forEach(k => (m.callouts[k] || []).forEach(n => { if (out.indexOf(n) < 0) out.push(n); }));
    }
    return out;
  }

  function agentOptions(cur) {
    const order = ['决斗', '先锋', '控场', '哨卫'];
    const g = {};
    (window.VD.AGENTS || []).forEach(a => { (g[a.role] = g[a.role] || []).push(a); });
    return order.filter(r => g[r]).map(r =>
      `<optgroup label="${r}">` + g[r].map(a =>
        `<option value="${esc(a.id)}"${a.id === cur ? ' selected' : ''}>${esc(a.name)}</option>`).join('') + '</optgroup>'
    ).join('');
  }

  function abilityOptions(agentId, cur) {
    const a = E.agent(agentId);
    const names = a ? (a.abilities || []).map(x => x.name) : [];
    return names.map(n => `<option value="${esc(n)}"${n === cur ? ' selected' : ''}>${esc(n)}</option>`).join('');
  }

  function stepRowHTML(s) {
    s = s || {};
    const firstId = ((window.VD.AGENTS || [])[0] || {}).id || '';
    const aid = s.agent || firstId;
    return `<div class="step-ed">
      <input class="s-t" type="number" min="0" step="0.5" value="${Number(s.t) || 0}" title="第几秒放">
      <select class="s-agent" title="谁">${agentOptions(aid)}</select>
      <select class="s-ability" title="技能">${abilityOptions(aid, s.ability)}</select>
      <input class="s-target" list="callout-list" placeholder="打到哪（A 大 / 天堂…）" value="${esc(s.target || '')}">
      <input class="s-why" placeholder="为什么（可空）" value="${esc(s.why || '')}">
      <button type="button" class="s-del ghost slim" title="删除这一步">✕</button>
    </div>`;
  }

  function tacticFormHTML(c) {
    const steps = (c.steps && c.steps.length ? c.steps : [{}]).map(stepRowHTML).join('');
    const callouts = allCallouts().map(n => `<option value="${esc(n)}"></option>`).join('');
    return `<div class="tactic-form">
      <div class="tf-grid">
        <label class="tf-field"><span>名称</span>
          <input id="tf-title" maxlength="40" value="${esc(c.title || '')}" placeholder="例：B 大三人冲">
        </label>
        <label class="tf-field"><span>阵营</span>
          <select id="tf-side">
            <option value="attack"${c.side === 'defend' ? '' : ' selected'}>进攻</option>
            <option value="defend"${c.side === 'defend' ? ' selected' : ''}>防守</option>
          </select>
        </label>
        <label class="tf-field"><span>目标区域</span>
          <select id="tf-site">
            <option value="A"${c.site === 'B' ? '' : ' selected'}>A 点</option>
            <option value="B"${c.site === 'B' ? ' selected' : ''}>B 点</option>
          </select>
        </label>
        <label class="tf-field"><span>难度</span>
          <select id="tf-diff">
            <option value="1"${c.difficulty === 1 ? ' selected' : ''}>1 简单</option>
            <option value="2"${!c.difficulty || c.difficulty === 2 ? ' selected' : ''}>2 中等</option>
            <option value="3"${c.difficulty === 3 ? ' selected' : ''}>3 要练</option>
          </select>
        </label>
      </div>
      <h3>步骤 <small>必要条件（requires）会按这里用到的英雄自动生成</small></h3>
      <datalist id="callout-list">${callouts}</datalist>
      <div id="tf-steps">${steps}</div>
      <div class="tactic-actions">
        <button id="tf-add-step" class="ghost slim" type="button">+ 加一步</button>
      </div>
      <div class="tf-grid">
        <label class="tf-field"><span>赢在哪</span>
          <textarea id="tf-win" rows="2" maxlength="240" placeholder="打完会拿到什么局面">${esc(c.win_condition || '')}</textarea>
        </label>
        <label class="tf-field"><span>会被什么破（一行一条）</span>
          <textarea id="tf-counter" rows="2" maxlength="240">${esc((c.countered_by || []).join('\n'))}</textarea>
        </label>
      </div>
      <label class="tf-field"><span>来源</span>
        <input id="tf-source" maxlength="60" value="${esc(c.source || '')}" placeholder="自己排位 / 某场比赛">
      </label>
      <div class="tactic-actions">
        <button id="tf-save" class="ghost" type="button">保存战术</button>
        <button id="tf-cancel" class="ghost slim" type="button">取消</button>
        <span id="tf-msg" class="muted xs"></span>
      </div>
    </div>`;
  }

  function tacticsListHTML() {
    const mine = window.VD.tactics ? window.VD.tactics.mine() : [];
    const builtin = (window.VD.COMBOS || []).filter(c => c.map === MAP);
    const row = (c, isMine) => {
      const sideTxt = c.side === 'defend' ? '防守' : '进攻';
      const reqs = (c.requires || []).map(id => { const a = E.agent(id); return a ? a.name : id; }).join(' + ');
      return `<div class="tactic-row">
        <div class="t-main">
          <div class="t-title">${esc(c.title)} <span class="pill">${sideTxt} ${esc(c.site || 'A')}</span>${isMine ? ' <span class="pill user">自建</span>' : ''}</div>
          <div class="t-meta">${esc(reqs)} · ${(c.steps || []).length} 步 · 难度 ${c.difficulty || 1}</div>
        </div>
        ${isMine
          ? `<button class="ghost slim" data-edit-tactic="${esc(c.id)}">编辑</button>
             <button class="ghost slim" data-del-tactic="${esc(c.id)}">删除</button>`
          : '<span class="muted xs">内置</span>'}
      </div>`;
    };
    return `<h3>我建的（${mine.length}）</h3>`
      + (mine.length ? mine.map(c => row(c, true)).join('')
        : '<p class="muted">还没有自建战术。点「+ 新建战术」照着填；也可以把改好的 JSON 粘到下面导入。</p>')
      + `<h3>内置（${builtin.length}，写死在 data/ascent.js）</h3>`
      + (builtin.length ? builtin.map(c => row(c, false)).join('') : '<p class="muted">这张图还没有内置组合拳。</p>');
  }

  function renderTactics() {
    const list = $('#tactics-list'), ed = $('#tactic-editor');
    if (!list || !ed) return;
    if (tacticDraft) {
      list.hidden = true;
      ed.hidden = false;
      ed.innerHTML = tacticFormHTML(tacticDraft);
    } else {
      ed.hidden = true;
      ed.innerHTML = '';
      list.hidden = false;
      list.innerHTML = tacticsListHTML();
    }
    const st = $('#tactics-status');
    if (st) {
      st.textContent = (window.VD.tactics && !window.VD.tactics.persistOk())
        ? '浏览器不允许存盘：改动只在本页有效'
        : '';
    }
  }

  function openTactics() {
    tacticDraft = null;
    renderTactics();
    const box = $('#tactics');
    if (box) { box.classList.add('open'); box.setAttribute('aria-hidden', 'false'); }
  }
  function closeTactics() {
    const box = $('#tactics');
    if (box) { box.classList.remove('open'); box.setAttribute('aria-hidden', 'true'); }
    const js = $('#tactics-json');
    if (js) js.hidden = true;
  }

  function newTactic() {
    tacticDraft = {
      side: state.side, site: 'A', difficulty: 2, title: '',
      steps: [{ t: 0, agent: '', ability: '', target: '', why: '' }],
      win_condition: '', countered_by: [], source: ''
    };
    renderTactics();
  }

  function editTactic(id) {
    if (!window.VD.tactics) return;
    const c = window.VD.tactics.mine().filter(x => x.id === id)[0];
    if (!c) return;
    tacticDraft = JSON.parse(JSON.stringify(c));
    renderTactics();
  }

  function collectTactic() {
    const ed = $('#tactic-editor');
    if (!ed) return null;
    const steps = [];
    ed.querySelectorAll('.step-ed').forEach(row => {
      steps.push({
        t: Number(row.querySelector('.s-t').value) || 0,
        agent: row.querySelector('.s-agent').value,
        ability: row.querySelector('.s-ability').value,
        target: row.querySelector('.s-target').value,
        why: row.querySelector('.s-why').value
      });
    });
    return {
      id: tacticDraft && tacticDraft.id,
      map: MAP,
      title: $('#tf-title').value,
      side: $('#tf-side').value,
      site: $('#tf-site').value,
      difficulty: Number($('#tf-diff').value) || 2,
      steps: steps,
      win_condition: $('#tf-win').value,
      countered_by: $('#tf-counter').value.split('\n'),
      source: $('#tf-source').value
    };
  }

  function saveTactic() {
    if (!window.VD.tactics) return;
    const n = window.VD.tactics.normalize(collectTactic());
    const msg = $('#tf-msg');
    if (!n.ok) { if (msg) msg.textContent = n.err; return; }
    const ok = window.VD.tactics.upsert(n.combo);
    tacticDraft = null;
    renderTactics();
    refresh();
    flash(ok ? '战术已保存' : '战术已保存（本页有效，刷新会丢）');
  }

  function delTactic(id) {
    if (!window.VD.tactics) return;
    if (!window.confirm('删除这条自建战术？')) return;
    window.VD.tactics.remove(id);
    renderTactics();
    refresh();
    flash('已删除');
  }

  function exportTactics() {
    const box = $('#tactics-json');
    const mine = window.VD.tactics ? window.VD.tactics.mine() : [];
    if (!box) return;
    if (!mine.length) { flash('还没有自建战术可导出'); return; }
    box.value = window.VD.tactics.exportJSON();
    box.hidden = false;
    try {
      const p = navigator.clipboard && navigator.clipboard.writeText(box.value);
      if (p && p.catch) p.catch(() => {});
      flash('已填到下面，也可以直接 Ctrl+C 复制');
    } catch (e) { flash('已填到下面，手动复制'); }
  }

  function importTactics() {
    const box = $('#tactics-json');
    const st = $('#tactics-status');
    if (!box || !box.value.trim()) { flash('先在下面粘一段 JSON'); return; }
    const r = window.VD.tactics.importJSON(box.value);
    renderTactics();
    refresh();
    if (st) {
      st.textContent = r.ok
        ? `导入 ${r.added} 条` + (r.errs.length ? `；${r.errs.length} 条没通过：${r.errs.slice(0, 2).join('；')}` : '')
        : (r.errs[0] || '没有导入任何条目');
    }
    if (r.ok) box.hidden = true;
  }

  function flash(msg) {
    const n = $('#toast');
    n.textContent = msg;
    n.classList.add('show');
    clearTimeout(flash._t);
    flash._t = setTimeout(() => n.classList.remove('show'), 2200);
  }

  /* ---------- 主刷新 ---------- */
  function refresh() {
    save();
    const res = E.analyze(state.comp, MAP, state.side);
    const matched = E.matchCombos(state.comp, MAP, state.side);
    const rec = E.recommend(state.comp, MAP, state.side, 4);

    renderSlots();
    renderMapBanner();
    renderRadar(res.dims);
    renderDims(res.dims);
    renderVerdict(res);
    renderCombos(matched);
    renderPicks(rec);
    renderPool();

    document.querySelectorAll('[data-side]').forEach(b => {
      b.classList.toggle('on', b.dataset.side === state.side);
    });
    $('#side-label').textContent = state.side === 'attack' ? '进攻方' : '防守方';

    window.__lastFacts = buildFacts(res, matched, rec);
  }

  /* ---------- 给 AI 的结构化事实（也是给用户看的"依据"） ---------- */
  function buildFacts(res, matched, rec) {
    return {
      map: res.map.name,
      map_note: res.map.note,
      callouts: (res.map.callouts && res.map.callouts[res.side]) || [],
      side: res.side === 'attack' ? '进攻' : '防守',
      comp: res.agents.map(a => ({
        name: a.name,
        role: a.role,
        adds: a.adds,
        why: a.tip,
        abilities: a.abilities.map(x => ({ name: x.name, tag: x.tag, note: x.note }))
      })),
      score: res.score,
      archetype: res.archetype,
      dims: res.dims.map(d => ({ name: d.label, supply: d.supply, need: d.need, level: d.level })),
      gaps: res.gaps.map(g => ({ name: g.label, level: g.level, supply: g.supply, need: g.need })),
      role_issues: res.roles.filter(r => r.msg).map(r => ({ role: r.role, count: r.count, msg: r.msg })),
      structure: { score: Math.round((res.structure ? res.structure.score : 0) * 100), missing: (res.structure ? res.structure.missing : []) },
      combos: matched.ok.map(m => ({
        title: m.combo.title, requires: m.combo.requires.map(id => (E.agent(id) || {}).name || id),
        steps: m.combo.steps.map(s => `${s.t}s ${(E.agent(s.agent) || {}).name || s.agent} ${s.ability} → ${s.target}`),
        win: m.combo.win_condition
      })),
      near_miss: matched.near.map(m => ({ title: m.combo.title, missing: (E.agent(m.missing[0]) || {}).name || m.missing[0] })),
      suggestions: rec.list.map(p => ({ name: p.agent.name, role: p.agent.role, delta: p.delta, fills: p.fillsDim, fills_role: p.primaryFill ? p.agent.role : null, alt: (p.roleFills || []).map(x => x.role) }))
    };
  }

  /* ---------- AI 解读（用户自带 Key，OpenAI 兼容接口） ----------
   * 配置以内存里的 aiConf 为准，localStorage 只做"顺手记住"：
   * file:// 下有的浏览器会禁掉 localStorage，如果只存 localStorage，
   * 保存就会静默失败 —— 这是"填了 Key 还是用不了"的头号原因。
   */
  const AI_DEFAULT = {
    url: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    key: ''
  };
  let aiConf = Object.assign({}, AI_DEFAULT);
  let aiPersistOk = true;

  function loadAIConf() {
    try {
      const raw = localStorage.getItem(LS_AI);
      if (raw) aiConf = Object.assign({}, AI_DEFAULT, JSON.parse(raw));
    } catch (e) {
      aiPersistOk = false;
    }
  }

  function saveAIConf(next) {
    aiConf = Object.assign({}, AI_DEFAULT, next);
    try {
      localStorage.setItem(LS_AI, JSON.stringify(aiConf));
      aiPersistOk = true;
    } catch (e) {
      aiPersistOk = false; // 存不住，但!内存里已经有了，本次照样能用
    }
    return aiPersistOk;
  }

  /* 统一的请求封装：返回 { data, ms }，错误带上 status / ms 方便解释 */
  async function callAPI(messages, opts) {
    opts = opts || {};
    const body = {
      model: aiConf.model,
      messages,
      temperature: opts.temperature == null ? 0.4 : opts.temperature
    };
    if (opts.maxTokens) body.max_tokens = opts.maxTokens;
    if (opts.json) body.response_format = { type: 'json_object' };

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeout || 60000);
    const t0 = Date.now();
    try {
      const resp = await fetch(aiConf.url, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + aiConf.key
        },
        body: JSON.stringify(body)
      });
      const ms = Date.now() - t0;
      if (!resp.ok) {
        let txt = '';
        try { txt = await resp.text(); } catch (e) {}
        const err = new Error('HTTP ' + resp.status + (txt ? ' · ' + txt.slice(0, 240) : ''));
        err.status = resp.status;
        err.ms = ms;
        throw err;
      }
      const data = await resp.json();
      return { data, ms };
    } catch (e) {
      if (e.ms == null) e.ms = Date.now() - t0;
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  const CORS_HINT = '请求被浏览器拦下了（file:// 打开时 Origin 是 null，多数模型接口会直接拒绝，这就是 CORS）。' +
    '三个办法：① 用本地服务器打开（文件夹里执行 npx serve，或 VS Code 的 Live Server）；' +
    '② 换一家允许浏览器直连的接口；③ 用本地 Ollama 时要设 OLLAMA_ORIGINS=*';

  function explainError(err) {
    const msg = String((err && err.message) || err);
    const s = err && err.status;
    if (s === 400) return '请求体被拒：可能这家接口不认 response_format，或模型名不对。';
    if (s === 401) return 'Key 不对，或这家接口用的是别的鉴权头（比如 x-api-key）。';
    if (s === 402) return '账户余额/额度不足。';
    if (s === 403) return 'Key 没权限或地区被限制。';
    if (s === 404) return '地址不对：要填到 /v1/chat/completions 这一级，模型名也可能不存在。';
    if (s === 429) return '限流了，等一会儿再试。';
    if (s >= 500) return '服务端错误，换一家接口试。';
    if (/abort|aborted/i.test(msg)) return '超过 60 秒没响应：网络慢，或模型在排队。';
    if (/Failed to fetch|NetworkError|Load failed|TypeError|fetch/i.test(msg)) return CORS_HINT;
    return '';
  }

  /* 模型有时会包一层 ```json 或前后加解释，这里尽量把 JSON 抠出来 */
  function extractJSON(text) {
    if (!text) return null;
    let t = String(text).trim();
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) t = fence[1].trim();
    try { return JSON.parse(t); } catch (e) {}
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a >= 0 && b > a) {
      try { return JSON.parse(t.slice(a, b + 1)); } catch (e) {}
    }
    return null;
  }

  /* 离线兜底：不联网也能给出可用结论（全部来自规则引擎的事实） */
  function offlineBrief(facts) {
    const dims = facts.dims || [];
    const passed = dims
      .filter(d => d.supply >= d.need && d.need > 0)
      .sort((a, b) => (b.supply - b.need) - (a.supply - a.need))
      .slice(0, 3)
      .map(d => ({ title: d.name + ' 达标（' + d.supply + '/' + d.need + '）', detail: '这是这套阵容的强项，可以围绕它设计开局。' }));

    const weak = (facts.gaps || []).map(g => ({
      title: g.name + ' 不够（' + g.supply + '/' + g.need + '）',
      detail: g.level === 'low' ? '结构性缺口：进点或防守会被直接惩罚。' : '偏弱：需要靠沟通或枪法补。'
    }));
    const roleIssues = (facts.role_issues || []).map(r => ({ title: r.role + ' × ' + r.count, detail: r.msg }));

    const first = (facts.combos || [])[0];
    const plan = first
      ? [{ title: first.title, steps: first.steps, why: first.win }]
      : [{
          title: '先把道具链条补起来',
          steps: ['这套阵容现在匹配不到任何组合拳', '按下面的换人建议补一个能和队友连起来的英雄'],
          why: '没有组合拳 = 大家的道具各打各的，进点只能靠对枪。'
        }];

    const trial = (facts.near_miss || []).slice(0, 3).map(n => ({
      title: n.title,
      steps: ['补一个「' + n.missing + '」就能打这条组合拳'],
      why: ''
    }));

    const swap = (facts.suggestions || []).slice(0, 3).map(s => ({
      out: '当前阵容',
      in: s.name,
      why: (s.fills_role ? '先补' + s.fills_role + '位（结构优先）' : '补 ' + (s.fills || '短板')) +
        '，覆盖度 ' + (s.delta >= 0 ? '+' : '') + s.delta
    }));

    return {
      verdict: facts.map + '·' + facts.side + '：覆盖度 ' + facts.score + '，' + facts.archetype +
        (weak.length ? '；短板是 ' + weak[0].title : '；没有明显结构性缺口'),
      strengths: passed,
      weaknesses: weak.concat(roleIssues),
      plan,
      trial,
      swap
    };
  }

  async function testConn() {
    const st = $('#ai-status');
    if (!aiConf.key) {
      st.className = 'ai-status err';
      st.textContent = '还没填 Key。';
      return;
    }
    st.className = 'ai-status';
    st.textContent = '正在测试…';
    try {
      const r = await callAPI([{ role: 'user', content: 'ping' }], { maxTokens: 8, timeout: 30000 });
      st.className = 'ai-status ok';
      st.textContent = '连接成功 · ' + aiConf.model + ' · ' + r.ms + 'ms';
    } catch (e) {
      const hint = explainError(e);
      st.className = 'ai-status err';
      st.textContent = '失败：' + ((e && e.message) || e) + (hint ? '\n' + hint : '');
    }
  }

  const SYS_PROMPT = `你是无畏契约（VALORANT）的战术教练，服务对象是中文玩家。
你会收到一份"阵容结构化事实"，它是用规则引擎算出来的，你必须以它为准，不要自己编造数值或英雄技能。
要求：
1. 只输出 JSON，不要任何 markdown；
2. 结论要具体到"谁、什么时候、打哪里"，不要空话；
3. 如果事实里 combos 为空，就明确说这套阵容缺什么，而不是编一套战术；
4. 不要推荐事实里没有的英雄名字。
5. 说点位时只能用 facts.callouts 里出现的中文点位名（例如 A 大 / 天堂 / 中连），不要自己造地名。
6. 技能名一律用国服叫法，只能取 facts.comp[].abilities 里的名字（例如猎枭的寻敌箭、炼狱的空投烟幕）；不要用英文名，也不要自己编简称（例如"烟雾弹""狙击枪"）。提到道具时要说明"谁的道具 + 丢给哪 + 为什么"。
7. 语气像教练复盘：先说这套阵容的赢法，再说风险，最后给一两个可试的细节。
8. 如果 facts 里提到某个英雄"兼职/能顶"另一个位置（例如蝰蛇顶哨卫），可以建议"把他当半个哨卫用"，但**不要改他的本职角色**，也不要因此说阵容不缺这个位置。
9. 谈换人/补人时，顺序是**先补齐 facts.structure.missing 里缺的位置**，再谈烟、信息这些单项数据；不要因为"信息多"就推荐一个已经有人做的位置。
JSON 结构：
{"verdict":"一句话结论","strengths":[{"title":"","detail":""}],"weaknesses":[{"title":"","detail":""}],
"plan":[{"title":"这套阵容最该打的赢法","steps":["..."],"why":""}],
"trial":[{"title":"这局可以试的组合","steps":["..."],"why":""}],
"swap":[{"out":"","in":"","why":""}]}`;

  async function runAI() {
    if (state.comp.length < 3) { flash('先至少选 3 个英雄'); return; }
    const facts = window.__lastFacts;
    if (!facts) { flash('先选阵容'); return; }

    // 用户可能只在设置里填了 Key、没点保存——这里顺手采用输入框里的值
    const typedKey = $('#ai-key').value.trim();
    if (typedKey && typedKey !== aiConf.key) {
      saveAIConf({
        url: $('#ai-url').value.trim() || aiConf.url,
        model: $('#ai-model').value.trim() || aiConf.model,
        key: typedKey
      });
    }

    // 没有 Key 也让功能"有内容"：先给离线版，再请他去填 Key
    if (!aiConf.key) {
      $('#ai-out').innerHTML = aiHTML(offlineBrief(facts), { offline: true }) +
        `<div class="ai-actions">
           <button class="ghost slim" id="ai-open-settings">填入 API Key，让模型再组织一遍</button>
         </div>`;
      const b = $('#ai-out').querySelector('#ai-open-settings');
      if (b) b.onclick = openDrawer;
      openDrawer();
      flash('离线版已生成；填 Key 后可用模型');
      return;
    }

    const btn = $('#btn-ai');
    btn.disabled = true; btn.textContent = '分析中…';
    const out = $('#ai-out');
    out.innerHTML = `<p class="muted">正在请求模型（${esc(aiConf.model)}）…</p>`;

    const messages = [
      { role: 'system', content: SYS_PROMPT },
      { role: 'user', content: '阵容事实：\n' + JSON.stringify(facts, null, 2) }
    ];

    try {
      let r;
      try {
        r = await callAPI(messages, { json: true });
      } catch (e) {
        if (e.status === 400) r = await callAPI(messages, {}); // 不认 response_format 的接口
        else throw e;
      }
      const data = r.data || {};
      const choice = data.choices && data.choices[0];
      const text = (choice && choice.message && (choice.message.content || choice.message.reasoning_content)) || '';
      const parsed = extractJSON(text);
      if (!parsed) {
        throw new Error('模型没返回可用 JSON：' + (text ? text.slice(0, 160) : '（空响应）'));
      }
      renderAI(parsed, { model: aiConf.model, ms: r.ms, usage: data.usage });
    } catch (err) {
      const hint = explainError(err);
      out.innerHTML =
        `<div class="ai-fallback">
           <p class="err"><b>AI 请求失败</b>：${esc((err && err.message) || err)}</p>
           ${hint ? `<p class="muted">${esc(hint)}</p>` : ''}
           <p class="muted">下面是<b>离线版结论</b>：不联网也能用，内容同样来自这套阵容的真实数据（只是少了模型的组织）。</p>
         </div>
         ${aiHTML(offlineBrief(facts), { offline: true })}
         <div class="ai-actions">
           <button class="ghost slim" id="ai-retry">重试</button>
           <button class="ghost slim" id="ai-open-settings">打开 API 设置</button>
         </div>`;
      const retry = out.querySelector('#ai-retry');
      if (retry) retry.onclick = runAI;
      const open = out.querySelector('#ai-open-settings');
      if (open) open.onclick = openDrawer;
    } finally {
      btn.disabled = false; btn.textContent = 'AI 解读';
    }
  }

  function aiHTML(r, meta) {
    meta = meta || {};
    const sec = (title, items, render) => {
      if (!items || !items.length) return '';
      return `<h3>${esc(title)}</h3><div class="ai-list">${items.map(render).join('')}</div>`;
    };
    const card = (it) => `<div class="ai-item"><b>${esc(it.title || '')}</b>
      ${(it.steps && it.steps.length) ? `<ol>${it.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
      ${it.detail ? `<p>${esc(it.detail)}</p>` : ''}
      ${it.why ? `<p class="muted">${esc(it.why)}</p>` : ''}</div>`;

    let head = '';
    if (meta.offline) {
      head = `<div class="ai-meta offline">离线版 · 规则引擎生成，没有调用模型</div>`;
    } else if (meta.model) {
      let usage = '';
      if (meta.usage) {
        const t = meta.usage.total_tokens ||
          (meta.usage.prompt_tokens || 0) + (meta.usage.completion_tokens || 0);
        if (t) usage = ' · ' + t + ' tokens';
      }
      head = `<div class="ai-meta">${esc(meta.model)} · ${meta.ms}ms${usage}</div>`;
    }

    return `${head}
      <div class="ai-verdict">${esc(r.verdict || '')}</div>
      ${sec('优势', r.strengths, card)}
      ${sec('隐患', r.weaknesses, card)}
      ${sec('赢法', r.plan, card)}
      ${sec('可以试的组合', r.trial, card)}
      ${sec('换人建议', r.swap, it => `<div class="ai-item"><b>${esc(it.out)} → ${esc(it.in)}</b><p>${esc(it.why)}</p></div>`)}
    `;
  }

  function renderAI(r, meta) {
    $('#ai-out').innerHTML = aiHTML(r, meta);
  }

  /* ---------- 抽屉 ---------- */
  function openDrawer() {
    $('#ai-url').value = aiConf.url;
    $('#ai-model').value = aiConf.model;
    $('#ai-key').value = aiConf.key;
    const st = $('#ai-status');
    if (st) {
      if (!aiPersistOk) {
        st.className = 'ai-status err';
        st.textContent = '注意：这个浏览器不允许本页写 localStorage（file:// 下常见）。配置只在本页有效，刷新后要重填——功能不受影响。';
      } else if (aiConf.key) {
        st.className = 'ai-status';
        st.textContent = '';
      }
    }
    $('#ai-drawer').classList.add('open');
  }
  function closeDrawer() { $('#ai-drawer').classList.remove('open'); }

  /* ---------- 启动 ---------- */
  function boot() {
    loadAIConf();
    E.init();
    load();
    loadVec(); // 先把本机改过的向量套上，再算第一遍

    $('#btn-ai').onclick = runAI;
    $('#btn-settings').onclick = openDrawer;
    $('#ai-close').onclick = closeDrawer;

    // 资产层拉到图之后重绘一次（拉不到就一直是字母头像）
    window.addEventListener('vd:assets', () => refresh());
    const sClose = $('#sheet-close');
    if (sClose) sClose.onclick = closeSheet;
    const sheet = $('#sheet');
    if (sheet) {
      sheet.onclick = (ev) => { if (ev.target === sheet) closeSheet(); };
    }
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') { closeSheet(); closeDrawer(); closeTune(); closeTactics(); }
    });

    // 调参数面板
    const tuneOpen = $('#btn-tune');
    if (tuneOpen) tuneOpen.onclick = openTune;
    const tClose = $('#tune-close');
    if (tClose) tClose.onclick = closeTune;
    const tReset = $('#tune-reset');
    if (tReset) tReset.onclick = resetAllVec;
    const tExport = $('#tune-export');
    if (tExport) tExport.onclick = exportVec;
    const tuneEl = $('#tune');
    if (tuneEl) tuneEl.onclick = (ev) => { if (ev.target === tuneEl) closeTune(); };
    const tuneBody = $('#tune-body');
    if (tuneBody) {
      tuneBody.addEventListener('input', (ev) => {
        const t = ev.target;
        if (t && t.dataset && t.dataset.agent && t.dataset.key) setVec(t.dataset.agent, t.dataset.key, t.value);
      });
      tuneBody.addEventListener('change', (ev) => {
        const t = ev.target;
        if (t && t.dataset && t.dataset.agent && t.dataset.key) {
          const a = E.agent(t.dataset.agent);
          if (a) t.value = a.vec[t.dataset.key]; // 越界/半档在这里归位显示
        }
      });
      tuneBody.addEventListener('click', (ev) => {
        const t = ev.target.closest ? ev.target.closest('[data-reset-agent]') : null;
        if (t) resetAgentVec(t.dataset.resetAgent);
      });
    }
    // 战术面板：自建组合拳
    const tkOpen = $('#btn-tactics');
    if (tkOpen) tkOpen.onclick = openTactics;
    const tkClose = $('#tactics-close');
    if (tkClose) tkClose.onclick = closeTactics;
    const tkNew = $('#tactic-new');
    if (tkNew) tkNew.onclick = newTactic;
    const tkExp = $('#tactics-export');
    if (tkExp) tkExp.onclick = exportTactics;
    const tkImp = $('#tactics-import');
    if (tkImp) tkImp.onclick = importTactics;
    const tkEl = $('#tactics');
    if (tkEl) tkEl.onclick = (ev) => { if (ev.target === tkEl) closeTactics(); };

    const tkList = $('#tactics-list');
    if (tkList) {
      tkList.addEventListener('click', (ev) => {
        const e = ev.target.closest('[data-edit-tactic]');
        if (e) { editTactic(e.dataset.editTactic); return; }
        const d = ev.target.closest('[data-del-tactic]');
        if (d) delTactic(d.dataset.delTactic);
      });
    }

    const tkEd = $('#tactic-editor');
    if (tkEd) {
      // 换了英雄就把他/她的技能重新列一遍（保证"技能名一字不差"这个约束）
      tkEd.addEventListener('change', (ev) => {
        const t = ev.target;
        if (!t.classList || !t.classList.contains('s-agent')) return;
        const row = t.closest('.step-ed');
        const sel = row && row.querySelector('.s-ability');
        if (sel) sel.innerHTML = abilityOptions(t.value, '');
      });
      tkEd.addEventListener('click', (ev) => {
        if (ev.target.id === 'tf-add-step') {
          const box = $('#tf-steps');
          if (box) box.insertAdjacentHTML('beforeend', stepRowHTML({ t: 0 }));
          return;
        }
        if (ev.target.id === 'tf-save') { saveTactic(); return; }
        if (ev.target.id === 'tf-cancel') { tacticDraft = null; renderTactics(); return; }
        const del = ev.target.closest('.s-del');
        if (del) {
          const row = del.closest('.step-ed');
          const box = $('#tf-steps');
          if (row && box && box.children.length > 1) { row.remove(); return; }
          flash('至少留一步');
        }
      });
    }

    // 组合拳卡片上的「编辑 / 删除」
    const comboBox = $('#combos');
    if (comboBox) {
      comboBox.addEventListener('click', (ev) => {
        const e = ev.target.closest('[data-edit-tactic]');
        if (e) { openTactics(); editTactic(e.dataset.editTactic); return; }
        const d = ev.target.closest('[data-del-tactic]');
        if (d) delTactic(d.dataset.delTactic);
      });
    }
    window.addEventListener('vd:tactics', () => { if (tacticDraft === null) renderTactics(); });

    const pre = $('#ai-preset');
    if (pre) {
      pre.onchange = () => {
        const o = pre.options[pre.selectedIndex];
        if (!o || !o.dataset.url) return;
        $('#ai-url').value = o.dataset.url;
        $('#ai-model').value = o.dataset.model;
      };
    }
    const testBtn = $('#ai-test');
    if (testBtn) {
      testBtn.onclick = () => {
        // 先把当前输入框里的值应用上，再测——不然测的还是旧配置
        saveAIConf({
          url: $('#ai-url').value.trim(),
          model: $('#ai-model').value.trim(),
          key: $('#ai-key').value.trim()
        });
        testConn();
      };
    }
    $('#ai-save').onclick = () => {
      const ok = saveAIConf({
        url: $('#ai-url').value.trim(),
        model: $('#ai-model').value.trim(),
        key: $('#ai-key').value.trim()
      });
      if (!ok) {
        flash('已生效（本页有效；浏览器不允许存盘，刷新后需重填）');
      } else {
        flash('已保存');
      }
      closeDrawer();
    };
    $('#btn-clear').onclick = () => { state.comp = []; refresh(); };
    $('#btn-preset').onclick = () => {
      // 两边各给一套"能同时命中 2 条组合拳"的阵容，用来快速看效果
      state.comp = state.side === 'defend'
        ? ['killjoy', 'cypher', 'sova', 'breach', 'jett']
        : ['brimstone', 'sova', 'jett', 'gekko', 'clove'];
      refresh();
    };
    document.querySelectorAll('[data-side]').forEach(b => {
      b.onclick = () => { state.side = b.dataset.side; refresh(); };
    });

    refresh();
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
