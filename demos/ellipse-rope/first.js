(function () {
  "use strict";

  /* ---------- 几何常量：绳长 2a 固定为 4.00 ---------- */
  var A = 2.0;          /* 半绳长 a */
  var TAU = Math.PI * 2;

  var cv = document.getElementById('cv');
  var ctx = cv.getContext('2d');
  var mlayer = document.getElementById('mlayer');

  /* k = c/a，滑块调它；t 是笔尖的参数角，prog 是已画出的弧长（弧度） */
  var state = { k: 0.62, t: 0, prog: 0, playing: true };

  var W = 0, H = 0, S = 100, ox = 0, oy = 0;
  var live = true;      /* 当前页签是否在显示，隐藏时不画，省电 */

  function CC() { return state.k * A; }
  function BB() { var c = CC(); return Math.sqrt(Math.max(0, A * A - c * c)); }
  function TX(x) { return ox + x * S; }
  function TY(y) { return oy - y * S; }

  /* 四种状态：圆（c=0）/ 椭圆 / 线段（2c=2a，退化）/ 无轨迹（2c>2a） */
  var COL  = { circle: '#2563eb', ellipse: '#7c3aed', segment: '#c2410c', none: '#dc2626' };
  var NAME = { circle: '圆', ellipse: '椭圆', segment: '线段', none: '无轨迹' };
  var COND = { circle: '2c = 0', ellipse: '0 < 2c < 2a', segment: '2c = 2a', none: '2c > 2a' };

  function typeOf() {
    if (state.k > 1.0005) return 'none';
    if (state.k > 0.9995) return 'segment';
    if (state.k < 0.015) return 'circle';
    return 'ellipse';
  }
  function curveColor() { return COL[typeOf()]; }

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
    /* 世界横向要留到 2c 最大时两枚钉子还在画布内（c 最大 1.3a） */
    S = Math.min(W / 6.1, H / 5.4);
    ox = W * 0.5; oy = H * 0.5;
  }

  /* ---------- 文字标签（HTML 浮层 + KaTeX） ---------- */
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
  function paintBoard() {
    ctx.clearRect(0, 0, W, H);
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#fbfdff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    var i, j;
    ctx.fillStyle = '#e6eef8';
    for (i = -6; i <= 6; i++) {
      for (j = -5; j <= 5; j++) {
        ctx.beginPath();
        ctx.arc(TX(i * 0.5), TY(j * 0.5), 1.15, 0, TAU);
        ctx.fill();
      }
    }
  }

  /* 参考圆：半径 a，两端重合时笔尖正好画它 */
  function drawGhost() {
    if (state.k >= 0.995) return;
    ctx.save();
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.arc(TX(0), TY(0), A * S, 0, TAU);
    ctx.strokeStyle = 'rgba(150,166,188,0.50)'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.restore();
    var ang = Math.PI * 0.75;
    tag(TX(A * Math.cos(ang)) - 4, TY(A * Math.sin(ang)) - 14, '\\text{半径 }a\\text{ 的圆}', '#9aa9bd');
  }

  /* 两焦点的连线 */
  function drawFocal(c) {
    if (c < 0.02) return;
    ctx.save();
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(TX(-c), TY(0)); ctx.lineTo(TX(c), TY(0));
    ctx.strokeStyle = 'rgba(203,216,234,0.95)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
  }

  /* 已经画出的那一段轨迹 */
  function drawTrace() {
    var span = Math.min(state.prog, TAU);
    if (span < 0.004) return;
    var b = BB(), col = curveColor();
    var t1 = state.t, t0 = t1 - span;
    var N = Math.max(30, Math.ceil(span / 0.028));
    var i, ang, x, y;

    ctx.beginPath();
    for (i = 0; i <= N; i++) {
      ang = t0 + span * i / N;
      x = TX(A * Math.cos(ang)); y = TY(b * Math.sin(ang));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (typeOf() === 'segment') {
      /* 退化：轨迹就是焦点连线本身，画成一条宽淡带，免得被上面的绳子完全盖住 */
      ctx.strokeStyle = rgba(col, 0.13); ctx.lineWidth = 16; ctx.stroke();
      ctx.strokeStyle = rgba(col, 0.30); ctx.lineWidth = 7; ctx.stroke();
    } else {
      ctx.strokeStyle = rgba(col, 0.09); ctx.lineWidth = 12; ctx.stroke();
      ctx.strokeStyle = rgba(col, 0.17); ctx.lineWidth = 6; ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  /* 细绳：两段，拉直 */
  function drawString(px, py) {
    var c = CC();
    var P1 = [TX(-c), TY(0)], P2 = [TX(c), TY(0)], P = [px, py];
    var segs = [];

    if (c < 0.02) {
      /* 两端重合：两条绳子几乎叠在一起，稍微错开一点才看得出是两段 */
      var dx = P[0] - P1[0], dy = P[1] - P1[1], L = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = -dy / L * 2.4, uy = dx / L * 2.4;
      segs.push([[P1[0] + ux, P1[1] + uy], [P[0] + ux, P[1] + uy]]);
      segs.push([[P1[0] - ux, P1[1] - uy], [P[0] - ux, P[1] - uy]]);
    } else {
      segs.push([P1, P]);
      segs.push([P2, P]);
    }

    ctx.lineCap = 'round';
    var i, s;
    for (i = 0; i < segs.length; i++) {
      s = segs[i];
      ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]); ctx.lineTo(s[1][0], s[1][1]);
      ctx.strokeStyle = 'rgba(217,138,0,0.16)'; ctx.lineWidth = 9; ctx.stroke();
    }
    for (i = 0; i < segs.length; i++) {
      s = segs[i];
      ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]); ctx.lineTo(s[1][0], s[1][1]);
      ctx.strokeStyle = '#d98a00'; ctx.lineWidth = 2.7; ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  function drawPin(x, y) {
    ctx.beginPath(); ctx.arc(x, y + 1.6, 7, 0, TAU);
    ctx.fillStyle = 'rgba(22,32,47,0.10)'; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, 5.8, 0, TAU);
    ctx.fillStyle = '#22405f'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.beginPath(); ctx.arc(x - 1.8, y - 1.9, 1.6, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
  }

  function drawPins(c) {
    if (c < 0.02) {
      var x = TX(0), y = TY(0);
      ctx.save();
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU);
      ctx.strokeStyle = 'rgba(37,99,235,0.5)'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.restore();
      drawPin(x, y);
    } else {
      drawPin(TX(-c), TY(0));
      drawPin(TX(c), TY(0));
    }
  }

  /* 铅笔朝向：沿椭圆外法线；曲线被压扁成线段时法线退化，改成立起来 */
  function pencilAngle(wx, wy, b) {
    if (b < 0.12) return -Math.PI / 2;
    var nx = wx / (A * A), ny = wy / (b * b);
    var len = Math.sqrt(nx * nx + ny * ny) || 1;
    return Math.atan2(-ny / len, nx / len);
  }

  /* 铅笔：笔尖落在 P 上，笔杆沿外法线方向 */
  function drawPencil(px, py, ang) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(ang);

    /* 铅芯 */
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(6.2, -2.3); ctx.lineTo(6.2, 2.3); ctx.closePath();
    ctx.fillStyle = '#2f3a4a'; ctx.fill();

    /* 木笔尖 */
    ctx.beginPath();
    ctx.moveTo(5.8, -2.3); ctx.lineTo(15.5, -5.3); ctx.lineTo(15.5, 5.3); ctx.lineTo(5.8, 2.3);
    ctx.closePath();
    ctx.fillStyle = '#ecd3ac'; ctx.fill();
    ctx.strokeStyle = 'rgba(158,128,88,0.55)'; ctx.lineWidth = 1; ctx.stroke();

    /* 笔杆 */
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(15.5, -5.3, 27, 10.6, 2.6);
    else ctx.rect(15.5, -5.3, 27, 10.6);
    ctx.fillStyle = '#4a7fc1'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.fillRect(16.5, -4.2, 24.5, 2.2);

    /* 金属箍 */
    ctx.fillStyle = '#cdd6e0'; ctx.fillRect(39, -5.3, 4.6, 10.6);
    ctx.fillStyle = 'rgba(0,0,0,0.10)'; ctx.fillRect(39, 2.4, 4.6, 2.9);

    ctx.restore();
  }

  function drawLabels(c, b, px, py) {
    if (c < 0.02) {
      tag(TX(0), TY(0) - 26, 'F_1,\\,F_2\\text{ 重合}', '#22405f');
    } else {
      tag(TX(-c) - 20, TY(0) - 16, 'F_1', '#22405f');
      tag(TX(c) + 20, TY(0) - 16, 'F_2', '#22405f');
      /* 焦点间距 2c */
      if (c * S > 74) tag(TX(0), TY(0) + 32, '2c', '#9fb0c7');
      /* 两段绳子的长度 */
      var mid1 = [(TX(-c) + px) / 2, (TY(0) + py) / 2];
      var mid2 = [(TX(c) + px) / 2, (TY(0) + py) / 2];
      /* 绳子几乎贴着焦点连线时不标，免得和「2c」挤在一起 */
      var far = Math.abs(py - TY(0)) > 56;
      if (far && Math.sqrt(Math.pow(px - TX(-c), 2) + Math.pow(py - TY(0), 2)) > 90) tag(mid1[0], mid1[1], '|PF_1|', '#c07f04');
      if (far && Math.sqrt(Math.pow(px - TX(c), 2) + Math.pow(py - TY(0), 2)) > 90) tag(mid2[0], mid2[1], '|PF_2|', '#c07f04');
    }

    /* 笔尖 P：标在法线反方向，避开铅笔 */
    var ang = pencilAngle(A * Math.cos(state.t), b * Math.sin(state.t), b);
    tag(px - Math.cos(ang) * 21, py - Math.sin(ang) * 21, 'P', '#5b2ec4');
  }

  /* 2a < 2c：没有轨迹，把「绳子不够长」直接画出来 */
  function drawNoLocus(c) {
    var y = TY(0), x1 = TX(-c), x2 = TX(c);
    var L = TX(-c + A), R = TX(c - A);     /* 两段绳子各自能伸到的最远处 */

    ctx.save();
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y);
    ctx.strokeStyle = 'rgba(203,216,234,0.95)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();

    /* 两段绳子：各长 a，中间差一截，两头碰不到一起 */
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(L, y);
    ctx.strokeStyle = 'rgba(217,138,0,0.16)'; ctx.lineWidth = 9; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y); ctx.lineTo(R, y);
    ctx.strokeStyle = 'rgba(217,138,0,0.16)'; ctx.lineWidth = 9; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(L, y);
    ctx.strokeStyle = '#d98a00'; ctx.lineWidth = 2.7; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y); ctx.lineTo(R, y);
    ctx.strokeStyle = '#d98a00'; ctx.lineWidth = 2.7; ctx.stroke();

    /* 缺口：红色虚线 + 两端箭头 */
    ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(R, y);
    ctx.strokeStyle = 'rgba(220,38,38,0.85)'; ctx.lineWidth = 1.8;
    ctx.setLineDash([3, 3]); ctx.stroke();
    ctx.setLineDash([]);
    var i;
    for (i = 0; i < 2; i++) {
      var tipX = i === 0 ? R : L, dir = i === 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(tipX, y); ctx.lineTo(tipX - dir * 6, y - 4);
      ctx.moveTo(tipX, y); ctx.lineTo(tipX - dir * 6, y + 4);
      ctx.strokeStyle = 'rgba(220,38,38,0.9)'; ctx.lineWidth = 1.8; ctx.stroke();
    }
    ctx.lineCap = 'butt';

    /* 笔尖本该在这里，可两段绳子都够不着它 */
    ctx.globalAlpha = 0.38;
    drawPencil(TX(0), y, -Math.PI / 2);
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(TX(0), y, 2.6, 0, TAU);
    ctx.fillStyle = 'rgba(220,38,38,0.9)'; ctx.fill();
  }

  function drawLabelsNone(c) {
    var y = TY(0);
    tag(TX(-c) - 20, y - 16, 'F_1', '#22405f');
    tag(TX(c) + 20, y - 16, 'F_2', '#22405f');
    tag(TX(0), y + 36, '2c>2a\\text{，够不着}', '#dc2626');
    tag(TX(0), y + 66, '2c', '#9fb0c7');
  }

  function draw() {
    paintBoard();
    var ty = typeOf(), c = CC(), b = BB(), t = state.t;

    if (ty === 'none') {
      drawNoLocus(c);
      drawPins(c);
      drawLabelsNone(c);
      tagEnd();
      return;
    }

    var px = TX(A * Math.cos(t)), py = TY(b * Math.sin(t));

    drawGhost();
    drawFocal(c);
    drawTrace();
    drawString(px, py);
    drawPins(c);
    drawPencil(px, py, pencilAngle(A * Math.cos(t), b * Math.sin(t), b));
    drawLabels(c, b, px, py);
    tagEnd();
  }

  /* ---------- 面板 ---------- */
  var badge = document.getElementById('badge');
  var badgeTxt = document.getElementById('badgeTxt');
  var badgeCond = document.getElementById('badgeCond');
  var lgCurve = document.getElementById('lgCurve');
  var els = {
    play: document.getElementById('play'),
    slider: document.getElementById('slider'),
    cRead: document.getElementById('cRead'),
    seg1: document.getElementById('seg1'),
    seg2: document.getElementById('seg2'),
    bar: document.querySelector('.bar'),
    r1v: document.getElementById('r1v'),
    r2v: document.getElementById('r2v'),
    vSum: document.getElementById('vSum'),
    v2c: document.getElementById('v2c'),
    vB: document.getElementById('vB'),
    vE: document.getElementById('vE'),
    vTotal: document.getElementById('vTotal'),
    vType: document.getElementById('vType')
  };

  var lastType = '';
  function updateUI() {
    var ty = typeOf(), c = CC(), b = BB(), t = state.t;
    var none = (ty === 'none');
    var r1 = A + c * Math.cos(t);      /* |PF1| */
    var r2 = A - c * Math.cos(t);      /* |PF2| */

    els.r1v.textContent = none ? '—' : r1.toFixed(2);
    els.r2v.textContent = none ? '—' : r2.toFixed(2);
    els.seg1.style.width = none ? '50%' : (r1 / (2 * A) * 100).toFixed(2) + '%';
    els.seg2.style.width = none ? '50%' : (r2 / (2 * A) * 100).toFixed(2) + '%';
    els.bar.className = none ? 'bar off' : 'bar';

    els.vSum.textContent = none ? '—' : (r1 + r2).toFixed(2);
    els.v2c.textContent = (2 * c).toFixed(2);
    els.vB.textContent = none ? '不存在' : b.toFixed(2);
    els.vE.textContent = (c / A).toFixed(3);
    els.cRead.textContent = (2 * c).toFixed(2);

    if (ty !== lastType) {
      lastType = ty;
      var col = COL[ty];
      badge.style.color = col;
      badge.style.borderColor = col;
      badge.style.background = rgba(col, 0.06);
      badgeTxt.textContent = NAME[ty];
      lgCurve.style.borderColor = col;
      els.vType.textContent = NAME[ty];
      els.vType.style.color = col;
      els.vTotal.style.background = rgba(col, 0.05);
      els.vTotal.style.borderColor = rgba(col, 0.22);
    }
    badgeCond.textContent = COND[ty];
    if (document.activeElement !== els.slider) els.slider.value = state.k;
  }

  /* ---------- 动画 ---------- */
  var OMEGA = 0.95;   /* 弧度 / 秒 */
  var last = performance.now();
  function loop(now) {
    var dt = (now - last) / 1000;
    if (!isFinite(dt) || dt < 0) dt = 0.016;
    if (dt > 0.05) dt = 0.05;
    last = now;
    if (!live) { requestAnimationFrame(loop); return; }

    if (state.playing && typeOf() !== 'none') {
      state.t += OMEGA * dt;
      if (state.t >= TAU) state.t -= TAU;
      state.prog = Math.min(TAU, state.prog + OMEGA * dt);
    }

    draw();
    updateUI();
    requestAnimationFrame(loop);
  }

  /* ---------- 交互 ---------- */
  function setPlaying(v) { state.playing = v; els.play.textContent = v ? '暂停' : '播放'; }

  var KMAX = 1.3;

  function preset(k) {
    state.k = Math.max(0, Math.min(KMAX, k));
    state.prog = 0;
    state.t = 0;
    els.slider.value = state.k;
    lastType = '';
    setPlaying(true);
  }

  els.play.addEventListener('click', function () { setPlaying(!state.playing); });
  document.getElementById('p0').addEventListener('click', function () { preset(0); });
  document.getElementById('p1').addEventListener('click', function () { preset(0.62); });
  document.getElementById('p2').addEventListener('click', function () { preset(0.965); });
  document.getElementById('p3').addEventListener('click', function () { preset(1); });
  document.getElementById('p4').addEventListener('click', function () { preset(1.18); });
  document.getElementById('re').addEventListener('click', function () { state.prog = 0; setPlaying(true); });

  /* 拖到 2c=2a 附近时吸住，免得学生总是差一点点错过临界 */
  function snap(k) {
    return (Math.abs(k - 1) < 0.018) ? 1 : k;
  }

  els.slider.addEventListener('input', function () {
    state.k = parseFloat(els.slider.value);
    lastType = '';
  });
  els.slider.addEventListener('change', function () {
    state.k = snap(state.k);
    els.slider.value = state.k;
    lastType = '';
  });

  window.addEventListener('keydown', function (e) {
    if (!live) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tg = e.target;
    if (tg && /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName)) return;
    if (e.key === 'ArrowLeft') { state.k = snap(Math.max(0, state.k - 0.01)); els.slider.value = state.k; lastType = ''; e.preventDefault(); }
    if (e.key === 'ArrowRight') { state.k = snap(Math.min(KMAX, state.k + 0.01)); els.slider.value = state.k; lastType = ''; e.preventDefault(); }
    if (e.key === ' ') { setPlaying(!state.playing); e.preventDefault(); }
  });

  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { szCache = {}; });

  /* 页签切换：隐藏时停画，重新显示时立即重排重绘一次 */
  window.__ell = window.__ell || {};
  window.__ell.first = {
    setLive: function (v) {
      live = v;
      if (v) { resize(); lastType = ''; draw(); updateUI(); }
    }
  };

  if (window.renderMathInElement) {
    renderMathInElement(document.body, {
      delimiters: [ { left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false } ],
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
      throwOnError: false, strict: false
    });
  }

  resize();
  requestAnimationFrame(loop);
})();
