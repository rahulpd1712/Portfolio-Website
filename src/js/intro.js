import { SYMBOLS } from './symbols.js';

const STORAGE_KEY = 'compiled-identity-intro';

// Plan rules enforced here:
//  - runs only on first visit of a browser tab (sessionStorage, set BEFORE
//    the animation so a mid-intro refresh does not replay it)
//  - never initializes under prefers-reduced-motion
//  - never blocks content: the overlay exists only while the intro runs, and
//    the static hero is fully rendered underneath from the first paint
//  - skip by click/tap anywhere inside the hero boundary or Escape; the
//    overlay intercepts the pointer so nothing underneath is activated
//  - no focus trap: the overlay is aria-hidden and never receives focus
export function initIntro() {
  const hero = document.querySelector('.hero');
  if (!hero) return; // case-study pages have no hero - never mark as seen
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let seen = false;
  try {
    seen = sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch (e) {
    seen = false;
  }
  if (seen) return;

  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch (e) {
    /* storage blocked: animation still runs once for this page view */
  }

  run(hero);
}

function run(hero) {
  const layer = document.createElement('div');
  layer.className = 'intro-layer';
  layer.setAttribute('aria-hidden', 'true');

  const ball = document.createElement('span');
  ball.className = 'intro-ball';
  layer.appendChild(ball);
  hero.appendChild(layer);

  const timers = [];
  const symbols = [];
  let finished = false;

  function later(fn, ms) {
    timers.push(setTimeout(fn, ms));
  }

  function cleanup() {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    window.removeEventListener('keydown', onKeyDown, true);
    layer.remove();

    const wrap = hero.querySelector('.hero-title-wrap');
    if (wrap) wrap.classList.remove('is-emphasis');
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      cleanup();
    }
  }

  // Click/tap inside the hero skips. The layer sits on top of the hero, so
  // the event never reaches buttons or links underneath.
  layer.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    cleanup();
  });

  window.addEventListener('keydown', onKeyDown, true);

  const rect = hero.getBoundingClientRect();
  const floor = Math.max(90, Math.min(rect.height * 0.45, 300));
  const cx = rect.width / 2;
  const cy = floor;
  ball.style.setProperty('--floor', Math.round(floor) + 'px');

  // 0.82s: the ball lands and breaks into code symbols.
  later(function () {
    if (ball.parentNode) ball.parentNode.removeChild(ball);
    layer.classList.add('is-dim');

    // Symbols assemble into/around the name and role block - the hero's
    // focal point.
    const titleEl = hero.querySelector('.hero-title-wrap');
    const layerRect = layer.getBoundingClientRect();
    const pRect = titleEl ? titleEl.getBoundingClientRect() : null;
    const target = pRect
      ? {
          left: pRect.left - layerRect.left,
          top: pRect.top - layerRect.top,
          width: pRect.width,
          height: pRect.height
        }
      : { left: cx - 90, top: cy - 70, width: 180, height: 140 };

    for (let i = 0; i < 26; i++) {
      const s = document.createElement('span');
      s.className = 'intro-sym';
      s.textContent = SYMBOLS[i % SYMBOLS.length];
      s.style.left = Math.round(cx) + 'px';
      s.style.top = Math.round(cy) + 'px';
      const tx = target.left + Math.random() * target.width - cx;
      const ty = target.top + Math.random() * target.height - cy;
      s.style.setProperty('--tx', Math.round(tx) + 'px');
      s.style.setProperty('--ty', Math.round(ty) + 'px');
      layer.appendChild(s);
      symbols.push(s);
    }

    // Two frames so the initial state paints before the transition runs.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        for (let i = 0; i < symbols.length; i++) {
          symbols[i].style.transitionDelay = (i % 7) * 45 + 'ms';
          symbols[i].classList.add('is-fly');
        }
      });
    });
  }, 820);

  // 1.72s: symbols dissolve as the name takes over.
  later(function () {
    for (let i = 0; i < symbols.length; i++) symbols[i].classList.add('is-out');
  }, 1720);

  // 2.26s: name and role emphasis.
  later(function () {
    const wrap = hero.querySelector('.hero-title-wrap');
    if (wrap) wrap.classList.add('is-emphasis');
  }, 2260);

  // 2.9s: settle into the normal hero. Total duration stays inside the
  // plan's 2-3 second target.
  later(cleanup, 2900);
}
