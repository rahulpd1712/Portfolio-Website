// Behavioral tests for the P1 intro + reduced-motion scroll-reveal guard,
// run in Node with a minimal DOM stub (no browser needed).
import { initIntro } from '../src/js/intro.js';
import { initScrollReveal } from '../src/js/scroll-reveal.js';

let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log('  PASS ' + name);
  else { failures++; console.log('  FAIL ' + name + (extra ? ' -- ' + extra : '')); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- minimal DOM stub -------------------------------------------------------
class ClassList {
  constructor() { this.s = new Set(); }
  add(...c) { c.forEach((x) => this.s.add(x)); }
  remove(...c) { c.forEach((x) => this.s.delete(x)); }
  contains(c) { return this.s.has(c); }
}
class El {
  constructor(tag, cls) {
    this.tagName = tag.toUpperCase();
    this.classList = new ClassList();
    if (cls) cls.split(' ').forEach((c) => { if (c) this.classList.add(c); });
    this.children = [];
    this.parentNode = null;
    this.attrs = {};
    this.listeners = {};
    this.textContent = '';
    this.style = {
      props: {},
      setProperty(k, v) { this.props[k] = String(v); },
      getPropertyValue(k) { return this.props[k] || ''; }
    };
  }
  // Mirror the real DOM: assigning className updates the class list.
  get className() { return Array.from(this.classList.s).join(' '); }
  set className(v) {
    this.classList = new ClassList();
    String(v).split(' ').forEach((c) => { if (c) this.classList.add(c); });
  }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  removeChild(c) { this.children = this.children.filter((x) => x !== c); c.parentNode = null; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
  addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 900, height: 520, right: 900, bottom: 520 }; }
  fire(type, ev) { (this.listeners[type] || []).forEach((fn) => fn(ev)); }
  querySelector(sel) {
    const cls = sel.slice(1);
    const walk = (el) => {
      for (const c of el.children) {
        if (c.classList.contains(cls)) return c;
        const hit = walk(c);
        if (hit) return hit;
      }
      return null;
    };
    return walk(this);
  }
  querySelectorAll(sel) {
    const cls = sel.slice(1);
    const out = [];
    const walk = (el) => { el.children.forEach((c) => { if (c.classList.contains(cls)) out.push(c); walk(c); }); };
    walk(this);
    return out;
  }
}

const hero = new El('section', 'hero');
const titleWrap = new El('div', 'hero-title-wrap');
hero.appendChild(titleWrap);
const documentEl = new El('html', '');

let reducedMotion = false;
const windowListeners = { keydown: [] };
const store = {};

globalThis.window = {
  matchMedia: () => ({ matches: reducedMotion, addEventListener() {}, addListener() {} }),
  addEventListener(type, fn, opts) { (windowListeners[type] = windowListeners[type] || []).push({ fn, opts }); },
  removeEventListener(type, fn) {
    windowListeners[type] = (windowListeners[type] || []).filter((l) => l.fn !== fn);
  },
  innerHeight: 800
};
globalThis.document = {
  documentElement: documentEl,
  hidden: false,
  querySelector: (sel) => (sel === '.hero' ? hero : documentEl.querySelector(sel)),
  querySelectorAll: (sel) => documentEl.querySelectorAll(sel),
  createElement: (tag) => new El(tag)
};
globalThis.sessionStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};
globalThis.requestAnimationFrame = (fn) => { fn(); return 1; };

function clearHero() {
  hero.children.slice().forEach((c) => { if (c !== titleWrap) hero.removeChild(c); });
}
function pressEscape() {
  (windowListeners.keydown || []).slice().forEach((l) => l.fn({ key: 'Escape', stopPropagation() {} }));
}

// ---- scenario A: reduced motion never initializes --------------------------
console.log('A. prefers-reduced-motion');
reducedMotion = true;
delete store['compiled-identity-intro'];
clearHero();
initIntro();
check('no overlay created', !hero.querySelector('.intro-layer'));
check('flag not written', store['compiled-identity-intro'] === undefined);

// ---- scenario B: seen flag skips ------------------------------------------
console.log('B. already seen in this tab');
reducedMotion = false;
store['compiled-identity-intro'] = '1';
clearHero();
initIntro();
check('no overlay created', !hero.querySelector('.intro-layer'));

// ---- scenario C: click skip removes layer, sets flag first -----------------
console.log('C. click skip');
delete store['compiled-identity-intro'];
clearHero();
initIntro();
check('flag written before animation ends', store['compiled-identity-intro'] === '1');
const layerC = hero.querySelector('.intro-layer');
check('overlay created', !!layerC);
check('ball present', !!(layerC && layerC.querySelector('.intro-ball')));
check('aria-hidden set', layerC && layerC.getAttribute('aria-hidden') === 'true');
if (layerC) layerC.fire('click', { preventDefault() {}, stopPropagation() {} });
check('layer removed on click', !hero.querySelector('.intro-layer'));
check('keydown listener removed', (windowListeners.keydown || []).length === 0);

// ---- scenario D: Escape skips ---------------------------------------------
console.log('D. Escape skip');
delete store['compiled-identity-intro'];
clearHero();
initIntro();
check('overlay created', !!hero.querySelector('.intro-layer'));
pressEscape();
check('layer removed on Escape', !hero.querySelector('.intro-layer'));
check('keydown listener removed', (windowListeners.keydown || []).length === 0);

// ---- scenario E: natural completion ---------------------------------------
console.log('E. natural run (2.9s timeline)');
delete store['compiled-identity-intro'];
clearHero();
initIntro();
const floor = hero.querySelector('.intro-ball').style.getPropertyValue('--floor');
check('ball floor computed from hero height', floor === '234px', 'got ' + floor + ' (520*0.45=234)');
await sleep(950);
const layerE = hero.querySelector('.intro-layer');
check('ball removed at burst', !!layerE && !layerE.querySelector('.intro-ball'));
check('symbols spawned', !!layerE && layerE.querySelectorAll('.intro-sym').length === 26);
check('dim class applied', !!layerE && layerE.classList.contains('is-dim'));
await sleep(2200);
check('layer removed after timeline', !hero.querySelector('.intro-layer'));
check('title emphasis class cleaned', !titleWrap.classList.contains('is-emphasis'));

// ---- scenario F: scroll-reveal honors reduced motion -----------------------
console.log('F. scroll-reveal reduced-motion guard');
reducedMotion = true;
documentEl.classList.remove('reveal-ready');
initScrollReveal();
check('reveal-ready NOT added under reduced motion', !documentEl.classList.contains('reveal-ready'));

console.log(failures === 0 ? 'ALL TESTS PASSED' : failures + ' TEST(S) FAILED');
process.exitCode = failures === 0 ? 0 : 1;
