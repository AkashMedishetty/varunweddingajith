/* autoscroll.js — the invitation plays itself.
   After the card opens it glides through every scene at an unhurried pace and
   pauses briefly at the big moments. Any touch, wheel or key hands control to the
   guest; after a few quiet seconds it carries on from wherever they are.
   The rail on the right shows where you are; the button bottom-left turns it off. */
(function () {
  'use strict';
  var VB = window.VB, $ = VB.$;
  var AS = VB.auto = { on: false, wanted: true, ended: false, waiting: false };
  var RESUME_MS = 3000, START_MS = 2000;
  var fy = 0, v = 0, last = 0, raf = 0, holdUntil = 0, holds = [], hi = 0, expectY = -1, idle = 0, started = false;
  var btn, rail, fill, dot, railH = 1, painting = false;
  var CHAPTERS = ['#aahvanam', '#families', '#muhurtham', '#knots', '#talambralu', '#venue', '#night', '#hosts'];

  function curY() { return window.pageYOffset || document.documentElement.scrollTop || 0; }
  function maxY() { return Math.max(0, document.documentElement.scrollHeight - window.innerHeight); }
  function docTop(el) { return el.getBoundingClientRect().top + curY(); }
  function setY(y) {
    expectY = Math.round(y);
    if (VB.lenis) VB.lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  }

  /* ---------------------------------------------------------------- where to pause, and for how long */
  AS.layout = function () {
    if (!rail) return;
    var list = [], vh = window.innerHeight;
    var act = function (sel, at, ms) {
      var el = $(sel);
      if (el) list.push({ y: docTop(el) + at * (el.offsetHeight - VB.sh), ms: ms });
    };
    var mid = function (sel, ms) {
      var el = $(sel);
      if (!el) return;
      var r = el.getBoundingClientRect();
      list.push({ y: r.top + curY() + r.height / 2 - vh / 2, ms: ms });
    };
    mid('#aahvanam .shloka', 1200);
    mid('#seam', 900);
    act('#muhurtham', (VB.acts.muAt || 0.34) + 0.04, 3000);
    act('#knots', 0.27, 1100);
    act('#knots', 0.5, 1100);
    act('#knots', 0.76, 2200);
    mid('#tb-stage', 2600);
    mid('#venue .actions', 1600);
    act('#night', 0.9, 2400);
    mid('#vb', 2000);
    holds = list.filter(function (h) { return h.y > 0; }).sort(function (a, b) { return a.y - b.y; });
    hi = 0;
    while (hi < holds.length && holds[hi].y < curY() - 2) hi++;
    var m = maxY() || 1, ticks = rail.querySelectorAll('.tick');
    for (var i = 0; i < ticks.length; i++) {
      var el = $(CHAPTERS[i]);
      ticks[i].style.top = (el ? VB.clamp(docTop(el) / m, 0, 1) * 100 : 0).toFixed(2) + '%';
    }
    railH = rail.clientHeight;
    AS.paint();
  };

  /* ---------------------------------------------------------------- the glide */
  function tick(now) {
    raf = 0;
    if (!AS.on) return;
    var dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    var base = VB.sh / 3, vt = base;
    if (now < holdUntil) vt = 0;
    else if (hi < holds.length) {
      var dist = holds[hi].y - fy;
      if (dist <= 0.75) { holdUntil = now + holds[hi].ms; hi++; vt = 0; }
      else vt = base * VB.clamp(dist / (base * 0.5), 0.15, 1);
    }
    v += (vt - v) * Math.min(1, dt * 3.5);
    if (vt === 0 && v < 2) v = 0;
    if (v > 0) {
      var m = maxY();
      fy = Math.min(m, fy + v * dt);
      setY(fy);
      if (fy >= m - 0.5) { AS.stop(true); return; }
    }
    raf = requestAnimationFrame(tick);
  }

  AS.resume = function () {
    clearTimeout(idle);
    idle = 0;
    AS.waiting = false;
    if (!AS.wanted || VB.reduce || AS.on || document.hidden || document.documentElement.classList.contains('locked')) { setBtn(); return; }
    fy = curY();
    if (fy >= maxY() - 2) { AS.ended = true; setBtn(); return; }
    AS.on = true; AS.ended = false; v = 0; last = 0; holdUntil = 0;
    hi = 0;
    while (hi < holds.length && holds[hi].y < fy - 2) hi++;
    rail.classList.add('auto');
    setBtn();
    raf = requestAnimationFrame(tick);
  };
  AS.stop = function (ended) {
    AS.on = false;
    v = 0;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    rail.classList.remove('auto');
    if (ended) AS.ended = true;
    setBtn();
  };
  function later(ms) {
    clearTimeout(idle);
    AS.waiting = AS.wanted && started;
    if (AS.waiting) idle = setTimeout(AS.resume, ms);
    setBtn();
  }
  /* the guest takes over: stop now, carry on after a quiet spell */
  function user(e) {
    if (!started) return;
    if (e && e.target && e.target.closest && e.target.closest('.ctl')) return;
    if (AS.on) AS.stop(false);
    later(RESUME_MS);
  }

  function setBtn() {
    if (!btn) return;
    var active = AS.wanted && !AS.ended;
    btn.classList.toggle('playing', active);
    btn.setAttribute('aria-label', active ? 'Pause auto-scroll' : 'Play auto-scroll');
  }

  /* ---------------------------------------------------------------- progress rail */
  AS.paint = function () {
    if (!rail) return;
    var m = maxY() || 1, p = VB.clamp(curY() / m, 0, 1);
    fill.style.transform = 'scaleY(' + p.toFixed(4) + ')';
    dot.style.transform = 'translate3d(0,' + (p * railH).toFixed(1) + 'px,0)';
  };
  function queuePaint() {
    if (painting) return;
    painting = true;
    requestAnimationFrame(function () { painting = false; AS.paint(); });
  }

  AS.init = function () {
    btn = $('#auto');
    rail = $('#rail');
    if (!btn || !rail) return;
    fill = rail.querySelector('.fill');
    dot = rail.querySelector('.dot');
    CHAPTERS.forEach(function () { var t = document.createElement('i'); t.className = 'tick'; rail.appendChild(t); });
    if (VB.reduce) { btn.style.display = 'none'; AS.wanted = false; }
    ['touchstart', 'pointerdown', 'wheel'].forEach(function (t) { window.addEventListener(t, user, { passive: true }); });
    window.addEventListener('keydown', function (e) {
      if (/^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| )$/.test(e.key)) user(e);
    });
    window.addEventListener('scroll', function () {
      if (AS.on && Math.abs(curY() - expectY) > 3) user();
      else if (AS.waiting) later(RESUME_MS);
      queuePaint();
    }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { if (AS.on) AS.stop(false); clearTimeout(idle); }
      else if (started && AS.wanted && !AS.ended) later(1500);
    });
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (AS.wanted && !AS.ended) {
        AS.wanted = false;
        clearTimeout(idle);
        AS.waiting = false;
        AS.stop(false);
        return;
      }
      AS.wanted = true;
      if (AS.ended || curY() >= maxY() - 2) { AS.ended = false; setY(0); fy = 0; AS.layout(); }
      AS.resume();
    });
    setBtn();
  };

  /* called once the card has opened */
  AS.begin = function () {
    if (!rail) return;
    started = true;
    rail.classList.add('show');
    if (!VB.reduce) btn.classList.add('show');
    AS.layout();
    later(START_MS);
  };
})();
