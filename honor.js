/* ============================================================
   星屿王国 · 功勋系统（独立模块 · ponytail MVP）
   全道具贡献数据库 · 每道具多阶段提交领钻石 · 搜索 / 一键提交
   纯前端 · 防御式接入现有 S / MATS / addGem / toast
   ============================================================ */
(function(){
'use strict';
if(window.HONOR) return;                 // 防重复加载
window.HONOR = {};

/* ---------- 阶段配置：用户给定 4 阶 + 等比扩展（need×10 / reward×5，无上限） ----------
   ponytail: 扩展公式为等比递增，真要调平衡再改配置表 */
const STAGES = [
  {need:100,     reward:5},
  {need:1000,    reward:20},
  {need:100000,  reward:100},
  {need:1000000, reward:500}
];
function stageAt(i){
  if(i<STAGES.length) return STAGES[i];
  let need=STAGES[STAGES.length-1].need, reward=STAGES[STAGES.length-1].reward;
  for(let k=STAGES.length;k<=i;k++){ need*=10; reward*=5; }
  return {need:need, reward:reward};
}
/* ---------- 防御式接入 ---------- */
function gs(){ return (typeof S!=='undefined') ? S : window.S; }
function fmt(n){ n=Math.floor(n); return n>=1e8?(n/1e8).toFixed(1)+'亿':n>=1e4?(n/1e4).toFixed(1)+'万':String(n); }
function addGemTo(n){
  const s=gs(); if(!s || typeof s.gem!=='number') return false;
  if(typeof addGem==='function') addGem(s,n); else s.gem+=n;
  const r=document.getElementById('resGem');
  if(r && typeof Svg!=='undefined' && Svg.gem) r.innerHTML=Svg.gem+s.gem;
  return true;
}
function toastMsg(msg,cls){ if(typeof toast==='function') toast(msg,cls||'good'); }
function itemQualityColor(m){
  if(typeof qualityAt==='function' && m && m.t!=null){ const q=qualityAt(m.t); if(q && q.c) return q.c; }
  return '#dbe2f0';
}
/* ---------- 道具范围：MATS 材料库全部（排除货币/占位） ---------- */
function items(){
  return Object.keys(MATS||{}).filter(k=>{
    const m=MATS[k];
    return m && m.n && !m.noHonor && !['coin','gem','gold','diamond','honor'].includes(k) && m.cat!=='货币';
  });
}
function totalOf(id){ const s=gs(); return (s && s.inv) ? (s.inv[id]||0) : 0; }
function honorOf(id){ const s=gs(); if(!s.honor) s.honor={}; return s.honor[id]||0; }
function gotOf(id,k){ const s=gs(); if(!s.honorGot) s.honorGot={}; return !!s.honorGot[id+'_'+k]; }
function curStage(id){
  const h=honorOf(id); let k=0;
  while(stageAt(k).need<=h) k++;
  return k; // 当前未完成阶段下标
}

/* ---------- 样式注入（与娱乐面板一致的深色金边） ---------- */
if(!document.getElementById('honor-style')){
  const st=document.createElement('style'); st.id='honor-style';
  st.textContent =
    '#honorBtn{position:fixed;top:132px;right:10px;z-index:99996;width:44px;height:44px;border-radius:12px;border:1px solid #d3ab66;background:linear-gradient(160deg,#1a2030,#2b2f45);color:#ffd76a;font-size:20px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;user-select:none}'+
    '#honorBtn:active{transform:scale(.94)}'+
    '#honorPanel{position:fixed;top:180px;right:12px;z-index:99999;width:min(380px,94vw);max-height:calc(100vh - 210px);background:#171c29;border:1px solid #d3ab66;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.6);overflow:hidden;display:flex;flex-direction:column;font-size:13px;color:#dbe2f0;user-select:none}'+
    '#honorPanel .hn-hd{display:flex;align-items:center;padding:8px 10px;border-bottom:1px solid rgba(211,171,102,.4);background:linear-gradient(180deg,#1f2637,#171c29);cursor:grab}'+
    '#honorPanel .hn-hd b{flex:1;color:#ffd76a;font-size:14px}'+
    '#honorPanel .hn-gem{font-size:11px;color:#8fd0ff;margin-right:6px}'+
    '#honorPanel .hn-x{border:0;background:none;color:#8fa0bd;font-size:16px;cursor:pointer;padding:2px 6px}'+
    '#honorPanel .hn-tools{display:flex;gap:6px;padding:8px 10px;border-bottom:1px solid rgba(211,171,102,.2)}'+
    '#honorPanel .hn-search{flex:1;background:#232a3a;color:#ffd76a;border:1px solid rgba(211,171,102,.4);border-radius:6px;font-size:12px;padding:5px 8px;min-width:0}'+
    '#honorPanel .hn-one{background:linear-gradient(180deg,#2b3147,#1c2231);color:#ffd76a;border:1px solid #d3ab66;border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;white-space:nowrap}'+
    '#honorPanel .hn-one:active{transform:scale(.95)}'+
    '#honorPanel .hn-bd{padding:6px 8px;overflow:auto;flex:1}'+
    '#honorPanel .hn-note{font-size:10.5px;color:#8fa0bd;padding:2px 2px 6px;line-height:1.5}'+
    '#honorPanel .hn-row{display:flex;align-items:center;gap:6px;padding:7px 8px;background:rgba(0,0,0,.28);border:1px solid rgba(211,171,102,.22);border-radius:8px;margin-bottom:6px}'+
    '#honorPanel .hn-row .hn-nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}'+
    '#honorPanel .hn-row .hn-cat{font-size:9.5px;color:#8fa0bd;border:1px solid rgba(143,160,189,.35);border-radius:4px;padding:1px 4px;white-space:nowrap}'+
    '#honorPanel .hn-row .hn-have{font-size:11px;color:#9fe0a0;white-space:nowrap}'+
    '#honorPanel .hn-row .hn-stg{font-size:10px;color:#ffd76a;white-space:nowrap}'+
    '#honorPanel .hn-row button{background:linear-gradient(180deg,#2b3147,#1c2231);color:#ffd76a;border:1px solid #d3ab66;border-radius:6px;padding:4px 9px;font-size:11.5px;cursor:pointer;white-space:nowrap}'+
    '#honorPanel .hn-row button:active{transform:scale(.95)}'+
    '#honorPanel .hn-empty{text-align:center;color:#8fa0bd;padding:20px 0}'+
    '#honorItem{position:fixed;z-index:99999;width:min(340px,92vw);max-height:82vh;background:#171c29;border:1px solid #d3ab66;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.6);overflow:hidden;display:flex;flex-direction:column;font-size:13px;color:#dbe2f0;user-select:none}'+
    '#honorItem .hn-hd{display:flex;align-items:center;padding:8px 10px;border-bottom:1px solid rgba(211,171,102,.4);background:linear-gradient(180deg,#1f2637,#171c29);cursor:grab}'+
    '#honorItem .hn-hd b{flex:1;color:#ffd76a;font-size:14px}'+
    '#honorItem .hn-x{border:0;background:none;color:#8fa0bd;font-size:16px;cursor:pointer;padding:2px 6px}'+
    '#honorItem .hn-bd{padding:10px;overflow:auto;flex:1}'+
    '#honorItem .hn-info{color:#8fa0bd;font-size:11.5px;margin-bottom:8px;line-height:1.6}'+
    '#honorItem .hn-stgrow{border:1px solid rgba(211,171,102,.28);border-radius:8px;padding:8px;margin-bottom:8px;background:rgba(0,0,0,.22)}'+
    '#honorItem .hn-stgrow.done{border-color:rgba(159,224,160,.5);opacity:.75}'+
    '#honorItem .hn-stgrow.cur{border-color:#d3ab66;box-shadow:0 0 0 1px rgba(211,171,102,.25)}'+
    '#honorItem .hn-stgrow.lock{opacity:.45}'+
    '#honorItem .hn-stglab{display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:4px}'+
    '#honorItem .hn-stglab .rw{color:#8fd0ff}'+
    '#honorItem .hn-bar{height:8px;border-radius:4px;background:#0d1119;overflow:hidden;border:1px solid rgba(211,171,102,.25)}'+
    '#honorItem .hn-bar i{display:block;height:100%;background:linear-gradient(90deg,#d3ab66,#ffd76a)}'+
    '#honorItem .hn-stgtxt{font-size:10px;color:#8fa0bd;margin-top:3px}'+
    '#honorItem .hn-acts{display:flex;gap:6px;justify-content:center;margin-top:8px}'+
    '#honorItem .hn-acts button{background:linear-gradient(180deg,#2b3147,#1c2231);color:#ffd76a;border:1px solid #d3ab66;border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer}'+
    '#honorItem .hn-acts button:active{transform:scale(.95)}'+
    '#honorItem .hn-acts button.go{background:linear-gradient(180deg,#ffd76a,#d3ab66);color:#10141c;font-weight:bold;border:1px solid #8a6d33}'+
    /* 银色毛玻璃悬停信息面板 + 点击详情容器 */
    '#hnTip{position:fixed;z-index:99998;width:min(240px,70vw);background:linear-gradient(165deg,rgba(206,212,220,.18),rgba(158,164,176,.10));backdrop-filter:blur(8px) saturate(1.4);-webkit-backdrop-filter:blur(8px) saturate(1.4);border:1px solid rgba(222,228,238,.5);border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.45);padding:10px;font-size:12px;color:#e8edf5;pointer-events:none;display:none}'+
    '#hnTip .hn-tipnm{font-weight:bold;font-size:13px;margin-bottom:6px}'+
    '#hnTip .hn-ln{display:flex;justify-content:space-between;gap:10px;padding:2px 0;border-bottom:1px dashed rgba(222,228,238,.18);line-height:1.45}'+
    '#hnTip .hn-ln:last-child{border-bottom:0}'+
    '#hnTip .hn-lk{color:#a9b4c4;flex-shrink:0}'+
    '#hnTip .hn-lv{color:#e8edf5;text-align:right;word-break:break-all}'+
    '#hnTip .hn-tiphint{color:#ffd76a;font-size:10px;margin-top:6px;text-align:center}'+
    '#hnInfo{position:fixed;z-index:99999;width:min(300px,90vw);background:linear-gradient(165deg,rgba(206,212,220,.2),rgba(158,164,176,.11));backdrop-filter:blur(10px) saturate(1.5);-webkit-backdrop-filter:blur(10px) saturate(1.5);border:1px solid rgba(222,228,238,.55);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.55);overflow:hidden;display:flex;flex-direction:column;font-size:13px;color:#e8edf5;user-select:none}'+
    '#hnInfo .hn-hd{display:flex;align-items:center;padding:8px 10px;border-bottom:1px solid rgba(222,228,238,.25);background:rgba(255,255,255,.06);cursor:grab}'+
    '#hnInfo .hn-hd b{flex:1;font-size:14px}'+
    '#hnInfo .hn-x{border:0;background:none;color:#a9b4c4;font-size:16px;cursor:pointer;padding:2px 6px}'+
    '#hnInfo .hn-bd{padding:10px;overflow:auto;flex:1}'+
    '#hnInfo .hn-ln{display:flex;justify-content:space-between;gap:10px;padding:4px 0;border-bottom:1px dashed rgba(222,228,238,.18);line-height:1.5}'+
    '#hnInfo .hn-ln:last-child{border-bottom:0}'+
    '#hnInfo .hn-lk{color:#a9b4c4;flex-shrink:0}'+
    '#hnInfo .hn-lv{color:#e8edf5;text-align:right;word-break:break-all}'+
    '#hnInfo .hn-acts{display:flex;gap:6px;justify-content:center;margin-top:10px}'+
    '#hnInfo .hn-acts button{background:linear-gradient(180deg,#2b3147,#1c2231);color:#ffd76a;border:1px solid #d3ab66;border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer}'+
    '#hnInfo .hn-acts button:active{transform:scale(.95)}';
  document.head.appendChild(st);
}

/* ---------- 拖拽（按钮 / 面板标题栏通用） ---------- */
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

/* ---------- DOM 骨架 ---------- */
const btn=document.createElement('button');
btn.id='honorBtn'; btn.title='功勋'; btn.textContent='🏆';
document.body.appendChild(btn);

const panel=document.createElement('div');
panel.id='honorPanel'; panel.style.display='none';
panel.innerHTML =
  '<div class="hn-hd"><b>🏆 功勋殿堂</b><span class="hn-gem"></span><button class="hn-x">×</button></div>'+
  '<div class="hn-tools"><input class="hn-search" placeholder="搜索道具名 / 类别…"><button class="hn-one">一键提交</button></div>'+
  '<div class="hn-bd"><div class="hn-note">提交任意道具积累功勋贡献，达标自动领取钻石（阶段 0/100→5钻 · 0/1000→20钻 · 0/100000→100钻 · 0/1000000→500钻，以此类推无上限）。<b>一键提交</b>：每种持有道具贡献至当前阶段达标（最多消耗持有全部）。</div><div class="hn-list"></div></div>';
document.body.appendChild(panel);

const itemModal=document.createElement('div');
itemModal.id='honorItem'; itemModal.style.display='none';
itemModal.innerHTML='<div class="hn-hd"><b></b><button class="hn-x">×</button></div><div class="hn-bd"></div>';
document.body.appendChild(itemModal);

/* 悬停信息面板 + 点击详情容器（银色毛玻璃） */
const hnTip=document.createElement('div');
hnTip.id='hnTip';
document.body.appendChild(hnTip);
const infoModal=document.createElement('div');
infoModal.id='hnInfo'; infoModal.style.display='none';
infoModal.innerHTML='<div class="hn-hd"><b></b><button class="hn-x">×</button></div><div class="hn-bd"></div>';
document.body.appendChild(infoModal);
drag(infoModal.querySelector('.hn-hd'), infoModal);

drag(btn);
drag(panel.querySelector('.hn-hd'), panel);
drag(itemModal.querySelector('.hn-hd'), itemModal);

/* ---------- 渲染 ---------- */
let curKw='';
function refreshGem(){ const w=panel.querySelector('.hn-gem'); const s=gs(); if(w) w.textContent='钻石 '+(s?fmt(s.gem||0):'0'); }
function renderList(){
  const list=panel.querySelector('.hn-list');
  const s=gs(); if(!s || !s.honor) s.honor={};
  const kw=curKw.trim().toLowerCase();
  const its=items().filter(k=>{
    const m=MATS[k]; if(!kw) return true;
    return (m.n.toLowerCase().indexOf(kw)>=0) || (String(m.cat||'').toLowerCase().indexOf(kw)>=0);
  }).sort((a,b)=>(MATS[a].n<MATS[b].n?-1:1));
  list.innerHTML = its.map(k=>{
    const m=MATS[k]; const have=totalOf(k); const h=honorOf(k);
    const cs=curStage(k); const st=stageAt(cs);
    const c=itemQualityColor(m);
    const stTxt = st.need<=h ? '已满' : ('第'+(cs+1)+'阶 '+fmt(h)+'/'+fmt(st.need));
    return '<div class="hn-row" data-hn="info" data-id="'+k+'" style="cursor:pointer">'+
      '<span class="hn-nm" style="color:'+c+'" title="'+m.n+'">'+m.n+'</span>'+
      '<span class="hn-cat">'+(m.cat||'杂')+'</span>'+
      '<span class="hn-have">×'+fmt(have)+'</span>'+
      '<span class="hn-stg">'+stTxt+'</span>'+
      '<button data-hn="open" data-id="'+k+'">提交</button>'+
    '</div>';
  }).join('') || '<div class="hn-empty">没有匹配的道具</div>';
}
function renderItemModal(id){
  const s=gs(); if(!s) return;
  const m=MATS[id]; if(!m) return;
  const have=totalOf(id); const h=honorOf(id);
  const cs=curStage(id);
  const stagesHtml=[];
  const shown=Math.max(cs+2, 3); // 当前 + 未来 2 阶预览
  for(let k=0;k<shown;k++){
    const st=stageAt(k); const done=h>=st.need; const got=gotOf(id,k);
    const cls = done ? 'done' : (k===cs?'cur':'lock');
    const pct = Math.min(100, Math.floor(h/st.need*100));
    stagesHtml.push(
      '<div class="hn-stgrow '+cls+'">'+
        '<div class="hn-stglab"><span>第'+(k+1)+'阶 · 提交 '+fmt(st.need)+'</span><span class="rw">钻石 ×'+fmt(st.reward)+'</span></div>'+
        (done
          ? '<div class="hn-stgtxt">'+(got?'已达成并领取 ✓':'已达成 · 奖励待领取（再次提交即可领取）')+'</div>'
          : '<div class="hn-bar"><i style="width:'+pct+'%"></i></div>'+
            '<div class="hn-stgtxt">'+fmt(h)+' / '+fmt(st.need)+'（还需 '+fmt(Math.max(0,st.need-h))+'）</div>')
      +'</div>');
  }
  itemModal.innerHTML =
    '<div class="hn-hd"><b style="color:'+itemQualityColor(m)+'">'+m.n+'</b><button class="hn-x">×</button></div>'+
    '<div class="hn-bd">'+
      '<div class="hn-info">类别：'+(m.cat||'杂')+' · 持有：<b style="color:#9fe0a0">'+fmt(have)+'</b> · 已贡献：<b style="color:#ffd76a">'+fmt(h)+'</b><br>提交消耗背包中的该道具，达标自动发放钻石，后续阶段无上限。</div>'+
      stagesHtml.join('')+
      '<div class="hn-acts">'+
        '<button data-hn="sub1" data-id="'+id+'">提交 1</button>'+
        '<button data-hn="suball" data-id="'+id+'">提交全部</button>'+
      '</div>'+
    '</div>';
  itemModal.style.display='flex';
  const w=itemModal.offsetWidth;
  itemModal.style.left=Math.max(8,Math.floor((innerWidth-w)/2))+'px';
  itemModal.style.top=Math.max(8,Math.floor(innerHeight*0.1))+'px';
  itemModal.querySelector('.hn-x').onclick=()=>{ itemModal.style.display='none'; };
  drag(itemModal.querySelector('.hn-hd'), itemModal);
}

/* ---------- 提交 ---------- */
function submitHonor(id,n){
  const s=gs(); if(!s || !s.inv) return;
  const have=totalOf(id);
  if(have<=0){ toastMsg('背包中没有该道具','bad'); return; }
  n=Math.min(n,have);
  s.inv[id]-=n; if(s.inv[id]<=0) delete s.inv[id];
  s.honor[id]=(s.honor[id]||0)+n;
  let got=0,k=0;
  while(true){
    const st=stageAt(k);
    if(s.honor[id]>=st.need){
      if(!gotOf(id,k)){ s.honorGot[id+'_'+k]=1; got+=st.reward; }
      k++;
    } else break;
  }
  if(got>0){ addGemTo(got); toastMsg('功勋贡献达成 · 奖励钻石 ×'+fmt(got)); }
  renderItemModal(id); renderList(); refreshGem();
}

/* ---------- 悬停信息面板 + 点击详情 ---------- */
function matInfoLines(id){
  const m=MATS[id]; if(!m) return [];
  const s=gs(); const have=totalOf(id); const h=honorOf(id); const cs=curStage(id); const st=stageAt(cs);
  const q=(typeof qualityAt==='function' && m.t!=null) ? qualityAt(m.t) : null;
  return [
    ['类别', m.cat||'杂'],
    ['品质', (q&&q.n) ? q.n : ('Lv.'+(m.t!=null?m.t:'-'))],
    ['描述', m.d||'-'],
    ['基础售价', (m.sell!=null?m.sell:0)+' 金币'],
    ['持有数量', fmt(have)],
    ['功勋贡献', fmt(h)+' · 第'+(cs+1)+'阶 '+fmt(h)+'/'+fmt(st.need)]
  ];
}
function tipBodyHtml(id){
  const m=MATS[id]; if(!m) return '';
  const c=itemQualityColor(m);
  return '<div class="hn-tipnm" style="color:'+c+'">'+m.n+'</div>'+
    matInfoLines(id).map(l=>'<div class="hn-ln"><span class="hn-lk">'+l[0]+'</span><span class="hn-lv">'+l[1]+'</span></div>').join('')+
    '<div class="hn-tiphint">点击查看详情</div>';
}
function showTip(row,id){
  const m=MATS[id]; if(!m) return;
  hnTip.innerHTML=tipBodyHtml(id);
  hnTip.style.display='block';
  const r=row.getBoundingClientRect(); const tw=hnTip.offsetWidth, th=hnTip.offsetHeight;
  let x=r.right+10, y=Math.min(r.top, innerHeight-th-8);
  if(x+tw>innerWidth-6) x=Math.max(6, r.left-tw-10);
  hnTip.style.left=x+'px'; hnTip.style.top=Math.max(6,y)+'px';
}
function hideTip(){ hnTip.style.display='none'; }
function openInfo(id){
  const m=MATS[id]; if(!m) return;
  const c=itemQualityColor(m);
  infoModal.innerHTML =
    '<div class="hn-hd"><b style="color:'+c+'">'+m.n+'</b><button class="hn-x">×</button></div>'+
    '<div class="hn-bd">'+
      matInfoLines(id).map(l=>'<div class="hn-ln"><span class="hn-lk">'+l[0]+'</span><span class="hn-lv">'+l[1]+'</span></div>').join('')+
      '<div class="hn-acts"><button data-hn="toSub" data-id="'+id+'">提交贡献</button><button class="hn-close">关闭</button></div>'+
    '</div>';
  infoModal.style.display='flex';
  const w=infoModal.offsetWidth;
  infoModal.style.left=Math.max(8,Math.floor((innerWidth-w)/2))+'px';
  infoModal.style.top=Math.max(8,Math.floor(innerHeight*0.12))+'px';
  const close=()=>{ infoModal.style.display='none'; };
  infoModal.querySelector('.hn-x').onclick=close;
  infoModal.querySelector('.hn-close').onclick=close;
  drag(infoModal.querySelector('.hn-hd'), infoModal);
}

/* ---------- 事件 ---------- */
btn.onclick=()=>{
  const s=gs(); if(!s) return;
  if(!s.honor) s.honor={}; if(!s.honorGot) s.honorGot={};
  refreshGem(); renderList();
  panel.style.display = panel.style.display==='none' ? 'flex' : 'none';
};
panel.querySelector('.hn-x').onclick=()=>{ panel.style.display='none'; };
const search=panel.querySelector('.hn-search');
search.oninput=()=>{ curKw=search.value; renderList(); };
search.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); renderList(); } };
panel.querySelector('.hn-one').onclick=()=>{
  const s=gs(); if(!s) return;
  if(!s.honor) s.honor={}; if(!s.honorGot) s.honorGot={};
  let cnt=0, got=0;
  items().forEach(k=>{
    const have=totalOf(k); if(have<=0) return;
    const cs=curStage(k); const need=stageAt(cs).need; const h=honorOf(k);
    const n=Math.min(have, Math.max(1, need-h));
    got+=submitQuiet(k,n); cnt++;
  });
  toastMsg('一键提交 '+cnt+' 种道具 · 获得钻石 ×'+fmt(got), 'good');
  renderList(); refreshGem();
};
function submitQuiet(id,n){
  const s=gs(); if(!s || !s.inv) return 0;
  if(totalOf(id)<=0 || n<=0) return 0;
  n=Math.min(n,totalOf(id));
  s.inv[id]-=n; if(s.inv[id]<=0) delete s.inv[id];
  s.honor[id]=(s.honor[id]||0)+n;
  let got2=0,k=0;
  while(true){
    const st=stageAt(k);
    if(s.honor[id]>=st.need){
      if(!gotOf(id,k)){ s.honorGot[id+'_'+k]=1; addGemTo(st.reward); got2+=st.reward; }
      k++;
    } else break;
  }
  return got2;
}
panel.addEventListener('click',e=>{
  const b=e.target.closest('[data-hn]');
  if(b && b.dataset.hn==='open'){ renderItemModal(b.dataset.id); return; }
  const row=e.target.closest('.hn-row');
  if(row && !e.target.closest('button')) openInfo(row.dataset.id);
});
panel.addEventListener('mouseover',e=>{ const row=e.target.closest('.hn-row'); if(row) showTip(row,row.dataset.id); });
panel.addEventListener('mouseout',e=>{ if(e.target.closest('.hn-row')) hideTip(); });
itemModal.addEventListener('click',e=>{
  const b=e.target.closest('[data-hn]');
  if(!b) return;
  const id=b.dataset.id;
  if(b.dataset.hn==='sub1') submitHonor(id,1);
  else if(b.dataset.hn==='suball') submitHonor(id,totalOf(id));
});
infoModal.addEventListener('click',e=>{
  const b=e.target.closest('[data-hn]');
  if(!b || b.dataset.hn!=='toSub') return;
  infoModal.style.display='none';
  renderItemModal(b.dataset.id);
});
window.HONOR.submitHonor = submitHonor;

/* ---------- 启动 ---------- */
(function init(){
  const s=gs();
  if(s){ if(!s.honor) s.honor={}; if(!s.honorGot) s.honorGot={}; }
  refreshGem();
})();
})();
