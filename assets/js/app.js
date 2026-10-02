/* =========================================================================
   La Comanda · Límites algebraicos · con el Profe Anto
   ========================================================================= */
import { generate, generateShift, verify, LEVELS, TECH, TECH_LEVEL, shuffle, MINUS } from './generator.js';
import { renderMath, renderRich, speak, renderRuffini } from './render.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $('#app');
const live = $('#live');
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, reduced() ? Math.min(ms, 120) : ms));

/* ---------------- estado guardado ---------------- */
const KEY = 'la-comanda-limites-v1';
const DEFAULT = {
  theme: 'system', sound: false,
  served: 0, tips: 0, streak: 0, bestStreak: 0, stars: 0,
  apertura: { done: false, idea: 0 },
  levels: { facil: { served: 0, best: 0, stars: 0, done: false }, medio: { served: 0, best: 0, stars: 0, done: false }, alto: { served: 0, best: 0, stars: 0, done: false } },
  shift: null, // { level, idx }
  tech: {}, // { [tech]: { ok, tries } }
  guide: { picks: 0 }, // aciertos totales: con pocos, la guía visual es más insistente
};
let S;
try { S = { ...structuredClone(DEFAULT), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { S = structuredClone(DEFAULT); }
S.levels = { ...DEFAULT.levels, ...(S.levels || {}) };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* sin almacenamiento */ } };

/* ---------------- tema ---------------- */
function applyTheme() {
  const t = S.theme;
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  const meta = document.querySelector('meta[name="theme-color"]');
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  if (meta) meta.setAttribute('content', dark ? '#121719' : '#F6F2EC');
}
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

/* ---------------- sonido (sutil, apagado por defecto) ---------------- */
let actx = null;
function tone(freqs, { dur = 0.12, type = 'sine', gain = 0.035, gap = 0.07 } = {}) {
  if (!S.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    freqs.forEach((f, i) => {
      const o = actx.createOscillator(); const g = actx.createGain();
      const t0 = actx.currentTime + i * gap;
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
    });
  } catch { /* sin audio */ }
}
const sfx = {
  ok: () => tone([659, 880]),
  bad: () => tone([196], { type: 'triangle', dur: 0.16, gain: 0.03 }),
  serve: () => tone([523, 659, 784, 1047], { gap: 0.08, dur: 0.18 }),
  tap: () => tone([440], { dur: 0.05, gain: 0.015 }),
};

/* ---------------- íconos ---------------- */
const I = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  arrow: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  screen: '<rect x="3.5" y="5" width="17" height="11" rx="2"/><path d="M9 20h6M12 16v4"/>',
  sound: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5"/><path d="M18 7a7 7 0 0 1 0 10"/>',
  mute: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M16 10l4 4M20 10l-4 4"/>',
  cup: '<path d="M5 9h11v4.5A5.5 5.5 0 0 1 10.5 19h0A5.5 5.5 0 0 1 5 13.5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8.5 3.5c-.6.8-.6 1.7 0 2.5M12 3.5c-.6.8-.6 1.7 0 2.5"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  flame: '<path d="M12 3c.8 3 5 5.2 5 10a5 5 0 0 1-10 0c0-2.2 1.1-3.7 2.2-4.6.1 1.6.8 2.6 1.9 3.1-.3-3.2.2-5.6.9-8.5z"/>',
  bulb: '<path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${I[n]}</svg>`;
const starIcon = (filled) => `<svg class="ic star ${filled ? 'on' : ''}" viewBox="0 0 24 24" aria-hidden="true">${I.star}</svg>`;

/* ---------------- guía visual: dónde tocar ----------------
   Una mano que toca y un anillo que late señalan qué se puede tocar.
   Novato: la mano recorre las opciones (sin delatar la correcta).
   Con experiencia: solo un saltito de las opciones si pasa un rato sin tocar. */
const HAND = `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><circle class="ripple" cx="15" cy="5.5" r="4"/><path class="palm" d="M13 18V7.5a2 2 0 0 1 4 0V13a2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v6c0 4.6-3.4 8-8 8h-1.2c-2.7 0-4.6-1.2-6-3.3l-4.2-6.1a2 2 0 0 1 3.2-2.4L13 20z"/><path d="M17 13v3M21 14v2.5"/></svg>`;
const G = { timers: [] };
const isNovice = () => (S.guide?.picks || 0) < 5;
function stopGuide() {
  G.timers.forEach((t) => clearTimeout(t)); G.timers = [];
  $$('.guide-hand').forEach((h) => h.remove());
  $$('.guide-on').forEach((e) => e.classList.remove('guide-on'));
}
function handOn(el) {
  $$('.guide-hand').forEach((h) => h.remove());
  if (!el || !el.isConnected) return;
  const h = document.createElement('span');
  h.className = 'guide-hand'; h.setAttribute('aria-hidden', 'true'); h.innerHTML = HAND;
  el.appendChild(h);
}
function bob(el, i = 0) {
  if (reduced() || !el.animate) return;
  el.animate([{ translate: '0 0' }, { translate: '0 -8px' }, { translate: '0 0' }, { translate: '0 -3px' }, { translate: '0 0' }], { duration: 650, delay: i * 120, easing: 'ease-out' });
}
/* un solo objetivo: anillo que late + mano */
function guideNext(el, { hand = true, scroll = false } = {}) {
  stopGuide();
  if (!el) return;
  el.classList.add('guide-on');
  if (hand) handOn(el);
  bob(el);
  if (scroll) setTimeout(() => el.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }), 60);
}
/* un grupo de opciones */
function guideGroup(box, sel, { strong = isNovice(), idle = 8000 } = {}) {
  stopGuide();
  if (!box) return;
  const items = () => $$(sel, box).filter((b) => !b.disabled && b.isConnected);
  const wave = () => items().forEach((b, i) => bob(b, i));
  if (strong) {
    let k = 0;
    const step = () => {
      const it = items();
      if (!it.length || !box.isConnected) { stopGuide(); return; }
      if (k % it.length === 0) wave();
      handOn(it[k % it.length]); k++;
      if (!reduced()) G.timers.push(setTimeout(step, 1500));
    };
    G.timers.push(setTimeout(step, 600));
  } else {
    const again = () => { if (!box.isConnected) return; wave(); G.timers.push(setTimeout(again, idle * 1.5)); };
    G.timers.push(setTimeout(again, idle));
  }
  box.addEventListener('pointerdown', stopGuide, { once: true });
}

/* ---------------- piezas comunes ---------------- */
const IMG = 'assets/img/';
const FACE = { base: 'cara-base', saludo: 'cara-saludo', pensativa: 'cara-pensativa', senalando: 'cara-senalando', animo: 'cara-animo', celebra: 'cara-celebra' };
function mentor(msg, face = 'base', label = 'Alma') {
  return `<div class="mentor" data-face="${face}">
    <img class="mentor-face" src="${IMG}${FACE[face]}.webp" alt="" width="56" height="56" decoding="async">
    <div class="bubble"><span class="bubble-name">${label}</span><p class="bubble-msg">${renderRich(msg)}</p></div>
  </div>`;
}
function setMentor(root, msg, face = 'base', label = 'Alma') {
  const m = $('.mentor', root);
  if (!m) return;
  const img = $('.mentor-face', m);
  if (img && m.dataset.face !== face) { img.src = `${IMG}${FACE[face]}.webp`; m.dataset.face = face; }
  $('.bubble-name', m).textContent = label;
  const p = $('.bubble-msg', m);
  p.innerHTML = renderRich(msg);
  m.classList.remove('pop'); void m.offsetWidth; m.classList.add('pop');
  live.textContent = `${label}: ${speak(msg)}`;
}
function topbar({ title, sub = '', back = '#/inicio', right = '' }) {
  return `<header class="topbar">
    <a class="icon-btn" href="${back}" aria-label="Volver">${icon('back')}</a>
    <div class="topbar-title"><strong>${title}</strong>${sub ? `<span>${sub}</span>` : ''}</div>
    <div class="topbar-right">${right}</div>
  </header>`;
}
const chip = (ic, val, label) => `<span class="counter" title="${label}" aria-label="${label}: ${val}">${icon(ic)}<span>${val}</span></span>`;
function themeIcon() { return S.theme === 'light' ? 'sun' : S.theme === 'dark' ? 'moon' : 'screen'; }
function themeLabel() { return S.theme === 'light' ? 'Modo claro' : S.theme === 'dark' ? 'Modo oscuro' : 'Modo del sistema'; }
function bindGlobal(root) {
  $$('[data-act="theme"]', root).forEach((b) => b.addEventListener('click', () => {
    S.theme = S.theme === 'system' ? 'light' : S.theme === 'light' ? 'dark' : 'system';
    save(); applyTheme();
    b.innerHTML = icon(themeIcon()); b.setAttribute('aria-label', themeLabel()); b.title = themeLabel();
  }));
  $$('[data-act="sound"]', root).forEach((b) => b.addEventListener('click', () => {
    S.sound = !S.sound; save();
    b.innerHTML = icon(S.sound ? 'sound' : 'mute'); b.setAttribute('aria-pressed', String(S.sound));
    if (S.sound) sfx.tap();
  }));
}
const brand = () => `<a class="brand" href="#/inicio" aria-label="La Comanda, inicio">${icon('cup', 'brand-ic')}<span>La Comanda</span></a>`;
const toggles = () => `<div class="toggles">
  <button class="icon-btn" data-act="theme" aria-label="${themeLabel()}" title="${themeLabel()}">${icon(themeIcon())}</button>
  <button class="icon-btn" data-act="sound" aria-pressed="${S.sound}" aria-label="Sonido" title="Sonido">${icon(S.sound ? 'sound' : 'mute')}</button>
</div>`;

const LEVEL_ORDER = ['facil', 'medio', 'alto'];
const SHIFT_LEN = 8;
function nextLevel() {
  if (!S.apertura.done) return 'apertura';
  for (const l of LEVEL_ORDER) if (!S.levels[l].done) return l;
  return 'alto';
}
function levelStatus(l) {
  if (l === 'apertura') return S.apertura.done ? 'ok' : (nextLevel() === 'apertura' ? 'now' : 'next');
  if (S.levels[l].done) return 'ok';
  if (S.shift && S.shift.level === l) return 'now';
  return nextLevel() === l ? 'now' : 'next';
}

/* =========================================================================
   INICIO
   ========================================================================= */
function viewHome() {
  const nl = nextLevel();
  const cont = S.shift && S.shift.idx > 0 && S.shift.idx < SHIFT_LEN
    ? { label: `Continuar · ${LEVELS[S.shift.level].name} ${S.shift.idx}/${SHIFT_LEN}`, href: `#/turno/${S.shift.level}` }
    : nl === 'apertura'
      ? { label: 'Empezar desde 0 · Apertura', href: '#/apertura' }
      : { label: `Empezar turno · ${LEVELS[nl].name}`, href: `#/turno/${nl}` };
  const greet = S.served === 0 ? 'Hoy abrimos la cafetería. ¿Empezamos?' : S.streak >= 3 ? `Llevas ${S.streak} pedidos seguidos sin error.` : 'Hay pedidos esperando en el riel.';
  const day = ['apertura', ...LEVEL_ORDER].map((l) => {
    const st = levelStatus(l);
    return `<li class="seg ${st}"><span></span>${{ apertura: 'Apertura', facil: 'Mañana', medio: 'Mediodía', alto: 'Hora punta' }[l]}</li>`;
  }).join('');
  app.innerHTML = `
  <div class="view home">
    <header class="home-top">${brand()}${toggles()}</header>
    <div class="home-grid">
      <figure class="hero" aria-hidden="true">
        <picture>
          <source media="(min-width: 900px)" srcset="${IMG}cafeteria-horizontal.webp">
          <img src="${IMG}cafeteria-vertical.webp" alt="" width="1000" height="1250" decoding="async" fetchpriority="high">
        </picture>
      </figure>
      <section class="home-main">
        <h1 class="title">Límites algebraicos</h1>
        <p class="subtitle">con el Profe Anto</p>
        ${mentor(greet, 'saludo')}
        <div class="counters">${chip('flame', S.streak, 'Racha')}${chip('cup', S.served, 'Pedidos servidos')}${chip('star', S.stars, 'Estrellas')}</div>
        <div class="day card">
          <div class="day-head"><span class="eyebrow">Jornada de hoy</span><span class="mono">${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })}</span></div>
          <ol class="day-segs">${day}</ol>
        </div>
        <div class="home-actions">
          <a class="btn primary" href="${cont.href}">${cont.label} ${icon('arrow')}</a>
          <div class="row2">
            <a class="btn secondary" href="#/jornada">Elegir turno</a>
            <a class="btn secondary" href="#/estaciones">Estaciones</a>
          </div>
        </div>
      </section>
    </div>
  </div>`;
  bindGlobal(app);
  // primera visita: señalar por dónde empezar
  if (!S.apertura.done && S.served === 0) setTimeout(() => guideNext($('.home-actions .btn.primary')), 900);
}

/* =========================================================================
   JORNADA (niveles)
   ========================================================================= */
function viewJornada() {
  const desc = {
    apertura: 'Qué significa acercarse, cómo se lee lím y cuándo sale 0/0.',
    facil: 'Factor común y diferencia de cuadrados.',
    medio: 'Aspa simple, conjugada y ∞/∞.',
    alto: 'Ruffini, ∞ − ∞ y pedidos que piden dos técnicas.',
  };
  const items = ['apertura', ...LEVEL_ORDER].map((l) => {
    const st = levelStatus(l);
    const L = l === 'apertura' ? { name: 'Apertura', short: 'Desde 0', hour: '07:00' } : LEVELS[l];
    const href = l === 'apertura' ? '#/apertura' : `#/turno/${l}`;
    let foot;
    if (st === 'ok') foot = `<span class="ok-line">${icon('check')} Servido${l === 'apertura' ? '' : ` ${SHIFT_LEN}/${SHIFT_LEN}`}</span><span class="stars">${[0, 1, 2].map((i) => starIcon(l === 'apertura' || i < Math.max(1, Math.round((S.levels[l]?.stars || 0) / SHIFT_LEN)))).join('')}</span>`;
    else if (st === 'now' && S.shift && S.shift.level === l) foot = `<span class="bar"><span style="width:${(S.shift.idx / SHIFT_LEN) * 100}%"></span></span><span>${S.shift.idx}/${SHIFT_LEN} pedidos</span>`;
    else if (st === 'now') foot = `<span class="go">Empezar ${icon('arrow')}</span>`;
    else foot = `<span class="muted">${icon('lock')} Recomendado después del turno anterior</span>`;
    return `<li class="shift ${st}">
      <div class="time"><span class="mono">${L.hour}</span><span class="dot"></span><span class="line"></span></div>
      <a class="shift-card card" href="${href}">
        <div class="shift-head"><h2>${L.name}</h2><span class="pill-level">${L.short}</span></div>
        <p>${renderRich(desc[l])}</p>
        <div class="shift-foot">${foot}</div>
      </a>
    </li>`;
  }).join('');
  app.innerHTML = `<div class="view narrow">${topbar({ title: 'Jornada', sub: 'Cada turno sube la dificultad' })}<ol class="shifts">${items}</ol></div>`;
}

/* =========================================================================
   ESTACIONES (técnicas)
   ========================================================================= */
const MASTER = 6;
function viewEstaciones() {
  const cards = Object.entries(TECH).map(([k, t]) => {
    const st = S.tech[k] || { ok: 0 };
    const lvl = st.ok >= MASTER ? 'ok' : st.ok > 0 ? 'mid' : 'off';
    const prog = lvl === 'ok' ? `${icon('check')} Dominada` : `${Math.min(st.ok, MASTER)} de ${MASTER}`;
    return `<a class="station card ${lvl}" href="#/estacion/${k}">
      <span class="glyph">${renderMath(t.glyph)}</span>
      <strong>${t.name}</strong>
      <span class="prog">${prog}</span>
    </a>`;
  }).join('');
  app.innerHTML = `<div class="view narrow">${topbar({ title: 'Estaciones', sub: 'Practica una técnica a la vez' })}
    <a class="banner" href="#/comandas"><span><strong>Lectura de comandas</strong><small>Solo elige la técnica. Pedidos rápidos.</small></span>${icon('arrow')}</a>
    <div class="stations">${cards}</div></div>`;
}

/* =========================================================================
   PEDIDO — motor principal
   ========================================================================= */
let P = null; // sesión de pedidos en curso
const FORM_TAG = {
  indet: ['Forma 0/0 · hay que transformar', 'warm'],
  directa: ['Sustitución directa', 'sage'],
  infinito: ['Forma ∞/∞ · divide entre la mayor potencia', 'warm'],
  infmenosinf: ['Forma ∞ − ∞ · hay que transformar', 'warm'],
};

function startSession(mode, opts = {}) {
  if (mode === 'turno') {
    const level = opts.level;
    if (!S.shift || S.shift.level !== level || S.shift.idx >= SHIFT_LEN) S.shift = { level, idx: 0, stats: { firstTry: 0, hints: 0, errors: 0, best: 0, tips: 0, techErr: {}, stars: 0 } };
    save();
    P = { mode, level, list: generateShift(level, SHIFT_LEN - S.shift.idx), offset: S.shift.idx, i: 0 };
  } else if (mode === 'estacion') {
    P = { mode, tech: opts.tech, level: TECH_LEVEL[opts.tech], list: [generate(opts.tech, TECH_LEVEL[opts.tech])], offset: 0, i: 0 };
  } else if (mode === 'apertura') {
    P = { mode, level: 'facil', list: [generate('directa', 'facil'), generate('directa', 'facil')], offset: 0, i: 0 };
  }
  P.runStreak = 0;
}

function viewPedido() {
  const ex = P.list[P.i];
  P.ex = ex; P.step = 0; P.errors = 0; P.hints = 0; P.hintLevel = 0; P.lines = []; P.busy = false; P.tips = 0;
  const total = P.mode === 'turno' ? SHIFT_LEN : P.mode === 'apertura' ? 2 : null;
  const num = P.offset + P.i + 1;
  const title = P.mode === 'turno' ? LEVELS[P.level].name : P.mode === 'estacion' ? TECH[P.tech].name : 'Apertura';
  const sub = total ? `Pedido ${num} de ${total}` : `Pedido ${num}`;
  const back = P.mode === 'estacion' ? '#/estaciones' : P.mode === 'apertura' ? '#/apertura' : '#/jornada';
  const segs = total ? `<div class="progress" aria-hidden="true">${Array.from({ length: total }, (_, k) => `<span class="${k < num - 1 ? 'done' : k === num - 1 ? 'now' : ''}"></span>`).join('')}</div>` : '';
  const time = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
  app.innerHTML = `<div class="view pedido">
    ${topbar({ title, sub, back, right: chip('flame', S.streak, 'Racha') })}
    ${segs}
    <div class="stage">
      <section class="col-ticket" aria-label="Pedido">
        <div class="rail" aria-hidden="true"><span class="clip"></span></div>
        <article class="ticket" id="ticket">
          <div class="ticket-meta mono"><span>PEDIDO 0${ex.number}</span><span>${time}</span></div>
          <div class="ticket-client"><img src="${IMG}cliente-${ex.client}.webp" alt="" width="32" height="32"><span>Para ${ex.clientName}</span></div>
          <div class="ticket-sep"></div>
          <div class="ticket-expr math" role="math" aria-label="${speak(ex.fTex)}">${renderMath(ex.fTex)}</div>
          <ol class="proc" id="proc" aria-label="Procedimiento"></ol>
          <div class="stamp" aria-hidden="true">SERVIDO</div>
        </article>
      </section>
      <section class="col-side">
        <div class="tray">
          ${mentor('', 'base')}
          <p class="guide-tip" id="gtip" hidden><span class="gt-hand" aria-hidden="true">${HAND}</span><span>Toca la opción que va en el <span class="mini-slot">?</span> <small>o arrástrala</small></span></p>
          <div class="options" id="options" role="group" aria-label="Alternativas"></div>
          <footer class="ped-foot">
            <button class="hint-btn" id="hintBtn" type="button">${icon('bulb')}<span>Pista</span></button>
            <span class="hint-dots" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
            <span class="howto">Toca o arrastra</span>
          </footer>
        </div>
      </section>
    </div>
  </div>`;
  $('#hintBtn').addEventListener('click', giveHint);
  showStep();
}

function tagsBox() {
  let t = $('#tags');
  if (!t) {
    t = document.createElement('li');
    t.id = 'tags'; t.className = 'tags';
    const proc = $('#proc');
    const form = $('#proc .form-line');
    if (form) form.after(t); else proc.prepend(t);
  }
  return t;
}
function lineEl(tex, cls = '') {
  const li = document.createElement('li');
  li.className = 'pline ' + cls;
  li.innerHTML = `<span class="math" role="math" aria-label="${speak(tex)}">${renderMath(tex)}</span>`;
  return li;
}
function fit(el) {
  // reduce el tamaño de una línea si no entra en el ancho
  const m = el.querySelector('.math') || el;
  m.style.fontSize = '';
  let size = parseFloat(getComputedStyle(m).fontSize);
  let guard = 0;
  while (m.scrollWidth > el.clientWidth + 1 && size > 13 && guard++ < 20) { size -= 1; m.style.fontSize = size + 'px'; }
}
const fitAll = () => $$('.pline, .ticket-expr').forEach(fit);
window.addEventListener('resize', () => { if (P && $('.pedido')) fitAll(); });

async function showStep() {
  const s = P.ex.steps[P.step];
  P.hintLevel = 0; P.stepErrors = 0;
  updateHintUI();
  const proc = $('#proc');
  // cancelación visible antes de simplificar
  if (s.cancelPrev && P.lines.length) {
    const prev = P.lines[P.lines.length - 1];
    prev.innerHTML = lineEl(s.cancelPrev).innerHTML;
    prev.classList.add('cancelling');
    fit(prev);
    await wait(420);
  }
  if (s.kind === 'tech' || s.kind === 'pick') {
    // la respuesta va a una etiqueta, no a una línea
    const tags = tagsBox();
    const t = document.createElement('span');
    t.className = 'tag slot-tag';
    t.innerHTML = '<span class="slot" data-slot>?</span>';
    t.dataset.pending = '1';
    tags.appendChild(t);
  } else if (s.line) {
    if (s.ruffini) {
      const box = document.createElement('li');
      box.className = 'pline ruffini-wrap';
      box.innerHTML = renderRuffini(s.ruffini.coeffs, s.ruffini.r);
      proc.appendChild(box);
      P.lines.push(box);
    }
    if (s.mode === 'replace' && P.lines.length) {
      const last = P.lines[P.lines.length - 1];
      last.innerHTML = lineEl(s.line).innerHTML;
      fit(last);
    } else {
      const li = lineEl(s.line, s.kind === 'form' ? 'form-line' : '');
      proc.appendChild(li);
      P.lines.push(li);
      fit(li);
      li.classList.add('enter');
      li.addEventListener('animationend', () => li.classList.remove('enter'), { once: true });
    }
  }
  const slot = $('#ticket .slot, #tags .slot');
  if (slot) slot.classList.add('active');
  setMentor(app, s.prompt, 'base');
  renderOptions(s);
  scrollIntoViewSoft($('#ticket .slot') || $('#proc').lastElementChild);
  // guía: al principio, insistente; luego, solo si pasa un rato sin tocar
  const novice = isNovice();
  $('#gtip').hidden = !novice;
  $('.howto').hidden = novice;
  if (slot) slot.classList.toggle('hey', novice);
  guideGroup($('#options'), '.pill', { strong: novice });
}

function scrollIntoViewSoft(el) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  if (r.bottom > window.innerHeight * 0.62 || r.top < 60) el.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
}

function renderOptions(s) {
  const box = $('#options');
  box.innerHTML = '';
  s.options.forEach((o, idx) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pill' + (o.text ? ' text' : '');
    b.dataset.idx = idx;
    b.innerHTML = `<span class="key" aria-hidden="true">${idx + 1}</span><span class="pill-body ${o.text ? '' : 'math'}">${o.text ? renderRich(o.tex) : renderMath(o.tex)}</span><span class="mark" aria-hidden="true"></span>`;
    b.setAttribute('aria-label', `Opción ${idx + 1}: ${o.text ? o.tex : speak(o.tex)}`);
    box.appendChild(b);
    bindPill(b, o);
    b.style.setProperty('--d', `${idx * 45}ms`);
  });
  $('.howto').textContent = matchMedia('(pointer: fine)').matches ? `Teclas 1 · ${s.options.length > 2 ? '2 · ' : ''}${s.options.length} o arrastra` : 'Toca o arrastra';
}

/* ---------- arrastrar o tocar ---------- */
function bindPill(b, o) {
  let start = null; let ghost = null; let moved = false;
  b.addEventListener('pointerdown', (e) => {
    if (P.busy || b.disabled) return;
    start = { x: e.clientX, y: e.clientY }; moved = false;
    b.setPointerCapture(e.pointerId);
  });
  b.addEventListener('pointermove', (e) => {
    if (!start) return;
    const dx = e.clientX - start.x; const dy = e.clientY - start.y;
    if (!moved && Math.hypot(dx, dy) > 8) {
      moved = true;
      const r = b.getBoundingClientRect();
      ghost = b.cloneNode(true); ghost.classList.add('ghost');
      Object.assign(ghost.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
      document.body.appendChild(ghost); b.classList.add('lifted');
    }
    if (moved && ghost) {
      ghost.style.transform = `translate(${dx}px, ${dy}px) scale(1.03)`;
      const slot = $('#ticket .slot.active, #tags .slot.active');
      if (slot) {
        const sr = slot.getBoundingClientRect();
        const over = e.clientX > sr.left - 30 && e.clientX < sr.right + 30 && e.clientY > sr.top - 30 && e.clientY < sr.bottom + 30;
        slot.classList.toggle('over', over);
      }
    }
  });
  const end = (e) => {
    if (!start) return;
    const wasMoved = moved; start = null;
    if (!wasMoved) { choose(o, b); return; }
    const slot = $('#ticket .slot.active, #tags .slot.active');
    const over = slot && slot.classList.contains('over');
    if (slot) slot.classList.remove('over');
    if (over || inTicket(e)) { choose(o, b, ghost); ghost = null; }
    else {
      b.classList.remove('lifted');
      if (ghost) { ghost.style.transition = 'transform .25s ease'; ghost.style.transform = 'translate(0,0)'; const g = ghost; setTimeout(() => g.remove(), 260); ghost = null; }
    }
  };
  b.addEventListener('pointerup', end);
  b.addEventListener('pointercancel', () => { start = null; if (ghost) { ghost.remove(); ghost = null; } b.classList.remove('lifted'); });
}
function inTicket(e) {
  const t = $('#ticket'); if (!t) return false;
  const r = t.getBoundingClientRect();
  return e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
}

document.addEventListener('keydown', (e) => {
  if (!P || !$('.pedido') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (/^[1-4]$/.test(e.key)) {
    const b = $(`#options .pill[data-idx="${Number(e.key) - 1}"]`);
    if (b && !b.disabled) { e.preventDefault(); choose(P.ex.steps[P.step].options[Number(e.key) - 1], b); }
  } else if (e.key === 'h' || e.key === 'H') { giveHint(); }
});

/* ---------- elegir ---------- */
async function choose(o, b, ghost = null) {
  if (P.busy || b.disabled) { if (ghost) ghost.remove(); return; }
  stopGuide();
  const s = P.ex.steps[P.step];
  if (!o.ok) {
    P.errors++; P.stepErrors++;
    if (P.mode === 'turno') { S.shift.stats.errors++; S.shift.stats.techErr[P.ex.tech] = (S.shift.stats.techErr[P.ex.tech] || 0) + 1; }
    S.streak = 0; save();
    $('.topbar .counter span').textContent = '0';
    sfx.bad();
    b.classList.remove('lifted');
    if (ghost) ghost.remove();
    b.classList.add('wrong');
    b.querySelector('.mark').innerHTML = icon('x');
    b.disabled = true;
    b.setAttribute('aria-disabled', 'true');
    setMentor(app, o.fb || 'Revisa este paso.', 'animo');
    // dos errores sin pedir pista: señalar el botón de pista
    if (P.stepErrors >= 2 && P.hintLevel === 0) guideNext($('#hintBtn'), { hand: false });
    return;
  }
  P.busy = true;
  S.guide = S.guide || { picks: 0 }; S.guide.picks++;
  $('#gtip').hidden = true;
  sfx.ok();
  // propinas: más si fue al primer intento y sin pistas
  const gain = P.stepErrors === 0 ? (P.hintLevel === 0 ? 10 : 6) : 3;
  P.tips += gain;
  $$('#options .pill').forEach((x) => { x.disabled = true; if (x !== b) x.classList.add('dim'); });
  b.classList.add('right');
  b.querySelector('.mark').innerHTML = icon('check');
  await fly(b, ghost);
  // escribir el resultado en el procedimiento
  if (s.kind === 'tech' || s.kind === 'pick') {
    const t = $('#tags [data-pending]');
    if (t) {
      delete t.dataset.pending;
      t.className = 'tag cool fill';
      t.innerHTML = s.kind === 'tech' ? `Técnica · ${TECH[s.tagTech].name}` : renderRich(s.tagText);
    }
  } else {
    const last = P.lines[P.lines.length - 1];
    const [first, ...more] = s.done.split(' \\br ');
    last.innerHTML = lineEl(first).innerHTML;
    last.classList.remove('enter');
    last.classList.add('filled');
    setTimeout(() => last.classList.remove('filled'), 900);
    fit(last);
    for (const m of more) { const li = lineEl(m, 'filled'); $('#proc').appendChild(li); P.lines.push(li); fit(li); }
    if (s.tag) {
      const [txt, tone] = FORM_TAG[s.tag];
      const t = document.createElement('span');
      t.className = `tag ${tone} fill`;
      t.textContent = txt;
      tagsBox().appendChild(t);
    }
  }
  if (s.kind === 'form' && s.tag !== 'directa') {
    // la línea de sustitución se aligera para no confundirla con el procedimiento
    P.lines[P.lines.length - 1].classList.add('aside');
  }
  setMentor(app, s.success || '¡Bien!', s.final ? 'celebra' : 'base');
  await wait(s.final ? 380 : 620);
  P.busy = false;
  if (s.final) { serve(); return; }
  P.step++;
  showStep();
}

async function fly(b, ghost) {
  const slot = $('#ticket .slot.active, #tags .slot.active');
  if (!slot || reduced()) { if (ghost) ghost.remove(); return; }
  const from = (ghost || b).getBoundingClientRect();
  const to = slot.getBoundingClientRect();
  const g = ghost || b.cloneNode(true);
  if (!ghost) {
    g.classList.add('ghost', 'right');
    Object.assign(g.style, { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px' });
    document.body.appendChild(g);
  }
  const base = b.getBoundingClientRect();
  const dx = to.left + to.width / 2 - (base.left + base.width / 2);
  const dy = to.top + to.height / 2 - (base.top + base.height / 2);
  const sc = Math.max(0.35, Math.min(1, (to.height + 14) / base.height));
  g.style.left = base.left + 'px'; g.style.top = base.top + 'px';
  g.style.transition = 'transform .42s cubic-bezier(.2,.8,.2,1), opacity .42s ease';
  requestAnimationFrame(() => {
    g.style.transform = `translate(${dx}px, ${dy}px) scale(${sc})`;
    g.style.opacity = '0.15';
  });
  slot.classList.add('landing');
  await wait(430);
  g.remove();
}

/* ---------- pistas ---------- */
function updateHintUI() {
  const dots = $$('.hint-dots i');
  dots.forEach((d, i) => d.classList.toggle('on', i < P.hintLevel));
  const btn = $('#hintBtn');
  if (btn) {
    btn.classList.toggle('active', P.hintLevel > 0);
    $('span', btn).textContent = P.hintLevel ? `Pista ${P.hintLevel}/4` : 'Pista';
    btn.disabled = P.hintLevel >= 4;
  }
}
function giveHint() {
  if (!P || P.busy) return;
  const s = P.ex.steps[P.step];
  if (P.hintLevel >= 4) return;
  P.hintLevel++; P.hints++;
  $('#hintBtn')?.classList.remove('guide-on');
  if (P.mode === 'turno') S.shift.stats.hints++;
  const h = s.hints[P.hintLevel - 1];
  const text = typeof h === 'string' ? h : h.text;
  $$('.mk.hl, .pline.hl').forEach((x) => x.classList.remove('hl'));
  if (typeof h === 'object' && h.mark) {
    if (h.mark === 'prev') { const prev = P.lines[P.lines.length - 2] || P.lines[P.lines.length - 1]; if (prev) prev.classList.add('hl'); }
    else $$(`#ticket [data-mk="${h.mark}"]`).forEach((x) => x.classList.add('hl'));
  }
  setMentor(app, text, P.hintLevel >= 3 ? 'senalando' : 'pensativa', `Pista ${P.hintLevel} de 4`);
  updateHintUI();
  sfx.tap();
}

/* ---------- servir ---------- */
async function serve() {
  const stars = P.errors === 0 && P.hints <= 1 ? 3 : P.errors <= 1 && P.hints <= 3 ? 2 : 1;
  const clean = P.errors === 0;
  S.served++; S.tips += P.tips; S.stars += stars;
  S.streak = clean ? S.streak + 1 : 0;
  S.bestStreak = Math.max(S.bestStreak, S.streak);
  const t = P.ex.tech;
  S.tech[t] = S.tech[t] || { ok: 0, tries: 0 };
  S.tech[t].tries++; if (clean) S.tech[t].ok++;
  if (P.mode === 'turno') {
    S.shift.idx++;
    const st = S.shift.stats; if (clean) st.firstTry++; st.tips += P.tips; st.stars += stars; st.best = Math.max(st.best, S.streak);
    S.levels[P.level].served++;
  }
  save();
  sfx.serve();
  const tk = $('#ticket');
  tk.classList.add('served');
  if (!reduced()) burst(tk);
  $('.topbar .counter span').textContent = String(S.streak);
  const lastInShift = P.mode === 'turno' && S.shift.idx >= SHIFT_LEN;
  const lastApertura = P.mode === 'apertura' && P.i >= P.list.length - 1;
  const nextLabel = lastInShift ? 'Cerrar el turno' : lastApertura ? 'Siguiente idea' : 'Siguiente pedido';
  const side = $('.col-side');
  side.innerHTML = `
    ${mentor(clean ? '¡Pedido servido! Lo construiste sin errores.' : '¡Pedido servido! Revisa los pasos donde dudaste.', 'celebra')}
    <div class="spacer"></div>
    <div class="reward">
      <span class="tip">+${P.tips} propinas</span>
      <span class="stars" aria-label="${stars} de 3 estrellas">${[0, 1, 2].map((i) => starIcon(i < stars)).join('')}</span>
      <span class="badge">${clean ? 'Al primer intento' : `${P.errors} ${P.errors === 1 ? 'error' : 'errores'}`}</span>
    </div>
    <button class="btn primary" id="nextBtn" type="button">${nextLabel} ${icon('arrow')}</button>
    <a class="btn ghost" href="${P.mode === 'estacion' ? '#/estaciones' : '#/jornada'}">${P.mode === 'estacion' ? 'Ver estaciones' : 'Ver la jornada'}</a>`;
  $('.ped-foot')?.remove();
  const nb = $('#nextBtn');
  nb.focus({ preventScroll: true });
  setTimeout(() => guideNext(nb, { hand: isNovice() || S.served <= 2, scroll: true }), 700);
  nb.addEventListener('click', () => {
    if (lastInShift) { location.hash = `#/fin/${P.level}`; return; }
    if (lastApertura) { S.apertura.idea = Math.max(S.apertura.idea, 3); save(); location.hash = '#/apertura/4'; return; }
    if (P.mode === 'estacion') P.list.push(generate(P.tech, P.level));
    P.i++;
    viewPedido();
    window.scrollTo({ top: 0, behavior: 'auto' });
  });
  live.textContent = `Pedido servido. ${stars} de 3 estrellas.`;
}

function burst(host) {
  const box = document.createElement('div');
  box.className = 'burst';
  const colors = ['var(--terracota)', 'var(--laton)', 'var(--salvia)', 'var(--terracota)'];
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('i');
    const ang = (Math.PI * 2 * i) / 18 + Math.random() * 0.3;
    const dist = 60 + Math.random() * 70;
    p.style.setProperty('--tx', `${Math.cos(ang) * dist}px`);
    p.style.setProperty('--ty', `${Math.sin(ang) * dist - 20}px`);
    p.style.setProperty('--c', colors[i % colors.length]);
    p.style.setProperty('--r', `${Math.random() * 180}deg`);
    p.className = i % 3 === 0 ? 'bean' : '';
    box.appendChild(p);
  }
  host.appendChild(box);
  setTimeout(() => box.remove(), 1100);
}

/* =========================================================================
   FIN DEL TURNO
   ========================================================================= */
function viewFin(level) {
  const st = (S.shift && S.shift.level === level && S.shift.stats) || { firstTry: 0, hints: 0, errors: 0, best: 0, tips: 0, techErr: {}, stars: 0 };
  S.levels[level].done = true;
  S.levels[level].stars = Math.max(S.levels[level].stars, st.stars);
  S.levels[level].best = Math.max(S.levels[level].best, st.firstTry);
  S.shift = null;
  save();
  const stars = st.stars >= SHIFT_LEN * 2.6 ? 3 : st.stars >= SHIFT_LEN * 1.8 ? 2 : 1;
  const worst = Object.entries(st.techErr).sort((a, b) => b[1] - a[1])[0];
  const nxt = LEVEL_ORDER[LEVEL_ORDER.indexOf(level) + 1];
  app.innerHTML = `<div class="view narrow fin">
    <header class="fin-head"><span class="eyebrow">${LEVELS[level].name} · ${LEVELS[level].short}</span><h1 class="title">Fin del turno</h1></header>
    <div class="big card paper"><span class="big-n">${SHIFT_LEN}</span><span>de ${SHIFT_LEN} pedidos servidos</span><span class="stars">${[0, 1, 2].map((i) => starIcon(i < stars)).join('')}</span></div>
    <div class="stats">
      <div class="card"><strong>${st.firstTry}/${SHIFT_LEN}</strong><span>Al primer intento</span></div>
      <div class="card"><strong>${st.hints}</strong><span>Pistas usadas</span></div>
      <div class="card"><strong>${st.best}</strong><span>Mejor racha</span></div>
      <div class="card"><strong>+${st.tips}</strong><span>Propinas</span></div>
    </div>
    ${worst ? `<div class="card hard"><span class="eyebrow">Lo que más te costó</span><div class="hard-row"><span class="glyph">${renderMath(TECH[worst[0]].glyph)}</span><span><strong>${TECH[worst[0]].name}</strong><small>${worst[1]} ${worst[1] === 1 ? 'error' : 'errores'}. Repásala en Estaciones.</small></span></div></div>` : ''}
    ${mentor(st.errors === 0 ? 'Turno impecable. ¡Así se atiende una cafetería!' : nxt ? `Buen turno. ${LEVELS[nxt].name} te espera.` : 'Cerraste la jornada completa.', 'celebra')}
    <div class="home-actions">
      ${nxt ? `<a class="btn primary" href="#/turno/${nxt}">Siguiente turno · ${LEVELS[nxt].name} ${icon('arrow')}</a>` : '<a class="btn primary" href="#/estaciones">Practicar en Estaciones</a>'}
      <a class="btn secondary" href="#/turno/${level}">Repetir ${LEVELS[level].name}</a>
      <a class="btn ghost" href="#/inicio">Volver al inicio</a>
    </div>
  </div>`;
  if (!reduced()) burst($('.big'));
  sfx.serve();
}

/* =========================================================================
   LECTURA DE COMANDAS — diagnóstico rápido de la técnica
   ========================================================================= */
let C = null;
function viewComandas() {
  if (!C || C.round >= 10) C = { round: 0, ok: 0 };
  const pool = ['directa', 'factorComun', 'difCuadrados', 'aspa', 'conjugada', 'potencia', 'ruffini', 'infMenosInf'];
  const tech = pool[Math.floor(Math.random() * pool.length)];
  const ex = generate(tech, TECH_LEVEL[tech]);
  const others = shuffle(pool.filter((t) => t !== tech)).slice(0, 3);
  const opts = shuffle([tech, ...others]);
  C.round++;
  const cue = { directa: 'Al sustituir da un número: no hay nada que transformar.', factorComun: 'Todos los términos tienen x y x → 0.', difCuadrados: 'Hay una resta de dos cuadrados.', aspa: 'Hay un trinomio x² + bx + c.', conjugada: 'Hay una raíz y sale 0/0.', potencia: 'Es un cociente con x → ∞.', ruffini: 'Hay un polinomio de grado 3 que se anula.', infMenosInf: 'Es una resta de dos cosas que crecen.' };
  app.innerHTML = `<div class="view narrow comandas">
    ${topbar({ title: 'Lectura de comandas', sub: `Ronda ${C.round} de 10`, back: '#/estaciones', right: chip('check', C.ok, 'Aciertos') })}
    <div class="rail" aria-hidden="true"><span class="clip"></span></div>
    <article class="ticket small"><div class="ticket-meta mono"><span>PEDIDO 0${ex.number}</span><span>${C.round}/10</span></div>
      <div class="ticket-expr math" role="math" aria-label="${speak(ex.fTex)}">${renderMath(ex.fTex)}</div></article>
    <h2 class="question">¿Qué técnica pide este pedido?</h2>
    <div class="tech-grid">${opts.map((t, i) => `<button class="tech-btn card" data-t="${t}" type="button"><span class="glyph">${renderMath(TECH[t].glyph)}</span><span>${TECH[t].name}</span></button>`).join('')}</div>
    ${mentor('Mira la forma antes de calcular.', 'base')}
    <div class="spacer"></div>
    <button class="btn primary hidden" id="nextC" type="button">${C.round >= 10 ? 'Ver resultado' : 'Siguiente comanda'} ${icon('arrow')}</button>
  </div>`;
  fitAll();
  guideGroup($('.tech-grid'), '.tech-btn', { strong: C.round === 1 && isNovice() });
  let answered = false;
  $$('.tech-btn').forEach((b) => b.addEventListener('click', () => {
    if (answered) return;
    stopGuide();
    const t = b.dataset.t;
    if (t === tech) {
      answered = true; C.ok++; sfx.ok();
      b.classList.add('right');
      setMentor(app, `Exacto. ${cue[tech]}`, 'celebra');
      $$('.tech-btn').forEach((x) => { x.disabled = true; if (x !== b) x.classList.add('dim'); });
      $('#nextC').classList.remove('hidden'); $('#nextC').focus({ preventScroll: true });
      setTimeout(() => guideNext($('#nextC'), { hand: C.round <= 2, scroll: true }), 500);
      $('.topbar .counter span').textContent = String(C.ok);
    } else {
      sfx.bad(); b.classList.add('wrong'); b.disabled = true;
      setMentor(app, `${TECH[t].name}: ${hintWrong(t)}`, 'animo');
    }
  }));
  $('#nextC').addEventListener('click', () => {
    if (C.round >= 10) {
      const ok = C.ok; C = null;
      app.innerHTML = `<div class="view narrow fin"><header class="fin-head"><span class="eyebrow">Lectura de comandas</span><h1 class="title">${ok} de 10</h1></header>
        ${mentor(ok >= 8 ? 'Lees las comandas como una barista experta.' : 'Vuelve a intentarlo: mira primero la forma.', ok >= 8 ? 'celebra' : 'base')}
        <div class="home-actions"><a class="btn primary" href="#/comandas">Otra ronda ${icon('arrow')}</a><a class="btn secondary" href="#/estaciones">Volver a Estaciones</a></div></div>`;
      return;
    }
    viewComandas();
  });
}
function hintWrong(t) {
  return { directa: 'solo sirve si el denominador no se anula.', factorComun: 'necesita que todos los términos compartan x.', difCuadrados: 'necesita una resta de dos cuadrados.', aspa: 'sirve para trinomios x² + bx + c.', conjugada: 'se usa cuando hay raíces.', potencia: 'se usa en cocientes con x → ∞.', ruffini: 'se usa con polinomios de grado 3 o más.', infMenosInf: 'se usa en restas de dos expresiones que crecen.' }[t];
}

/* =========================================================================
   APERTURA (Desde 0)
   ========================================================================= */
function aperturaFrame(n, inner, title) {
  return `<div class="view narrow apertura">
    ${topbar({ title: 'Apertura', sub: `Idea ${n} de 4 · ${title}`, back: '#/jornada', right: `<span class="idea-dots" aria-hidden="true">${[1, 2, 3, 4].map((k) => `<i class="${k < n ? 'done' : k === n ? 'now' : ''}"></i>`).join('')}</span>` })}
    ${inner}
  </div>`;
}

function viewApertura(n = 1) {
  if (n === 1) return idea1();
  if (n === 2) return idea2();
  if (n === 3) { startSession('apertura'); return viewPedido(); }
  return idea4();
}

/* pequeña pregunta de opciones (Apertura): una sola correcta, retroalimentación en las incorrectas */
function miniQuiz(box, opts, { onRight, row = false } = {}) {
  box.className = 'options' + (row ? ' row' : '');
  box.innerHTML = opts.map((o, i) => `<button class="pill ${o.math ? '' : 'text'}" data-i="${i}" type="button"><span class="pill-body ${o.math ? 'math' : ''}">${o.math ? renderMath(o.t) : o.t}</span><span class="mark" aria-hidden="true"></span></button>`).join('');
  $$('.pill', box).forEach((b) => b.addEventListener('click', () => {
    if (b.disabled) return;
    stopGuide();
    const o = opts[Number(b.dataset.i)];
    if (o.ok) {
      sfx.ok(); b.classList.add('right'); b.querySelector('.mark').innerHTML = icon('check');
      $$('.pill', box).forEach((x) => { x.disabled = true; if (x !== b) x.classList.add('dim'); });
      S.guide = S.guide || { picks: 0 }; S.guide.picks++; save();
      onRight?.();
    } else {
      sfx.bad(); b.classList.add('wrong'); b.disabled = true; b.querySelector('.mark').innerHTML = icon('x');
      setMentor(app, o.fb, 'animo');
    }
  }));
  guideGroup(box, '.pill', { strong: true });
}
function nextIdeaButton(after, href) {
  after.insertAdjacentHTML('afterend', `<a class="btn primary next-idea" href="${href}">Siguiente idea ${icon('arrow')}</a>`);
  setTimeout(() => guideNext($('.next-idea'), { scroll: true }), 500);
}

function idea1() {
  // f(x) = (x² − 4)/(x − 2): el concepto de límite solo con números (sin gráficas)
  const fmt = (v) => String(Math.round(v * 1000) / 1000);
  const rows = [1.9, 1.99, 1.999, 2, 2.001, 2.01, 2.1];
  const order = [1.9, 2.1, 1.99, 2.01, 1.999, 2.001, 2];
  app.innerHTML = aperturaFrame(1, `
    <div class="card paper approach">
      <div class="math center big-expr" role="math" aria-label="f de x igual a x al cuadrado menos 4 entre x menos 2">${renderMath('f(x) = \\frac{x^{2} − 4}{x − 2}')}</div>
      <div class="ap-table" role="table" aria-label="Valores de f(x) cuando x se acerca a 2">
        <div class="ap-row head" role="row"><span role="columnheader" class="math">${renderMath('x')}</span><span role="columnheader" class="math">${renderMath('f(x)')}</span></div>
        <div class="ap-side" aria-hidden="true">x se acerca a 2 desde abajo ↓</div>
        ${rows.map((v) => `<div class="ap-row ${v === 2 ? 'hole' : ''}" role="row">
          <span class="ap-x math" role="cell">${renderMath(fmt(v))}</span>
          <span role="cell"><button class="ap-cell" type="button" data-v="${v}" aria-label="Calcular f de ${fmt(v)}">?</button></span>
        </div>`).join('')}
        <div class="ap-side" aria-hidden="true">x se acerca a 2 desde arriba ↑</div>
      </div>
    </div>
    ${mentor('Toca cada ? para calcular f(x). Mira a qué número se acerca.', 'saludo')}
    <div class="options row" id="q1"></div>`, 'Acercarse');
  const shown = new Set();
  const next = () => order.find((v) => !shown.has(v));
  const cell = (v) => $(`.ap-cell[data-v="${v}"]`);
  $$('.ap-cell').forEach((b) => b.addEventListener('click', () => {
    const v = Number(b.dataset.v);
    if (shown.has(v)) return;
    shown.add(v); sfx.tap();
    b.classList.add('shown');
    if (v === 2) {
      b.classList.add('none');
      b.innerHTML = `<span class="math">${renderMath('\\frac{0}{0}')}</span>`;
      b.setAttribute('aria-label', 'f de 2 da 0 entre 0: no existe');
      setMentor(app, 'En x = 2 sale 0/0: f(2) no existe. Pero los valores de al lado sí se acercan a algo.', 'pensativa');
    } else {
      b.textContent = fmt(v + 2);
      b.setAttribute('aria-label', `f de ${fmt(v)} es ${fmt(v + 2)}`);
      setMentor(app, `f(${fmt(v)}) = ${fmt(v + 2)}`, 'senalando');
    }
    if (shown.size === rows.length) { $('.approach').classList.add('converge'); ask(); }
    else guideNext(cell(next()));
  }));
  setTimeout(() => guideNext(cell(next())), 700);
  function ask() {
    setTimeout(() => {
      setMentor(app, 'Cuando x se acerca a 2, ¿a qué número se acerca f(x)?', 'base');
      miniQuiz($('#q1'), shuffle([
        { t: '4', math: true, ok: true },
        { t: '2', math: true, fb: '2 es a donde se acerca x. Mira la columna de f(x).' },
        { t: 'No existe', fb: 'f(2) no existe, pero f(x) sí se acerca a un número: mira la tabla.' },
      ]), {
        row: true,
        onRight: () => {
          setMentor(app, 'Exacto. El límite es 4, aunque f(2) no exista. Eso es un límite: el valor al que se acerca f(x).', 'celebra');
          S.apertura.idea = Math.max(S.apertura.idea, 1); save();
          nextIdeaButton($('#q1'), '#/apertura/2');
        },
      });
      $('#q1').scrollIntoView({ block: 'end', behavior: reduced() ? 'auto' : 'smooth' });
    }, 700);
  }
}

function idea2() {
  const parts = [
    ['lim', 'lím', 'lím se lee “límite”: el valor al que se acerca la función.'],
    ['to', 'x → 2', '“x tiende a 2”: x se acerca a 2 todo lo que quieras, sin necesidad de llegar.'],
    ['f', 'f(x)', 'Es la función: lo que va cambiando mientras x se acerca.'],
    ['v', '= 4', 'Es el resultado: el número al que se acerca f(x).'],
  ];
  app.innerHTML = aperturaFrame(2, `
    <div class="card paper anatomy">
      <div class="anatomy-expr" role="group" aria-label="Partes de la notación de límite">
        <span class="lim anat"><button class="part" data-p="lim" type="button"><span class="lw">lím</span></button><button class="part sub" data-p="to" type="button"><span class="ls"><i>x</i> → 2</span></button></span>
        <button class="part" data-p="f" type="button"><span class="math">${renderMath('f(x)')}</span></button>
        <button class="part" data-p="v" type="button"><span class="math">${renderMath('= 4')}</span></button>
      </div>
      <p class="anatomy-help">Toca cada parte marcada</p>
      <ul class="anatomy-list" id="alist"></ul>
    </div>
    ${mentor('Así se escribe un límite. Toca cada parte para saber qué significa.', 'base')}
    <div class="options" id="q2"></div>`, 'Leer la notación');
  const seen = new Set();
  const nextPart = () => { const p = parts.find((x) => !seen.has(x[0])); return p && $(`.part[data-p="${p[0]}"]`); };
  $$('.part').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const p = parts.find((x) => x[0] === b.dataset.p);
    $$('.part').forEach((x) => x.classList.remove('sel')); b.classList.add('sel');
    setMentor(app, p[2], 'senalando');
    if (!seen.has(p[0])) {
      seen.add(p[0]); sfx.tap();
      $('#alist').insertAdjacentHTML('beforeend', `<li><span class="math">${renderMath(p[1])}</span><span>${p[2].split(':')[0]}</span></li>`);
      b.classList.add('seen');
    }
    if (seen.size === 4) { if (!$('#q2').children.length) quiz(); }
    else guideNext(nextPart());
  }));
  setTimeout(() => guideNext(nextPart()), 700);
  function quiz() {
    stopGuide();
    setTimeout(() => {
      setMentor(app, '¿Qué significa x → 2?', 'base');
      miniQuiz($('#q2'), shuffle([
        { t: 'x se acerca a 2', ok: true },
        { t: 'x vale 2', fb: 'Se acerca, pero no necesita llegar a 2.' },
        { t: 'f(x) vale 2', fb: 'La flecha habla de x, no de f(x).' },
      ]), {
        onRight: () => {
          setMentor(app, 'Eso es. Ahora veamos cómo se calcula cuando basta sustituir.', 'celebra');
          S.apertura.idea = Math.max(S.apertura.idea, 2); save();
          nextIdeaButton($('#q2'), '#/apertura/3');
        },
      });
      $('#q2').scrollIntoView({ block: 'end', behavior: reduced() ? 'auto' : 'smooth' });
    }, 600);
  }
}

function idea4() {
  // ¿número o 0/0? — clasifica 6 pedidos
  const list = shuffle([
    generate('directa', 'facil'), generate('directa', 'facil'), generate('directa', 'facil'),
    generate('factorComun', 'facil'), generate('difCuadrados', 'facil'), generate('aspa', 'medio'),
  ]);
  let i = 0; let ok = 0;
  const render = () => {
    const ex = list[i];
    const isDirect = ex.tech === 'directa';
    app.innerHTML = aperturaFrame(4, `
      <p class="lead">Sustituye mentalmente. ¿Da un número o sale 0/0?</p>
      <div class="rail" aria-hidden="true"><span class="clip"></span></div>
      <article class="ticket small"><div class="ticket-meta mono"><span>PEDIDO 0${ex.number}</span><span>${i + 1}/6</span></div>
        <div class="ticket-expr math" role="math" aria-label="${speak(ex.fTex)}">${renderMath(ex.fTex)}</div></article>
      ${mentor(i === 0 ? 'Si el denominador no se anula, basta sustituir. Si sale 0/0, hay que transformar.' : 'Siguiente pedido.', 'base')}
      <div class="options">
        <button class="pill text" data-k="num" type="button"><span class="pill-body">Da un número · sustitución directa</span><span class="mark"></span></button>
        <button class="pill text" data-k="indet" type="button"><span class="pill-body">Sale 0/0 · hay que transformar</span><span class="mark"></span></button>
      </div>`, '¿Directo o transformar?');
    fitAll();
    guideGroup($('.apertura .options'), '.pill', { strong: i === 0 || isNovice() });
    $$('.pill').forEach((b) => b.addEventListener('click', async () => {
      if (b.disabled) return;
      stopGuide();
      const right = (b.dataset.k === 'num') === isDirect;
      if (right) {
        ok++; sfx.ok(); b.classList.add('right'); b.querySelector('.mark').innerHTML = icon('check');
        $$('.pill').forEach((x) => { x.disabled = true; });
        setMentor(app, isDirect ? `Exacto: el límite vale ${ex.answer.tex.includes('\\') ? 'un número' : ex.answer.tex}.` : 'Exacto: sale 0/0, así que hay que transformar antes de sustituir.', 'celebra');
        await wait(1100);
        i++;
        if (i < list.length) render();
        else done();
      } else {
        sfx.bad(); b.classList.add('wrong'); b.disabled = true; b.querySelector('.mark').innerHTML = icon('x');
        setMentor(app, isDirect ? 'Revisa el denominador: al sustituir no vale 0.' : 'Sustituye en el numerador y en el denominador: los dos dan 0.', 'animo');
      }
    }));
  };
  const done = () => {
    S.apertura.done = true; S.apertura.idea = 4; save();
    app.innerHTML = `<div class="view narrow fin"><header class="fin-head"><span class="eyebrow">Apertura · Desde 0</span><h1 class="title">Cafetería abierta</h1></header>
      <div class="big card paper"><span class="big-n">${ok}</span><span>de 6 comandas leídas al primer intento</span></div>
      ${mentor('Ya sabes qué es un límite, cómo se lee y cuándo hay que transformar. Empieza la Mañana tranquila.', 'celebra')}
      <div class="home-actions"><a class="btn primary" href="#/turno/facil">Empezar · Mañana tranquila ${icon('arrow')}</a><a class="btn ghost" href="#/inicio">Volver al inicio</a></div></div>`;
    if (!reduced()) burst($('.big'));
    sfx.serve();
  };
  render();
}

/* =========================================================================
   ROUTER
   ========================================================================= */
function route() {
  const h = location.hash.replace(/^#\/?/, '') || 'inicio';
  const [a, b] = h.split('/');
  document.body.dataset.view = a;
  stopGuide();
  window.scrollTo(0, 0);
  try {
    if (a === 'inicio') viewHome();
    else if (a === 'jornada') viewJornada();
    else if (a === 'estaciones') viewEstaciones();
    else if (a === 'turno' && LEVELS[b] && b !== 'apertura') { startSession('turno', { level: b }); viewPedido(); }
    else if (a === 'estacion' && TECH[b]) { startSession('estacion', { tech: b }); viewPedido(); }
    else if (a === 'fin' && LEVELS[b]) viewFin(b);
    else if (a === 'comandas') { C = null; viewComandas(); }
    else if (a === 'apertura') viewApertura(Number(b) || 1);
    else viewHome();
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div class="view narrow"><p>Algo salió mal al preparar el pedido.</p><a class="btn primary" href="#/inicio">Volver al inicio</a></div>`;
  }
  const h1 = $('h1, .topbar-title strong', app);
  if (h1) { h1.setAttribute('tabindex', '-1'); }
  requestAnimationFrame(fitAll);
}
window.addEventListener('hashchange', route);
route();

// para pruebas desde la consola
window.__limites = { generate, verify, state: () => P };
