// ============================================================================
// 星屿王国 · 放置传说 —— 联网后端（零依赖：仅用 Node 内置模块）
// 运行：node server.js   （默认端口 3000，可用环境变量 PORT 覆盖）
// 数据：data/*.json（首次运行自动创建）
// 接口：
//   GET  /api/health             健康检查
//   POST /api/auth/guest         游客登录（设备码换 token）
//   POST /api/auth/taptap        TapTap 登录（预留：配置后启用）
//   POST /api/save               上传云存档（token + 存档 + 排行摘要）
//   GET  /api/save               下载云存档
//   GET  /api/rank               拉取排行榜 Top50
//   GET  /api/rank/detail?uid=   排行玩家详情（技能/装备/工具快照）
//   GET  /api/atlas              全服图鉴（物资/击杀/金币/死亡/交易聚合）
//   GET  /api/chat?after=<id>    增量拉取全服消息
//   POST /api/chat               发送全服消息
//   POST /api/heartbeat          心跳（刷新在线状态）
//   GET  /api/online             在线玩家数
// ============================================================================
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const MAX_SAVE_BYTES = 2 * 1024 * 1024;   // 存档上限 2MB
const MAX_CHAT_LEN = 120;                 // 单条消息长度
const CHAT_KEEP = 500;                    // 服务端保留消息条数
const RANK_KEEP = 100;                    // 排行保留玩家数
const HEARTBEAT_TTL = 90 * 1000;          // 在线判定：90 秒内心跳过

// ---- TapTap 开放平台配置（预留）-------------------------------------------
// 上架前在 TapTap 开放平台创建应用后填写，并启动回调域名，即可启用 TapTap 登录
const TAPTAP_APP_ID = process.env.TAPTAP_APP_ID || '';
const TAPTAP_APP_SECRET = process.env.TAPTAP_APP_SECRET || '';

// ---- 简易 JSON 存储 --------------------------------------------------------
function loadFile(name, def) {
  const p = path.join(DATA_DIR, name);
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { return def; }
}
function saveFile(name, obj) {
  const p = path.join(DATA_DIR, name);
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, p);
}
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
let users = loadFile('users.json', {});
let saves = loadFile('saves.json', {});
let chat = loadFile('chat.json', { messages: [] });

function persist() {
  saveFile('users.json', users);
  saveFile('saves.json', saves);
  saveFile('chat.json', chat);
}
// 限流简单记录：同一 token 每分钟最多 30 次写请求
const writeLimit = {};
function limited(uid) {
  const now = Date.now();
  const w = writeLimit[uid];
  if (!w || now - w.t > 60000) { writeLimit[uid] = { t: now, n: 1 }; return false; }
  w.n++;
  return w.n > 30;
}

function tokenOf(headers) {
  const h = headers['x-token'] || headers['x-access-token'];
  if (Array.isArray(h)) return h[0];
  return h;
}

// ---- 辅助 ----------------------------------------------------------------
function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Token, X-Access-Token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}
function readBody(req, cb) {
  let size = 0; const chunks = [];
  req.on('data', c => {
    size += c.length;
    if (size > MAX_SAVE_BYTES + 64 * 1024) { req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', () => {
    try { cb(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
    catch (e) { cb(null); }
  });
  req.on('error', () => cb(null));
}
function uidName(uid) {
  const u = users[uid];
  return u ? (u.name || '冒险者') : '冒险者';
}
function safeText(s) {
  return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, MAX_CHAT_LEN);
}

// ---- 路由 -----------------------------------------------------------------
const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { sendJson(res, 204, {}); return; }
  const url = (req.url || '').split('?')[0];
  const q = new URLSearchParams((req.url || '').split('?')[1] || '');
  const headers = req.headers;

  if (req.method === 'GET' && url === '/api/health') {
    return sendJson(res, 200, { ok: true, t: Date.now(), online: onlineCount() });
  }
  if (req.method === 'GET' && url === '/api/online') {
    return sendJson(res, 200, { online: onlineCount() });
  }

  // ---- 公开读接口（无需登录）----
  // 排行榜
  if (req.method === 'GET' && url === '/api/rank') {
    const rows = Object.keys(saves)
      .filter(k => users[k])
      .map(k => ({ uid: k, name: saves[k].summary.name, power: saves[k].summary.power, lvl: saves[k].summary.lvl, av: saves[k].summary.av, updatedAt: saves[k].updatedAt }))
      .sort((a, b) => b.power - a.power || b.lvl - a.lvl)
      .slice(0, 50);
    return sendJson(res, 200, { rows });
  }

  // 排行玩家详情（公开）：技能 / 已装备装备 / 已装备工具 快照
  if (req.method === 'GET' && url === '/api/rank/detail') {
    const pu = q.get('uid');
    const rec = saves[pu];
    if (!rec || !users[pu]) return sendJson(res, 404, { error: 'no such player' });
    const sv = rec.save || {};
    return sendJson(res, 200, {
      uid: pu,
      name: rec.summary.name,
      power: rec.summary.power,
      lvl: rec.summary.lvl,
      av: rec.summary.av,
      skills: sv.skills || {},
      equipped: sv.equipped || {},
      updatedAt: rec.updatedAt
    });
  }

  // 全服图鉴（公开）：本服全体玩家累计物资 / 击杀分类 / 金币 / 死亡 / 交易
  if (req.method === 'GET' && url === '/api/atlas') {
    const got = {}, kills = {};
    let players = 0, totalKills = 0, totalGold = 0, deaths = 0, trades = 0;
    for (const k in saves) {
      const sv = saves[k].save || {};
      const st = sv.stats || {};
      players++;
      const g = st.got || {};
      for (const key in g) {
        const v = Number(g[key]) || 0;
        if (v) got[key] = (got[key] || 0) + v;
      }
      const kl = st.kills || {};
      for (const mid in kl) {
        const v = Number(kl[mid]) || 0;
        if (v) kills[mid] = (kills[mid] || 0) + v;
      }
      totalKills += Number(st.totalKills) || 0;
      totalGold += Number(st.totalGold) || 0;
      deaths += Number(st.deaths) || 0;
      trades += Number(st.trades) || 0;
    }
    return sendJson(res, 200, {
      players, got, kills,
      totalKills: Math.round(totalKills),
      totalGold: Math.round(totalGold),
      deaths, trades, updatedAt: Date.now()
    });
  }

  // 聊天：增量拉取（after = 上一条已见消息 id）
  if (req.method === 'GET' && url === '/api/chat') {
    const after = parseInt(q.get('after') || '0', 10) || 0;
    const msgs = chat.messages.filter(m => m.id > after).slice(-100);
    return sendJson(res, 200, { messages: msgs });
  }

  // 游客登录：deviceId -> token
  if (req.method === 'POST' && url === '/api/auth/guest') {
    return readBody(req, body => {
      if (!body || !body.deviceId) return sendJson(res, 400, { error: 'missing deviceId' });
      const dev = String(body.deviceId).slice(0, 64);
      // 同一设备复用已有账号
      let uid = Object.keys(users).find(k => users[k].device === dev);
      if (!uid) {
        uid = crypto.randomBytes(12).toString('hex');
        const guest = '星屿冒险者' + Math.floor(Math.random() * 9000 + 1000);
        users[uid] = { device: dev, name: guest, createdAt: Date.now(), lastSeen: Date.now(), guest: true };
      } else {
        users[uid].lastSeen = Date.now();
      }
      persist();
      return sendJson(res, 200, { token: uid, name: users[uid].name, guest: true, taptapEnabled: !!TAPTAP_APP_ID });
    });
  }

  // TapTap 登录（预留）：接入开放平台后，前端用 code 换取会话
  if (req.method === 'POST' && url === '/api/auth/taptap') {
    return readBody(req, body => {
      if (!TAPTAP_APP_ID) return sendJson(res, 503, { error: 'TapTap 登录未配置', hint: '请在开放平台创建应用并设置 TAPTAP_APP_ID/TAPTAP_APP_SECRET' });
      if (!body || !body.code) return sendJson(res, 400, { error: 'missing code' });
      // TODO(上架前)：以 code + appid + secret 调 TapTap OAuth 换取 openid，再映射/创建本地账号
      // 参考：POST https://developer.taptap.cn/oauth/...（以开放平台文档为准）
      return sendJson(res, 501, { error: 'TapTap 接入点已预留，需配置开放平台凭证后启用' });
    });
  }

  const uid = tokenOf(headers);
  if (!uid) return sendJson(res, 401, { error: 'missing token' });
  if (!users[uid]) return sendJson(res, 401, { error: 'invalid token' });
  if (req.method === 'POST' && url === '/api/save') {
    if (limited(uid)) return sendJson(res, 429, { error: 'too many requests' });
    return readBody(req, body => {
      if (!body || !body.save) return sendJson(res, 400, { error: 'missing save' });
      const s = JSON.stringify(body.save);
      if (Buffer.byteLength(s) > MAX_SAVE_BYTES) return sendJson(res, 413, { error: 'save too large' });
      const summary = {
        name: safeText((body.summary && body.summary.name) || users[uid].name),
        power: Math.max(0, Math.round(Number((body.summary && body.summary.power) || 0))),
        lvl: Math.max(1, Math.round(Number((body.summary && body.summary.lvl) || 1))),
        av: Math.max(0, Math.round(Number((body.summary && body.summary.av) || 0))),
      };
      if (summary.name) users[uid].name = summary.name;
      saves[uid] = { save: body.save, summary, updatedAt: Date.now() };
      users[uid].lastSeen = Date.now();
      persist();
      return sendJson(res, 200, { ok: true, updatedAt: saves[uid].updatedAt });
    });
  }

  // 云存档：下载
  if (req.method === 'GET' && url === '/api/save') {
    const s = saves[uid];
    if (!s) return sendJson(res, 404, { error: 'no cloud save' });
    users[uid].lastSeen = Date.now();
    persist();
    return sendJson(res, 200, { save: s.save, summary: s.summary, updatedAt: s.updatedAt });
  }

  // 聊天：发送
  if (req.method === 'POST' && url === '/api/chat') {
    if (limited(uid)) return sendJson(res, 429, { error: 'too many requests' });
    return readBody(req, body => {
      const text = safeText(body && body.text);
      if (!text) return sendJson(res, 400, { error: 'empty message' });
      users[uid].lastSeen = Date.now();
      const id = (chat.messages[chat.messages.length - 1] || { id: 0 }).id + 1;
      chat.messages.push({ id, uid, name: uidName(uid), text, ts: Date.now() });
      if (chat.messages.length > CHAT_KEEP) chat.messages = chat.messages.slice(-CHAT_KEEP);
      persist();
      return sendJson(res, 200, { id });
    });
  }

  // 心跳
  if (req.method === 'POST' && url === '/api/heartbeat') {
    users[uid].lastSeen = Date.now();
    persist();
    return sendJson(res, 200, { ok: true, online: onlineCount() });
  }

  return sendJson(res, 404, { error: 'not found' });
});

function onlineCount() {
  const now = Date.now();
  return Object.keys(users).filter(k => now - (users[k].lastSeen || 0) < HEARTBEAT_TTL).length;
}

server.listen(PORT, () => {
  console.log('[星屿王国联网后端] 已启动: http://localhost:' + PORT);
  console.log('  数据目录: ' + DATA_DIR);
  console.log('  TapTap 登录: ' + (TAPTAP_APP_ID ? '已配置' : '未配置（游客模式可用）'));
});
