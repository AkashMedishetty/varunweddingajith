/* main.js — boot order: measure → build cover → WebGL temple → scroll acts → loader out */
(function () {
  'use strict';
  var VB = window.VB, $ = VB.$, $$ = VB.$$;
  var g = window.gsap, ST = window.ScrollTrigger;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  if (!g || !ST) { document.documentElement.classList.add('rm'); VB.reduce = true; }
  else g.registerPlugin(ST);

  function relayout() {
    VB.measure();
    VB.hero.layout();
    VB.hero.placeFly();
    VB.acts.layout();
    if (VB.extras.sizeGrains) VB.extras.sizeGrains();
    if (ST) ST.refresh();
  }

  VB.measure();
  VB.music.init();
  VB.hero.init();
  VB.hero.layout();
  VB.temple.init().then(function () { VB.hero.layout(); });

  if (g && ST && VB.fine && window.Lenis && !VB.reduce) {
    var lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ST.update);
    g.ticker.add(function (t) { lenis.raf(t * 1000); });
    g.ticker.lagSmoothing(0);
    VB.lenis = lenis;
  }

  if (g && ST) {
    VB.hero.scroll(ST);
    VB.acts.reveals(g, ST);
  }
  VB.acts.muhurtham(g, ST);
  VB.acts.knots(g, ST);
  VB.acts.night(g, ST);
  VB.extras.akshintalu(ST);
  VB.extras.monogram(g, ST);
  VB.extras.countdown();
  VB.extras.links();

  $('#lang').addEventListener('click', function (e) {
    e.stopPropagation();
    VB.setLang(VB.lang() === 'te' ? 'en' : 'te');
  });
  VB.onLang = function () {
    VB.extras.share();
    setTimeout(relayout, 30);
  };

  var lastW = window.innerWidth, lastH = VB.sh, rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      VB.measure();
      if (window.innerWidth === lastW && Math.abs(VB.sh - lastH) < 2) return;
      lastW = window.innerWidth; lastH = VB.sh;
      relayout();
    }, 180);
  });
  if (document.fonts && document.fonts.addEventListener) {
    document.fonts.addEventListener('loadingdone', function () { VB.hero.placeFly(); if (ST) ST.refresh(); });
  }

  VB.afterOpen = function () { $('#lang').focus({ preventScroll: true }); };

  /* loader: wait for fonts + the cover's own images, never longer than 3.5 s */
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  var coverImgs = [$('#gan-fly img')].concat($$('.face .dab'));
  var coverReady = new Promise(function (res) { VB.whenLoaded(coverImgs, res); });
  Promise.race([Promise.all([fontsReady, coverReady]), new Promise(function (r) { setTimeout(r, 3500); })]).then(function () {
    relayout();
    var ld = $('#loader');
    ld.classList.add('gone');
    setTimeout(function () { if (ld.parentNode) ld.parentNode.removeChild(ld); }, 1000);
    VB.hero.introCover();
    VB.music.prime();
  });
})();
