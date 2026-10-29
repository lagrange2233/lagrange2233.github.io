/* =========================================================================
   例 6（第二定义）：定点 F(4,0)，定直线 l: x = 25/4，|MF| : d = 4 : 5
   轨迹 x²/25 + y²/9 = 1（a = 5, b = 3, c = 4, e = 4/5）
   ========================================================================= */
(function () {
  "use strict";

  var A = 5, B = 3, C = 4, DL = 25 / 4;      /* 半长轴、半短轴、半焦距、准线 x=a²/c */
  var TAU = Math.PI * 2;

  var cv = document.getElementById('cv2');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var mlayer = document.getElementById('mlayer2');

  /* t：M 的参数角；prog：已经画出的弧；other：是否叠加另一个焦点；
     side：当前对照的是哪一对（+1 右焦点↔右准线，-1 左焦点↔左准线） */
  var st = { t: 0, prog: 0, playing: true, other: false, side: 1 };
  var W = 0, H = 0, S = 90, ox = 0, oy = 0, live = false;

  var UP = '#2563eb', DIR = '#d98a00', RED = '#dc2626', VIO = '#7c3aed', INK = '#22405f', GRN = '#0f8a5f';

  function TX(x) { return ox + x * S; }
  function TY(y) { return oy - y * S; }

  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a.toFixed(3) + ')';
  }

  function resize() {
    var r = cv.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = r.width; H = r.height;
    /* 左右两条准线（±6.25）都要进画面：横向留给 x ∈ [-7.6, 7.6]，纵向 |y| ≤ 4.2 */
    S = Math.min(W / 15.2, H / 9.0);
    ox = W * 0.5;
    oy = H * 0.5;
  }

  /* ---------- 浮层标签 ---------- */
  var pool = [], used = 0, texCache = {}, szCache = {};

  function texHTML(tex) {
    var hit = texCache[tex];
    if (hit) return hit;
    var h;
    try { h = katex.renderToString(tex, { output: 'html', throwOnError: false, displayMode: false, strict: false }); }
    catch (e) { h = '<span>' + tex + '</span>'; }
    texCache[tex] = h; return h;
  }
  function tag(px, py, tex, col) {
    var el = pool[used];
    if (!el) { el = document.createElement('div'); el.className = 'mlabel'; mlayer.appendChild(el); pool[used] = el; }
    used++;
    if (el.__tex !== tex) { el.innerHTML = texHTML(tex); el.__tex = tex; }
    el.style.color = col; el.style.display = '';
    var sz = szCache[tex];
    if (!sz || !sz.w) { sz = { w: el.offsetWidth, h: el.offsetHeight }; if (sz.w) szCache[tex] = sz; }
    var x = px - sz.w / 2, y = py - sz.h / 2;
    x = Math.max(5, Math.min(W - sz.w - 5, x));
    y = Math.max(5, Math.min(H - sz.h - 5, y));
    el.style.left = x + 'px'; el.style.top = y + 'px';
  }
  function tagEnd() { for (var i = used; i < pool.length; i++) pool[i].style.display = 'none'; used = 0; }

  /* ---------- 图板 ---------- */
  function board() {
    ctx.clearRect(0, 0, W, H);
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#fbfdff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    var i, X, Y;
    ctx.strokeStyle = '#e9f1fa'; ctx.lineWidth = 1;
    for (i = -12; i <= 12; i++) {
      if (!i) continue;
      X = Math.round(TX(i)) + 0.5; Y = Math.round(TY(i)) + 0.5;
      if (X > -1 && X < W + 1) { ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, H); ctx.stroke(); }
      if (Y > -1 && Y < H + 1) { ctx.beginPath(); ctx.moveTo(0, Y); ctx.lineTo(W, Y); ctx.stroke(); }
    }

    var ax = Math.round(TX(0)) + 0.5, ay = Math.round(TY(0)) + 0.5;
    ctx.strokeStyle = '#c2d2e6'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, ay); ctx.lineTo(W - 4, ay); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax, H); ctx.lineTo(ax, 4); ctx.stroke();
    ctx.fillStyle = '#c2d2e6';
    ctx.beginPath(); ctx.moveTo(W - 1, ay); ctx.lineTo(W - 10, ay - 4.2); ctx.lineTo(W - 10, ay + 4.2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(ax, 1); ctx.lineTo(ax - 4.2, 10); ctx.lineTo(ax + 4.2, 10); ctx.closePath(); ctx.fill();
  }

  /* ---------- 两条准线：当前对照的那条高亮，另一条淡显 ---------- */
  function directrixLine(side) {
    var on = side === st.side;
    var px = Math.round(TX(side * DL)) + 0.5;

    ctx.save();
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = on ? 'rgba(220,38,38,.72)' : 'rgba(150,166,186,.5)';
    ctx.lineWidth = on ? 1.9 : 1.3;
    ctx.beginPath(); ctx.moveTo(px, 8); ctx.lineTo(px, H - 8); ctx.stroke();
    ctx.restore();

    if (on) {
      tag(px + (side > 0 ? 6 : -6), 26, 'l:\\;x=' + (side > 0 ? '' : '-') + '\\dfrac{25}{4}', RED);
    } else {
      tag(px, 26, side > 0 ? 'l' : "l'", '#b3bfcf');
    }
  }

  /* ---------- 已经画出的轨迹 ---------- */
  function trace() {
    var span = Math.min(st.prog, TAU);
    if (span < 0.004) return;
    var N = Math.max(60, Math.ceil(span / 0.02));
    var i, a;

    ctx.beginPath();
    for (i = 0; i <= N; i++) {
      a = span * i / N;
      var px = TX(A * Math.cos(a)), py = TY(B * Math.sin(a));
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(VIO, 0.09); ctx.lineWidth = 12; ctx.stroke();
    ctx.strokeStyle = rgba(VIO, 0.16); ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = VIO; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.lineCap = 'butt';
  }

  function seg(p, q, col, alpha) {
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
    ctx.strokeStyle = rgba(col, 0.13 * alpha); ctx.lineWidth = 9; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
    ctx.strokeStyle = rgba(col, alpha); ctx.lineWidth = 2.4; ctx.stroke();
    ctx.lineCap = 'butt';
  }

  function dash(p, q, col, alpha) {
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = rgba(col, alpha); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
    ctx.restore();
  }

  function dot(x, y, r, col) {
    ctx.beginPath(); ctx.arc(x, y, r + 2.4, 0, TAU);
    ctx.fillStyle = rgba(col, 0.14); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = 1.7; ctx.strokeStyle = '#fff'; ctx.stroke();
  }

  /* H 处的直角记号：dx 指向 M 所在的那一侧，记号朝 x 轴画 */
  function rightAngle(hx, hy, y, dx) {
    var s = y > 0 ? 1 : -1;
    ctx.strokeStyle = 'rgba(217,138,0,.9)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(hx + dx * 9, hy);
    ctx.lineTo(hx + dx * 9, hy + s * 9);
    ctx.lineTo(hx, hy + s * 9);
    ctx.stroke();
  }

  function draw() {
    if (W < 10) return;
    board();
    directrixLine(1);
    directrixLine(-1);

    var side = st.side;
    var t = st.t, x = A * Math.cos(t), y = B * Math.sin(t);
    var Fx = side * C;                     /* 当前对照的焦点坐标 */
    var d = DL - side * x;                 /* 到当前准线的距离：M 夹在两条准线之间，恒为正 */
    var mf = Math.hypot(x - Fx, y);

    var M = [TX(x), TY(y)];
    var F = [TX(Fx), TY(0)];
    var H = [TX(side * DL), TY(y)];

    trace();

    /* 另一侧：平时只点一个小灰点；开启「叠加另一个焦点」时变绿并连到 M */
    var F2 = [TX(-Fx), TY(0)];
    if (st.other) {
      dash(F2, M, GRN, 0.85);
      dot(F2[0], F2[1], 4, GRN);
      tag(F2[0], F2[1] - 21, side > 0 ? "F'(-4,0)" : 'F(4,0)', '#0b6b4a');
      tag((F2[0] + M[0]) / 2, (F2[1] + M[1]) / 2 + 17, "|MF'|=" + Math.hypot(x + Fx, y).toFixed(2), '#0b6b4a');
    } else {
      dot(F2[0], F2[1], 3, '#b9c6da');
    }

    dash(M, H, DIR, 0.95);
    rightAngle(H[0], H[1], y, -side);
    seg(F, M, UP, 1);

    dot(F[0], F[1], 4.6, INK);
    tag(F[0], F[1] + 22, side > 0 ? 'F(4,0)' : "F'(-4,0)", INK);
    dot(H[0], H[1], 3.2, DIR);

    dot(M[0], M[1], 4.8, VIO);
    tag(M[0] + (x > 0 ? 17 : -17), M[1] - 17, 'M', '#5b2ec4');

    /* 两条线段各自贴标签：向上 / 向下错开，免得在 x 轴上叠住 */
    tag((F[0] + M[0]) / 2, (F[1] + M[1]) / 2 - 19, '|MF|=' + mf.toFixed(2), UP);
    tag((M[0] + H[0]) / 2, (M[1] + H[1]) / 2 + 19, 'd=' + d.toFixed(2), '#a86f0a');

    tag(TX(0) - 16, TY(0) + 14, 'O', '#9fb0c7');
    tag(TX(-A) - 6, TY(0) - 24, 'A(-5,0)', '#6b7a90');
    tag(TX(A) + 2, TY(0) - 24, 'B(5,0)', '#6b7a90');

    tagEnd();
  }

  /* ---------- 面板 ---------- */
  var badge = document.getElementById('badge2');
  var badgeTxt = document.getElementById('badgeTxt2');
  var badgeCond = document.getElementById('badgeCond2');
  var lgCurve = document.getElementById('lgCurve2');

  var els = {
    play: document.getElementById('play2'),
    re: document.getElementById('re2'),
    slider: document.getElementById('slider2'),
    thRead: document.getElementById('thRead'),
    vMF: document.getElementById('vMF'),
    vD: document.getElementById('vD'),
    vRatio: document.getElementById('vRatio'),
    vConst: document.getElementById('vConst'),
    vPair: document.getElementById('vPair'),
    total: document.getElementById('vTotal2'),
    track: document.getElementById('rtrack'),
    eq: document.getElementById('eq2'),
    side: document.getElementById('sSide'),
    other: document.getElementById('sF')
  };

  /* d 的最大值出现在左顶点：a + a²/c = 5 + 6.25 = 11.25 */
  var DMAX = A + DL;

  function ui() {
    var side = st.side;
    var t = st.t, x = A * Math.cos(t), y = B * Math.sin(t);
    var d = DL - side * x, mf = Math.hypot(x - side * C, y), r = mf / d;

    els.vMF.textContent = mf.toFixed(2);
    els.vD.textContent = d.toFixed(2);
    els.vRatio.textContent = r.toFixed(3);
    els.thRead.textContent = (t * 180 / Math.PI).toFixed(0) + '°';
    els.vConst.textContent = '恒为 4/5';

    els.vPair.textContent = side > 0
      ? '右焦点 F(4,0) ↔ 右准线 x = 25/4'
      : "左焦点 F'(-4,0) ↔ 左准线 x = −25/4";
    badgeCond.textContent = side > 0 ? '|MF| : d = 4 : 5' : "|MF'| : d' = 4 : 5";

    /* 整条的长度跟着 d 伸缩，蓝色段恒占 4/5 */
    els.track.style.width = Math.max(3, Math.min(100, d / DMAX * 100)).toFixed(2) + '%';

    if (document.activeElement !== els.slider) els.slider.value = st.t;

    var s = '\\dfrac{x^{2}}{25}+\\dfrac{y^{2}}{9}=1';
    if (els.eq.__tex !== s) {
      try { els.eq.innerHTML = katex.renderToString(s, { throwOnError: false, strict: false }); els.eq.__tex = s; }
      catch (e) { els.eq.textContent = s; }
    }
  }

  /* ---------- 动画 ---------- */
  var OMEGA = 0.85;
  var last = performance.now();
  function loop(now) {
    var dt = (now - last) / 1000;
    if (!isFinite(dt) || dt < 0) dt = 0.016;
    if (dt > 0.05) dt = 0.05;
    last = now;
    if (!live) { requestAnimationFrame(loop); return; }

    if (st.playing) {
      st.t += OMEGA * dt;
      if (st.t >= TAU) st.t -= TAU;
      st.prog = Math.min(TAU, st.prog + OMEGA * dt);
    }
    draw();
    ui();
    requestAnimationFrame(loop);
  }

  /* ---------- 交互 ---------- */
  function setPlaying(v) { st.playing = v; els.play.textContent = v ? '暂停' : '播放'; }

  function preset(t0) {
    st.t = t0;
    st.prog = TAU;
    els.slider.value = st.t;
    setPlaying(false);
  }

  els.play.addEventListener('click', function () { setPlaying(!st.playing); });
  els.re.addEventListener('click', function () { st.t = 0; st.prog = 0; setPlaying(true); });
  document.getElementById('s0').addEventListener('click', function () { preset(0); });
  document.getElementById('s1').addEventListener('click', function () { preset(Math.PI / 2); });
  document.getElementById('s2').addEventListener('click', function () { preset(Math.PI); });

  els.other.addEventListener('click', function () {
    st.other = !st.other;
    els.other.className = st.other ? 'btn on' : 'btn';
    els.other.textContent = st.other ? '已叠加 · 点击隐藏' : '叠加另一个焦点';
  });

  /* 左右两条准线各配一个焦点，比值一样是 4/5 */
  els.side.addEventListener('click', function () {
    st.side = -st.side;
    els.side.textContent = st.side > 0 ? '⇄ 换到左准线' : '⇄ 换回右准线';
    ui();
  });

  els.slider.addEventListener('input', function () {
    st.t = parseFloat(els.slider.value);
    st.prog = TAU;
    setPlaying(false);
  });

  window.addEventListener('keydown', function (e) {
    if (!live) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tg = e.target;
    if (tg && /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName)) return;
    if (e.key === 'ArrowLeft') { st.t = Math.max(0, st.t - 0.02); st.prog = TAU; setPlaying(false); els.slider.value = st.t; e.preventDefault(); }
    if (e.key === 'ArrowRight') { st.t = Math.min(TAU, st.t + 0.02); st.prog = TAU; setPlaying(false); els.slider.value = st.t; e.preventDefault(); }
    if (e.key === ' ') { setPlaying(!st.playing); e.preventDefault(); }
  });

  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { szCache = {}; });

  badge.style.color = VIO;
  badge.style.borderColor = VIO;
  badge.style.background = rgba(VIO, 0.06);
  badgeTxt.textContent = '椭圆';
  badgeCond.textContent = '|MF| : d = 4 : 5';
  lgCurve.style.borderColor = VIO;

  window.__ell = window.__ell || {};
  window.__ell.second = {
    setLive: function (v) {
      live = v;
      if (v) { resize(); draw(); ui(); }
    }
  };

  resize();
  requestAnimationFrame(loop);
})();
