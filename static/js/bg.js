(function () {
  'use strict';

  // Only run on desktop pointer devices — no-op on touch/mobile
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var GRID = 8;
  var CFG = {
    spawnRadius: 60,
    fadeRadius: 300,
    spawnRate: 7,
    particleLife: 120,
    particleLifeVariance: 20,
    fontSize: 8,
    maxOpacity: 0.22,
    maxParticles: 400,
    font: '"Geist Mono", "Courier New", Consolas, monospace',
  };
  var CHARS = '0123456789/\\|+-=<>{}[]()#@&%*~^_.,:;!?$◉◎◆◇†‡\xa7\xb6\xb7▪▫●○■□'.split('');

  var wrap = document.createElement('div');
  wrap.setAttribute('aria-hidden', 'true');
  wrap.style.cssText = 'pointer-events:none;position:fixed;inset:0;z-index:-1;';
  document.body.appendChild(wrap);

  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
  wrap.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var particles = [];
  var occupied = {};
  var mouse = { x: -500, y: -500 };
  var lastSpawn = 0;
  var rafId = null;

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = CFG.fontSize + 'px ' + CFG.font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  }

  resize();
  window.addEventListener('resize', resize);

  // Maps particle age (0–1) to a warm-tinted grey matching the zinc palette.
  // Inverted in dark mode so particles are light against the dark bg.
  function charColor(t, isDark) {
    var v;
    if (t < 0.2) v = 26 + (t / 0.2) * 42;
    else if (t < 0.5) v = 68 + ((t - 0.2) / 0.3) * 68;
    else if (t < 0.8) v = 136 + ((t - 0.5) / 0.3) * 51;
    else v = 187 + ((t - 0.8) / 0.2) * 34;
    v = Math.round(v);
    if (isDark) v = 255 - v;
    // Subtle warm shift to match the zinc palette
    return 'rgb(' + Math.min(255, v + 4) + ',' + v + ',' + Math.max(0, v - 6) + ')';
  }

  function spawn() {
    if (particles.length >= CFG.maxParticles) return;
    var ox = (Math.random() - 0.5) * CFG.spawnRadius * 2;
    var oy = (Math.random() - 0.5) * CFG.spawnRadius * 2;
    if (ox * ox + oy * oy > CFG.spawnRadius * CFG.spawnRadius) return;
    var gx = Math.round((mouse.x + ox) / GRID) * GRID;
    var gy = Math.round((mouse.y + oy) / GRID) * GRID;
    var key = gx + ',' + gy;
    if (occupied[key]) return;
    occupied[key] = true;
    var life = CFG.particleLife + (Math.random() - 0.5) * CFG.particleLifeVariance * 2;
    particles.push({
      x: gx, y: gy, key: key,
      char: CHARS[Math.floor(Math.random() * CHARS.length)] || '\xb7',
      age: 0, maxAge: life,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    var isDark = document.documentElement.classList.contains('dark');
    var mx = mouse.x, my = mouse.y;

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.age++;
      if (p.age >= p.maxAge) {
        delete occupied[p.key];
        particles.splice(i, 1);
        continue;
      }
      var dx = p.x - mx, dy = p.y - my;
      var prox = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / CFG.fadeRadius);
      if (prox < 0.01) {
        delete occupied[p.key];
        particles.splice(i, 1);
        continue;
      }
      var t = p.age / p.maxAge;
      ctx.globalAlpha = (1 - t * t) * CFG.maxOpacity * prox;
      ctx.fillStyle = charColor(t, isDark);
      ctx.fillText(p.char, p.x, p.y);
    }

    ctx.globalAlpha = 1;
    rafId = particles.length > 0 ? requestAnimationFrame(draw) : null;
  }

  document.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    var now = performance.now();
    if (now - lastSpawn < 20) return;
    lastSpawn = now;
    for (var i = 0; i < CFG.spawnRate; i++) spawn();
    if (rafId === null) rafId = requestAnimationFrame(draw);
  });
})();
