/* ============================================================
   星屿王国 · 礼包码兑换（独立模块 · ponytail MVP）
   内置礼包码 · 一键兑换 · 防重复 · 复用 hn- 样式与拖拽
   纯前端 · 防御式接入现有 S / MATS / save / toast
   ============================================================ */
(function(){
'use strict';
if(window.GIFT) return;                 // 防重复加载
window.GIFT = {};

/* ---------- 礼包码库（可随时新增） ---------- */
// ponytail: 单机无后端，礼包码内置；后续联网版可改为服务器校验
const GIFTCODES = {
  'XINGYU888': { n:'新手启程礼包', gold:8888, gem:88, items:{'小麦':20,'铜矿':10}, d:'欢迎来到星屿王国，愿星辉指引你前行！' },
  'STAR2026':  { n:'星屿冒险礼包', gold:6666, gem:66, items:{'木材':30,'铁矿石':15}, d:'星屿冒险者的专属馈赠。' }
};

/* ---------- 工具 ---------- */
function S_(){ return (typeof S!=='undefined') ? S : window.S; }
function toastMsg(msg, cls){ if(typeof window.toast==='function') window.toast(msg, cls||'good'); }
function matId(name){ if(typeof MATS!=='undefined'){ for(const k in MATS){ if(MATS[k].n===name) return k; } } return null; }
function fmt(n){ if(n==null) n=0; if(n>=1e9) return (n/1e9).toFixed(2).replace(/\.?0+$/,'')+'B'; if(n>=1e6) return (n/1e6).toFixed(2).replace(/\.?0+$/,'')+'M'; if(n>=1e4) return (n/1e4).toFixed(1).replace(/\.0$/,'')+'万'; return ''+Math.floor(n); }

/* ---------- 样式注入（深色金边，与功勋面板一致） ---------- */
if(!document.getElementById('gift-style')){
  const st=document.createElement('style'); st.id='gift-style';
  st.textContent =
    '#giftBtn{position:fixed;bottom:92px;right:10px;z-index:99996;width:44px;height:44px;border-radius:12px;border:1px solid #d3ab66;background:linear-gradient(160deg,#1a2030,#2b2f45);color:#ffd76a;font-size:20px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;user-select:none}'+
    '#giftBtn:active{transform:scale(.94)}'+
    '#giftPanel{position:fixed;top:200px;right:12px;z-index:99999;width:min(340px,92vw);max-height:calc(100vh - 240px);background:#171c29;border:1px solid #d3ab66;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.6);overflow:hidden;display:flex;flex-direction:column;font-size:13px;color:#dbe2f0;user-select:none}'+
    '#giftPanel .hn-hd{display:flex;align-items:center;padding:8px 10px;border-bottom:1px solid rgba(211,171,102,.4);background:linear-gradient(180deg,#1f2637,#171c29);cursor:grab}'+
    '#giftPanel .hn-hd b{flex:1;color:#ffd76a;font-size:14px}'+
    '#giftPanel .hn-x{border:0;background:none;color:#8fa0bd;font-size:16px;cursor:pointer;padding:2px 6px}'+
    '#giftPanel .hn-bd{padding:8px 10px;overflow:auto;flex:1}'+
    '#giftPanel .hn-tools{display:flex;gap:6px;padding:0 0 8px}'+
    '#giftPanel .hn-search{flex:1;background:#232a3a;color:#ffd76a;border:1px solid rgba(211,171,102,.4);border-radius:6px;font-size:12px;padding:5px 8px;min-width:0}'+
    '#giftPanel .hn-one{background:linear-gradient(180deg,#2b3147,#1c2231);color:#ffd76a;border:1px solid #d3ab66;border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;white-space:nowrap}'+
    '#giftPanel .hn-one:active{transform:scale(.95)}'+
    '#giftPanel .hn-note{font-size:10.5px;color:#8fa0bd;padding:2px 2px 6px;line-height:1.5}'+
    '#giftPanel .hn-row{display:flex;align-items:center;gap:6px;padding:7px 8px;background:rgba(0,0,0,.28);border:1px solid rgba(211,171,102,.22);border-radius:8px;margin-bottom:6px;flex-wrap:wrap}'+
    '#giftPanel .hn-nm{flex:1;min-width:0;font-weight:600;color:#ffd76a}'+
    '#giftPanel .hn-rw{font-size:10.5px;color:#9fe0a0;flex-basis:100%}'+
    '#giftPanel .hn-d{font-size:9.5px;color:#8fa0bd;flex-basis:100%}'+
    '#giftPanel .hn-row button{background:linear-gradient(180deg,#2b3147,#1c2231);color:#ffd76a;border:1px solid #d3ab66;border-radius:6px;padding:4px 10px;font-size:11.5px;cursor:pointer;white-space:nowrap}'+
    '#giftPanel .hn-row button.done{opacity:.5;cursor:default}'+
    '#giftPanel .hn-empty{text-align:center;color:#8fa0bd;padding:20px 0}';
  document.head.appendChild(st);
}

/* ---------- 拖拽（复用功勋面板同款） ---------- */
function drag(el, move){
  move = move || el;
  let sx=0,sy=0,ox=0,oy=0,on=false;
  el.addEventListener('pointerdown',e=>{
    if(e.target!==el && e.target.closest && e.target.closest('button,a')) return;
    on=true; sx=e.clientX; sy=e.clientY; ox=move.offsetLeft; oy=move.offsetTop;
    if(el.setPointerCapture){ try{ el.setPointerCapture(e.pointerId); }catch(_){} }
    e.preventDefault();
  });
  el.addEventListener('pointermove',e=>{ if(!on) return; move.style.left=(ox+e.clientX-sx)+'px'; move.style.top=(oy+e.clientY-sy)+'px'; });
  el.addEventListener('pointerup',()=>{ on=false; });
}

/* ---------- 兑换 ---------- */
function redeem(code){
  code=(code||'').trim().toUpperCase();
  const s=S_(); if(!s){ toastMsg('存档未就绪','bad'); return; }
  const c=GIFTCODES[code];
  if(!c){ toastMsg('礼包码无效','bad'); return; }
  if(!s.giftUsed) s.giftUsed={};
  if(s.giftUsed[code]){ toastMsg('该礼包码已使用','bad'); return; }
  if(c.gold) s.gold=(s.gold||0)+c.gold;
  if(c.gem) s.gem=(s.gem||0)+c.gem;
  if(!s.inv) s.inv={};
  const names=c.items||{};
  for(const nm in names){
    const id=matId(nm);
    if(id) s.inv[id]=(s.inv[id]||0)+names[nm];
  }
  s.giftUsed[code]=1;
  if(typeof save==='function') save();
  toastMsg('领取成功：'+c.n+'！');
  renderGifts();
}

/* ---------- 渲染 ---------- */
const btn=document.createElement('button');
btn.id='giftBtn'; btn.title='礼包'; btn.textContent='🎁';
document.body.appendChild(btn);

const panel=document.createElement('div');
panel.id='giftPanel'; panel.style.display='none';
panel.innerHTML =
  '<div class="hn-hd"><b>🎁 礼包兑换</b><button class="hn-x">×</button></div>'+
  '<div class="hn-bd">'+
    '<div class="hn-tools"><input class="hn-search" placeholder="输入礼包码…"><button class="hn-one">兑换</button></div>'+
    '<div class="hn-note">礼包码可通过官方渠道获取，每个礼包码仅可兑换一次。</div>'+
    '<div class="hn-list"></div>'+
  '</div>';
document.body.appendChild(panel);

/* ---------- 逻辑 ---------- */
function renderGifts(){
  const s=S_(); const list=panel.querySelector('.hn-list');
  const keys=Object.keys(GIFTCODES); const used=s&&s.giftUsed?s.giftUsed:{};
  if(!keys.length){ list.innerHTML='<div class="hn-empty">暂无可用礼包码</div>'; return; }
  list.innerHTML=keys.map(code=>{
    const c=GIFTCODES[code]; const isUsed=!!used[code];
    const rw=[];
    if(c.gold) rw.push('金币×'+fmt(c.gold));
    if(c.gem) rw.push('钻石×'+fmt(c.gem));
    for(const nm in (c.items||{})) rw.push(nm+'×'+c.items[nm]);
    return '<div class="hn-row">'+
      '<span class="hn-nm">'+code+'</span>'+
      '<button'+(isUsed?' class="done" disabled':'')+' data-code="'+code+'">'+(isUsed?'已领取':'领取')+'</button>'+
      '<span class="hn-rw">'+c.n+'：'+rw.join(' · ')+'</span>'+
      '<span class="hn-d">'+c.d+'</span>'+
    '</div>';
  }).join('');
  list.querySelectorAll('[data-code]').forEach(b=>{ b.onclick=()=>redeem(b.getAttribute('data-code')); });
}
btn.onclick=()=>{
  const show=panel.style.display==='none';
  panel.style.display=show?'flex':'none';
  if(show) renderGifts();
};
panel.querySelector('.hn-x').onclick=()=>{ panel.style.display='none'; };
panel.querySelector('.hn-one').onclick=()=>{
  const input=panel.querySelector('.hn-search');
  redeem(input.value); input.value='';
};
panel.querySelector('.hn-search').addEventListener('keydown',e=>{
  if(e.key==='Enter'){ panel.querySelector('.hn-one').click(); }
});
drag(btn);
drag(panel.querySelector('.hn-hd'), panel);
window.GIFT.redeem=redeem;  // 供调试/后续扩展
})();
