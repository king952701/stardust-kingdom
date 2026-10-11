/* ============================================================
   星屿王国 · 娱乐悬浮面板（独立模块 · ponytail MVP）
   赛车 / 老虎机 可玩 · 连连看 / 五子棋 / 斗地主 敬请期待
   纯前端 · 单机 AI · 不依赖现有游戏内部实现（金币防御式接入）
   ============================================================ */
(function(){
'use strict';
if(window.ENT) return;                 // 防重复加载
window.ENT = {};

/* ---------- 金币：有主存档就用主存档金币，否则内部钱包 ---------- */
function wallet(){ const s=(typeof S!=='undefined')?S:window.S; return (s && typeof s.gold==='number') ? s : null; }
function fmt(n){ n=Math.floor(n); return n>=1e8?(n/1e8).toFixed(1)+'亿':n>=1e4?(n/1e4).toFixed(1)+'万':String(n); }
function addG(n){ const s=wallet(); if(s){ if(window.addGold) addGold(s,n); else s.gold+=n; } else window.ENT.bank=(window.ENT.bank||0)+n; }
function takeG(n){ const s=wallet(); if(s){ if(s.gold<n) return false; s.gold-=n; return true; } if((window.ENT.bank||0)<n) return false; window.ENT.bank-=n; return true; }
function goldTxt(){ const s=wallet(); return fmt(s?s.gold:(window.ENT.bank||0)); }

/* ---------- 通用 Canvas 容器（两个游戏复用） ---------- */
function mkCanvas(w,h){
  const c=document.createElement('canvas');
  c.width=w; c.height=h;
  c.style.cssText='display:block;margin:8px auto;background:#10141c;border:1px solid #d3ab66;border-radius:8px;touch-action:none;';
  return c;
}

/* ---------- 拖拽（按钮/面板标题栏通用；move 指定实际移动的元素） ---------- */
function drag(el, move){
  move = move || el;
  let sx=0,sy=0,ox=0,oy=0,on=false;
  el.addEventListener('pointerdown',e=>{ if(e.target!==el && e.target.closest&&e.target.closest('button,a')) return; on=true; sx=e.clientX; sy=e.clientY; ox=move.offsetLeft; oy=move.offsetTop; if(el.setPointerCapture){ try{ el.setPointerCapture(e.pointerId); }catch(_){} } e.preventDefault(); });
  el.addEventListener('pointermove',e=>{ if(!on) return; move.style.left=(ox+e.clientX-sx)+'px'; move.style.top=(oy+e.clientY-sy)+'px'; });
  el.addEventListener('pointerup',()=>{ on=false; });
}

/* ---------- 样式注入（深色金边，与现有暗黑风一致） ---------- */
if(!document.getElementById('ent-style')){
  const st=document.createElement('style'); st.id='ent-style';
  st.textContent =
    '#entBtn{position:fixed;top:84px;right:10px;z-index:99998;width:44px;height:44px;border-radius:12px;border:1px solid #d3ab66;background:linear-gradient(160deg,#1a2030,#2b2f45);color:#ffd76a;font-size:20px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;user-select:none;}'+
    '#entBtn:active{transform:scale(.94)}'+
    '#entPanel{position:fixed;top:140px;right:12px;z-index:99999;width:300px;max-width:96vw;max-height:calc(100vh - 170px);background:#171c29;border:1px solid #d3ab66;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.6);overflow:hidden;display:flex;flex-direction:column;font-size:13px;color:#dbe2f0;user-select:none;}'+
    '#entPanel .ent-hd{display:flex;align-items:center;padding:8px 10px;border-bottom:1px solid rgba(211,171,102,.4);background:linear-gradient(180deg,#1f2637,#171c29);cursor:grab;}'+
    '#entPanel .ent-hd b{flex:1;color:#ffd76a;font-size:14px}'+
    '#entPanel .ent-w{font-size:11px;color:#8fa0bd;margin-right:6px}'+
    '#entPanel .ent-x{border:0;background:none;color:#8fa0bd;font-size:16px;cursor:pointer;padding:2px 6px}'+
    '#entPanel .ent-bd{padding:8px;overflow:auto;flex:1}'+
    '#entPanel .ent-list{display:flex;flex-direction:column;gap:6px}'+
    '#entPanel .ent-item{display:flex;align-items:center;gap:8px;padding:9px 10px;background:rgba(0,0,0,.28);border:1px solid rgba(211,171,102,.25);border-radius:8px;cursor:pointer;}'+
    '#entPanel .ent-item:hover{border-color:#d3ab66}'+
    '#entPanel .ent-item .ic{font-size:18px}'+
    '#entPanel .ent-item .nm{flex:1}'+
    '#entPanel .ent-item .tg{font-size:10px;color:#8fa0bd}'+
    '#entPanel .ent-item.coming{opacity:.55;cursor:default}'+
    '#entPanel .ent-game{padding:4px}'+
    '#entPanel .ent-game h4{color:#ffd76a;margin:6px 0 4px;text-align:center;font-size:14px}'+
    '#entPanel .ent-game .row{display:flex;gap:6px;justify-content:center;margin:6px 0}'+
    '#entPanel .ent-game button{background:linear-gradient(180deg,#2b3147,#1c2231);color:#ffd76a;border:1px solid #d3ab66;border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer}'+
    '#entPanel .ent-game button:active{transform:scale(.95)}'+
    '#entPanel .ent-game canvas{max-width:100%;height:auto}'+
    '#entPanel .race-ctrl{display:flex;gap:6px;justify-content:center;margin:6px 0}'+
    '#entPanel .race-ctrl button{flex:1;padding:10px 0;font-size:14px;min-height:42px;touch-action:none}'+
    '#entPanel .ent-game .st{text-align:center;color:#ffd76a;font-size:12px;min-height:16px;margin:2px 0}'+
    '#entPanel .ent-game .keys{color:#8fa0bd;font-size:10px;text-align:center;margin-top:4px}'+
    '#entPanel .slot-reel{display:inline-block;width:52px;height:64px;line-height:64px;text-align:center;font-size:32px;background:#10141c;border:1px solid #d3ab66;border-radius:8px;margin:0 5px}'+
    '#entPanel .slots{text-align:center;margin:8px 0}'+
    '#entPanel .res{text-align:center;color:#ffd76a;font-size:13px;min-height:18px;margin:4px 0}'+
    '#entPanel .fruit-box{background:linear-gradient(180deg,#7a1f1f,#b5452a);border:1px solid #d3ab66;border-radius:10px;padding:8px;margin:4px 0}'+
    '#entPanel .fruit-box h4{color:#ffd76a;text-align:center;margin:2px 0 6px;font-size:15px;text-shadow:0 1px 2px #000}'+
    '#entPanel .f-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:3px;background:#2a120c;border:2px solid #d3ab66;border-radius:8px;padding:4px}'+
    '#entPanel .f-cell{height:32px;display:flex;align-items:center;justify-content:center;font-size:19px;background:#3d1b10;border:1px solid #6b3a20;border-radius:4px}'+
    '#entPanel .f-cell.win{background:#7a4a10;border-color:#ffd76a;box-shadow:0 0 6px #ffd76a}'+
    '#entPanel .f-odds{display:flex;gap:3px;justify-content:center;margin:6px 0;flex-wrap:wrap}'+
    '#entPanel .f-odds span{font-size:10px;color:#ffd76a;background:#2a120c;border:1px solid #6b3a20;border-radius:4px;padding:2px 4px;white-space:nowrap}'+
    '#entPanel .f-lines{text-align:center;color:#f0b9a0;font-size:10px;margin:2px 0}'+
    '#entPanel .f-lines b{color:#ffd76a}'+
    '#entPanel .ent-betrow{display:flex;gap:6px;align-items:center;justify-content:center;margin:6px 0}'+
    '#entPanel .ent-betlab{color:#8fa0bd;font-size:11px}'+
    '#entPanel .ent-bet{background:#232a3a;color:#ffd76a;border:1px solid #d3ab66;border-radius:6px;font-size:12px;padding:5px 4px}'+
    '#entPanel .ent-betcus{width:110px;background:#232a3a;color:#ffd76a;border:1px solid #d3ab66;border-radius:6px;font-size:12px;padding:5px 4px}'+
    '#entPanel .ent-go{background:linear-gradient(180deg,#ffd76a,#d3ab66);color:#10141c;font-weight:bold;border:1px solid #8a6d33;border-radius:8px;padding:6px 14px;font-size:13px;cursor:pointer}'+
    '#ent-jp{position:fixed;top:20%;left:50%;transform:translateX(-50%);z-index:99997;text-align:center;pointer-events:none}'+
    '#ent-jp .ent-jpt{font-size:30px;font-weight:bold;color:#ff4d4d;text-shadow:0 0 14px #ff4d4d,0 0 30px #ff9040;letter-spacing:6px;animation:jpIn .3s ease}'+
    '#ent-jp .ent-jpm{margin-top:8px;font-size:16px;color:#ffd76a;text-shadow:0 0 10px #ff9040;background:rgba(20,6,6,.72);border:1px solid #ff4d4d;border-radius:10px;padding:8px 18px;animation:jpIn .3s ease}'+
    '#ent-jp .ent-jpm b{color:#ff4d4d}'+
    '@keyframes jpIn{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}';
  document.head.appendChild(st);
}

/* ---------- DOM 骨架 ---------- */
const btn=document.createElement('button');
btn.id='entBtn'; btn.title='娱乐'; btn.textContent='🎮';
document.body.appendChild(btn);

const panel=document.createElement('div');
panel.id='entPanel'; panel.style.display='none';
panel.innerHTML =
  '<div class="ent-hd"><b>🎮 娱乐中心</b><span class="ent-w">金币 '+goldTxt()+'</span><button class="ent-x">×</button></div>'+
  '<div class="ent-bd">'+
    '<div class="ent-list">'+
      entItem('🏁','赛车','8 车竞速 · 金币奖励')+
      entItem('🎰','老虎机','图标跑灯 · 纯虚拟娱乐')+
      entItem('🎡','跑马灯','图标跑灯 · 纯虚拟娱乐')+
      entItem('🍎','水果机 777','777 图标 · 纯虚拟娱乐')+
      entItem('🀄','连连看 PK','敬请期待',1)+
      entItem('⚫','五子棋 PK','敬请期待',1)+
      entItem('🃏','斗地主','敬请期待',1)+
    '</div>'+
    '<div style="font-size:10.5px;color:#e8b45a;opacity:.85;padding:6px 10px 2px;line-height:1.5">⚠️ 本娱乐模块仅供休闲，使用游戏内虚拟金币，无任何现实货币价值，不可提现或兑换。</div>'+
    '<div class="ent-game" style="display:none"></div>'+
  '</div>';
document.body.appendChild(panel);

function entItem(ic,nm,tg,coming){
  return '<div class="ent-item'+(coming?' coming':'')+'" data-g="'+nm+'"><span class="ic">'+ic+'</span><span class="nm">'+nm+'</span><span class="tg">'+tg+'</span></div>';
}
drag(btn);
drag(panel.querySelector('.ent-hd'), panel);

function refreshWallet(){ const w=panel.querySelector('.ent-w'); if(w) w.textContent='金币 '+goldTxt(); }

/* ---------- 生命周期：切换/关闭时销毁当前小游戏（性能优先） ---------- */
let cleanup=null;
function closeGame(){ if(typeof cleanup==='function'){ cleanup(); cleanup=null; } }

const listView=panel.querySelector('.ent-list'), gameView=panel.querySelector('.ent-game');
function backList(){ closeGame(); gameView.style.display='none'; listView.style.display=''; refreshWallet(); }
window.ENT.back=backList;                 // 供独立小游戏模块（slot_machine.js）返回列表
window.ENT.setCleanup=fn=>{ cleanup=fn; }; // 供独立模块注册销毁钩子（关游戏时取消动画）

function openGame(name){
  closeGame();
  listView.style.display='none'; gameView.style.display='block'; gameView.innerHTML='';
  if(name==='赛车') raceGame(gameView);
  else if(name==='老虎机') slotGame(gameView);
  else if(name==='跑马灯') window.SlotMachine && window.SlotMachine.open(gameView);
  else if(name==='水果机 777') fruitGame(gameView);
  refreshWallet();
}

btn.addEventListener('click',()=>{
  const show=panel.style.display==='none';
  if(show){ refreshWallet(); }
  else { closePanel(); }   // ponytail: 收起面板即销毁游戏，避免后台空转
  panel.style.display=show?'':'none';
});
function closePanel(){ closeGame(); gameView.innerHTML=''; gameView.style.display='none'; listView.style.display=''; }
panel.querySelector('.ent-x').addEventListener('click',()=>{ closePanel(); panel.style.display='none'; });

panel.querySelectorAll('.ent-item').forEach(it=>{
  it.addEventListener('click',()=>{
    if(it.classList.contains('coming')) return;
    openGame(it.dataset.g);
  });
});

/* ============================================================
   赛车小游戏（MVP · 2D 车道 · 单机 AI）
   ============================================================ */
function raceGame(host){
  host.innerHTML='<h4>🏁 赛车 · 终点 1000m</h4>';
  const st=document.createElement('div'); st.className='st';
  const cv=mkCanvas(320,460), ctx=cv.getContext('2d');
  const keys=document.createElement('div'); keys.className='keys';
  keys.textContent='← → 换道 · 空格 氮气(10金币) · X 道具砸对手 · 手机点下方按钮';
  const ctrl=document.createElement('div'); ctrl.className='race-ctrl';
  ctrl.innerHTML='<button data-c="L">◀ 左移</button><button data-c="N">⚡氮气</button><button data-c="R">右移 ▶</button><button data-c="X">💥道具</button>';
  const row=document.createElement('div'); row.className='row';
  row.innerHTML='<button data-b="restart">重新开始</button><button data-b="back">返回列表</button>';
  host.appendChild(st); host.appendChild(cv); host.appendChild(keys); host.appendChild(ctrl); host.appendChild(row);
  row.querySelector('[data-b="back"]').onclick=backList;

  const W=320,H=460, LANES=[90,160,230];
  // ponytail: 车道切换而非连续横移，真要平滑移动再加插值
  let px=160, dist=0, coins=0, items=0, nitroT=0, over=false, last=performance.now();
  let ai=[], pick=[];
  const kd={}; let tL=0, tR=0;   // 触屏按键状态
  function kdH(e){ kd[e.code]=e.type==='keydown'; }
  addEventListener('keydown',kdH); addEventListener('keyup',kdH);
  function doLeft(){ px=LANES[Math.max(0,LANES.indexOf(px)-1)]; }
  function doRight(){ px=LANES[Math.min(LANES.length-1,LANES.indexOf(px)+1)]; }
  function doNitro(){ if(coins>=10){ coins-=10; nitroT=1.6; st.textContent='⚡ 氮气加速！'; } else st.textContent='金币不足 10，集满再加速'; }
  function doItem(){ if(items>0){ items--; const t=ai[Math.floor(Math.random()*ai.length)]; t.d=Math.max(-200,t.d-60); st.textContent='💥 道具命中对手！'; } else st.textContent='还没有道具（吃 ★ 获得）'; }
  ctrl.querySelectorAll('button').forEach(b=>{
    const c=b.dataset.c;
    if(c==='L'||c==='R'){
      b.addEventListener('pointerdown',e=>{ e.preventDefault(); if(c==='L') tL=1; else tR=1; });
      const up=()=>{ if(c==='L') tL=0; else tR=0; };
      b.addEventListener('pointerup',up); b.addEventListener('pointercancel',up); b.addEventListener('pointerleave',up);
    } else if(c==='N') b.addEventListener('click',doNitro);
    else b.addEventListener('click',doItem);
  });
  // ponytail: cleanup 持有销毁函数（cancel rAF + 移除按键监听），关游戏时调用
  let raf=0;
  cleanup=()=>{ cancelAnimationFrame(raf); removeEventListener('keydown',kdH); removeEventListener('keyup',kdH); };

  function reset(){
    dist=0; coins=0; items=0; nitroT=0; over=false; last=performance.now();
    ai=[]; pick=[];
    for(let i=0;i<7;i++) ai.push({x:LANES[i%3], d:-i*45, spd:150+Math.random()*70});
    st.textContent=''; frame(last);
  }
  row.querySelector('[data-b="restart"]').onclick=reset;

  function end(){
    over=true;
    const all=ai.map(a=>a.d).concat([dist]);
    all.sort((a,b)=>b-a);
    const rank=all.indexOf(dist)+1;
    if(rank===1){ addG(200); st.textContent='🏆 冠军！+200 金币'; }
    else st.textContent='第 '+rank+' 名 · 再跑一次试试';
    refreshWallet();
  }

  function frame(now){
    if(over) return;
    const dt=Math.min(.05,(now-last)/1000); last=now;
    if(kd['ArrowLeft']||tL) doLeft();
    if(kd['ArrowRight']||tR) doRight();
    let spd=190;
    if(nitroT>0){ nitroT-=dt; spd+=130; }
    if(kd['Space'] && coins>=10){ coins-=10; nitroT=1.6; }
    if(kd['KeyX'] && items>0){ items--; const t=ai[Math.floor(Math.random()*ai.length)]; t.d=Math.max(-200,t.d-60); st.textContent='💥 道具命中对手！'; }
    dist+=spd*dt;
    // 金币/道具刷出（世界 y：460 → 0 滚动）
    if(Math.random()<dt*0.5) pick.push({x:LANES[Math.floor(Math.random()*3)], y:470, kind:Math.random()<0.72?'coin':'item'});
    pick.forEach(p=>{ p.y-=spd*1.1*dt; });
    pick=pick.filter(p=>p.y>-20);
    // 吃到判定
    pick.forEach(p=>{
      if(!over && Math.abs(p.x-px)<24 && Math.abs(p.y-392)<28){
        if(p.kind==='coin'){ coins++; st.textContent='金币 '+coins+' / 10（集满可氮气）'; }
        else { items++; st.textContent='获得道具 ×'+items+'（按 X 使用）'; }
        p.dead=1;
      }
    });
    pick=pick.filter(p=>!p.dead);
    // AI 前进
    ai.forEach(a=>{ a.d+=a.spd*dt; if(Math.random()<dt*0.2) a.x=LANES[Math.floor(Math.random()*3)]; });
    if(dist>=1000){ end(); return; }
    draw();
    raf=requestAnimationFrame(frame);
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    // 路面
    ctx.fillStyle='#232a3a'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#3a4258';
    ctx.fillRect(LANES[0]-38,0,38,H); ctx.fillRect(LANES[1]-19,0,38,H); ctx.fillRect(LANES[2],0,38,H);
    // 车道分隔虚线（滚动）
    ctx.fillStyle='#8fa0bd';
    const off=(dist*2)%60;
    for(let y=-60+off;y<H;y+=60){ ctx.fillRect(124,y,4,28); ctx.fillRect(194,y,4,28); }
    // 前方 AI 车（只画在玩家前面的）
    ai.forEach(a=>{
      const dy=(a.d-dist)*1.5;
      if(dy>8 && dy<460){
        ctx.fillStyle='#c94f4f'; ctx.fillRect(a.x-16,392-dy,32,20);
        ctx.fillStyle='#8fd0ff'; ctx.fillRect(a.x-10,392-dy-4,20,5);
      }
    });
    // 金币/道具
    pick.forEach(p=>{
      ctx.fillStyle=p.kind==='coin'?'#ffd76a':'#6bd6ff';
      ctx.beginPath(); ctx.arc(p.x,p.y,9,0,7); ctx.fill();
      ctx.fillStyle='#10141c'; ctx.font='10px sans-serif'; ctx.textAlign='center';
      ctx.fillText(p.kind==='coin'?'$':'★',p.x,p.y+3);
    });
    // 玩家车
    ctx.fillStyle='#4fc36a'; ctx.fillRect(px-17,378,34,24);
    ctx.fillStyle='#b7ffc9'; ctx.fillRect(px-11,374,22,6);
    if(nitroT>0){ ctx.fillStyle='#6bd6ff'; ctx.font='11px sans-serif'; ctx.textAlign='center'; ctx.fillText('氮气加速中',px,470); }
    // 状态条
    ctx.fillStyle='#dbe2f0'; ctx.font='12px sans-serif'; ctx.textAlign='left';
    ctx.fillText('距离 '+(1000-dist|0)+'m',8,16);
    ctx.fillStyle='#ffd76a'; ctx.textAlign='right';
    ctx.fillText('💰'+coins+' · 💥'+items,312,16);
  }

  reset();
}

/* ============================================================
   通用下注金额下拉（10 / 100 / 1K / 10K / 1M / 自定义 1M~1B）
   ============================================================ */
// ponytail: 档位写死；自定义仅限 1M~1B（用户指定区间），非法值直接拒绝
const BET_OPTS = [[10,'10'],[100,'100'],[1000,'1K'],[10000,'10K'],[1000000,'1M']];
const BET_MIN = 1000000, BET_MAX = 1000000000;
function betSelect(){
  const wrap=document.createElement('div'); wrap.className='row ent-betrow';
  wrap.innerHTML='<label class="ent-betlab">下注</label><select class="ent-bet">'+
    BET_OPTS.map(o=>'<option value="'+o[0]+'">'+o[1]+(o[0]>=1000?'（'+fmt(o[0])+'）':'')+'</option>').join('')+
    '<option value="custom">自定义…</option></select>'+
    '<input class="ent-betcus" type="number" min="'+BET_MIN+'" max="'+BET_MAX+'" placeholder="'+fmt(BET_MIN)+' ~ '+fmt(BET_MAX)+'" style="display:none">';
  const sel=wrap.querySelector('.ent-bet'), cus=wrap.querySelector('.ent-betcus');
  sel.onchange=()=>{ cus.style.display = sel.value==='custom' ? '' : 'none'; };
  function get(){
    if(sel.value==='custom'){
      const v=Math.floor(+cus.value||0);
      if(v<BET_MIN || v>BET_MAX) return 0;
      return v;
    }
    return +sel.value;
  }
  return { wrap:wrap, get:get };
}
function betErr(){ return '自定义金额需在 '+fmt(BET_MIN)+' ~ '+fmt(BET_MAX)+' 之间'; }

/* ============================================================
   头奖全服通告：飘红三次 + 烟花 10 秒（含玩家姓名）
   ============================================================ */
// ponytail: 单机版"全服"= 屏幕公告 + 系统聊天；真联网版挂到 server 广播即可
function fireworkShow(sec){
  const cv=document.createElement('canvas'); cv.id='ent-fw';
  cv.style.cssText='position:fixed;inset:0;z-index:99996;pointer-events:none';
  document.body.appendChild(cv);
  const ctx=cv.getContext('2d');
  function size(){ cv.width=innerWidth; cv.height=innerHeight; }
  size(); addEventListener('resize', size);
  const ps=[];
  function boom(x,y){
    const n=60+Math.floor(Math.random()*40), hue=Math.floor(Math.random()*360);
    for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, v=2+Math.random()*5;
      ps.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:0.06+Math.random()*0.04,life:50+Math.random()*30,hue:hue}); }
  }
  const endT=Date.now()+sec*1000;
  for(let i=0;i<6;i++) setTimeout(()=>boom(Math.random()*cv.width, Math.random()*cv.height*0.5), i*350);
  function tick(){
    ctx.fillStyle='rgba(4,6,12,.16)'; ctx.fillRect(0,0,cv.width,cv.height);
    for(let i=ps.length-1;i>=0;i--){ const p=ps[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=p.g; p.life--;
      ctx.beginPath(); ctx.arc(p.x,p.y,1.6,0,Math.PI*2); ctx.fillStyle='hsla('+p.hue+',90%,60%,'+Math.min(1,p.life/40)+')'; ctx.fill();
      if(p.life<=0) ps.splice(i,1); }
    if(Date.now()<endT){ if(Math.random()<0.22) boom(Math.random()*cv.width, Math.random()*cv.height*0.6); requestAnimationFrame(tick); }
    else{ cv.remove(); removeEventListener('resize', size); }
  }
  requestAnimationFrame(tick);
}
function jackpotBanner(name, desc, win){
  const box=document.createElement('div'); box.id='ent-jp';
  box.innerHTML='<div class="ent-jpt">🎆 全服通告 🎆</div><div class="ent-jpm">恭喜玩家【'+name+'】'+desc+'，赢得 <b>'+fmt(win)+'</b> 金币！</div>';
  document.body.appendChild(box);
  let i=0;   // 飘红三次（显示→隐藏×3 轮）
  const iv=setInterval(()=>{ box.style.display = (i%2===0)?'':'none'; if(++i>=6){ clearInterval(iv); box.remove(); } }, 700);
  setTimeout(()=>{ if(box.isConnected) box.remove(); }, 12000);
  if(window.pushChat) pushChat(1, '🎆 全服通告：玩家【'+name+'】'+desc+'，赢得 '+fmt(win)+' 金币！🎆');
}
window.ENT.jackpot = function(win, desc){
  const name = (typeof playerName!=='undefined' && playerName) ? playerName : '星屿旅人';
  jackpotBanner(name, desc, win);
  fireworkShow(10);
};
window.ENT.betSelect = betSelect;   // 供独立小游戏模块（slot_machine.js）复用下注下拉

/* ============================================================
   老虎机 / 水果机 777（共用 mkSlots 引擎 · 赔率写死）
   ============================================================ */
function mkSlots(host, cfg){
  const ICONS=cfg.icons, bets=cfg.bets, special=cfg.special||null;
  host.innerHTML='<h4>'+cfg.title+'</h4><div style="font-size:10.5px;color:#e8b45a;opacity:.85;padding:0 2px 4px;line-height:1.5">⚠️ 纯虚拟娱乐玩法：使用游戏内金币，无任何现实货币价值，不可提现兑换。</div>';
  const wl=document.createElement('div'); wl.className='st'; wl.textContent='金币 '+goldTxt();
  const slots=document.createElement('div'); slots.className='slots';
  const reels=[0,1,2].map(()=>{ const d=document.createElement('span'); d.className='slot-reel'; d.textContent='❓'; slots.appendChild(d); return d; });
  const res=document.createElement('div'); res.className='res';
  const betsRow=document.createElement('div'); betsRow.className='row';
  let spinning=false, raf=0;   // ponytail: 动画期间防连点（防止重复扣金币）；raf 供 cleanup 取消
  const bs=betSelect(); betsRow.appendChild(bs.wrap);
  const go=document.createElement('button'); go.className='ent-go'; go.textContent='GO';
  go.onclick=()=>{ const b=bs.get(); if(b<=0){ res.textContent=betErr(); return; } spin(b); };
  betsRow.appendChild(go);
  const row=document.createElement('div'); row.className='row';
  row.innerHTML='<button data-b="back">返回列表</button>';
  host.appendChild(wl); host.appendChild(slots); host.appendChild(res); host.appendChild(betsRow); host.appendChild(row);
  row.querySelector('[data-b="back"]').onclick=backList;

  function spin(bet){
    if(spinning) return;
    if(!takeG(bet)){ res.textContent='金币不足'; return; }
    spinning=true;
    res.textContent='转动中…';
    // 旋转动画：rAF 驱动，随机闪动后三个滚轮依次停在最终图案（600/900/1200ms）
    // ponytail: rAF 渲染，setTimeout 兜底（低帧率/后台环境也能 1.8s 内出结果）
    const final=ICONS.map(()=>ICONS[Math.floor(Math.random()*ICONS.length)]);
    const stops=[600,900,1200], t0=performance.now();
    let doneT=0, finished=0;
    function finish(){
      if(finished) return; finished=1;
      clearTimeout(doneT); cancelAnimationFrame(raf);
      reels.forEach((el,i)=>el.textContent=final[i]);   // 兜底也显示结果图案
      const same=new Set(final).size;
      // ponytail: 777 超级大奖（special 图案三同 ×100），普通三同 ×10，两同 ×2
      const allMul=(special && final[0]===special)?100:10;
      const win=same===1?bet*allMul:same===2?bet*2:0;
      if(win>0){
        addG(win);
        if(same===1) window.ENT.jackpot(win, cfg.title+'中头奖（三连 '+final[0]+' ×'+allMul+'）');
      }
      res.textContent=win>0?('🎉 中了！+'+win+' 金币'):('没中 · -'+bet+' 金币');
      wl.textContent='金币 '+goldTxt();
      refreshWallet();
      spinning=false;
    }
    function step(now){
      const t=now-t0;
      reels.forEach((el,i)=>{
        if(t>=stops[i]) el.textContent=final[i];
        else el.textContent=ICONS[Math.floor(Math.random()*ICONS.length)];
      });
      if(t>=stops[2]){ finish(); return; }
      raf=requestAnimationFrame(step);
    }
    doneT=setTimeout(finish, 1800);
    raf=requestAnimationFrame(step);
  }
  cleanup=()=>{ cancelAnimationFrame(raf); };
}
function slotGame(host){ mkSlots(host, { title:'🎰 老虎机', icons:['🍒','🍋','⭐','7️⃣','🔔'], bets:[10,50,100] }); }

/* ============================================================
   水果机 777（街机网格版 · 3×5 图案 · 三行中奖线 · 赔率栏）
   ============================================================ */
function fruitGame(host){
  // [图案, 权重%, 倍数]：7️⃣ 最稀有赔率最高，水果常见
  const P=[ ['7️⃣',4,100],['⭐',7,50],['🍇',10,30],['🍉',12,20],['🍊',15,15],['🍎',16,10],['🍋',17,5],['🔔',19,3] ];
  function rndIcon(){ let r=Math.random()*100; for(const p of P){ if(r<p[1]) return p[0]; r-=p[1]; } return '🍋'; }
  function oddOf(ic){ for(const p of P) if(p[0]===ic) return p[2]; return 0; }
  function judge(grid){
    // 3 条横线中奖：一行 5 全同 → 该图案赔率；≥4 同 → ×2 小奖；多行可叠加
    const wins=[];
    for(let r=0;r<3;r++){
      const cnt={}; grid[r].forEach(ic=>cnt[ic]=(cnt[ic]||0)+1);
      let best=null; for(const ic in cnt){ if(best===null||cnt[ic]>cnt[best]) best=ic; }
      const c=cnt[best], mul=oddOf(best);
      if(c>=5 && mul>0) wins.push({row:r, icon:best, mul});
      else if(c>=4) wins.push({row:r, icon:best, mul:2});
    }
    return wins;
  }
  host.innerHTML='<div class="fruit-box"><h4>🍎 水果机 777</h4><div style="font-size:10.5px;color:#e8b45a;opacity:.85;padding:2px 0 4px;line-height:1.5">⚠️ 纯虚拟娱乐玩法：使用游戏内金币，无任何现实货币价值，不可提现兑换。</div></div>';
  const wl=document.createElement('div'); wl.className='st'; wl.textContent='金币 '+goldTxt();
  const grid=document.createElement('div'); grid.className='f-grid';
  const cells=[];
  for(let i=0;i<15;i++){ const c=document.createElement('div'); c.className='f-cell'; c.textContent='❓'; grid.appendChild(c); cells.push(c); }
  const lines=document.createElement('div'); lines.className='f-lines';
  lines.innerHTML='中奖线：<b>上 · 中 · 下</b> 一行 5 同按赔率，4 同小奖 ×2';
  const odds=document.createElement('div'); odds.className='f-odds';
  P.forEach(p=>{ const s=document.createElement('span'); s.textContent=p[0]+'×'+p[2]; odds.appendChild(s); });
  const res=document.createElement('div'); res.className='res';
  const bets=document.createElement('div'); bets.className='row';
  const bs=betSelect(); bets.appendChild(bs.wrap);
  const go=document.createElement('button'); go.className='ent-go'; go.textContent='GO';
  go.onclick=()=>{ const b=bs.get(); if(b<=0){ res.textContent=betErr(); return; } spin(b); };
  bets.appendChild(go);
  let spinning=false, raf=0;   // ponytail: 防连点；raf 供 cleanup 取消
  const row=document.createElement('div'); row.className='row';
  row.innerHTML='<button data-b="back">返回列表</button>';
  host.appendChild(wl); host.appendChild(grid); host.appendChild(lines); host.appendChild(odds); host.appendChild(res); host.appendChild(bets); host.appendChild(row);
  row.querySelector('[data-b="back"]').onclick=backList;

  function spin(bet){
    if(spinning) return;
    if(!takeG(bet)){ res.textContent='金币不足'; return; }
    spinning=true;
    res.textContent='转动中…';
    cells.forEach(c=>c.classList.remove('win'));
    // 生成最终 3×5 网格
    const final=[];
    for(let r=0;r<3;r++){ final.push([]); for(let c=0;c<5;c++) final[r].push(rndIcon()); }
    // 旋转动画：5 列独立快速换图，从左到右依次停止（400+i*350ms）
    // ponytail: rAF 渲染 + setTimeout 兜底（低帧率/后台环境也能 2.6s 内出结果）
    const stops=[400,750,1100,1450,1800], t0=performance.now();
    let doneT=0, finished=0;
    function showFinal(){
      for(let r=0;r<3;r++) for(let c=0;c<5;c++) cells[r*5+c].textContent=final[r][c];
    }
    function finish(){
      if(finished) return; finished=1;
      clearTimeout(doneT); cancelAnimationFrame(raf);
      showFinal();
      const wins=judge(final);
      let total=0;
      wins.forEach(w=>{ total+=bet*w.mul; for(let c=0;c<5;c++) cells[w.row*5+c].classList.add('win'); });
      if(total>0){
        addG(total);
        if(wins.some(w=>w.mul>=100)) window.ENT.jackpot(total, '水果机 777 头奖（7️⃣ 满行 ×100）');
      }
      const names=wins.map(w=>('第'+(w.row===0?'上':w.row===1?'中':'下')+'行 '+w.icon+' ×'+w.mul)).join('、');
      res.textContent=total>0?('🎉 '+names+' · +'+total+' 金币'):('没中 · -'+bet+' 金币');
      wl.textContent='金币 '+goldTxt();
      refreshWallet();
      spinning=false;
    }
    function step(now){
      const t=now-t0;
      for(let c=0;c<5;c++){
        if(t>=stops[c]){ for(let r=0;r<3;r++) cells[r*5+c].textContent=final[r][c]; }
        else for(let r=0;r<3;r++) cells[r*5+c].textContent=rndIcon();
      }
      if(t>=stops[4]){ finish(); return; }
      raf=requestAnimationFrame(step);
    }
    doneT=setTimeout(finish, 2600);
    raf=requestAnimationFrame(step);
  }
  cleanup=()=>{ cancelAnimationFrame(raf); };
}
})();
