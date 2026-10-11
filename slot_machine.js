/* ============================================================
   跑马灯老虎机（独立模块 · ponytail MVP）
   一圈图标蛇形高亮跑灯 → 停在某图标 → 押中按赔率赔
   金币接入现有存档（防御式）；由娱乐面板入口调用
   ============================================================ */
(function(){
'use strict';
if(window.SlotMachine) return;
window.SlotMachine = { open: open };

/* ===== 概率与赔率（写死，方便以后调平衡） ===== */
// ponytail: 概率写死，真要调平衡再做配置表
const ODDS = {
  '🍎': { label:'苹果', odd:3,  w:0.33 },
  '🔔': { label:'铃铛', odd:6,  w:0.25 },
  '⭐': { label:'星星', odd:8,  w:0.17 },
  '🎰': { label:'BAR',  odd:15, w:0.17 },
  '7️⃣': { label:'77',   odd:30, w:0.08 }
};
const GRID = ['🍎','🍎','🍎','🍎','🔔','🔔','🔔','⭐','⭐','🎰','🎰','7️⃣']; // 12 格，格子占比即出现概率
const SERP = [0,1,2,3,7,6,5,4,8,9,10,11]; // 蛇形高亮顺序（模拟跑马灯绕圈）
// ponytail: 用 3×4 网格 + 蛇形扫描模拟"一圈"跑马灯，真环形布局要做绝对定位再说
const BET = 10; // 默认每图标押注（下拉框可选 10/100/1K/10K/1M/自定义 1M~1B）
const BET_MIN = 1000000, BET_MAX = 1000000000;
function betErr(){ return '自定义金额需在 '+fmt(BET_MIN)+' ~ '+fmt(BET_MAX)+' 之间'; }

/* ---------- 金币（防御式：有主存档用主存档，否则面板内部钱包） ---------- */
function wallet(){ const s=(typeof S!=='undefined')?S:window.S; return (s&&typeof s.gold==='number')?s:null; }
function fmt(n){ n=Math.floor(n); return n>=1e8?(n/1e8).toFixed(1)+'亿':n>=1e4?(n/1e4).toFixed(1)+'万':String(n); }
function addG(n){ const s=wallet(); if(s){ if(window.addGold) addGold(s,n); else s.gold+=n; } else window.ENT.bank=(window.ENT.bank||0)+n; }
function takeG(n){ const s=wallet(); if(s){ if(s.gold<n) return false; s.gold-=n; return true; } if((window.ENT.bank||0)<n) return false; window.ENT.bank-=n; return true; }
function goldTxt(){ const s=wallet(); return fmt(s?s.gold:(window.ENT.bank||0)); }

/* ---------- 样式（纯色 · 与现有暗黑金边 UI 一致） ---------- */
if(!document.getElementById('sm-style')){
  const st=document.createElement('style'); st.id='sm-style';
  st.textContent =
    '#entPanel .sm-game{padding:4px}'+
    '#entPanel .sm-game h4{color:#ffd76a;margin:6px 0 4px;text-align:center;font-size:14px}'+
    '#entPanel .sm-info{display:flex;justify-content:space-between;background:rgba(0,0,0,.3);border:1px solid rgba(211,171,102,.35);border-radius:6px;padding:4px 8px;margin:4px 0;font-size:11px;color:#8fa0bd}'+
    '#entPanel .sm-info b{color:#ffd76a}'+
    '#entPanel .sm-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;background:#10141c;border:1px solid #d3ab66;border-radius:8px;padding:6px}'+
    '#entPanel .sm-cell{height:40px;display:flex;align-items:center;justify-content:center;font-size:22px;background:#232a3a;border:1px solid #3a4258;border-radius:6px}'+
    '#entPanel .sm-cell.on{background:#7a4a10;border-color:#ffd76a;box-shadow:0 0 8px #ffd76a}'+
    '#entPanel .sm-bets{display:flex;gap:4px;justify-content:center;margin:6px 0;flex-wrap:wrap}'+
    '#entPanel .sm-bet{font-size:12px;color:#dbe2f0;background:#232a3a;border:1px solid #3a4258;border-radius:6px;padding:5px 8px;cursor:pointer}'+
    '#entPanel .sm-bet.picked{color:#ffd76a;border-color:#d3ab66;background:#2b3147}'+
    '#entPanel .sm-go{display:block;width:86px;height:50px;margin:4px auto;font-size:17px;font-weight:bold;color:#10141c;background:linear-gradient(180deg,#ffd76a,#d3ab66);border:1px solid #8a6d33;border-radius:10px;cursor:pointer}'+
    '#entPanel .sm-go:disabled{opacity:.5;cursor:default}'+
    '#entPanel .sm-res{text-align:center;color:#ffd76a;font-size:13px;min-height:18px;margin:4px 0}'+
    '#entPanel .sm-row{display:flex;gap:6px;justify-content:center;margin:4px 0}'+
    '#entPanel .sm-row button{background:linear-gradient(180deg,#2b3147,#1c2231);color:#ffd76a;border:1px solid #d3ab66;border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer}';
  document.head.appendChild(st);
}

/* ============ 主入口 ============ */
function open(host){
  host.classList.add('sm-game');
  host.innerHTML='<h4>🎡 跑马灯老虎机</h4><div style="font-size:10.5px;color:#e8b45a;opacity:.85;padding:0 2px 4px;line-height:1.5">⚠️ 纯虚拟娱乐玩法：使用游戏内金币，无任何现实货币价值，不可提现兑换。</div>';
  const info=document.createElement('div'); info.className='sm-info';
  const grid=document.createElement('div'); grid.className='sm-grid';
  const cells=[];
  GRID.forEach((ic,i)=>{ const c=document.createElement('div'); c.className='sm-cell'; c.textContent=ic; c.dataset.i=i; grid.appendChild(c); cells.push(c); });
  const betRow=document.createElement('div'); betRow.className='row';
  const bs=(window.ENT && typeof ENT.betSelect==='function') ? ENT.betSelect() : null;
  if(bs) betRow.appendChild(bs.wrap);
  const betsRow=document.createElement('div'); betsRow.className='sm-bets';
  const betBtns={};
  Object.keys(ODDS).forEach(ic=>{
    const b=document.createElement('button'); b.className='sm-bet';
    b.textContent=ic+' ×'+ODDS[ic].odd; b.dataset.icon=ic;
    b.onclick=()=>toggle(ic);
    betsRow.appendChild(b); betBtns[ic]=b;
  });
  const go=document.createElement('button'); go.className='sm-go'; go.textContent='GO';
  const res=document.createElement('div'); res.className='sm-res';
  const row=document.createElement('div'); row.className='sm-row';
  row.innerHTML='<button data-b="back">返回列表</button>';
  host.appendChild(info); host.appendChild(betRow); host.appendChild(grid); host.appendChild(betsRow); host.appendChild(go); host.appendChild(res); host.appendChild(row);
  row.querySelector('[data-b="back"]').onclick=()=>{ if(window.ENT&&ENT.back) ENT.back(); };

  /* ---------- 状态 ---------- */
  const state={ bets:{}, spinning:false, cur:0, timer:0, bet:BET };
  function betCount(){ return Object.keys(state.bets).filter(k=>state.bets[k]).length; }
  function refreshInfo(win){
    info.innerHTML='余额 <b>'+goldTxt()+'</b> · 本局下注 <b>'+betCount()*state.bet+'</b> · 中奖 <b>'+(win||0)+'</b>';
  }
  refreshInfo(0);

  function toggle(ic){
    if(state.spinning) return;
    state.bets[ic]=!state.bets[ic];
    betBtns[ic].classList.toggle('picked', !!state.bets[ic]);
    refreshInfo();
  }

  function highlight(i){ cells.forEach((c,k)=>c.classList.toggle('on', k===i)); }

  /* 加权选图标（概率写死） */
  function pickIcon(){
    let r=Math.random();
    for(const ic in ODDS){ if(r<ODDS[ic].w) return ic; r-=ODDS[ic].w; }
    return '🍎';
  }

  function goSpin(){
    if(state.spinning) return;
    const n=betCount();
    if(n===0){ res.textContent='请先押注图标（点下面的图标按钮）'; return; }
    const bet = bs ? bs.get() : state.bet;
    if(bs && bet<=0){ res.textContent=betErr(); return; }
    state.bet=bet;
    if(!takeG(n*bet)){ res.textContent='金币不足'; return; }
    state.spinning=true; go.disabled=true;
    Object.keys(betBtns).forEach(k=>betBtns[k].style.pointerEvents='none');
    res.textContent='转动中…';
    refreshInfo();
    // 预选结果：按概率选图标 → 该图标随机格子 → 蛇形索引
    const icon=pickIcon();
    const pool=[]; GRID.forEach((g,i)=>{ if(g===icon) pool.push(i); });
    const targetIdx=SERP.indexOf(pool[Math.floor(Math.random()*pool.length)]);
    const curIdx=SERP.indexOf(state.cur);
    // 转 ≥2 圈后停在目标格
    const steps=24+((targetIdx-curIdx+12)%12);
    let i=0;
    const cancel=window.ENT&&ENT.setCleanup?ENT.setCleanup:()=>{};
    function tick(){
      state.cur=SERP[(curIdx+i+1)%12];
      highlight(state.cur);
      i++;
      if(i>=steps){ settle(icon); return; }
      const d=50+550*Math.pow(i/steps,2);   // ponytail: 平方缓动，先快后慢
      state.timer=setTimeout(tick, d);
    }
    cancel(()=>{ clearTimeout(state.timer); });
    state.timer=setTimeout(tick, 50);
  }

  function settle(icon){
    const won=!!state.bets[icon];
    const n=betCount();
    let win=0;
    if(won){ win=state.bet*ODDS[icon].odd; addG(win); if(icon==='7️⃣') window.ENT.jackpot(win, '跑马灯押中 77 头奖（×30）'); }
    // 停后闪两下提示
    let f=0;
    const fl=setInterval(()=>{
      f++;
      if(f%2) highlight(state.cur); else cells.forEach(c=>c.classList.remove('on'));
      if(f>=4){
        clearInterval(fl);
        if(won) highlight(state.cur);
        res.textContent=won?('🎉 押中 '+icon+'（'+ODDS[icon].label+'）！+'+win+' 金币'):('没押中 · -'+n*BET+' 金币');
        refreshInfo(win);
        state.spinning=false; go.disabled=false;
        Object.keys(betBtns).forEach(k=>betBtns[k].style.pointerEvents='');
      }
    },180);
  }

  go.onclick=goSpin;
}
})();
