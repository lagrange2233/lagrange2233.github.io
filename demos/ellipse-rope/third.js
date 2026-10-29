/* =========================================================================
   例 3（第三定义）：A(-5,0)、B(5,0)，k₁·k₂ = m = -b²/a² 恒成立
   ========================================================================= */
(function () {
  "use strict";

  var AA = 5;              /* A(-5,0)、B(5,0)，a = 5 */
  var TAU = Math.PI * 2;

  var cv = document.getElementById('cv3');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var mlayer = document.getElementById('mlayer3');

  /* m 是斜率之积；t 是 M 的参数角；prog 是已经画出的弧 */
  var st = { m: -4 / 9, t: 0.9, prog: 0, playing: true, foci: false };
  var MMIN = -1.2, MMAX = -0.12;
  var W = 0, H = 0, S = 100, ox = 0, oy = 0, live = false, lastKind = '';

  var COL = { circle: '#2563eb', ellipse: '#7c3aed', tall: '#0f8a5f' };
  var NAME = { circle: '圆', ellipse: '椭圆', tall: '椭圆（长轴竖）' };

  function BV() { return AA * Math.sqrt(-st.m); }   /* b = a√(-m) */
  function TX(x) { return ox + x * S; }
  function TY(y) { return oy - y * S; }

  function kind() {
    if (Math.abs(st.m + 1) < 0.008) return 'circle';
    return st.m < -1 ? 'tall' : 'ellipse';
  }
  function Col() { return COL[kind()]; }

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
    /* 横向要放得下 x∈[-5,5]，纵向要放得下 |m| 最大时的 b≈5.5 */
    S = Math.min(W / 12.4, H / 13.4);
    ox = W * 0.5; oy = H * 0.5;
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

  /* ---------- 图板：单位网格 + 坐标轴 ---------- */
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

  /* ---------- 已经画出的轨迹 ---------- */
  function trace() {
    var span = Math.min(st.prog, TAU);
    if (span < 0.004) return;
    var b = BV(), t0 = st.t - span;
    var N = Math.max(40, Math.ceil(span / 0.025));
    var i, a, x, y;

    ctx.beginPath();
    for (i = 0; i <= N; i++) {
      a = t0 + span * i / N;
      x = TX(AA * Math.cos(a)); y = TY(b * Math.sin(a));
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    var col = Col();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(col, 0.09); ctx.lineWidth = 12; ctx.stroke();
    ctx.strokeStyle = rgba(col, 0.16); ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.stroke();
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

  /* MA、MB：M 贴到 A 或 B 上时淡出（那时斜率不存在） */
  function rays(x, y, alpha) {
    if (alpha <= 0.03) return;
    var M = [TX(x), TY(y)];
    seg([TX(-AA), TY(0)], M, '#2563eb', alpha);   /* k1 */
    seg([TX(AA), TY(0)], M, '#d98a00', alpha);    /* k2 */
  }

  function dot(x, y, r, col) {
    ctx.beginPath(); ctx.arc(x, y, r + 2.4, 0, TAU);
    ctx.fillStyle = rgba(col, 0.14); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = 1.7; ctx.strokeStyle = '#fff'; ctx.stroke();
  }

  function drawFoci(x, y) {
    var b = BV(), cE = Math.sqrt(Math.abs(AA * AA - b * b));
    var up = b > AA;
    var f1 = up ? [0, -cE] : [-cE, 0];
    var f2 = up ? [0, cE] : [cE, 0];
    var M = [TX(x), TY(y)];
    var P1 = [TX(f1[0]), TY(f1[1])], P2 = [TX(f2[0]), TY(f2[1])];

    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(15,138,95,0.55)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(M[0], M[1]); ctx.lineTo(P1[0], P1[1]); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(M[0], M[1]); ctx.lineTo(P2[0], P2[1]); ctx.stroke();
    ctx.restore();

    dot(P1[0], P1[1], 4, '#0f8a5f');
    dot(P2[0], P2[1], 4, '#0f8a5f');
    tag(P1[0], P1[1] - 19, 'F_1', '#0b6b4a');
    tag(P2[0], P2[1] - 19, 'F_2', '#0b6b4a');

    var maj = 2 * Math.max(AA, b);
    tag(TX(0), TY(0) + 50, '|MF_1|+|MF_2|=' + maj.toFixed(0), '#0b6b4a');
  }

  function fmt(v) { return (Math.abs(v) < 100 ? v.toFixed(2) : '\\infty'); }

  /* 把标签贴在线段上，并朝远离 x 轴的一侧错开，免得压住直线 */
  function labOnLine(ax, ay, bx, by, tex, col) {
    var dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
    if (L < 70) return;
    var ux = -dy / L, uy = dx / L;
    if (uy * (by - TY(0)) < 0) { ux = -ux; uy = -uy; }
    tag(ax + dx * 0.44 + ux * 15, ay + dy * 0.44 + uy * 15, tex, col);
  }

  function labels(x, y, b, fade) {
    var dA = Math.hypot(x + AA, y), dB = Math.hypot(x - AA, y);
    tag(TX(-AA) - 4, TY(0) - 25, 'A(-5,0)', '#22405f');
    tag(TX(AA) + 4, TY(0) - 25, 'B(5,0)', '#22405f');
    tag(TX(0) - 15, TY(0) + 13, 'O', '#9fb0c7');

    if (fade < 1) {
      tag(TX(dA < dB ? -AA : AA), TY(0) - 56, '\\text{斜率不存在}', '#dc2626');
    }
    if (fade <= 0.55) return;

    var mx = TX(x), my = TY(y);
    labOnLine(TX(-AA), TY(0), mx, my, 'k_1=' + fmt(y / (x + AA)), '#1f56b3');
    labOnLine(TX(AA), TY(0), mx, my, 'k_2=' + fmt(y / (x - AA)), '#a86f0a');

    /* M 的标签放在椭圆外法线方向；贴到顶点时让位给 A、B 的坐标 */
    if (Math.min(dA, dB) > 1.3) {
      var nx = x / (AA * AA), ny = y / (b * b);
      var ln = Math.hypot(nx, ny) || 1;
      tag(mx + nx / ln * 22, my - ny / ln * 22, 'M', '#5b2ec4');
    }
  }

  function draw() {
    if (W < 10) return;
    board();
    var b = BV(), x = AA * Math.cos(st.t), y = b * Math.sin(st.t);
    var dA = Math.hypot(x + AA, y), dB = Math.hypot(x - AA, y);
    var fade = Math.min(1, Math.min(dA, dB) / 0.55);

    trace();
    if (st.foci) drawFoci(x, y);
    rays(x, y, fade);

    dot(TX(-AA), TY(0), 4.6, '#22405f');
    dot(TX(AA), TY(0), 4.6, '#22405f');

    if (fade < 1) {
      ctx.save();
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(TX(x), TY(y), 13, 0, TAU);
      ctx.strokeStyle = 'rgba(220,38,38,' + (0.8 * (1 - fade) + 0.1).toFixed(3) + ')';
      ctx.lineWidth = 1.6; ctx.stroke();
      ctx.restore();
    }
    dot(TX(x), TY(y), 4.8, '#7c3aed');

    labels(x, y, b, fade);
    tagEnd();
  }

  /* ---------- 面板 ---------- */
  var badge = document.getElementById('badge3');
  var badgeTxt = document.getElementById('badgeTxt3');
  var badgeCond = document.getElementById('badgeCond3');
  var lgCurve = document.getElementById('lgCurve3');

  var els = {
    play: document.getElementById('play3'),
    re: document.getElementById('re3'),
    slider: document.getElementById('slider3'),
    mRead: document.getElementById('mRead'),
    k1v: document.getElementById('k1v'),
    k2v: document.getElementById('k2v'),
    ks1: document.getElementById('ks1'),
    ks2: document.getElementById('ks2'),
    kprod: document.getElementById('kprod'),
    total: document.getElementById('vTotal3'),
    vb: document.getElementById('vb3'),
    vc: document.getElementById('vc3'),
    vf: document.getElementById('vf3'),
    eq: document.getElementById('eq3'),
    foci: document.getElementById('qF')
  };

  function setBar(el, v) {
    if (!isFinite(v)) v = 0;
    var w = Math.min(48, Math.abs(v) / (Math.abs(v) + 2.2) * 48);
    if (v >= 0) { el.style.left = '50%'; el.style.right = 'auto'; }
    else { el.style.left = 'auto'; el.style.right = '50%'; }
    el.style.width = w.toFixed(2) + '%';
  }
  function neg(s) { return String(s).replace('-', '\u2212'); }
  function trim(s) { return String(s).replace(/\.?0+$/, ''); }

  var eqLast = '';
  function eqUpdate() {
    var s;
    if (Math.abs(st.m + 4 / 9) < 1e-6) s = '\\dfrac{x^{2}}{25}+\\dfrac{9y^{2}}{100}=1\\quad(x\\ne\\pm5)';
    else if (Math.abs(st.m + 1) < 0.008) s = 'x^{2}+y^{2}=25\\quad(x\\ne\\pm5)';
    else s = '\\dfrac{x^{2}}{25}+\\dfrac{y^{2}}{' + (-st.m * AA * AA).toFixed(2) + '}=1\\quad(x\\ne\\pm5)';
    if (s === eqLast) return;
    eqLast = s;
    try {
      els.eq.innerHTML = katex.renderToString(s, { throwOnError: false, strict: false });
    } catch (e) { els.eq.textContent = s; }
  }
  function mText() {
    if (Math.abs(st.m + 4 / 9) < 1e-6) return 'm = −4/9';
    if (Math.abs(st.m + 1) < 0.008) return 'm = −1';
    return 'm = ' + neg(st.m.toFixed(3));
  }

  function ui() {
    var b = BV(), x = AA * Math.cos(st.t), y = b * Math.sin(st.t);
    var dA = Math.hypot(x + AA, y), dB = Math.hypot(x - AA, y);
    var ok = Math.min(dA, dB) > 0.32;
    var k1 = y / (x + AA), k2 = y / (x - AA);

    els.k1v.textContent = ok ? neg(k1.toFixed(3)) : '—';
    els.k2v.textContent = ok ? neg(k2.toFixed(3)) : '—';
    setBar(els.ks1, k1);
    setBar(els.ks2, k2);

    els.kprod.textContent = neg(trim(st.m.toFixed(4)));
    els.vb.textContent = b.toFixed(2);
    var cE = Math.sqrt(Math.abs(AA * AA - b * b));
    els.vc.textContent = (2 * cE).toFixed(2);
    els.vf.textContent = cE < 0.02 ? '重合于 O' : (b > AA ? '(0, ±' + cE.toFixed(2) + ')' : '(±' + cE.toFixed(2) + ', 0)');
    els.mRead.textContent = neg(st.m.toFixed(3));
    eqUpdate();

    var kd = kind();
    if (kd !== lastKind) {
      lastKind = kd;
      var col = COL[kd];
      badge.style.color = col;
      badge.style.borderColor = col;
      badge.style.background = rgba(col, 0.06);
      badgeTxt.textContent = NAME[kd];
      lgCurve.style.borderColor = col;
      els.total.style.background = rgba(col, 0.05);
      els.total.style.borderColor = rgba(col, 0.22);
    }
    badgeCond.textContent = mText();
    if (document.activeElement !== els.slider) els.slider.value = st.m;
  }

  /* ---------- 动画 ---------- */
  var OMEGA = 1.0;
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

  function preset(m) {
    st.m = Math.max(MMIN, Math.min(MMAX, m));
    st.t = 0.9;
    st.prog = 0;
    els.slider.value = st.m;
    lastKind = '';
    setPlaying(true);
  }

  els.play.addEventListener('click', function () { setPlaying(!st.playing); });
  els.re.addEventListener('click', function () { st.prog = 0; st.t = 0.9; setPlaying(true); });
  document.getElementById('q0').addEventListener('click', function () { preset(-4 / 9); });
  document.getElementById('q1').addEventListener('click', function () { preset(-1); });
  document.getElementById('q2').addEventListener('click', function () { preset(-0.13); });
  document.getElementById('q3').addEventListener('click', function () { preset(-1.2); });

  els.foci.addEventListener('click', function () {
    st.foci = !st.foci;
    els.foci.className = st.foci ? 'btn on' : 'btn';
    els.foci.textContent = st.foci ? '已叠加焦点 · 点击隐藏' : '叠加第一定义的焦点';
  });

  els.slider.addEventListener('input', function () {
    st.m = parseFloat(els.slider.value);
    lastKind = '';
  });

  window.addEventListener('keydown', function (e) {
    if (!live) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tg = e.target;
    if (tg && /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName)) return;
    if (e.key === 'ArrowLeft') { st.m = Math.max(MMIN, st.m - 0.01); els.slider.value = st.m; lastKind = ''; e.preventDefault(); }
    if (e.key === 'ArrowRight') { st.m = Math.min(MMAX, st.m + 0.01); els.slider.value = st.m; lastKind = ''; e.preventDefault(); }
    if (e.key === ' ') { setPlaying(!st.playing); e.preventDefault(); }
  });

  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { szCache = {}; });

  window.__ell = window.__ell || {};
  window.__ell.third = {
    setLive: function (v) {
      live = v;
      if (v) { resize(); lastKind = ''; draw(); ui(); }
    }
  };

  resize();
  requestAnimationFrame(loop);
})();
