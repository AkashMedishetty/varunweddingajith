/* acts.js — scroll chapters after the hero:
   kinetic text, the silk seam, the 11:20 tera drop, the three knots, the night sky. */
(function () {
  'use strict';
  var VB = window.VB, $ = VB.$, $$ = VB.$$, seg = VB.seg, E = VB.ease;
  var A = VB.acts = {};

  /* ---------------------------------------------------------------- text + line-art reveals */
  A.reveals = function (g, ST) {
    $$('.kw').forEach(function (node) {
      var words = VB.splitWords(node);
      g.set(words, { yPercent: 70, opacity: 0 });
      ST.create({ trigger: VB.stableParent(node), start: 'top 88%', once: true,
        onEnter: function () { g.to(words, { yPercent: 0, opacity: 1, duration: 0.95, ease: 'power3.out', stagger: 0.045 }); } });
    });
    $$('.reveal-mask').forEach(function (node) {
      var from = node.classList.contains('deity') ? 'inset(100% 0 0 0)' : node.classList.contains('feast') ? 'inset(0 100% 0 0)' : 'inset(0 50% 0 50%)';
      g.set(node, { clipPath: from });
      ST.create({ trigger: VB.stableParent(node), start: 'top 90%', once: true,
        onEnter: function () { g.to(node, { clipPath: 'inset(0% 0% 0% 0%)', duration: 2.2, ease: 'power2.inOut' }); } });
    });
    $$('.name-in').forEach(function (node) {
      g.set(node, { opacity: 0, scale: 0.94, backgroundPosition: '100% 0' });
      ST.create({ trigger: node.parentElement, start: 'top 86%', once: true,
        onEnter: function () { g.to(node, { opacity: 1, scale: 1, backgroundPosition: '0% 0', duration: 2.6, ease: 'power3.out' }); } });
    });
    g.set('#seam .band', { scaleX: 0 });
    g.set('#seam .medal', { scale: 0, rotation: -40 });
    g.to('#seam .band', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '#seam', start: 'top 88%', end: 'top 45%', scrub: 0.6 } });
    ST.create({ trigger: '#seam', start: 'top 55%', once: true,
      onEnter: function () { g.to('#seam .medal', { scale: 1, rotation: 0, duration: 1.2, ease: 'back.out(1.7)' }); } });
  };

  /* ---------------------------------------------------------------- 11:20 — the tera falls */
  var mu = { dropped: false, tl: null };
  A.muLayout = function () {
    var sw = VB.sw, sh = VB.sh, iw = sw, ih = iw * 710 / 1100, iy = sh * 0.335;
    var sc = $('#mu-scene');
    sc.style.width = iw + 'px';
    sc.style.transform = 'translate3d(0,' + iy + 'px,0)';
    var te = $('#tera'), tw = iw * 0.36;
    te.style.width = tw + 'px';
    te.style.height = (tw / 0.75) + 'px';
    te.style.left = (iw * 0.32) + 'px';
    te.style.top = (iy - ih * 0.14) + 'px';
    [['#glow-a', 37, 6], ['#glow-b', 62, 12]].forEach(function (g) { var n = $(g[0]); n.style.left = g[1] + '%'; n.style.top = g[2] + '%'; });
    $('#mu-bot').style.top = (iy + ih + sh * 0.03) + 'px';
  };
  /* the time is fixed at 11:20; scrolling only decides when the tera drops */
  var MU_AT = 0.34;
  A.muhurtham = function (g, ST) {
    A.muLayout();
    if (VB.reduce || !g || !ST) { $('#tera').style.opacity = 0; return; }
    g.set(['#panch', '#countdown'], { opacity: 0, y: 14 });
    mu.tl = g.timeline({ paused: true })
      .to('#tera', { y: function () { return VB.sw * 0.5; }, rotation: 7, scaleY: 0.82, opacity: 0, duration: 1.25, ease: 'power2.in' }, 0)
      .fromTo(['#glow-a', '#glow-b'], { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1.25, duration: 0.7, ease: 'power2.out', stagger: 0.12 }, 0.55)
      .to(['#glow-a', '#glow-b'], { opacity: 0, scale: 1.8, duration: 1.4, ease: 'power1.out' }, 1.35)
      .to('#clock', { color: '#ffd98f', textShadow: '0 0 28px rgba(255,200,90,.55)', duration: 0.8 }, 0.5)
      .to('#panch', { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 0.9)
      .to('#countdown', { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 1.2);
    ST.create({
      trigger: '#muhurtham', start: 'top top', end: 'bottom bottom', scrub: 0.4,
      onUpdate: function (self) {
        var p = self.progress;
        $('#mu-scene img').style.transform = 'scale(' + (1 + 0.05 * seg(p, MU_AT, 1)).toFixed(4) + ')';
        if (!mu.dropped && p >= MU_AT) {
          mu.dropped = true;
          mu.tl.play();
          VB.bell(560, 0.5, true);
          setTimeout(function () { if (mu.dropped) VB.bell(560, 0.36); }, 1100);
          setTimeout(function () { if (mu.dropped) VB.bell(560, 0.26); }, 2200);
        } else if (mu.dropped && p < MU_AT - 0.08) { mu.dropped = false; mu.tl.reverse(); }
      }
    });
  };

  /* ---------------------------------------------------------------- mangalya dharana
     No diagram. The painting, a slow push toward his hands at her neck, and three
     beats of lamplight, one per knot, each with a soft bell. The words said while
     tying arrive on the first two beats; the blessing on the third. */
  var BEATS = [0.24, 0.47, 0.7];
  var kn = { p: 0, on: [false, false, false], tw: null, FX: 0.4, FY: 0.36, x: 0, y: 0, iw: 1, ih: 1 };
  A.knLayout = function () {
    var sw = VB.sw, sh = VB.sh, iw = sw * 1.12, ih = iw * 863 / 1100;
    kn.iw = iw; kn.ih = ih; kn.x = (sw - iw) / 2; kn.y = sh - ih + sh * 0.01;
    var m = $('#mangalya');
    m.style.width = iw + 'px';
    m.style.transformOrigin = (kn.FX * 100) + '% ' + (kn.FY * 100) + '%';
    var l = $('#mg-light');
    l.style.width = l.style.height = (iw * 0.9) + 'px';
  };
  A.knFrame = function (p) {
    kn.p = p;
    var q = VB.reduce ? 1 : p;
    var push = E.sine(q), s = 1 + 0.14 * push, y = kn.y - push * VB.sh * 0.03;
    $('#mangalya').style.transform = 'translate3d(' + kn.x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + s.toFixed(4) + ')';
    var glow = 0;
    BEATS.forEach(function (b, i) {
      var k = seg(q, b - 0.015, b + 0.13);
      if (k > 0 && k < 1) glow = Math.max(glow, Math.sin(Math.PI * k) * (i === 2 ? 0.8 : 0.6));
      if (VB.reduce || !kn.tw) return;
      if (!kn.on[i] && q >= b) { kn.on[i] = true; kn.tw[i].play(); VB.bell(620 + i * 40, 0.24); }
      else if (kn.on[i] && q < b - 0.05) { kn.on[i] = false; kn.tw[i].reverse(); }
    });
    glow = Math.max(glow, seg(q, 0.76, 0.9) * 0.28);
    var l = $('#mg-light'), r = kn.iw * 0.45;
    var fx = kn.x + kn.FX * kn.iw, fy = y + kn.FY * kn.ih;
    l.style.transform = 'translate3d(' + (fx - r).toFixed(1) + 'px,' + (fy - r).toFixed(1) + 'px,0) scale(' + (0.9 + 0.1 * glow).toFixed(3) + ')';
    l.style.opacity = glow.toFixed(3);
  };
  A.knots = function (g, ST) {
    A.knLayout();
    if (VB.reduce || !g || !ST) { A.knFrame(1); return; }
    var words = function (sel, i) { var n = $$(sel)[i]; return n ? VB.splitWords(n) : []; };
    var l1 = words('#kn-shloka .t .sl', 0).concat(words('#kn-shloka .e .sl', 0));
    var l2 = words('#kn-shloka .t .sl', 1).concat(words('#kn-shloka .e .sl', 1));
    var tl = $$('#kn-title .t .ln'), el = $$('#kn-title .e .ln');
    g.set(l1.concat(l2), { yPercent: 60, opacity: 0 });
    g.set(tl.concat(el), { opacity: 0, y: 18 });
    var rise = function () { return { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.05, ease: 'power3.out', paused: true }; };
    kn.tw = [
      g.to(l1, rise()),
      g.to(l2, rise()),
      g.timeline({ paused: true })
        .to(tl, { opacity: 1, y: 0, duration: 1.4, stagger: 0.3, ease: 'power3.out' }, 0)
        .to(el, { opacity: 1, y: 0, duration: 1.4, stagger: 0.3, ease: 'power3.out' }, 0)
    ];
    A.knFrame(0);
    ST.create({ trigger: '#knots', start: 'top top', end: 'bottom bottom', scrub: 0.5, onUpdate: function (self) { A.knFrame(self.progress); } });
  };

  /* ---------------------------------------------------------------- night: Saptarishi + Arundhati */
  var nt = { p: 0, stars: [], dip: [], F: null, S: null };
  var DIP = [[-3.4, 5.6], [0, 0], [4.3, -1.03], [9.8, -2.1], [12.9, 1.24], [20.4, -1.45], [20.1, -6.8]];
  var LINES = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]];
  A.ntLayout = function () {
    var sw = VB.sw, sh = VB.sh;
    var h = Math.min(sh * 0.56, sw * 0.78 * 1150 / 709), w = h * 709 / 1150;
    var x = sw - w - sw * 0.01, y = sh - h;
    var a = $('#arundhati');
    a.style.width = w + 'px';
    nt.ax = x; nt.ay = y;
    var F = { x: x + 0.0227 * w, y: y + 0.0052 * h }, dir = { x: -0.5691, y: -0.8223 };
    var t = (F.x - sw * 0.13) / -dir.x;
    if (F.y + dir.y * t < sh * 0.27) t = (F.y - sh * 0.27) / -dir.y;
    nt.F = F;
    nt.S = { x: F.x + dir.x * t, y: F.y + dir.y * t };
    var k = sw / 44, M = { x: nt.S.x - 6, y: nt.S.y + 6 };
    nt.dip = DIP.map(function (d) { return { x: M.x + d[0] * k, y: M.y + d[1] * k }; });
    var la = $('#lab-a'), lv = $('#lab-v');
    la.style.left = nt.S.x + 'px'; la.style.top = (nt.S.y - 4) + 'px';
    lv.style.left = (M.x + 4) + 'px'; lv.style.top = (M.y + 40) + 'px';
    var rnd = (function (s) { return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })(20261016);
    nt.stars = [];
    for (var i = 0; i < 130; i++) nt.stars.push({ x: rnd() * sw, y: rnd() * sh * 0.72, r: 0.35 + rnd() * 1.05, ph: rnd() * 6.3, sp: 0.6 + rnd() * 1.6 });
    var c = $('#sky'), d = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(sw * d); c.height = Math.round(sh * d); nt.d = d;
  };
  A.ntFrame = function (now) {
    var c = $('#sky'), x = c.getContext('2d'), d = nt.d, p = VB.reduce ? 1 : nt.p, t = now / 1000;
    x.setTransform(d, 0, 0, d, 0, 0);
    x.clearRect(0, 0, VB.sw, VB.sh);
    var sa = seg(p, 0, 0.25);
    nt.stars.forEach(function (s) {
      x.globalAlpha = sa * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph)));
      x.fillStyle = '#fff7e2';
      x.beginPath(); x.arc(s.x, s.y, s.r, 0, 6.2832); x.fill();
    });
    var lq = seg(p, 0.25, 0.5);
    x.strokeStyle = 'rgba(233,200,120,.55)'; x.lineWidth = 0.9;
    LINES.forEach(function (ln, i) {
      var f = VB.clamp(lq * LINES.length - i, 0, 1);
      if (f <= 0) return;
      var a = nt.dip[ln[0]], b = nt.dip[ln[1]];
      x.globalAlpha = 0.9;
      x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(VB.lerp(a.x, b.x, f), VB.lerp(a.y, b.y, f)); x.stroke();
    });
    nt.dip.forEach(function (s, i) {
      x.globalAlpha = sa;
      var g = x.createRadialGradient(s.x, s.y, 0, s.x, s.y, 9);
      g.addColorStop(0, 'rgba(255,244,210,.9)'); g.addColorStop(1, 'rgba(255,244,210,0)');
      x.fillStyle = g; x.beginPath(); x.arc(s.x, s.y, 9, 0, 6.2832); x.fill();
      x.fillStyle = '#fffaf0'; x.beginPath(); x.arc(s.x, s.y, i === 1 ? 2.2 : 1.8, 0, 6.2832); x.fill();
    });
    var pq = seg(p, 0.5, 0.7);
    if (pq > 0) {
      x.globalAlpha = 0.85; x.setLineDash([2, 5]); x.strokeStyle = '#f2cf7c'; x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(nt.F.x, nt.F.y - 4); x.lineTo(VB.lerp(nt.F.x, nt.S.x, pq), VB.lerp(nt.F.y - 4, nt.S.y, pq)); x.stroke();
      x.setLineDash([]);
    }
    var fl = seg(p, 0.66, 0.85), S = nt.S;
    x.globalAlpha = Math.max(sa * 0.7, fl);
    var R = 6 + fl * (16 + 3 * Math.sin(t * 3));
    var gr = x.createRadialGradient(S.x, S.y, 0, S.x, S.y, R);
    gr.addColorStop(0, 'rgba(255,236,180,1)'); gr.addColorStop(0.3, 'rgba(255,214,120,.55)'); gr.addColorStop(1, 'rgba(255,214,120,0)');
    x.fillStyle = gr; x.beginPath(); x.arc(S.x, S.y, R, 0, 6.2832); x.fill();
    x.fillStyle = '#fffdf5'; x.beginPath(); x.arc(S.x, S.y, 1.5 + fl, 0, 6.2832); x.fill();
    if (fl > 0) {
      x.globalAlpha = fl * 0.8; x.strokeStyle = 'rgba(255,240,200,.8)'; x.lineWidth = 0.8;
      var ray = 7 + fl * 14;
      x.beginPath(); x.moveTo(S.x - ray, S.y); x.lineTo(S.x + ray, S.y); x.moveTo(S.x, S.y - ray); x.lineTo(S.x, S.y + ray); x.stroke();
    }
    x.globalAlpha = 1;
    $('#lab-a').style.opacity = fl;
    $('#lab-v').style.opacity = fl * 0.75;
    var up = (1 - seg(p, 0, 0.35)) * VB.sh * 0.06;
    $('#arundhati').style.transform = 'translate3d(' + nt.ax + 'px,' + (nt.ay + up) + 'px,0)';
  };
  A.night = function (g, ST) {
    A.ntLayout();
    A.ntFrame(performance.now());
    if (VB.reduce) return;
    var on = false, raf = 0;
    var tick = function (now) { raf = 0; A.ntFrame(now); if (on) raf = requestAnimationFrame(tick); };
    ST.create({ trigger: '#night', start: 'top bottom', end: 'bottom top',
      onToggle: function (self) { on = self.isActive; if (on && !raf) raf = requestAnimationFrame(tick); } });
    ST.create({ trigger: '#night', start: 'top top', end: 'bottom bottom', scrub: 0.5, onUpdate: function (self) { nt.p = self.progress; } });
  };

  A.layout = function () { A.muLayout(); A.knLayout(); A.knFrame(VB.reduce ? 1 : kn.p); A.ntLayout(); A.ntFrame(performance.now()); };
})();
