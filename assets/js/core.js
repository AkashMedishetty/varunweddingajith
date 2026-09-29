/* core.js — shared state and helpers for the invitation.
   Everything hangs off window.VB so the chapter files stay independent. */
(function () {
  'use strict';
  var VB = window.VB = {};
  var root = document.documentElement;

  VB.reduce = root.classList.contains('rm');
  VB.fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  VB.$ = function (s, el) { return (el || document).querySelector(s); };
  VB.$$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  VB.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  VB.lerp = function (a, b, t) { return a + (b - a) * t; };
  /* progress of p inside [a,b], clamped to 0..1 */
  VB.seg = function (p, a, b) { return VB.clamp((p - a) / (b - a), 0, 1); };
  VB.ease = {
    io: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    in: function (t) { return t * t * t; },
    sine: function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; }
  };

  /* ---------------------------------------------------------------- stage metrics
     The stage is a phone-shaped column: full width on phones, 480px max on
     tablets and desktop. --sw/--sh drive every size in the stylesheet. */
  VB.sw = 390; VB.sh = 844;
  VB.measure = function () {
    var pin = document.getElementById('hero-pin');
    VB.sw = Math.min(window.innerWidth, 480);
    VB.sh = pin ? pin.clientHeight : window.innerHeight;
    root.style.setProperty('--sw', VB.sw + 'px');
    root.style.setProperty('--sh', VB.sh + 'px');
    return VB.sw + 'x' + VB.sh;
  };

  /* ---------------------------------------------------------------- language */
  VB.lang = function () { return root.getAttribute('data-lang') === 'en' ? 'en' : 'te'; };
  VB.setLang = function (l) {
    root.setAttribute('data-lang', l);
    root.lang = l;
    try { localStorage.setItem('vb-lang', l); } catch (e) { /* private mode */ }
    document.title = l === 'en'
      ? 'Varun Kumar & Bhavani · Wedding Invitation · 16.10.2026'
      : 'వరుణ్ కుమార్ & భవాని · పెండ్లిపిలుపు · 16.10.2026';
    if (VB.onLang) VB.onLang(l);
  };

  /* ---------------------------------------------------------------- the guest's name (?to=)
     Written as text only (never HTML) so a crafted link cannot inject markup. */
  VB.guest = (function () {
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { return ''; }
    var n = (q.get('to') || q.get('n') || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
    return n.slice(0, 64);
  })();
  VB.isTelugu = function (s) { return /[\u0C00-\u0C7F]/.test(s); };

  /* ---------------------------------------------------------------- word splitting
     Split by WORD only: splitting Telugu into characters breaks conjunct shaping. */
  VB.splitWords = function (el) {
    if (el.__split) return el.__split;
    var out = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var parts = c.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span');
            w.className = 'w';
            w.textContent = part;
            frag.appendChild(w);
            out.push(w);
          });
          node.replaceChild(frag, c);
        } else if (c.nodeType === 1 && !c.classList.contains('w')) {
          walk(c);
        }
      });
    })(el);
    el.__split = out;
    return out;
  };

  /* nearest ancestor that is visible in both languages (triggers must not be display:none) */
  VB.stableParent = function (el) {
    var t = el;
    while (t && t.classList && (t.classList.contains('t') || t.classList.contains('e') || t.classList.contains('kw'))) t = t.parentElement;
    return t || el;
  };

  /* ---------------------------------------------------------------- music + bell */
  var audio, playing = false, want = true, actx = null, fadeRaf = 0;
  VB.music = {
    init: function () {
      audio = document.getElementById('music');
      var btn = document.getElementById('sound');
      if (!audio || !btn) return;
      audio.addEventListener('error', function () { btn.style.display = 'none'; });
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        want = !playing;
        if (playing) VB.music.stop(); else VB.music.start();
      });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden && playing) { audio.pause(); } else if (!document.hidden && playing) { audio.play().catch(function () {}); }
      });
    },
    prime: function () { if (audio) { audio.preload = 'auto'; try { audio.load(); } catch (e) {} } },
    start: function () {
      if (!audio || !want) return;
      document.getElementById('sound').classList.add('show');
      try {
        if (!actx) { var C = window.AudioContext || window.webkitAudioContext; if (C) actx = new C(); }
        if (actx && actx.state === 'suspended') actx.resume();
      } catch (e) { actx = null; }
      audio.volume = 0;
      var p = audio.play();
      var go = function () {
        playing = true;
        document.getElementById('sound').classList.add('playing');
        VB.music.fade(0.55, 2600);
      };
      if (p && p.then) p.then(go).catch(function () { /* blocked: wait for the button */ }); else go();
    },
    stop: function () {
      if (!audio) return;
      playing = false;
      document.getElementById('sound').classList.remove('playing');
      VB.music.fade(0, 500, function () { audio.pause(); });
    },
    fade: function (to, ms, done) {
      cancelAnimationFrame(fadeRaf);
      var from = audio.volume, t0 = performance.now();
      (function step(now) {
        var k = VB.clamp((now - t0) / ms, 0, 1);
        try { audio.volume = from + (to - from) * k; } catch (e) { /* iOS: volume is read-only */ }
        if (k < 1) fadeRaf = requestAnimationFrame(step); else if (done) done();
      })(t0);
    },
    on: function () { return playing; }
  };

  /* A struck brass temple bell: a short metallic strike, a hum an octave below,
     and partials in slightly detuned pairs that beat as the bell rings out.
     Rings only while sound is on; with duck=true the music dips under it. */
  var BELL = [[0.5, .5, 6], [1, 1, 4.6], [1.004, .7, 4.2], [1.19, .3, 2.8], [1.5, .3, 2.4],
    [2, .45, 2.2], [2.007, .3, 2], [2.74, .22, 1.5], [3.76, .12, 1], [5.4, .07, .6]];
  VB.bell = function (f0, level, duck) {
    if (!actx || !playing) return;
    try {
      var t = actx.currentTime + 0.01, out = actx.createGain();
      out.gain.value = (level || 0.2) * 0.3;
      out.connect(actx.destination);
      BELL.forEach(function (pt) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = 'sine';
        o.frequency.value = f0 * pt[0];
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(pt[1], t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + pt[2]);
        o.connect(g); g.connect(out);
        o.start(t); o.stop(t + pt[2] + 0.05);
      });
      var len = Math.floor(actx.sampleRate * 0.03), buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = actx.createBufferSource(), bp = actx.createBiquadFilter(), ng = actx.createGain();
      src.buffer = buf; bp.type = 'bandpass'; bp.frequency.value = f0 * 4; bp.Q.value = 1.4; ng.gain.value = 0.9;
      src.connect(bp); bp.connect(ng); ng.connect(out);
      src.start(t);
      if (duck) {
        VB.music.fade(0.16, 300, function () {
          setTimeout(function () { if (playing) VB.music.fade(0.55, 2200); }, 2600);
        });
      }
    } catch (e) { /* sound is decoration only */ }
  };

  /* ---------------------------------------------------------------- image readiness */
  VB.whenLoaded = function (imgs, cb) {
    var n = imgs.length, done = 0;
    if (!n) { cb(); return; }
    imgs.forEach(function (im) {
      if (im.complete && im.naturalWidth) { if (++done === n) cb(); return; }
      var fin = function () { if (++done === n) cb(); };
      im.addEventListener('load', fin, { once: true });
      im.addEventListener('error', fin, { once: true });
    });
  };
})();
