/* ============================================================
   云存档模块（Bmob REST API · ponytail MVP）
   国内直连，免费版够用
   ============================================================ */
(function(){
'use strict';
if(window.CloudSave) return;

const BMOB_APP_ID = '781648f16e1780758148d4693f8b78a3';
const BMOB_REST_KEY = '662d75cdd74d641dd8efc43b098c6c1e';
const BMOB_API = 'https://api.bmobcloud.com';

let sessionToken = null;
let currentObjectId = null;

// 初始化时恢复登录态（刷新/换设备免重新登录）
(function(){
  sessionToken = localStorage.getItem('stardust_token');
  currentObjectId = localStorage.getItem('stardust_user_id');
})();

async function call(method, path, body, needAuth){
  const headers = {
    'X-Bmob-Application-Id': BMOB_APP_ID,
    'X-Bmob-REST-API-Key': BMOB_REST_KEY,
    'Content-Type': 'application/json'
  };
  if(needAuth && sessionToken) headers['X-Bmob-Session-Token'] = sessionToken;

  const res = await fetch(BMOB_API + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(()=>null);
  if(!res.ok) throw new Error((data && data.error) || ('HTTP ' + res.status));
  return data;
}

// 按 owner 查找该用户的存档记录（换设备时自动恢复 saveId）
async function findSaveByOwner(){
  if(!currentObjectId) return null;
  try {
    const rows = await call('GET', '/1/classes/GameSave?where=' + encodeURIComponent(JSON.stringify({owner: currentObjectId})) + '&order=-updatedAt&limit=1', null, true);
    if(rows && rows.results && rows.results.length){
      localStorage.setItem('stardust_cloud_save_id', rows.results[0].objectId);
      return rows.results[0].objectId;
    }
  } catch(e){}
  return null;
}

/* ===== 用户认证 ===== */
async function signUp(username, password, email){
  const user = await call('POST', '/1/users', {
    username: username,
    password: password,
    email: email
  }, false);
  sessionToken = user.sessionToken;
  currentObjectId = user.objectId;
  localStorage.setItem('stardust_token', sessionToken);
  localStorage.setItem('stardust_user_id', currentObjectId);
  await findSaveByOwner();
  return { data: user, error: null };
}

async function signIn(username, password){
  const user = await call('POST', '/1/login', {
    username: username,
    password: password
  }, false);
  sessionToken = user.sessionToken;
  currentObjectId = user.objectId;
  localStorage.setItem('stardust_token', sessionToken);
  localStorage.setItem('stardust_user_id', currentObjectId);
  await findSaveByOwner();
  return { data: user, error: null };
}

async function signOut(){
  sessionToken = null;
  currentObjectId = null;
  localStorage.removeItem('stardust_token');
  localStorage.removeItem('stardust_user_id');
  localStorage.removeItem('stardust_cloud_save_id');
}

/* ===== 云存档 =====
   存到 GameSave 表，每个用户一条（owner 关联用户）
   存档记录 id 存 localStorage('stardust_cloud_save_id')
   ============================================================ */
async function save(progress){
  if(!sessionToken) return { error: '未登录' };
  const p = Object.assign({}, progress);
  delete p.objectId; delete p.createdAt; delete p.updatedAt;
  const snap = getMetrics(p);  // 已验证快照
  let saveId = localStorage.getItem('stardust_cloud_save_id');
  try {
    if(saveId){
      await call('PUT', '/1/classes/GameSave/' + saveId, {
        progress: p,
        verified_snapshot: snap
      }, true);
    } else {
      // 本地没记录 id：先按 owner 查一次，有就复用，没有再新建
      const found = await findSaveByOwner();
      if(found){
        saveId = found;
        await call('PUT', '/1/classes/GameSave/' + saveId, { progress: p, verified_snapshot: snap }, true);
      } else {
        const created = await call('POST', '/1/classes/GameSave', {
          progress: p,
          verified_snapshot: snap,
          owner: currentObjectId
        }, true);
        localStorage.setItem('stardust_cloud_save_id', created.objectId);
      }
    }
    return { error: null };
  } catch(e){
    if(saveId && /not found/i.test(e.message)){
      localStorage.removeItem('stardust_cloud_save_id');
      return save(progress);
    }
    return { error: e.message };
  }
}

async function load(){
  if(!sessionToken) return { error: '未登录', data: null };
  let saveId = localStorage.getItem('stardust_cloud_save_id');
  if(!saveId){
    saveId = await findSaveByOwner();
    if(!saveId) return { error: null, data: null };
  }
  try {
    const row = await call('GET', '/1/classes/GameSave/' + saveId, null, true);
    return { error: null, data: row };
  } catch(e){
    return { error: e.message, data: null };
  }
}

/* ===== 数据防作弊校验 =====
   每次上传成功后记录"已验证快照"（关键数值基准）
   每 60s 对比本地 vs 快照：增幅离谱 → 判定被篡改 → 回滚本地到云端
   ============================================================ */
function getMetrics(save){
  if(!save) return {coins:0, level:1, gems:0};
  return {
    coins: save.coins || save.gold || save.money || 0,
    level: save.level || (save.combat && save.combat.level) || 1,
    gems: save.gems || save.diamonds || save.crystal || 0
  };
}

// 判断 60s 内增幅是否合理（阈值宽松，只挡明显作弊）
function isReasonable(before, after){
  if(!before) return true;
  if(after.level > before.level + 10) return false;        // 60s 最多升 10 级
  if(after.coins > before.coins * 100 && after.coins > before.coins + 100000) return false;  // 金币暴涨 100 倍且超 10 万
  if(after.gems > before.gems + 50) return false;         // 60s 钻石最多 +50
  return true;
}

async function verifyTick(){
  if(!sessionToken) return;
  const saveId = localStorage.getItem('stardust_cloud_save_id');
  if(!saveId) return;
  try {
    const row = await call('GET', '/1/classes/GameSave/' + saveId, null, true);
    const verified = row.verified_snapshot;
    if(!verified || !row.progress) return;
    const localRaw = localStorage.getItem('stardust_kingdom_v1');
    if(!localRaw) return;
    const localMetrics = getMetrics(JSON.parse(localRaw));
    if(!isReasonable(verified, localMetrics)){
      // 本地被篡改 → 回滚到云端版本
      localStorage.setItem('stardust_kingdom_v1', JSON.stringify(row.progress));
      if(window.toast) window.toast('检测到数据异常，已恢复云端进度', 'bad');
      setTimeout(function(){ location.reload(); }, 500);
    }
  } catch(e){}
}
setInterval(verifyTick, 60000);

// 心跳：每 30 秒更新 last_online，GM 面板据此判断在线状态
async function heartbeat(){
  if(!sessionToken || !currentObjectId) return;
  try {
    await call('PUT', '/1/users/' + currentObjectId, { last_online: Date.now() }, true);
  } catch(e){}
}
setInterval(heartbeat, 30000);
// 立即执行一次（登录后马上心跳）
setTimeout(heartbeat, 3000);

// 获取客户端 IP 并写入 User 表（GM 面板查看）
async function fetchAndSaveIp(){
  if(!sessionToken || !currentObjectId) return;
  try {
    const res = await fetch('https://myip.ipip.net/json');
    const data = await res.json();
    const ip = data.ip || (data.data && data.data.ip) || '未知';
    await call('PUT', '/1/users/' + currentObjectId, { ip: ip }, true);
  } catch(e){}
}
setTimeout(fetchAndSaveIp, 3000);

window.CloudSave = { signUp, signIn, signOut, save, load };

/* ===== 云端拍卖行（极简版，双端互通列表） =====
   AuctionItem 表：item_name / price / seller_name / seller_uid
   ============================================================ */
async function auctionPublish(itemName, price){
  if(!sessionToken) return { error: '未登录' };
  // 优先用存档里的角色名，其次邮箱
  let sellerName = '冒险者';
  try {
    const raw = localStorage.getItem('stardust_kingdom_v1');
    if(raw){
      const d = JSON.parse(raw);
      if(d.roleName) sellerName = d.roleName;
    }
  } catch(e){}
  if(sellerName === '冒险者') sellerName = localStorage.getItem('stardust_current_user') || '冒险者';
  try {
    await call('POST', '/1/classes/AuctionItem', {
      item_name: itemName,
      price: price,
      seller_name: sellerName,
      seller_uid: currentObjectId
    }, true);
    return { error: null };
  } catch(e){ return { error: e.message }; }
}

async function auctionList(){
  if(!sessionToken) return { error: '未登录', items: [] };
  try {
    const rows = await call('GET', '/1/classes/AuctionItem?limit=50&order=-createdAt', null, true);
    return { error: null, items: rows.results || [] };
  } catch(e){ return { error: e.message, items: [] }; }
}

async function auctionBuy(itemId, price){
  if(!sessionToken) return { error: '未登录' };
  try {
    await call('DELETE', '/1/classes/AuctionItem/' + itemId, null, true);
    return { error: null };
  } catch(e){ return { error: e.message }; }
}

window.CloudAuction = { publish: auctionPublish, list: auctionList, buy: auctionBuy };

/* ===== 云端邮箱（Mailbox 表：owner_uid / title / content / gold / gems / read / claimed） ===== */
// 拉取当前用户的云端邮件
async function mailList(){
  if(!sessionToken) return { error: '未登录', items: [] };
  try {
    const rows = await call('GET', '/1/classes/Mailbox?where=' + encodeURIComponent(JSON.stringify({owner_uid: currentObjectId, is_deleted: false})) + '&order=-createdAt&limit=50', null, true);
    return { error: null, items: rows.results || [] };
  } catch(e){ return { error: e.message, items: [] }; }
}
// 领取邮件附件（同步 read=true, claimed=true）
async function mailClaim(mailId){
  if(!sessionToken) return { error: '未登录' };
  try {
    await call('PUT', '/1/classes/Mailbox/' + mailId, { read: true, claimed: true }, true);
    return { error: null };
  } catch(e){ return { error: e.message }; }
}
// 删除邮件（软删除 is_deleted=true）
async function mailDelete(mailId){
  if(!sessionToken) return { error: '未登录' };
  try {
    await call('PUT', '/1/classes/Mailbox/' + mailId, { is_deleted: true }, true);
    return { error: null };
  } catch(e){ return { error: e.message }; }
}
// 发邮件（系统/其他玩家调用）
async function mailSend(toUid, title, content, gold, gems){
  if(!sessionToken) return { error: '未登录' };
  try {
    await call('POST', '/1/classes/Mailbox', {
      owner_uid: toUid,
      title: title,
      content: content,
      gold: gold || 0,
      gems: gems || 0,
      read: false,
      claimed: false,
      is_deleted: false
    }, true);
    return { error: null };
  } catch(e){ return { error: e.message }; }
}
window.CloudMail = { list: mailList, claim: mailClaim, delete: mailDelete, send: mailSend };

/* ===== 公会模块（Guild 表） ===== */
// 创建公会
async function guildCreate(name, notice){
  if(!sessionToken) return { error: '未登录' };
  try {
    const res = await call('POST', '/1/classes/Guild', {
      name: name,
      leader_uid: currentObjectId,
      notice: notice || '',
      level: 1,
      members: [currentObjectId],
      created_at: Date.now()
    }, true);
    return { error: null, guildId: res.objectId };
  } catch(e){ return { error: e.message }; }
}
// 公会列表
async function guildList(){
  if(!sessionToken) return { error: '未登录', items: [] };
  try {
    const rows = await call('GET', '/1/classes/Guild?limit=50&order=-created_at', null, true);
    return { error: null, items: rows.results || [] };
  } catch(e){ return { error: e.message, items: [] }; }
}
// 申请加入公会
async function guildApply(guildId){
  if(!sessionToken) return { error: '未登录' };
  try {
    await call('PUT', '/1/classes/Guild/' + guildId, {
      applicants: { __op: 'AddUnique', objects: [currentObjectId] }
    }, true);
    return { error: null };
  } catch(e){ return { error: e.message }; }
}
// 公会聊天列表
async function guildChatList(guildId){
  if(!sessionToken) return { error: '未登录', items: [] };
  try {
    const rows = await call('GET', '/1/classes/GuildChat?where=' + encodeURIComponent(JSON.stringify({guild_id: guildId})) + '&order=-created_at&limit=50', null, true);
    return { error: null, items: rows.results || [] };
  } catch(e){ return { error: e.message, items: [] }; }
}
// 发公会聊天
async function guildChatSend(guildId, content){
  if(!sessionToken) return { error: '未登录' };
  try {
    await call('POST', '/1/classes/GuildChat', {
      guild_id: guildId,
      uid: currentObjectId,
      content: content,
      created_at: Date.now()
    }, true);
    return { error: null };
  } catch(e){ return { error: e.message }; }
}
window.CloudGuild = { create: guildCreate, list: guildList, apply: guildApply, chatList: guildChatList, chatSend: guildChatSend,
  // 会长管理
  acceptApply: guildAcceptApply, rejectApply: guildRejectApply, kick: guildKick, editNotice: guildEditNotice, leave: guildLeave,
  // 仓库
  storageList: storageList, storageDeposit: storageDeposit, storageWithdraw: storageWithdraw, getContribution: getContribution,
  contributionList: contributionList };

// 拉某公会所有成员贡献（排行）
async function contributionList(guildId){
  if(!sessionToken) return { error: '未登录', items: [] };
  try {
    const rows = await call('GET', '/1/classes/GuildContribution?where=' + encodeURIComponent(JSON.stringify({guild_id: guildId})) + '&order=-points&limit=50', null, true);
    return { error: null, items: rows.results || [] };
  } catch(e){ return { error: e.message, items: [] }; }
}

/* ===== 公会仓库 ===== */
const ITEM_VALUE_MAP = {
  '铁剑': 10, '铁盾': 10, '铁头盔': 10, '铁甲': 15,
  '金剑': 50, '金盾': 50, '金头盔': 50, '金甲': 80,
  '钻剑': 200, '钻盾': 200, '钻头盔': 200, '钻甲': 300,
  '铁矿': 2, '银矿': 5, '金矿': 10, '钻石': 20,
  '生命药水': 5, '魔力药水': 5, '体力药水': 5
};
function getItemValue(name){ return ITEM_VALUE_MAP[name] || 1; }

// 会员等级每日仓库次数限制
const MEMBER_LIMITS = {
  '初级会员': 50,
  '中级会员': 120,
  '高级会员': 300,
  '传奇会员': 1400,
  '会长': Infinity // 无限制
};
// 检查今日仓库次数（简化：localStorage 记录）
function checkDailyStorageLimit(uid, memberLevel){
  const today = new Date().toDateString();
  const key = 'storage_' + today + '_' + uid;
  const used = parseInt(localStorage.getItem(key) || '0');
  const limit = MEMBER_LIMITS[memberLevel] || 50;
  if(used >= limit) return { ok: false, msg: '今日次数已用完（'+used+'/'+limit+'）' };
  return { ok: true, used: used, limit: limit };
}
// 记录一次仓库操作
function recordStorageUsage(uid){
  const today = new Date().toDateString();
  const key = 'storage_' + today + '_' + uid;
  const used = parseInt(localStorage.getItem(key) || '0');
  localStorage.setItem(key, String(used + 1));
}

async function storageList(guildId){
  if(!sessionToken) return { error: '未登录', items: [] };
  try {
    const rows = await call('GET', '/1/classes/GuildStorage?where=' + encodeURIComponent(JSON.stringify({guild_id: guildId})) + '&order=-created_at&limit=50', null, true);
    return { error: null, items: rows.results || [] };
  } catch(e){ return { error: e.message, items: [] }; }
}
async function storageDeposit(guildId, itemName){
  if(!sessionToken) return { error: '未登录' };
  const value = getItemValue(itemName);
  try {
    await call('POST', '/1/classes/GuildStorage', { guild_id: guildId, item_name: itemName, value: value, owner_uid: currentObjectId, created_at: Date.now() }, true);
    await addContribution(guildId, currentObjectId, value);
    return { error: null, value: value };
  } catch(e){ return { error: e.message }; }
}
async function storageWithdraw(guildId, storageId, itemName, created_at){
  if(!sessionToken) return { error: '未登录' };
  const cost = getItemValue(itemName) * 2;
  try {
    // 防刷：24小时冷静期（存入后 24 小时内不能取出）
    const HOUR = 3600000;
    if(created_at && Date.now() - created_at < 24 * HOUR){
      const remainH = Math.ceil((24*HOUR - (Date.now()-created_at))/HOUR);
      return { error: '存入未满 24 小时（还需 ' + remainH + ' 小时）' };
    }
    const myPoints = await getContribution(guildId, currentObjectId);
    if(myPoints < cost) return { error: '贡献点不足（需要 ' + cost + '）' };
    await addContribution(guildId, currentObjectId, -cost);
    await call('DELETE', '/1/classes/GuildStorage/' + storageId, null, true);
    return { error: null, cost: cost };
  } catch(e){ return { error: e.message }; }
}
async function addContribution(guildId, uid, delta){
  const rows = await call('GET', '/1/classes/GuildContribution?where=' + encodeURIComponent(JSON.stringify({guild_id: guildId, uid: uid})), null, true);
  const existing = (rows.results || [])[0];
  if(existing){
    await call('PUT', '/1/classes/GuildContribution/' + existing.objectId, { points: (existing.points||0) + delta }, true);
  } else {
    await call('POST', '/1/classes/GuildContribution', { guild_id: guildId, uid: uid, points: delta }, true);
  }
}
// 公会等级公式：0→1=100万，1→2=1000万，2→3=1亿，以此类推（10倍递增）
// 等级 = floor(log10(总贡献)) - 5（100万=6位=1级，1000万=7位=2级，1亿=8位=3级...）
function getGuildLevel(totalContribution){
  if(totalContribution < 1000000) return 0; // 100万以下 = 0级
  return Math.floor(Math.log10(totalContribution)) - 5;
}
// 升到下一级需要的总贡献
function getNextLevelRequire(level){
  return Math.pow(10, level + 6); // 1级=10^6=100万，2级=10^7=1000万...
}
async function getContribution(guildId, uid){
  try {
    const rows = await call('GET', '/1/classes/GuildContribution?where=' + encodeURIComponent(JSON.stringify({guild_id: guildId, uid: uid})), null, true);
    const existing = (rows.results || [])[0];
    return existing ? (existing.points || 0) : 0;
  } catch(e){ return 0; }
}

// 接受申请：从 applicants 移除 + 加入 members
async function guildAcceptApply(guildId, applyUid){
  if(!sessionToken) return { error: '未登录' };
  try {
    await call('PUT', '/1/classes/Guild/' + guildId, {
      applicants: { __op: 'Remove', objects: [applyUid] },
      members: { __op: 'AddUnique', objects: [applyUid] }
    }, true);
    return { error: null };
  } catch(e){ return { error: e.message }; }
}
// 拒绝申请：从 applicants 移除
async function guildRejectApply(guildId, applyUid){
  if(!sessionToken) return { error: '未登录' };
  try {
    await call('PUT', '/1/classes/Guild/' + guildId, {
      applicants: { __op: 'Remove', objects: [applyUid] }
    }, true);
    return { error: null };
  } catch(e){ return { error: e.message }; }
}
// 踢人：从 members 移除
async function guildKick(guildId, kickUid){
  if(!sessionToken) return { error: '未登录' };
  try {
    await call('PUT', '/1/classes/Guild/' + guildId, {
      members: { __op: 'Remove', objects: [kickUid] }
    }, true);
    return { error: null };
  } catch(e){ return { error: e.message }; }
}
// 改公告
async function guildEditNotice(guildId, notice){
  if(!sessionToken) return { error: '未登录' };
  try {
    await call('PUT', '/1/classes/Guild/' + guildId, { notice: notice }, true);
    return { error: null };
  } catch(e){ return { error: e.message }; }
}
// 退出公会：从 members 移除
async function guildLeave(guildId, leaveUid){
  if(!sessionToken) return { error: '未登录' };
  try {
    await call('PUT', '/1/classes/Guild/' + guildId, {
      members: { __op: 'Remove', objects: [leaveUid] }
    }, true);
    return { error: null };
  } catch(e){ return { error: e.message }; }
}
})();
