/* temple.js — the temple draws itself in gold ink.
   Two textures: the line drawing (sepia on white) and a precomputed
   "arrival time" map (geodesic distance along the strokes from the bottom
   step). A uniform progress p reveals every pixel whose arrival time < p,
   with a bright molten-gold front travelling up the lines.
   Without WebGL the static drawing is shown and revealed with a clip wipe. */
(function () {
  'use strict';
  var VB = window.VB;
  var T = VB.temple = { gl: false, ready: false, p: 0 };
  var cv, gl, prog, loc = {}, texI, texT, dpr = 1, rect = [0, 0, 1, 1], img, dirty = true;

  var VS = 'attribute vec2 a;uniform vec4 r;uniform vec2 s;varying vec2 v;' +
    'void main(){v=a;vec2 q=(r.xy+a*r.zw)/s*2.0-1.0;gl_Position=vec4(q.x,-q.y,0.0,1.0);}';
  var FS = [
    'precision mediump float;',
    'uniform sampler2D ti;uniform sampler2D tt;uniform float p;uniform vec3 ci;uniform vec3 ch;varying vec2 v;',
    'void main(){',
    ' vec3 c=texture2D(ti,v).rgb;',
    ' float ink=clamp((1.0-dot(c,vec3(0.299,0.587,0.114)))/0.589,0.0,1.0);',
    ' float t=texture2D(tt,v).r;',
    ' float d=p-t;',
    ' float drawn=smoothstep(0.0,0.035,d);',
    ' float hot=smoothstep(-0.004,0.01,d)*(1.0-smoothstep(0.02,0.1,d));',
    ' float halo=(1.0-smoothstep(0.0,0.03,abs(d-0.012)))*0.16*step(p,0.999);',
    ' vec3 col=mix(ci,ch,hot);',
    ' float a=ink*max(drawn,hot*0.9);',
    ' float h=halo*(1.0-ink);',
    ' gl_FragColor=vec4(col*a+ch*h,a+h*0.6);',
    '}'
  ].join('\n');

  function sh(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function tex(im) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function load(src) {
    return new Promise(function (res, rej) {
      var i = new Image();
      i.decoding = 'async';
      i.onload = function () { res(i); };
      i.onerror = rej;
      i.src = src;
    });
  }

  function fallback() {
    T.gl = false;
    if (cv) cv.style.display = 'none';
    img.style.display = 'block';
    T.ready = true;
    dirty = true;
    T.render();
  }

  T.init = function () {
    cv = document.getElementById('temple-gl');
    img = document.getElementById('temple-img');
    var glc = null;
    if (!VB.reduce) {
      try { glc = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false }) || cv.getContext('experimental-webgl'); } catch (e) { glc = null; }
    }
    if (!glc) return load('assets/temple.webp').then(fallback, fallback);
    gl = glc;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (e) { return Promise.resolve(fallback()); }
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
    var aLoc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(aLoc);
    gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
    ['r', 's', 'p', 'ci', 'ch', 'ti', 'tt'].forEach(function (n) { loc[n] = gl.getUniformLocation(prog, n); });
    gl.uniform3f(loc.ci, 0.49, 0.33, 0.14);   /* settled ink: antique gold-brown */
    gl.uniform3f(loc.ch, 1.0, 0.80, 0.38);    /* molten front */
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); fallback(); }, false);
    return Promise.all([load('assets/temple.webp'), load('assets/temple-time.png')]).then(function (ims) {
      gl.activeTexture(gl.TEXTURE0); texI = tex(ims[0]);
      gl.activeTexture(gl.TEXTURE1); texT = tex(ims[1]);
      gl.uniform1i(loc.ti, 0);
      gl.uniform1i(loc.tt, 1);
      T.gl = true;
      T.ready = true;
      T.resize();
    }, fallback);
  };

  T.resize = function () {
    if (!T.gl) { dirty = true; T.render(); return; }
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = cv.clientWidth, h = cv.clientHeight;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    gl.viewport(0, 0, cv.width, cv.height);
    dirty = true;
    T.render();
  };

  /* rect in CSS px of the pin; p in 0..1 */
  T.set = function (x, y, w, h, p) {
    if (x !== rect[0] || y !== rect[1] || w !== rect[2] || h !== rect[3] || p !== T.p) {
      rect = [x, y, w, h];
      T.p = p;
      dirty = true;
    }
  };

  T.render = function () {
    if (!dirty || !T.ready) return;
    dirty = false;
    if (!T.gl) {
      img.style.width = rect[2] + 'px';
      img.style.height = rect[3] + 'px';
      img.style.transform = 'translate(' + rect[0] + 'px,' + rect[1] + 'px)';
      var cut = VB.reduce ? 0 : (1 - VB.clamp(T.p * 1.05, 0, 1)) * 100;
      img.style.clipPath = 'inset(' + cut.toFixed(2) + '% 0 0 0)';
      return;
    }
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform4f(loc.r, rect[0] * dpr, rect[1] * dpr, rect[2] * dpr, rect[3] * dpr);
    gl.uniform2f(loc.s, cv.width, cv.height);
    gl.uniform1f(loc.p, VB.reduce ? 1.2 : T.p * 1.12);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };
})();
