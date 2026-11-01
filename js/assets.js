/* 资产层：从 valorant-api.com 拉特工头像 / 职业图标 / 地图图，用来"丰富界面"
 * 原则：只做展示与档案，不参与任何打分；拉不到就自动降级成字母头像，页面照常可用。
 * 数据来自 https://valorant-api.com（社区维护，非 Riot 官方接口）。
 */
(function () {
  const VD = window.VD;
  if (!VD) return;

  const BASE = 'https://valorant-api.com/v1/';
  const CACHE_KEY = 'vd.assets.v1';
  const TTL = 7 * 24 * 3600 * 1000; // 7 天

  VD.assetReady = false;

  /* 技能描述里有 <debuffred> 这类富文本标签，剥掉 */
  function clean(s) {
    return String(s == null ? '' : s)
      .replace(/<[^>]+>/g, '')
      .replace(/\r\n|\n|\r/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (!p || !p.t || Date.now() - p.t > TTL) return null;
      return p;
    } catch (e) { return null; }
  }
  function writeCache(p) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(p)); } catch (e) { /* 存不下就算了 */ }
  }

  function apply(pack) {
    if (!pack || !pack.agents) return false;
    let hit = 0;
    VD.AGENTS.forEach(a => {
      const k = String(a.en || '').toLowerCase();
      if (pack.agents[k]) { a.asset = pack.agents[k]; hit++; }
    });
    VD.MAPS.forEach(m => {
      const k = String(m.en || '').toLowerCase();
      if (pack.maps && pack.maps[k]) m.asset = pack.maps[k];
    });
    if (!hit) return false;
    VD.assetReady = true;
    try { window.dispatchEvent(new Event('vd:assets')); } catch (e) {}
    return true;
  }

  function buildPack(enAgents, zhAgents, maps) {
    const zh = {};
    (zhAgents || []).forEach(z => { zh[z.uuid] = z; });

    const agents = {};
    (enAgents || []).forEach(e => {
      if (!e.isPlayableCharacter) return;
      const z = zh[e.uuid] || e; // 中文文本优先用 zh-CN 的
      agents[String(e.displayName || '').toLowerCase()] = {
        uuid: e.uuid,
        icon: e.displayIcon || '',
        full: e.fullPortraitV2 || e.fullPortrait || '',
        banner: e.background || '',
        roleIcon: (e.role || {}).displayIcon || '',
        roleDesc: clean((z.role || {}).description),
        desc: clean(z.description),
        abilities: (z.abilities || []).map(x => ({
          slot: x.slot,
          name: x.displayName,
          desc: clean(x.description),
          icon: x.displayIcon || ''
        }))
      };
    });

    const mapPack = {};
    (maps || []).forEach(m => {
      mapPack[String(m.displayName || '').toLowerCase()] = {
        uuid: m.uuid,
        splash: m.splash || '',
        listIcon: m.listViewIcon || '',
        icon: m.displayIcon || ''
      };
    });

    return { t: Date.now(), agents, maps: mapPack };
  }

  function get(url) {
    return fetch(url, { mode: 'cors' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => (j && j.data) || null)
      .catch(() => null);
  }

  function fetchAll() {
    return Promise.all([
      get(BASE + 'agents?isPlayableCharacter=true&language=en-US'),
      get(BASE + 'agents?isPlayableCharacter=true&language=zh-CN'),
      get(BASE + 'maps?language=en-US')
    ]).then(res => {
      const en = res[0], zh = res[1], maps = res[2];
      if (!en) return null; // 完全拉不到：保持字母头像
      return buildPack(en, zh || [], maps || []);
    });
  }

  function load() {
    const cached = readCache();
    if (cached && apply(cached)) return; // 有缓存立即生效
    fetchAll().then(pack => {
      if (!pack) return;
      if (!Object.keys(pack.agents).length) return;
      writeCache(pack);
      apply(pack);
    });
  }

  VD.assets = {
    agent(id) {
      const a = VD.AGENTS.filter(x => x.id === id)[0];
      return (a && a.asset) || null;
    },
    map(id) {
      const m = VD.MAPS.filter(x => x.id === id)[0];
      return (m && m.asset) || null;
    },
    reload: load
  };

  load();
})();
