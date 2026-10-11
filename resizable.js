/* 可拖拽分隔条组件：左右/上下拉伸，localStorage 记忆，小屏降级，键盘无障碍。
   用法：
   - 拍卖行侧栏：renderAuction 渲染后调用 window.initResizables()（已在 renderAuction 尾部接入）
   - 其他界面：window.initResizables() 已初始化顶栏（上下）；新增左右分区时在渲染后调用即可 */
(function(){
  if(typeof window==='undefined') return;
  var KEY = 'xcResize';
  var mem = {};
  try{ mem = JSON.parse(localStorage.getItem(KEY))||{}; }catch(e){ mem = {}; }
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(mem)); }catch(e){} }
  function isSmall(){ return window.matchMedia && matchMedia('(max-width:640px)').matches; }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  if(!document.getElementById('rz-css')){
    var st = document.createElement('style');
    st.id = 'rz-css';
    st.textContent =
      '#topbar{align-items:center}'+
      '.rz-bar{position:relative;flex:none;z-index:5;box-sizing:border-box;opacity:0;transition:opacity .15s;cursor:col-resize;outline:none;touch-action:none}'+
      '.rz-bar.rz-v{width:7px;margin:0 -3px;border-left:1px solid transparent;border-right:1px solid transparent}'+
      '.rz-bar.rz-h{height:7px;margin:-3px 0;border-top:1px solid transparent;border-bottom:1px solid transparent}'+
      '.rz-bar:hover,.rz-bar:focus,.rz-bar.drag{opacity:1}'+
      '.rz-bar::after{content:"";position:absolute;inset:0;border-radius:3px;background:rgba(127,182,255,0);pointer-events:none}'+
      '.rz-bar:hover::after,.rz-bar:focus::after{background:rgba(127,182,255,.35)}'+
      '.rz-bar.drag::after{background:rgba(127,182,255,.55)}'+
      '.rz-h{cursor:row-resize}'+
      '@media (max-width:640px){.rz-bar{display:none}}';
    document.head.appendChild(st);
  }
  function makeBar(dir, label){
    var b = document.createElement('div');
    b.className = 'rz-bar rz-'+(dir==='h'?'h':'v');
    b.setAttribute('role','separator');
    b.setAttribute('aria-label', label||'调整区域大小');
    b.setAttribute('aria-orientation', dir==='h'?'horizontal':'vertical');
    b.tabIndex = 0;
    return b;
  }
  function dragStart(bar, onMove){
    var start = function(e){
      e.preventDefault(); bar.classList.add('drag');
      var t = e.touches ? e.touches[0] : e;
      var sx = t.clientX, sy = t.clientY;
      var mv = function(e2){
        var t2 = e2.touches ? e2.touches[0] : e2;
        onMove(t2.clientX - sx, t2.clientY - sy);
      };
      var up = function(){
        bar.classList.remove('drag'); save();
        document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up);
        document.removeEventListener('touchmove', mv); document.removeEventListener('touchend', up);
      };
      document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
      document.addEventListener('touchmove', mv, {passive:false}); document.addEventListener('touchend', up);
    };
    bar.addEventListener('mousedown', start);
    bar.addEventListener('touchstart', start, {passive:false});
  }
  /* 左右拉伸：side 与 main 之间 */
  function vresize(containerSel, sideSel, opts){
    if(isSmall()) return;
    var c = document.querySelector(containerSel);
    if(!c) return;
    var side = c.querySelector(sideSel);
    if(!side) return;
    var bar = makeBar('v', opts.label);
    side.after(bar);
    var set = function(w){ side.style.width = clamp(w, opts.min, opts.max)+'px'; mem[opts.key] = side.offsetWidth; };
    set(mem[opts.key] || opts.def);
    dragStart(bar, function(dx){ set(side.offsetWidth + dx); });
    bar.addEventListener('keydown', function(e){
      var step = e.shiftKey ? 20 : 5;
      if(e.key==='ArrowLeft' || e.key==='ArrowRight'){ set(side.offsetWidth + (e.key==='ArrowLeft'?-step:step)); save(); e.preventDefault(); }
    });
  }
  /* 上下拉伸：top 与下方内容之间 */
  function hresize(topSel, opts){
    if(isSmall()) return;
    var top = document.querySelector(topSel);
    if(!top) return;
    var bar = makeBar('h', opts.label);
    top.after(bar);
    var set = function(h){ top.style.height = clamp(h, opts.min, opts.max)+'px'; mem[opts.key] = top.offsetHeight; };
    set(mem[opts.key] || opts.def);
    dragStart(bar, function(dx, dy){ set(top.offsetHeight + dy); });
    bar.addEventListener('keydown', function(e){
      var step = e.shiftKey ? 20 : 5;
      if(e.key==='ArrowUp' || e.key==='ArrowDown'){ set(top.offsetHeight + (e.key==='ArrowUp'?-step:step)); save(); e.preventDefault(); }
    });
  }
  /* 拍卖行侧栏：每次渲染后重建分隔条（渲染会重写 innerHTML） */
  window.initResizables = function(){
    var c = document.querySelector('#auctionBody .ah-body');
    if(c) c.querySelectorAll('.rz-bar').forEach(function(b){ b.remove(); });
    vresize('#auctionBody .ah-body', '.ah-side', {key:'ahSide', def:118, min:90, max:240, label:'调整拍卖行侧栏宽度'});
  };
  /* 顶栏：静态元素，初始化一次 */
  hresize('#topbar', {key:'topbar', def:44, min:44, max:110, label:'调整顶部栏高度'});
  window.initResizables();

  /* ===== 弹窗缩放手柄（modalBox 居中弹窗 / gearPanel 右侧面板） ===== */
  if(!document.getElementById('rz-mh-css')){
    var st2 = document.createElement('style'); st2.id = 'rz-mh-css';
    st2.textContent =
      '.rz-mh{position:fixed;z-index:99;width:14px;height:14px;cursor:nwse-resize;opacity:0;transition:opacity .15s;'+
      'border-right:3px solid rgba(127,182,255,.5);border-bottom:3px solid rgba(127,182,255,.5);border-radius:0 0 6px 0;touch-action:none}'+
      '.rz-mh:hover,.rz-mh.drag{opacity:1}'+
      '@media (max-width:640px){.rz-mh{display:none}}';
    document.head.appendChild(st2);
  }
  function attachHandle(target, id, key, minW, minH, apply){
    var h = document.createElement('div');
    h.id = id; h.className = 'rz-mh';
    h.setAttribute('role','separator'); h.setAttribute('aria-label','调整弹窗大小'); h.tabIndex = 0;
    document.body.appendChild(h);
    var m = mem[key] || {};
    if(m.w) apply(m.w, m.h||0);
    function pos(){ var r = target.getBoundingClientRect(); h.style.left = (r.right-7)+'px'; h.style.top = (r.bottom-7)+'px'; }
    pos();
    var start = function(e){
      e.preventDefault(); h.classList.add('drag');
      var t = e.touches ? e.touches[0] : e, sx = t.clientX, sy = t.clientY, w0 = target.offsetWidth, h0 = target.offsetHeight;
      var mv = function(e2){
        var t2 = e2.touches ? e2.touches[0] : e2;
        var w = clamp(w0+(t2.clientX-sx), minW, Math.floor(innerWidth*0.92));
        var hh = minH ? clamp(h0+(t2.clientY-sy), minH, Math.floor(innerHeight*0.84)) : 0;
        apply(w, hh); mem[key] = {w: w, h: hh}; pos();
      };
      var up = function(){ h.classList.remove('drag'); save(); document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up); document.removeEventListener('touchmove',mv); document.removeEventListener('touchend',up); };
      document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
      document.addEventListener('touchmove',mv,{passive:false}); document.addEventListener('touchend',up);
    };
    h.addEventListener('mousedown',start);
    h.addEventListener('touchstart',start,{passive:false});
    h.addEventListener('keydown', function(e){
      var step = e.shiftKey ? 20 : 5;
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'||e.key==='ArrowUp'||e.key==='ArrowDown'){
        var w = clamp(target.offsetWidth + (e.key==='ArrowRight'?step:(e.key==='ArrowLeft'?-step:0)), minW, Math.floor(innerWidth*0.92));
        var hh = minH ? clamp(target.offsetHeight + (e.key==='ArrowDown'?step:(e.key==='ArrowUp'?-step:0)), minH, Math.floor(innerHeight*0.84)) : 0;
        apply(w, hh); mem[key] = {w: w, h: hh}; save(); e.preventDefault();
      }
    });
    return {handle: h, refresh: pos};
  }
  var modalApi = null, gpApi = null;
  window.modalResize = function(){
    var box = document.getElementById('modalBox');
    if(!box || !box.offsetParent) return;
    if(!modalApi){ modalApi = attachHandle(box, 'rz-mh-modal', 'modal', 300, 240, function(w,hh){ box.style.width = w+'px'; if(hh>0) box.style.height = hh+'px'; }); }
    else modalApi.refresh();
  };
  window.gearPanelResize = function(){
    var pan = document.getElementById('gearPanel');
    if(!pan) return;
    if(!pan.classList.contains('open')){ var hh = document.getElementById('rz-gph'); if(hh) hh.style.display = 'none'; return; }
    if(!gpApi){ gpApi = attachHandle(pan, 'rz-gph', 'gearPanel', 300, 0, function(w){ pan.style.width = w+'px'; }); }
    else gpApi.refresh();
    var h = document.getElementById('rz-gph'); if(h) h.style.display = 'block';
  };
})();
