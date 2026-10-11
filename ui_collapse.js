/* ============================================================
   UI 布局改造：左右常驻面板 → 悬浮小图标 + 弹窗（ponytail MVP）
   1. 通用弹窗组件（400×500 · 可拖拽 · ×关闭 · 点外关闭 · 位置记忆）
   2. 左侧（属性/装备/工具）→ 左上角头像按钮 + Tab 弹窗
   3. 聊天 → 右上角气泡按钮 + 弹窗
   本阶段不动：作业状态/增益（右侧仍常驻）、底部导航
   不破坏现有功能：sideL/sideR 继续每帧渲染，只是改显示位置
   ============================================================ */
(function(){
'use strict';
if(window.__UICollapse) return;
window.__UICollapse = 1;

/* ---------- 样式 ---------- */
(function(){
  if(document.getElementById('ui-collapse-style')) return;
  const st=document.createElement('style'); st.id='ui-collapse-style';
  st.textContent =
    // 桌面：左列归零、sideL 隐藏；聊天框在侧栏内隐藏（弹窗内再显示）
    '@media (min-width:1100px){'+
      '#app{grid-template-columns:0 1fr 272px}'+
      '#sideL{display:none}'+
      '#sideR #chatBox{display:none}'+
    '}'+
    // 悬浮小图标（40×40 · 半透明 · hover 高亮）
    '#uiAvatar,#uiChatBtn{position:fixed;z-index:9998;width:40px;height:40px;border-radius:10px;'+
      'display:flex;align-items:center;justify-content:center;cursor:pointer;'+
      'background:rgba(20,16,8,.55);border:1px solid #6b4f28;box-shadow:0 3px 10px rgba(0,0,0,.4);transition:filter .15s}'+
    '#uiAvatar{left:12px;top:64px}'+
    '#uiAvatar img{width:38px;height:38px;border-radius:9px;object-fit:cover}'+
    '#uiAvatarLvl{position:absolute;right:-6px;bottom:-6px;min-width:18px;height:18px;padding:0 3px;border-radius:9px;'+
      'background:linear-gradient(180deg,#ffd76a,#d3ab66);color:#10141c;font-size:10px;font-weight:800;'+
      'line-height:18px;text-align:center;border:1px solid #8a6d33}'+
    '#uiAvatar:hover,#uiChatBtn:hover{filter:brightness(1.25);border-color:#c9a34a}'+
    '#uiChatBtn{right:12px;top:64px;font-size:20px;color:#ffd76a}'+
    // 通用弹窗
    '.ui-pop{position:fixed;z-index:9999;width:400px;height:500px;max-width:94vw;max-height:86vh;display:flex;flex-direction:column;'+
      'background:linear-gradient(180deg,rgba(46,34,20,.96),rgba(34,24,13,.95));border:1px solid #6b4f28;border-radius:14px;'+
      'box-shadow:0 14px 44px rgba(0,0,0,.6);font-size:12px}'+
    '.ui-pop-hd{display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid rgba(107,79,40,.6);'+
      'cursor:move;user-select:none;color:#ffd76a;font-weight:700;font-size:13px}'+
    '.ui-pop-x{margin-left:auto;cursor:pointer;color:var(--dim2);font-size:17px;line-height:1;padding:2px 6px}'+
    '.ui-pop-x:hover{color:#ffd76a}'+
    '.ui-pop-tabs{display:flex;gap:4px;padding:6px 8px;border-bottom:1px solid rgba(107,79,40,.4)}'+
    '.ui-pop-tabs span{flex:1;text-align:center;padding:4px 0;border-radius:7px;font-size:12px;color:var(--dim2);cursor:pointer;border:1px solid transparent}'+
    '.ui-pop-tabs span:hover{color:var(--txt)}'+
    '.ui-pop-tabs span.on{background:rgba(255,215,106,.16);color:#ffd76a;border-color:rgba(255,215,106,.4)}'+
    '.ui-pop-bd{flex:1;overflow-y:auto;padding:10px 12px}'+
    '.ui-pop-bd .side-panel{margin-bottom:0}'+
    '.ui-pop-bd #chatBox{display:block;margin-top:0;height:100%}'+
    '.ui-pop-bd #chatBox .chat-list{flex:1;height:auto;max-height:none}';
  document.head.appendChild(st);
})();

/* ============ 通用弹窗组件 ============ */
function uiPop(title, key, withTabs){
  const box=document.createElement('div');
  box.className='ui-pop';
  box.innerHTML='<div class="ui-pop-hd"><span>'+title+'</span><b class="ui-pop-x">×</b></div>'+
    (withTabs?'<div class="ui-pop-tabs"></div>':'')+'<div class="ui-pop-bd"></div>';
  document.body.appendChild(box);
  const hd=box.querySelector('.ui-pop-hd'), x=box.querySelector('.ui-pop-x'), bd=box.querySelector('.ui-pop-bd');
  // 位置：localStorage 记忆 / 默认居中偏上（记忆位置强制钳制在屏幕内，防拖出屏后找不到）
  const K='ui_pop_'+key;
  try{
    const p=localStorage.getItem(K);
    if(p){
      const a=p.split(',');
      const mx=Math.max(0,innerWidth-80), my=Math.max(0,innerHeight-60);
      box.style.left=Math.min(Math.max(0,+a[0]||0),mx)+'px';
      box.style.top=Math.min(Math.max(0,+a[1]||0),my)+'px';
    }
  }catch(e){}
  if(!box.style.left) box.style.left=Math.max(10,(innerWidth-400)/2)+'px';
  if(!box.style.top) box.style.top=Math.max(60,Math.min(90,innerHeight-520))+'px';
  // 拖拽（标题栏，鼠标 + 触屏）
  hd.addEventListener('mousedown', e=>{
    if(e.target.classList.contains('ui-pop-x')) return;
    const sx=e.clientX, sy=e.clientY, l=box.offsetLeft, t=box.offsetTop;
    function mv(ev){ box.style.left=Math.max(0,l+ev.clientX-sx)+'px'; box.style.top=Math.max(0,t+ev.clientY-sy)+'px'; }
    function up(){
      document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up);
      try{ localStorage.setItem(K, box.style.left.replace('px','')+','+box.style.top.replace('px','')); }catch(e){}
    }
    document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
  });
  hd.addEventListener('touchstart', e=>{
    if(e.target.classList.contains('ui-pop-x')) return;
    const t0=e.touches[0], sx=t0.clientX, sy=t0.clientY, l=box.offsetLeft, t=box.offsetTop;
    function mv(ev){ const t1=ev.touches[0]; box.style.left=Math.max(0,l+t1.clientX-sx)+'px'; box.style.top=Math.max(0,t+t1.clientY-sy)+'px'; }
    function up(){
      document.removeEventListener('touchmove',mv); document.removeEventListener('touchend',up);
      try{ localStorage.setItem(K, box.style.left.replace('px','')+','+box.style.top.replace('px','')); }catch(e){}
    }
    document.addEventListener('touchmove',mv,{passive:false}); document.addEventListener('touchend',up);
  }, {passive:false});
  // × 关闭 + 点外关闭（close 可被外层 setClose 包装，×/点外都会走包装）
  const api={};
  api.close=function(){ box.remove(); document.removeEventListener('mousedown', outside); };
  api.setClose=function(fn){ const orig=api.close; api.close=function(){ fn(); orig(); }; };
  function outside(e){ if(box.isConnected && !box.contains(e.target)) api.close(); }
  x.onclick=()=>api.close();
  setTimeout(()=>document.addEventListener('mousedown', outside), 0);
  return { box:box, bd:bd, tabs:withTabs?box.querySelector('.ui-pop-tabs'):null, close:()=>api.close(), setClose:api.setClose };
}

/* ============ 角色弹窗（属性 / 装备 / 工具） ============ */
let charState=null;
function openChar(){
  if(charState && charState.pop.box.isConnected) return;
  charState=null;
  const pop=uiPop('角色', 'char', true);
  pop.setClose(()=>moveLeftBack());
  charState={ pop:pop, tab:'stats' };
  const T=[['stats','属性'],['equip','装备'],['tool','工具']];
  pop.tabs.innerHTML=T.map(t=>'<span data-t="'+t[0]+'">'+t[1]+'</span>').join('');
  const els=pop.tabs.querySelectorAll('span');
  els.forEach(el=>el.onclick=()=>{ charState.tab=el.dataset.t; els.forEach(x=>x.classList.toggle('on',x===el)); syncLeft(); });
  els[0].classList.add('on');
  syncLeft();
}
/* 按内容类名匹配面板（装备/工具都用 slotGridHtml，不能靠顺序） */
function pickPanel(sideL, tab){
  if(!sideL) return null;
  const ps=sideL.querySelectorAll('.side-panel');
  for(const p of ps){
    if(tab==='stats' && p.classList.contains('char-panel')) return p;
    if(tab==='equip' && !p.querySelector('.tool-grid') && p.querySelector('.eq-slot2')) return p;
    if(tab==='tool' && p.querySelector('.tool-grid')) return p;
  }
  return null;
}
function syncLeft(){
  if(!charState) return;
  let sideL=document.getElementById('sideL');
  let p=pickPanel(sideL, charState.tab);
  // 面板被移空时（快速切 Tab）强制重渲染侧栏兜底
  if(!p && sideL && typeof playerStats==='function'){
    _rSL((typeof S!=='undefined')?S:window.S, playerStats((typeof S!=='undefined')?S:window.S));
    sideL=document.getElementById('sideL');
    p=pickPanel(sideL, charState.tab);
  }
  if(p && charState.pop.bd.firstChild!==p){ charState.pop.bd.innerHTML=''; charState.pop.bd.appendChild(p); }
}
function moveLeftBack(){
  if(!charState) return;
  const panel=charState.pop.bd.firstChild;
  if(panel && panel.classList && panel.classList.contains('side-panel')){
    const sideL=document.getElementById('sideL');
    if(sideL) sideL.appendChild(panel);
  }
}

/* ============ 聊天气泡 + 聊天弹窗 ============ */
let chatState=null;
function openChat(){
  if(chatState && chatState.pop.box.isConnected) return;
  chatState=null;
  const pop=uiPop('聊天', 'chat', false);
  pop.setClose(()=>moveChatBack());
  chatState={ pop:pop };
  syncChat();
}
function syncChat(){
  if(!chatState) return;
  const cb=document.getElementById('chatBox');
  if(cb && chatState.pop.bd.firstChild!==cb){ chatState.pop.bd.innerHTML=''; chatState.pop.bd.appendChild(cb); }
}
function moveChatBack(){
  const cb=document.getElementById('chatBox');
  if(cb && cb.parentNode && cb.parentNode.classList.contains('ui-pop-bd')){
    const sideR=document.getElementById('sideR');
    if(sideR) sideR.appendChild(cb);
  }
}

/* ============ 悬浮小图标 ============ */
function setupAvatar(){
  const btn=document.createElement('div'); btn.id='uiAvatar';
  btn.innerHTML='<img id="uiAvatarImg" alt=""><span id="uiAvatarLvl">1</span>';
  document.body.appendChild(btn);
  btn.onclick=()=>{ if(charState && charState.pop.box.isConnected){ moveLeftBack(); charState.pop.close(); charState=null; } else openChar(); };
  updateAvatar();
}
function updateAvatar(){
  const s=(typeof S!=='undefined')?S:window.S, img=document.getElementById('uiAvatarImg'), lv=document.getElementById('uiAvatarLvl');
  if(!img || !s) return;
  if(typeof CHAR_AVATARS!=='undefined') img.src=CHAR_AVATARS[(s.avatar||0)%CHAR_AVATARS.length];
  if(lv && s.skills && s.skills.fight) lv.textContent=s.skills.fight.lvl;
}
function setupChatBtn(){
  const b=document.createElement('div'); b.id='uiChatBtn'; b.textContent='💬';
  document.body.appendChild(b);
  // 位置记忆 + 可拖拽（鼠标/触屏），拖拽与点击自动区分（恢复时钳制在屏幕内）
  const K='ui_chat_pos';
  try{
    const p=localStorage.getItem(K);
    if(p){
      const a=p.split(',');
      if(+a[0]>=0) b.style.left=Math.min(+a[0],Math.max(0,innerWidth-50))+'px';
      if(+a[1]>=0) b.style.top=Math.min(+a[1],Math.max(0,innerHeight-50))+'px';
    }
  }catch(e){}
  function toggle(){ if(chatState && chatState.pop.box.isConnected){ moveChatBack(); chatState.pop.close(); chatState=null; } else openChat(); }
  let dragging=false;
  function bindDrag(evType){
    b.addEventListener(evType, e=>{
      const t = e.touches ? e.touches[0] : e;
      if(evType==='mousedown' && e.button!==0) return;
      dragging=false;
      const sx=t.clientX, sy=t.clientY, l=b.offsetLeft, top=b.offsetTop;
      function mv(ev){ const t2=ev.touches?ev.touches[0]:ev; if(!dragging && Math.abs(t2.clientX-sx)+Math.abs(t2.clientY-sy)>4) dragging=true; if(dragging){ b.style.left=Math.max(0,l+t2.clientX-sx)+'px'; b.style.top=Math.max(0,top+t2.clientY-sy)+'px'; } }
      function up(){
        document.removeEventListener(evType==='mousedown'?'mousemove':'touchmove', mv);
        document.removeEventListener(evType==='mousedown'?'mouseup':'touchend', up);
        if(dragging){ try{ localStorage.setItem(K, b.style.left.replace('px','')+','+b.style.top.replace('px','')); }catch(e){} }
        else toggle();
      }
      document.addEventListener(evType==='mousedown'?'mousemove':'touchmove', mv, {passive:false});
      document.addEventListener(evType==='mousedown'?'mouseup':'touchend', up);
    }, {passive:false});
  }
  bindDrag('mousedown');
  bindDrag('touchstart');
}

/* ============ 包装渲染函数（弹窗打开时同步实时内容） ============ */
const _rSL=window.renderSideL, _rSR=window.renderSideR;
if(typeof _rSL==='function'){
  window.renderSideL=function(s,p){ _rSL(s,p); updateAvatar(); if(charState) syncLeft(); };
}
if(typeof _rSR==='function'){
  window.renderSideR=function(s,p){ _rSR(s,p); if(chatState) syncChat(); };
}

/* ============ 启动 ============ */
(function init(){
  if(typeof renderSideL!=='function' || (typeof S==='undefined' && !window.S)){ setTimeout(init, 300); return; }
  setupAvatar();
  setupChatBtn();
})();
})();
