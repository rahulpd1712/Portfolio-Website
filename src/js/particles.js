import { randomSymbol } from './symbols.js';

// P2 canvas particle field: drifting code symbols behind the hero copy.
// Cost controls: pauses off-screen and when the tab is hidden,
// stops entirely under reduced motion, renders a single static frame on
// small screens, and caps device pixel ratio at 2.
export function initParticles() {
  const canvas = document.querySelector('.hero-particles');
  const hero = document.querySelector('.hero');
  if (!canvas || !hero || !canvas.getContext) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  let width = 0;
  let height = 0;
  let accent = '#38bdf8';
  let particles = [];
  let raf = 0;
  let running = false;
  let inView = true;
  let animateAllowed = !reduced.matches;

  function readAccent() {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent')
      .trim();
    accent = value || '#38bdf8';
  }

  function seed() {
    const count = width < 768 ? 12 : 28;
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.16,
        vy: -0.05 - Math.random() * 0.12,
        size: 10 + Math.random() * 8,
        alpha: 0.05 + Math.random() * 0.15,
        char: randomSymbol()
      });
    }
  }

  function resize() {
    const rect = hero.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    readAccent();
    seed();
    drawFrame();
    if (width >= 768) start();
    else stop();
  }

  function drawFrame() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = accent;
    ctx.textBaseline = 'middle';
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.globalAlpha = p.alpha;
      ctx.font = '700 ' + p.size + 'px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      ctx.fillText(p.char, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  function step() {
    if (!running) return;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -24) {
        p.y = height + 16;
        p.x = Math.random() * width;
      }
      if (p.x < -24) p.x = width + 16;
      if (p.x > width + 24) p.x = -16;
    }
    drawFrame();
    raf = requestAnimationFrame(step);
  }

  function start() {
    if (running || !inView || document.hidden || !animateAllowed) return;
    if (width < 768) return; // phones get the static frame only
    running = true;
    raf = requestAnimationFrame(step);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (inView) start();
      else stop();
    });
    io.observe(hero);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else start();
  });

  document.addEventListener('themechange', function () {
    readAccent();
    drawFrame();
  });

  const onReducedChange = function (event) {
    animateAllowed = !event.matches;
    if (!animateAllowed) stop();
    else start();
  };
  if (reduced.addEventListener) reduced.addEventListener('change', onReducedChange);
  else if (reduced.addListener) reduced.addListener(onReducedChange);

  let resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  resize();
}
