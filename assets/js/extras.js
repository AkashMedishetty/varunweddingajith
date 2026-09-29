/* extras.js — the guest's akshintalu, the countdown, venue links, sharing, the VB monogram */
(function () {
  'use strict';
  var VB = window.VB, $ = VB.$, $$ = VB.$$;
  var X = VB.extras = {};
  var WHEN = new Date('2026-10-16T11:20:00+05:30').getTime();
  var VENUE_Q = 'Kommidi Kistareddy Function Hall, Sri Venkateswara Swamy Temple Road, Kistareddy Colony, Uppal, Hyderabad';

  /* ---------------------------------------------------------------- akshintalu (turmeric rice) */
  var G = [], gctx = null, gOn = false, graf = 0, blessed = 0;
  var COLS = ['#f3b21f', '#e89a12', '#f7c948', '#fbd66a', '#d8860b', '#b3121c'];
  function grain(x, y, burst) {
    var a = burst ? (-Math.PI / 2 + (Math.random() - 0.5) * 2.2) : Math.PI / 2;
    var sp = burst ? 120 + Math.random() * 260 : 20 + Math.random() * 30;
    return { x: x, y: y, vx: Math.cos(a) * sp * (burst ? 0.8 : 0.2), vy: Math.sin(a) * sp, r: Math.random() * 6.3, vr: (Math.random() - 0.5) * 12,
      c: COLS[(Math.random() * (burst ? 6 : 5)) | 0], l: 0, max: 2.2 + Math.random() * 1.2, s: 0.8 + Math.random() * 0.5 };
  }
  function gTick(now) {
    graf = 0;
    var c = $('#grains'), d = c.__d || 1, W = c.width / d, Hh = c.height / d;
    var dt = Math.min(0.033, (now - (gTick.t || now)) / 1000);
    gTick.t = now;
    gctx.setTransform(d, 0, 0, d, 0, 0);
    gctx.clearRect(0, 0, W, Hh);
    if (gOn && Math.random() < 0.35) G.push(grain(W * (0.3 + Math.random() * 0.4), Hh * 0.18, false));
    for (var i = G.length - 1; i >= 0; i--) {
      var g = G[i];
      g.l += dt; g.vy += 520 * dt; g.vx *= 0.995; g.x += g.vx * dt; g.y += g.vy * dt; g.r += g.vr * dt;
      if (g.y > Hh + 10 || g.l > g.max) { G.splice(i, 1); continue; }
      gctx.globalAlpha = Math.min(1, (g.max - g.l) * 2);
      gctx.fillStyle = g.c;
      gctx.save(); gctx.translate(g.x, g.y); gctx.rotate(g.r);
      gctx.beginPath(); gctx.ellipse(0, 0, 3.1 * g.s, 1.35 * g.s, 0, 0, 6.2832); gctx.fill();
      gctx.restore();
    }
    if (gOn || G.length) graf = requestAnimationFrame(gTick);
  }
  function gRun() { if (!graf && gctx) graf = requestAnimationFrame(gTick); }
  X.akshintalu = function (ST) {
    var st = $('#tb-stage'), c = $('#grains');
    var size = function () { var d = Math.min(window.devicePixelRatio || 1, 2); c.width = Math.round(c.clientWidth * d); c.height = Math.round(c.clientHeight * d); c.__d = d; };
    size();
    X.sizeGrains = size;
    gctx = c.getContext('2d');
    var shower = function (cx, cy) {
      var r = c.getBoundingClientRect();
      var x = cx - r.left, y = cy - r.top;
      for (var i = 0; i < 46; i++) G.push(grain(x + (Math.random() - 0.5) * 16, y, true));
      blessed++;
      if (blessed === 1 || blessed % 4 === 0) VB.bell(1320, 0.1);
      if (window.gsap) window.gsap.to('#tb-thanks', { opacity: 1, duration: 0.8, ease: 'power2.out' });
      gRun();
    };
    st.addEventListener('pointerdown', function (e) { shower(e.clientX, e.clientY); });
    st.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      var r = st.getBoundingClientRect();
      shower(r.left + r.width * (0.35 + Math.random() * 0.3), r.top + r.height * 0.2);
    });
    if (!VB.reduce && ST) {
      ST.create({ trigger: '#tb-stage', start: 'top 80%', end: 'bottom 20%',
        onToggle: function (self) { gOn = self.isActive; if (gOn) gRun(); } });
    }
  };

  /* ---------------------------------------------------------------- countdown */
  X.countdown = function () {
    var ids = ['cd-d', 'cd-h', 'cd-m', 'cd-s'].map(function (i) { return document.getElementById(i); });
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    (function tick() {
      var x = Math.max(0, WHEN - Date.now());
      ids[0].textContent = pad(Math.floor(x / 864e5));
      ids[1].textContent = pad(Math.floor(x % 864e5 / 36e5));
      ids[2].textContent = pad(Math.floor(x % 36e5 / 6e4));
      ids[3].textContent = pad(Math.floor(x % 6e4 / 1e3));
      setTimeout(tick, 1000 - (Date.now() % 1000));
    })();
  };

  /* ---------------------------------------------------------------- venue + calendar + share */
  X.links = function () {
    $('#directions').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(VENUE_Q);
    var title = 'Varun Kumar weds Bhavani';
    var details = 'Sumuhurtham 11:20 a.m. · Dhanur Lagnam. With love from the Mora family.';
    var cal = $('#addcal');
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mora//Pilupu//EN', 'BEGIN:VEVENT', 'UID:varun-bhavani-20261016@pilupu',
        'DTSTAMP:20260929T000000Z', 'DTSTART:20261016T055000Z', 'DTEND:20261016T093000Z', 'SUMMARY:' + title,
        'LOCATION:' + VENUE_Q.replace(/,/g, '\\,'), 'DESCRIPTION:' + details, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      cal.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
      cal.setAttribute('download', 'varun-bhavani.ics');
      cal.removeAttribute('target');
    } else {
      cal.href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) +
        '&dates=20261016T112000/20261016T150000&ctz=Asia/Kolkata&location=' + encodeURIComponent(VENUE_Q) + '&details=' + encodeURIComponent(details);
    }
    X.share();
  };
  /* the forwarded link never carries this guest's personal name */
  X.share = function () {
    var base = location.origin + location.pathname;
    var te = VB.lang() === 'te';
    var msg = te
      ? 'మోర వారి పెండ్లిపిలుపు 🌼\nచి॥ వరుణ్ కుమార్ & చి॥ల॥సౌ॥ భవాని\nశుక్రవారం, 16 అక్టోబర్ 2026 · ఉదయం 11:20\n'
      : 'The Mora family invites you 🌼\nVarun Kumar & Bhavani\nFriday, 16 October 2026 · 11:20 a.m.\n';
    $('#share-wa').href = 'https://wa.me/?text=' + encodeURIComponent(msg + base + (te ? '' : '?l=en'));
  };

  /* ---------------------------------------------------------------- the VB monogram on a paper seal:
     the letters draw in leaf green, the water flows in, the lotus blooms last */
  X.monogram = function (g, ST) {
    var box = $('#vb');
    fetch('assets/vb.svg').then(function (r) { return r.text(); }).then(function (txt) {
      box.innerHTML = txt;
      var svg = box.querySelector('svg');
      var letters = $$('path.v, path.vl, path.b', svg);
      var water = $$('path.sw1, path.sw2, path.sw3', svg);
      var lotus = $$('path.lo1, path.lo2, path.lo3', svg), bloom = svg.querySelector('g.lotus');
      var lined = letters.concat(water);
      if (VB.reduce || !g || !ST) { lined.forEach(function (p) { p.style.fillOpacity = 1; p.style.strokeOpacity = 0; }); return; }
      lined.forEach(function (p) { var L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
      g.set(lotus, { opacity: 0 });
      if (bloom) g.set(bloom, { scale: 0.55, transformOrigin: '50% 100%' });
      ST.create({ trigger: box, start: 'top 85%', once: true, onEnter: function () {
        var tl = g.timeline()
          .to(letters, { strokeDashoffset: 0, duration: 2, ease: 'power2.inOut', stagger: 0.08 })
          .to(letters, { fillOpacity: 1, duration: 1, ease: 'power2.out' }, 1.4)
          .to(water, { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut', stagger: 0.07 }, 1.2)
          .to(water, { fillOpacity: 1, duration: 0.8, ease: 'power2.out', stagger: 0.05 }, 2)
          .to(lotus, { opacity: 1, duration: 0.9, ease: 'power2.out', stagger: 0.06 }, 2.5)
          .to(lined, { strokeOpacity: 0, duration: 0.8 }, 3.3);
        if (bloom) tl.to(bloom, { scale: 1, duration: 1.3, ease: 'back.out(1.5)' }, 2.5);
      } });
    }).catch(function () { box.style.display = 'none'; });
  };
})();
