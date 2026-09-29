/* hero.js — the card (cover), the gatefold opening and the temple scene.
   One state object S is tweened by the opening timeline and by scroll;
   a single rAF loop turns S into transforms while the hero is on screen. */
(function () {
  'use strict';
  var VB = window.VB, $ = VB.$, $$ = VB.$$, seg = VB.seg, E = VB.ease;
  var H = VB.hero = {};
  var S = H.S = { p: 0, ink: 0, settle: 1, leafIn: 0, garIn: 0, garSwing: 1, coupleIn: 0, cowIn: 0, ganIn: 0, cue: 0 };
  var L = H.L = {};
  var el = {}, visible = true, raf = 0, opened = false, openTl = null;

  function tf(node, x, y, s, r, px, py) {
    px = px || 0; py = py || 0;
    node.style.transform = 'translate3d(' + (x + px).toFixed(2) + 'px,' + (y + py).toFixed(2) + 'px,0) rotate(' + (r || 0).toFixed(3) +
      'deg) scale(' + s.toFixed(4) + ') translate(' + (-px).toFixed(2) + 'px,' + (-py).toFixed(2) + 'px)';
  }

  /* ---------------------------------------------------------------- layout (stage px) */
  H.layout = function () {
    var sw = VB.sw, sh = VB.sh;
    var tw = Math.min(sw * 1.1, sh * 0.6 * 1086 / 1154), th = tw * 1154 / 1086;
    L.t = { x: (sw - tw) / 2, y: sh * 0.07, w: tw, h: th };
    L.door = { x: L.t.x + tw * 0.5, y: L.t.y + th * 0.745 };
    L.thr = { x: L.t.x + tw * 0.5, y: L.t.y + th * 0.9 };
    var gd = 0.041 * tw * 2 * 1.75;
    L.g = { w: gd, h: gd * 627 / 600, cx: L.t.x + 0.4991 * tw, cy: L.t.y + 0.3102 * th };
    var ch = Math.min(sh * 0.45, sw * 0.62 * 1100 / 674), cw = ch * 674 / 1100;
    L.c = { w: cw, h: ch, x: sw * 0.385 - cw / 2, y: sh - ch - sh * 0.012 };
    var ow = sw * 0.37, oh = ow * 373 / 520;
    L.cow = { w: ow, h: oh, x: sw - ow - sw * 0.01, y: sh - oh - sh * 0.022 };
    var lw = sw * 0.5, lh = lw * 727 / 640;
    L.lf = { w: lw, h: lh, xl: -sw * 0.08, xr: sw - lw + sw * 0.08, y: -sh * 0.02 };
    var gh = sh * 0.47, gw = gh * 103 / 1000;
    L.gar = { w: gw, h: gh, xl: sw * 0.028, xr: sw - sw * 0.028 - gw };
    var gh2 = sh * 0.29, gw2 = gh2 * 103 / 1000;
    L.gar2 = { w: gw2, h: gh2, xl: sw * 0.145, xr: sw - sw * 0.145 - gw2 };

    el.gan.style.width = L.g.w + 'px';
    el.couple.style.width = cw + 'px';
    el.cow.style.width = ow + 'px';
    el.leaves.forEach(function (n) { n.style.width = lw + 'px'; });
    el.gars.forEach(function (n) { n.style.width = gw + 'px'; });
    el.gars2.forEach(function (n) { n.style.width = gw2 + 'px'; });
    el.glow.style.width = el.glow.style.height = '60px';
    sizeCanvas(el.petals);
    VB.temple.resize();
    H.apply(performance.now());
  };

  function sizeCanvas(c) {
    var d = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(c.clientWidth * d);
    c.height = Math.round(c.clientHeight * d);
    c.__d = d;
  }

  /* ---------------------------------------------------------------- one frame of the scene */
  H.apply = function (now) {
    var p = S.p, t = now / 1000;
    /* camera: a slow dolly into the temple doorway */
    var z = (1 + 1.3 * E.in(seg(p, 0.05, 1))) * (1 + 0.06 * (1 - S.settle));
    var d = L.door;
    var tx = d.x + (L.t.x - d.x) * z, ty = d.y + (L.t.y - d.y) * z;
    VB.temple.set(tx, ty, L.t.w * z, L.t.h * z, S.ink);
    VB.temple.render();

    /* Ganesha rides the gopuram */
    var gx = d.x + (L.g.cx - d.x) * z, gy = d.y + (L.g.cy - d.y) * z;
    tf(el.gan, gx - L.g.w * z / 2, gy - L.g.h * z / 2, z, 0);
    el.gan.style.opacity = S.ganIn;

    /* the couple walk up to the steps and into the light */
    var q = E.sine(seg(p, 0, 0.72));
    var thr = { x: d.x + (L.thr.x - d.x) * z, y: d.y + (L.thr.y - d.y) * z };
    var bx = VB.lerp(L.c.x + L.c.w / 2, thr.x, q);
    var by = VB.lerp(L.c.y + L.c.h, thr.y, E.io(q)) + (1 - S.coupleIn) * L.c.h * 0.12;
    var cs = VB.lerp(1, 0.2, E.out(q)) * (1.04 - 0.04 * S.coupleIn);
    tf(el.couple, bx - L.c.w * cs / 2, by - L.c.h * cs, cs, 0);
    el.couple.style.opacity = S.coupleIn * (1 - seg(p, 0.6, 0.74));

    /* the cow stays in the courtyard as the camera moves past */
    var q2 = E.in(seg(p, 0, 0.5));
    tf(el.cow, L.cow.x + q2 * VB.sw * 0.5 + (1 - S.cowIn) * VB.sw * 0.22, L.cow.y + q2 * VB.sh * 0.12, 1 + 0.35 * q2, 0);
    el.cow.style.opacity = S.cowIn * (1 - seg(p, 0.3, 0.5));

    /* banana leaves grow in, sway, then part like curtains */
    var q3 = E.in(seg(p, 0, 0.55));
    var sway = Math.sin(t * 0.9) * 1.4 + Math.sin(t * 2.3 + 1) * 0.5;
    var li = S.leafIn, ls = (0.72 + 0.28 * li) * (1 + 0.5 * q3);
    tf(el.leaves[0], L.lf.xl - q3 * VB.sw * 0.45, L.lf.y - q3 * VB.sh * 0.2, ls, -16 * (1 - li) + sway, 0, L.lf.h * 0.55);
    tf(el.leaves[1], L.lf.xr + q3 * VB.sw * 0.45, L.lf.y - q3 * VB.sh * 0.2, ls, 16 * (1 - li) - sway * 0.9, L.lf.w, L.lf.h * 0.55);
    el.leaves[0].style.opacity = el.leaves[1].style.opacity = Math.min(1, li * 1.4);

    /* garlands drop and swing, bells settle to a gentle sway */
    var gi = S.garIn, amp = 7 * S.garSwing + 1.4;
    var sw1 = Math.sin(t * 1.7) * amp, sw2 = Math.sin(t * 1.4 + 2) * amp * 0.8;
    var gy0 = -(1 - gi) * L.gar.h * 1.05 - q3 * VB.sh * 0.25;
    tf(el.gars[0], L.gar.xl - q3 * VB.sw * 0.3, gy0, 1, sw1, L.gar.w / 2, 0);
    tf(el.gars[1], L.gar.xr + q3 * VB.sw * 0.3, gy0, 1, -sw2, L.gar.w / 2, 0);
    var gy1 = -(1 - gi) * L.gar2.h * 1.1 - q3 * VB.sh * 0.25;
    tf(el.gars2[0], L.gar2.xl - q3 * VB.sw * 0.3, gy1, 1, sw2 * 0.8, L.gar2.w / 2, 0);
    tf(el.gars2[1], L.gar2.xr + q3 * VB.sw * 0.3, gy1, 1, -sw1 * 0.8, L.gar2.w / 2, 0);

    /* light floods out of the doorway into the next chapter */
    var q4 = seg(p, 0.58, 1);
    el.glow.style.transform = 'translate3d(' + (d.x - 30) + 'px,' + (d.y - 30) + 'px,0) scale(' + (0.001 + E.in(q4) * 42).toFixed(3) + ')';
    el.glow.style.opacity = seg(p, 0.58, 0.72);

    el.cue.style.opacity = S.cue * (1 - seg(p, 0, 0.05));
    petals(t);
  };

  /* ---------------------------------------------------------------- petals */
  var P = [], pctx = null, pOn = false;
  function mkPetal(i, top) {
    var cols = ['#b3121c', '#d42a2a', '#e8841b', '#f2a93b', '#fff4dc'];
    return { x: Math.random(), y: top ? -0.05 - Math.random() * 0.3 : Math.random(), r: 3 + Math.random() * 4.5, v: 0.018 + Math.random() * 0.025,
      a: Math.random() * 6.3, w: 0.5 + Math.random(), c: cols[i % cols.length], o: 0.55 + Math.random() * 0.4 };
  }
  var lastT = 0;
  function petals(t) {
    if (!pOn || !pctx) return;
    var c = el.petals, d = c.__d || 1, W = c.width, Hh = c.height, dt = Math.min(0.05, t - (lastT || t));
    lastT = t;
    pctx.clearRect(0, 0, W, Hh);
    for (var i = 0; i < P.length; i++) {
      var k = P[i];
      k.y += k.v * dt * (1 + S.p * 2);
      k.a += dt * 1.3 * k.w;
      var x = (k.x + Math.sin(k.a) * 0.02) * W, y = k.y * Hh;
      if (k.y > 1.05) { P[i] = mkPetal(i, true); continue; }
      pctx.globalAlpha = k.o * (1 - seg(S.p, 0.55, 0.8));
      pctx.fillStyle = k.c;
      pctx.beginPath();
      pctx.ellipse(x, y, k.r * d, k.r * d * 0.55, k.a, 0, 6.2832);
      pctx.fill();
    }
  }

  /* ---------------------------------------------------------------- loop */
  function loop(now) {
    raf = 0;
    if (!visible) return;
    H.apply(now);
    raf = requestAnimationFrame(loop);
  }
  H.run = function () { if (!raf && visible) raf = requestAnimationFrame(loop); };

  /* ---------------------------------------------------------------- cover */
  function gslotRect() {
    var r = $('#gan-slot').getBoundingClientRect(), c = $('#cover').getBoundingClientRect();
    return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.width * 627 / 600 };
  }
  H.placeFly = function () {
    var f = $('#gan-fly'), r = gslotRect();
    f.style.width = r.w + 'px';
    f.style.transform = 'translate3d(' + r.x + 'px,' + r.y + 'px,0)';
  };

  H.buildCover = function () {
    var face = $('#face'), hand = $$('.cv-to .hand', face)[0];
    if (VB.guest) {
      hand.textContent = VB.guest;
      hand.classList.add(VB.isTelugu(VB.guest) ? 'te' : 'en');
    } else {
      $('.cv-to .line', face).style.display = 'none';
    }
    var clone = face.cloneNode(true);
    clone.removeAttribute('id');
    $$('[id]', clone).forEach(function (n) { n.removeAttribute('id'); });
    $$('button', clone).forEach(function (b) { b.tabIndex = -1; });
    var dr = $('#cover .door.r');
    dr.appendChild(clone);
    var shade = document.createElement('div');
    shade.className = 'shade';
    dr.appendChild(shade);
  };

  H.introCover = function () {
    H.placeFly();
    if (VB.reduce || !window.gsap) {
      $$('.cv .fx').forEach(function (n) { n.style.opacity = 1; });
      $$('.face .dab').forEach(function (n) { n.style.opacity = 0.92; });
      $$('.cv-to .hand').forEach(function (n) { n.style.clipPath = 'none'; });
      $('#gan-fly').style.opacity = 1;
      return;
    }
    var g = window.gsap, tl = g.timeline({ delay: 0.15 });
    tl.fromTo('.cv-invoc', { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, 0)
      .fromTo('#gan-fly', { opacity: 0, scale: 0.86, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 1.3, ease: 'power3.out' }, 0.1)
      .fromTo('#gan-fly .shine', { backgroundPosition: '120% 0' }, { backgroundPosition: '-60% 0', duration: 1.8, ease: 'power2.inOut' }, 0.7)
      .fromTo('.cv-head', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out' }, 0.35)
      .fromTo('.cv-flo', { opacity: 0, scaleX: 0.3 }, { opacity: 1, scaleX: 1, duration: 1, ease: 'power3.out' }, 0.6)
      .fromTo('.cv-names', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 0.7)
      .fromTo('.cv-date', { opacity: 0 }, { opacity: 1, duration: 1, ease: 'power2.out' }, 0.85)
      .fromTo('.cv-to', { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'power2.out' }, 1.0)
      .to('.cv-to .hand', { clipPath: 'inset(-40% 0% -40% 0)', duration: 1.9, ease: 'power1.inOut' }, 1.35)
      .fromTo('.seal', { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'back.out(1.8)' }, 1.5);
    ['.d1', '.d2', '.d3', '.d4'].forEach(function (c, i) {
      tl.fromTo('.face .dab' + c, { opacity: 0, scale: 1.35 }, { opacity: 0.94, scale: 1, duration: 0.55, ease: 'power3.out' }, 0.55 + i * 0.16);
    });
    /* foil catches the light: phone tilt on Android, pointer on desktop, gentle sweep otherwise */
    var shine = $('#gan-fly .shine');
    var sweep = g.to(shine, { backgroundPosition: '-60% 0', duration: 2.4, ease: 'sine.inOut', repeat: -1, repeatDelay: 2.6, delay: 3.2, startAt: { backgroundPosition: '120% 0' } });
    var tilt = function (x) { sweep.pause(); shine.style.backgroundPosition = (120 - VB.clamp(x, 0, 1) * 180).toFixed(1) + '% 0'; };
    window.addEventListener('deviceorientation', function (e) { if (!opened && e.gamma != null) tilt((e.gamma + 30) / 60); }, { passive: true });
    if (VB.fine) $('#cover').addEventListener('pointermove', function (e) { if (!opened) tilt(e.clientX / window.innerWidth); });
  };

  /* ---------------------------------------------------------------- the opening */
  H.open = function () {
    if (opened) { if (openTl) openTl.progress(1); return; }
    opened = true;
    VB.music.start();
    var cover = $('#cover'), fly = $('#gan-fly');
    cover.classList.add('opened');
    var from = gslotRect();
    var s1 = L.g.w / from.w;
    var done = function () {
      document.documentElement.classList.remove('locked');
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      if (VB.afterOpen) VB.afterOpen();
    };
    if (VB.reduce || !window.gsap) {
      S.ink = 1; S.leafIn = S.garIn = S.coupleIn = S.cowIn = S.ganIn = S.cue = 1; S.garSwing = 0; S.settle = 1;
      cover.style.transition = 'opacity .5s';
      cover.style.opacity = 0;
      setTimeout(function () { cover.style.display = 'none'; }, 520);
      H.apply(performance.now());
      done();
      return;
    }
    var g = window.gsap;
    S.settle = 0;
    pctx = el.petals.getContext('2d');
    for (var i = 0; i < (VB.sw < 400 ? 14 : 18); i++) P.push(mkPetal(i, false));
    var tl = openTl = g.timeline();
    tl.add(done, 2.3);
    tl.to('.seal', { scale: 0.9, duration: 0.14, ease: 'power2.in' }, 0)
      .to('.seal', { scale: 1, opacity: 0, duration: 0.4, ease: 'power2.out' }, 0.14)
      .to('#cover .door.l', { rotationY: -104, duration: 1.7, ease: 'power3.inOut' }, 0.12)
      .to('#cover .door.r', { rotationY: 104, duration: 1.7, ease: 'power3.inOut' }, 0.12)
      .to('#cover .shade', { opacity: 0.85, duration: 1.2, ease: 'power1.in' }, 0.2)
      .fromTo(fly, { x: from.x, y: from.y, scale: 1, transformOrigin: '0 0' },
        { x: L.g.cx - L.g.w / 2, y: L.g.cy - L.g.h / 2, scale: s1, duration: 1.75, ease: 'power3.inOut' }, 0.12)
      .to(S, { settle: 1, duration: 2.6, ease: 'power2.out' }, 0.2)
      .to(S, { ink: 1, duration: 4.4, ease: 'power1.inOut' }, 0.5)
      .to(S, { leafIn: 1, duration: 1.7, ease: 'back.out(1.25)' }, 1.15)
      .to(S, { garIn: 1, duration: 1.3, ease: 'power2.out' }, 1.4)
      .to(S, { garSwing: 0, duration: 3.4, ease: 'power1.out' }, 1.8)
      .add(function () { S.ganIn = 1; fly.style.opacity = 0; }, 1.9)
      .add(function () { cover.style.display = 'none'; }, 2.0)
      .to(S, { coupleIn: 1, duration: 1.9, ease: 'power2.out' }, 2.4)
      .to(S, { cowIn: 1, duration: 1.5, ease: 'power2.out' }, 2.9)
      .add(function () { pOn = true; }, 3.0)
      .to(S, { cue: 1, duration: 0.8, ease: 'power1.out' }, 4.4);
    H.run();
  };

  /* ---------------------------------------------------------------- init */
  H.init = function () {
    el.gan = $('#gan');
    el.couple = $('#couple');
    el.cow = $('#cow');
    el.leaves = $$('#hero .leaf');
    el.gars = [$('#hero .gar.l'), $('#hero .gar.r')];
    el.gars2 = [$('#hero .gar.l2'), $('#hero .gar.r2')];
    el.glow = $('#door-glow');
    el.petals = $('#petals');
    el.cue = $('#cue');
    $$('#hero .h-el,#gan').forEach(function (n) { n.style.transformOrigin = '0 0'; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) H.run();
      }).observe($('#hero'));
    }
    H.buildCover();
    var cover = $('#cover');
    cover.addEventListener('click', H.open);
    cover.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); H.open(); } });
  };

  /* scroll act, wired by main.js once ScrollTrigger exists */
  H.scroll = function (ST) {
    if (VB.reduce) return;
    ST.create({
      trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: 0.6,
      onUpdate: function (self) { S.p = self.progress; H.run(); }
    });
  };
})();
