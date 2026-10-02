/* =========================================================================
   Generador de pedidos (ejercicios) de límites algebraicos
   -------------------------------------------------------------------------
   Cada pedido trae:
     - la función f (texto para mostrar + evaluador numérico),
     - el valor del límite,
     - los pasos, cada uno con su hueco, alternativas, retroalimentación
       por error y cuatro pistas progresivas.
   Todo se verifica numéricamente en verify() antes de mostrarse.
   Notación (DSL) que entiende render.js:
     \frac{A}{B}  \sqrt{A}  \lim{a}  \slot  \cancel{A}  \mark{k}{A}
     \ok{A}  \ruffini{c0,c1,...;r}  x^{n}
   ========================================================================= */

export const MINUS = '−';
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const nz = (a, b) => { let v; do v = rnd(a, b); while (v === 0); return v; };
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };

/* ---------- números y fracciones ---------- */
export const nTex = (n) => (n < 0 ? MINUS + Math.abs(n) : String(n));
const nP = (n) => (n < 0 ? `(${nTex(n)})` : nTex(n)); // con paréntesis si es negativo
const Q = (n, d = 1) => {
  if (d === 0) throw new Error('denominador 0');
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
};
const qVal = (q) => q.n / q.d;
const Qs = (n, d = 1) => (d === 0 ? null : Q(n, d)); // seguro para distractores
const qTex = (q) => {
  const s = q.n < 0 ? MINUS : '';
  const n = Math.abs(q.n);
  return q.d === 1 ? s + n : `${s}\\frac{${n}}{${q.d}}`;
};
const qEq = (a, b) => a.n === b.n && a.d === b.d;

/* ---------- polinomios (coeficientes en orden descendente) ---------- */
export const pTex = (c) => {
  const deg = c.length - 1;
  let out = '';
  let first = true;
  c.forEach((a, i) => {
    const p = deg - i;
    if (a === 0) return;
    const neg = a < 0;
    const abs = Math.abs(a);
    const body = p === 0 ? String(abs) : (abs === 1 ? '' : String(abs)) + (p === 1 ? 'x' : `x^{${p}}`);
    if (first) { out += (neg ? MINUS : '') + body; first = false; }
    else out += (neg ? ` ${MINUS} ` : ' + ') + body;
  });
  return out || '0';
};
const pEv = (c, x) => c.reduce((s, a) => s * x + a, 0);
const pMul = (a, b) => {
  const r = Array(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => { r[i + j] += x * y; }));
  return r;
};
const trim = (c) => { let i = 0; while (i < c.length - 1 && c[i] === 0) i++; return c.slice(i); };
const pEq = (a, b) => { a = trim(a); b = trim(b); return a.length === b.length && a.every((v, i) => v === b[i]); };
const linR = (r) => [1, -r]; // (x − r)
const cx = (k) => (k === 1 ? '' : k === -1 ? MINUS : nTex(k)); // coeficiente delante de x
const par = (c) => `(${pTex(c)})`;
/* sustituye x = a en un polinomio, mostrando la cuenta */
const pSubTex = (c, a) => {
  const deg = c.length - 1;
  const A = a < 0 ? `(${nTex(a)})` : String(a);
  let out = '';
  let first = true;
  c.forEach((k, i) => {
    const p = deg - i;
    if (k === 0) return;
    const neg = k < 0;
    const abs = Math.abs(k);
    let body;
    if (p === 0) body = String(abs);
    else {
      const pw = p === 1 ? A : `${A}^{${p}}`;
      body = abs === 1 ? pw : `${abs}·${pw}`;
    }
    if (first) { out += (neg ? MINUS : '') + body; first = false; }
    else out += (neg ? ` ${MINUS} ` : ' + ') + body;
  });
  return out || '0';
};
function ruffini(c, r) {
  const q = [c[0]];
  for (let i = 1; i < c.length; i++) q.push(c[i] + r * q[i - 1]);
  const rem = q.pop();
  return { q, rem };
}

/* ---------- expresiones: texto + evaluador ---------- */
const E = {
  p: (c) => ({ tex: pTex(c), ev: (x) => pEv(c, x) }),
  pp: (c) => ({ tex: par(c), ev: (x) => pEv(c, x) }),
  k: (n) => ({ tex: nTex(n), ev: () => n }),
  q: (q) => ({ tex: qTex(q), ev: () => qVal(q) }),
  mul: (...fs) => ({ tex: fs.map((f) => f.tex).join(''), ev: (x) => fs.reduce((s, f) => s * f.ev(x), 1) }),
  frac: (a, b) => ({ tex: `\\frac{${a.tex}}{${b.tex}}`, ev: (x) => a.ev(x) / b.ev(x) }),
  sub: (a, b) => ({ tex: `${a.tex} ${MINUS} ${b.tex}`, ev: (x) => a.ev(x) - b.ev(x) }),
  add: (a, b) => ({ tex: `${a.tex} + ${b.tex}`, ev: (x) => a.ev(x) + b.ev(x) }),
  sq: (c) => ({ tex: `\\sqrt{${pTex(c)}}`, ev: (x) => Math.sqrt(pEv(c, x)) }),
  cancel: (f) => ({ tex: `\\cancel{${f.tex}}`, ev: f.ev }),
  mark: (k, f) => ({ tex: `\\mark{${k}}{${f.tex}}`, ev: f.ev }),
  raw: (tex, ev) => ({ tex, ev }),
};
const lim = (aTex) => `\\lim{${aTex}}`;

/* ---------- técnicas ---------- */
export const TECH = {
  directa: { name: 'Sustitución directa', glyph: 'f(a)' },
  factorComun: { name: 'Factor común', glyph: 'x( · )' },
  difCuadrados: { name: 'Diferencia de cuadrados', glyph: 'a² − b²' },
  aspa: { name: 'Aspa simple', glyph: '( )( )' },
  ruffini: { name: 'Ruffini', glyph: 'x − r' },
  conjugada: { name: 'Conjugada', glyph: '√ ± √' },
  potencia: { name: 'Mayor potencia', glyph: '∞/∞' },
  infMenosInf: { name: 'Infinito menos infinito', glyph: '∞ − ∞' },
};

/* Retroalimentación cuando se elige una técnica que no corresponde */
const TECH_FB = {
  directa: 'Al sustituir sale una forma indeterminada: no basta sustituir.',
  factorComun: 'Mira si todos los términos comparten x. Aquí no basta con eso.',
  difCuadrados: 'La diferencia de cuadrados necesita dos términos: a² − b².',
  aspa: 'El aspa simple sirve para trinomios x² + bx + c.',
  ruffini: 'Ruffini se usa con polinomios de grado 3 o más.',
  conjugada: 'La conjugada se usa cuando hay raíces.',
  potencia: 'Dividir entre la mayor potencia se usa cuando x → ∞ en un cociente.',
  infMenosInf: 'Aquí no hay una resta de dos expresiones que crecen.',
};

let SEQ = 0;
const CLIENTS = ['Valeria', 'Diego', 'Rosa', 'Mateo', 'Lucía', 'Andrés', 'Camila', 'Joaquín', 'Ximena', 'Bruno', 'Fiorella', 'Renato'];

function baseExercise(tech, level) {
  SEQ += 1;
  return {
    id: `${tech}-${Date.now().toString(36)}-${SEQ}`,
    tech,
    level,
    number: rnd(10, 99),
    client: rnd(1, 6),
    clientName: pick(CLIENTS),
    steps: [],
  };
}

/* ---------- pasos comunes ---------- */
function substStep(ex, numSub, denSub, kind = 'indet') {
  const aT = ex.aTex;
  if (kind === 'indet') {
    return {
      kind: 'form',
      prompt: `Sustituye x = ${aT}. ¿Qué forma aparece?`,
      line: `\\note{x = ${aT}:} \\frac{${numSub}}{${denSub}} \\to \\slot`,
      done: `\\note{x = ${aT}:} \\frac{${numSub}}{${denSub}} \\to \\frac{0}{0}`,
      tag: 'indet',
      options: shuffle([
        { tex: '\\frac{0}{0}', ok: true },
        { tex: '0', ok: false, fb: 'El denominador también vale 0. Revisa abajo.' },
        { tex: '1', ok: false, fb: '0 entre 0 no es 1: es una forma indeterminada.' },
      ]),
      hints: [
        'Sustituir es cambiar cada x por el valor al que se acerca.',
        { mark: 'num', text: 'Calcula primero el numerador.' },
        'Calcula numerador y denominador por separado.',
        'El numerador da 0. ¿Y el denominador?',
      ],
      success: 'Sale 0/0: hay que transformar la expresión.',
    };
  }
  return null;
}

function techStep(ex, correct, wrongs, cue) {
  const opts = [{ tex: TECH[correct].name, ok: true, text: true }];
  for (const w of wrongs) opts.push({ tex: TECH[w].name, ok: false, text: true, fb: TECH_FB[w] });
  return {
    kind: 'tech',
    prompt: '¿Qué técnica pide este pedido?',
    tagTech: correct,
    options: shuffle(opts),
    hints: [
      'Mira la forma de la expresión antes de elegir.',
      { mark: ex.markTech || 'num', text: 'Observa la parte resaltada.' },
      cue,
      `Piensa en: ${TECH[correct].name.toLowerCase()}.`,
    ],
    success: cue,
  };
}

/* opciones de valor final: el correcto y errores plausibles */
function valueOptions(correct, wrongs) {
  const opts = [{ tex: qTex(correct), ok: true, val: qVal(correct) }];
  const seen = new Set([qTex(correct)]);
  for (const [q, fb] of wrongs) {
    if (q === null || q === undefined) continue;
    const t = typeof q === 'string' ? q : qTex(q);
    if (seen.has(t)) continue;
    seen.add(t);
    opts.push({ tex: t, ok: false, fb, val: typeof q === 'string' ? NaN : qVal(q) });
    if (opts.length === 3) break;
  }
  return shuffle(opts);
}

/* opciones de expresión: la correcta y distractores (se descartan los que coincidan) */
function exprOptions(correct, wrongs, x0) {
  const opts = [{ tex: correct.tex, ok: true, ev: correct.ev }];
  const seen = new Set([correct.tex]);
  for (const [w, fb] of wrongs) {
    if (!w || seen.has(w.tex)) continue;
    // descartar distractores que en realidad son equivalentes al correcto
    let differs = false; let finite = 0;
    for (const t of [x0 + 0.37, x0 - 0.61, x0 + 1.23, x0 + 2.71]) {
      const a = correct.ev(t);
      const b = w.ev(t);
      if (!Number.isFinite(b) || !Number.isFinite(a)) continue;
      finite++;
      if (Math.abs(a - b) > 1e-6 * (1 + Math.abs(a))) differs = true;
    }
    if (!differs || finite < 2) continue;
    seen.add(w.tex);
    opts.push({ tex: w.tex, ok: false, fb, ev: w.ev });
    if (opts.length === 3) break;
  }
  return shuffle(opts);
}

/* =========================================================================
   1. SUSTITUCIÓN DIRECTA
   ========================================================================= */
function genDirecta(level = 'facil') {
  for (;;) {
    const ex = baseExercise('directa', level);
    const a = nz(-4, 4);
    const N = pick([[1, 0, rnd(-6, 6)], [1, rnd(-4, 4), rnd(-5, 5)], [rnd(1, 3), rnd(-5, 5)]]);
    const D = pick([[1, rnd(-5, 5)], [2, rnd(-5, 5)], [1, 0, rnd(1, 6)]]);
    const nv = pEv(N, a);
    const dv = pEv(D, a);
    if (dv === 0 || nv === 0 || pEq(N, D)) continue;
    const val = Q(nv, dv);
    if (Math.abs(val.n) > 40 || val.d > 12) continue;
    ex.a = a; ex.aTex = nTex(a);
    const num = E.p(N); const den = E.p(D);
    ex.f = E.frac(num, den);
    ex.fTex = `${lim(ex.aTex)} ${E.frac(E.mark('num', num), E.mark('den', den)).tex}`;
    ex.answer = { tex: qTex(val), value: qVal(val) };
    // errores plausibles: signo al elevar negativo, olvidar el denominador
    const wrongSign = Q(pEv(N, -a), dv);
    ex.steps.push({
      kind: 'form',
      prompt: `Sustituye x = ${ex.aTex}. ¿Qué pasa con el denominador?`,
      line: `\\note{x = ${ex.aTex}:} \\frac{${pSubTex(N, a)}}{${pSubTex(D, a)}} \\to \\slot`,
      done: `\\note{x = ${ex.aTex}:} \\frac{${pSubTex(N, a)}}{${pSubTex(D, a)}} \\to \\frac{${nTex(nv)}}{${nTex(dv)}}`,
      tag: 'directa',
      options: shuffle([
        { tex: `\\frac{${nTex(nv)}}{${nTex(dv)}}`, ok: true },
        { tex: '\\frac{0}{0}', ok: false, fb: `Revisa: el denominador vale ${nTex(dv)}, no 0.` },
        { tex: `\\frac{${nTex(nv)}}{0}`, ok: false, fb: `Calcula de nuevo el denominador: da ${nTex(dv)}.` },
      ]),
      hints: [
        'Sustituir es cambiar cada x por el valor al que se acerca.',
        { mark: 'den', text: 'Mira el denominador.' },
        'Si el denominador no se anula, basta sustituir.',
        `El denominador vale ${nTex(dv)}.`,
      ],
      success: 'El denominador no se anula: basta sustituir.',
    });
    const wrongs = [
      [Q(-val.n, val.d), 'Revisa los signos al sustituir.'],
      [Q(nv, 1), 'Falta dividir entre el denominador.'],
      [Q(dv, nv === 0 ? 1 : nv), 'Pusiste el cociente al revés.'],
      [Q(val.n + 1, val.d), 'Vuelve a hacer la cuenta.'],
    ];
    if (!qEq(wrongSign, val)) wrongs.unshift([wrongSign, `Sustituye x = ${ex.aTex} con su signo.`]);
    ex.steps.push({
      kind: 'line',
      prompt: 'Escribe el valor del límite.',
      mode: 'append',
      line: `= \\frac{${pSubTex(N, a)}}{${pSubTex(D, a)}} = \\slot`,
      done: `= \\frac{${pSubTex(N, a)}}{${pSubTex(D, a)}} = \\ok{${qTex(val)}}`,
      options: valueOptions(val, wrongs),
      hints: [
        'Ya no hay límite que transformar: solo calcula.',
        { mark: 'num', text: `El numerador vale ${nTex(nv)}.` },
        'Divide numerador entre denominador y simplifica.',
        `Queda ${nTex(nv)} entre ${nTex(dv)}.`,
      ],
      final: true,
      success: '¡Pedido servido!',
    });
    return ex;
  }
}

/* =========================================================================
   2. FACTOR COMÚN   lím x→0  (p x² + q x)/(r x² + s x)
   ========================================================================= */
function genFactorComun(level = 'facil') {
  for (;;) {
    const ex = baseExercise('factorComun', level);
    const p = nz(-4, 5); const q = nz(-9, 9); const r = nz(-4, 5); const s = nz(-9, 9);
    if (p * s === q * r) continue; // evitar que todo se simplifique a una constante
    const val = Q(q, s);
    ex.a = 0; ex.aTex = '0';
    const N = [p, q, 0]; const D = [r, s, 0];
    const num = E.p(N); const den = E.p(D);
    ex.f = E.frac(num, den);
    ex.markTech = 'num';
    ex.fTex = `${lim('0')} ${E.frac(E.mark('num', num), E.mark('den', den)).tex}`;
    ex.answer = { tex: qTex(val), value: qVal(val) };
    ex.steps.push(substStep(ex, pSubTex(N, 0), pSubTex(D, 0)));
    ex.steps.push(techStep(ex, 'factorComun', ['difCuadrados', 'aspa'], 'Todos los términos tienen x: saca x como factor común.'));
    const X = E.raw('x', (t) => t);
    const nF = E.mul(X, E.pp([p, q]));
    const dF = E.mul(X, E.pp([r, s]));
    const L = (n, d) => `= ${lim('0')} \\frac{${n}}{${d}}`;
    ex.steps.push({
      kind: 'line', mode: 'append',
      prompt: 'Saca factor común en el numerador.',
      line: L('\\slot', den.tex), done: L(nF.tex, den.tex), verifyEv: E.frac(nF, den).ev,
      options: exprOptions(nF, [
        [E.mul(X, E.pp([p, 0, q])), 'Al sacar x, cada término pierde una x.'],
        [E.mul(X, E.pp([p, -q])), 'Revisa el signo dentro del paréntesis.'],
        [E.mul(E.raw(`${cx(p)}x`, (t) => p * t), E.pp([1, q])), 'Solo la x es común a los dos términos.'],
      ], 0),
      hints: [
        'Factor común: lo que se repite en todos los términos sale fuera.',
        { mark: 'num', text: 'Los dos términos del numerador tienen x.' },
        `Escribe ${pTex(N)} como x por algo.`,
        `Empieza así: x(${cx(p)}x …)`,
      ],
      success: 'Bien. Ahora el denominador.',
    });
    ex.steps.push({
      kind: 'line', mode: 'replace',
      prompt: 'Ahora saca factor común en el denominador.',
      line: L(nF.tex, '\\slot'), done: L(nF.tex, dF.tex), verifyEv: E.frac(nF, dF).ev,
      options: exprOptions(dF, [
        [E.mul(X, E.pp([r, 0, s])), 'Al sacar x, cada término pierde una x.'],
        [E.mul(X, E.pp([r, -s])), 'Revisa el signo dentro del paréntesis.'],
        [E.mul(X, E.pp([s, r])), 'Los coeficientes se quedan en su lugar.'],
      ], 0),
      hints: [
        'Haz lo mismo que en el numerador.',
        { mark: 'den', text: 'Los dos términos del denominador tienen x.' },
        `Escribe ${pTex(D)} como x por algo.`,
        `Empieza así: x(${cx(r)}x …)`,
      ],
      success: 'Ahora la x se repite arriba y abajo.',
    });
    const simp = E.frac(E.p([p, q]), E.p([r, s]));
    ex.steps.push({
      kind: 'line', mode: 'append',
      prompt: 'Simplifica. ¿Qué queda?',
      cancelPrev: L(`\\cancel{x}${par([p, q])}`, `\\cancel{x}${par([r, s])}`),
      line: `= ${lim('0')} \\slot`, done: `= ${lim('0')} ${simp.tex}`, verifyEv: simp.ev,
      options: exprOptions(simp, [
        [E.frac(E.k(p + q), E.k(r + s)), 'Se cancelan factores, no términos sueltos.'],
        [E.frac(E.p([p, -q]), E.p([r, -s])), 'Los signos no cambian al simplificar.'],
        [E.frac(E.p([1, q]), E.p([1, s])), 'Los coeficientes de x se mantienen.'],
      ], 0.5),
      hints: [
        'Puedes cancelar x porque x se acerca a 0, pero no es 0.',
        { mark: 'prev', text: 'La x multiplica arriba y abajo.' },
        'Tacha el factor que se repite.',
        `Arriba queda ${pTex([p, q])}.`,
      ],
      success: 'Se canceló x: x se acerca a 0, pero no vale 0.',
    });
    ex.steps.push({
      kind: 'line', mode: 'append', final: true,
      prompt: 'Ahora sí, sustituye x = 0.',
      line: `= \\frac{${pSubTex([p, q], 0)}}{${pSubTex([r, s], 0)}} = \\slot`,
      done: `= \\frac{${pSubTex([p, q], 0)}}{${pSubTex([r, s], 0)}} = \\ok{${qTex(val)}}`,
      options: valueOptions(val, [
        [Qs(p, r), 'Al sustituir x = 0 quedan los términos sin x.'],
        ['0', 'Ya no hay 0/0: sustituye en la expresión simplificada.'],
        [Qs(-q, s), 'Revisa los signos.'],
      ]),
      hints: [
        'Ya no aparece 0/0.',
        { mark: 'prev', text: 'Sustituye en la última expresión.' },
        'Cambia x por 0: los términos con x desaparecen.',
        `Queda ${nTex(q)} entre ${nTex(s)}.`,
      ],
      success: '¡Pedido servido!',
    });
    return ex;
  }
}

/* =========================================================================
   3. DIFERENCIA DE CUADRADOS
   ========================================================================= */
function genDifCuadrados(level = 'facil') {
  const variant = level === 'facil' ? pick(['A', 'A', 'B']) : pick(['A', 'B', 'C']);
  for (;;) {
    const ex = baseExercise('difCuadrados', level);
    const a = nz(-7, 7);
    if (Math.abs(a) === 1 && Math.random() < 0.6) continue;
    ex.a = a; ex.aTex = nTex(a);
    const sq = a * a;
    const N2 = [1, 0, -sq]; // x² − a²
    const fac = linR(a); // (x − a)
    const other = [1, a]; // (x + a)
    const L = (n, d) => `= ${lim(ex.aTex)} \\frac{${n}}{${d}}`;
    const factored = E.mul(E.pp(fac), E.pp(other));
    const wrongs = [
      [E.mul(E.pp(fac), E.pp(fac)), `${par(fac)}² tiene un término con x en el medio.`],
      [E.mul(E.pp([1, -sq]), E.pp([1, sq])), `Busca el número que al cuadrado da ${sq}.`],
      [E.mul(E.pp(other), E.pp(other)), `${par(other)}² tiene un término con x en el medio.`],
    ];
    let numEx, denEx, val, simp, simpWrongs, evalLine, valWrongs, cTex;
    if (variant === 'A' || variant === 'C') {
      // A: (x² − a²)/(x − a) → 2a   C: (x² − a²)/((x − a)(x − c)) → 2a/(a − c)
      numEx = E.p(N2);
      let c = null;
      if (variant === 'A') denEx = E.p(fac);
      else {
        do c = nz(-6, 6); while (c === a || c === -a);
        denEx = E.p(pMul(fac, linR(c)));
      }
      ex.f = E.frac(numEx, denEx);
      ex.fTex = `${lim(ex.aTex)} ${E.frac(E.mark('num', numEx), E.mark('den', denEx)).tex}`;
      ex.markTech = 'num';
      ex.steps.push(substStep(ex, pSubTex(N2, a), pSubTex(variant === 'A' ? fac : pMul(fac, linR(c)), a)));
      ex.steps.push(techStep(ex, 'difCuadrados', variant === 'A' ? ['aspa', 'conjugada'] : ['factorComun', 'conjugada'],
        `Arriba hay una resta de cuadrados: x² ${MINUS} ${sq}.`));
      ex.steps.push({
        kind: 'line', mode: 'append',
        prompt: 'Factoriza el numerador.',
        line: L('\\slot', denEx.tex), done: L(factored.tex, denEx.tex), verifyEv: E.frac(factored, denEx).ev,
        options: exprOptions(factored, wrongs, a),
        hints: [
          `a² ${MINUS} b² = (a ${MINUS} b)(a + b)`,
          { mark: 'num', text: `Aquí a = x y b = ${Math.abs(a)}.` },
          `¿Qué número al cuadrado da ${sq}?`,
          `Empieza así: (x ${MINUS} ${Math.abs(a)})(x …)`,
        ],
        success: variant === 'A' ? 'Bien. El factor (x − a) aparece arriba y abajo.' : 'Bien. Ahora el denominador.',
      });
      let dF = denEx;
      if (variant === 'C') {
        dF = E.mul(E.pp(fac), E.pp(linR(c)));
        ex.steps.push({
          kind: 'line', mode: 'replace',
          prompt: 'Factoriza el denominador con aspa simple.',
          line: L(factored.tex, '\\slot'), done: L(factored.tex, dF.tex), verifyEv: E.frac(factored, dF).ev,
          options: exprOptions(dF, [
            [E.mul(E.pp([1, a]), E.pp([1, c])), 'Revisa los signos: deben multiplicar y sumar lo correcto.'],
            [E.mul(E.pp(fac), E.pp([1, c])), 'Revisa el signo del segundo factor.'],
            [E.mul(E.pp([1, -a * c]), E.pp([1, -1])), 'Busca dos números que multipliquen el término independiente.'],
          ], a),
          hints: [
            'Aspa simple: x² + bx + c = (x + m)(x + n)',
            { mark: 'den', text: 'Mira el denominador.' },
            `Busca dos números que multipliquen ${nTex(a * c)} y sumen ${nTex(-(a + c))}.`,
            `Uno de los factores es ${par(fac)}.`,
          ],
          success: 'Ahora el factor que causa 0/0 está arriba y abajo.',
        });
      }
      const cp = variant === 'A'
        ? L(`\\cancel{${par(fac)}}${par(other)}`, `\\cancel{${par(fac)}}`)
        : L(`\\cancel{${par(fac)}}${par(other)}`, `\\cancel{${par(fac)}}${par(linR(c))}`);
      if (variant === 'A') {
        simp = E.p(other);
        val = Q(2 * a);
        simpWrongs = [
          [E.p(fac), `Se cancela ${par(fac)}; queda el otro factor.`],
          [E.frac(E.p(other), E.p(fac)), 'El factor de abajo también se cancela.'],
          [E.p([1, -2 * a]), 'Revisa el signo del factor que queda.'],
        ];
        evalLine = `${pSubTex(other, a)}`;
        valWrongs = [['0', `Sustituye en ${pTex(other)}, no en ${pTex(fac)}.`], [Q(a), `${nTex(a)} + ${nP(a)} no es ${nTex(a)}.`], [Q(sq), 'No hay que elevar al cuadrado.']];
        cTex = qTex(val);
      } else {
        simp = E.frac(E.p(other), E.p(linR(c)));
        val = Q(2 * a, a - c);
        simpWrongs = [
          [E.frac(E.p(fac), E.p(linR(c))), `Se cancela ${par(fac)}; queda ${par(other)} arriba.`],
          [E.frac(E.p(other), E.p([1, c])), 'Revisa el signo del factor de abajo.'],
          [E.p(other), 'Abajo también queda un factor.'],
        ];
        evalLine = `\\frac{${pSubTex(other, a)}}{${pSubTex(linR(c), a)}}`;
        valWrongs = [['0', 'Ya no hay 0/0: sustituye en la expresión simplificada.'], [Qs(2 * a, a + c), 'Revisa el signo del denominador.'], [Q(a - c, 2 * a), 'Pusiste el cociente al revés.']];
        cTex = qTex(val);
      }
      ex.answer = { tex: cTex, value: qVal(val) };
      ex.steps.push({
        kind: 'line', mode: 'append',
        prompt: 'Simplifica. ¿Qué queda?',
        cancelPrev: cp,
        line: `= ${lim(ex.aTex)} \\slot`, done: `= ${lim(ex.aTex)} ${simp.tex}`, verifyEv: simp.ev,
        options: exprOptions(simp, simpWrongs, a),
        hints: [
          `Puedes cancelar porque x se acerca a ${ex.aTex}, pero no es ${ex.aTex}.`,
          { mark: 'prev', text: `El factor ${par(fac)} está arriba y abajo.` },
          'Tacha el factor que se repite.',
          `Arriba queda ${par(other)}.`,
        ],
        success: `Se canceló ${par(fac)}, el factor que producía 0/0.`,
      });
      ex.steps.push({
        kind: 'line', mode: 'append', final: true,
        prompt: `Sustituye x = ${ex.aTex}.`,
        line: `= ${evalLine} = \\slot`, done: `= ${evalLine} = \\ok{${cTex}}`,
        options: valueOptions(val, valWrongs),
        hints: ['Ya no aparece 0/0.', { mark: 'prev', text: 'Sustituye en la última expresión.' }, `Cambia x por ${ex.aTex}.`, `Calcula ${evalLine.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/, '($1)/($2)')}.`],
        success: '¡Pedido servido!',
      });
      return ex;
    }
    // B: (x − a)/(x² − a²) → 1/(2a)
    numEx = E.p(fac); denEx = E.p(N2);
    ex.f = E.frac(numEx, denEx);
    ex.markTech = 'den';
    ex.fTex = `${lim(ex.aTex)} ${E.frac(E.mark('num', numEx), E.mark('den', denEx)).tex}`;
    val = Q(1, 2 * a);
    ex.answer = { tex: qTex(val), value: qVal(val) };
    ex.steps.push(substStep(ex, pSubTex(fac, a), pSubTex(N2, a)));
    ex.steps.push(techStep(ex, 'difCuadrados', ['factorComun', 'conjugada'], `Abajo hay una resta de cuadrados: x² ${MINUS} ${sq}.`));
    ex.steps.push({
      kind: 'line', mode: 'append',
      prompt: 'Factoriza el denominador.',
      line: L(numEx.tex, '\\slot'), done: L(numEx.tex, factored.tex), verifyEv: E.frac(numEx, factored).ev,
      options: exprOptions(factored, wrongs, a),
      hints: [`a² ${MINUS} b² = (a ${MINUS} b)(a + b)`, { mark: 'den', text: `Aquí a = x y b = ${Math.abs(a)}.` }, `¿Qué número al cuadrado da ${sq}?`, `Empieza así: (x ${MINUS} ${Math.abs(a)})(x …)`],
      success: 'Bien. Ahora el mismo factor está arriba y abajo.',
    });
    simp = E.frac(E.k(1), E.p(other));
    ex.steps.push({
      kind: 'line', mode: 'append',
      prompt: 'Simplifica. ¿Qué queda?',
      cancelPrev: L(`\\cancel{${pTex(fac)}}`, `\\cancel{${par(fac)}}${par(other)}`),
      line: `= ${lim(ex.aTex)} \\slot`, done: `= ${lim(ex.aTex)} ${simp.tex}`, verifyEv: simp.ev,
      options: exprOptions(simp, [
        [E.p(other), 'Al cancelar todo el numerador, arriba queda 1.'],
        [E.frac(E.k(0), E.p(other)), 'Al cancelar arriba queda 1, no 0.'],
        [E.frac(E.k(1), E.p(fac)), `Se cancela ${par(fac)}; abajo queda ${par(other)}.`],
      ], a),
      hints: [`Puedes cancelar porque x se acerca a ${ex.aTex}, pero no es ${ex.aTex}.`, { mark: 'prev', text: `${par(fac)} está arriba y abajo.` }, 'Cuando se cancela todo el numerador, queda 1.', `Abajo queda ${par(other)}.`],
      success: 'Al cancelar todo el numerador, queda 1.',
    });
    ex.steps.push({
      kind: 'line', mode: 'append', final: true,
      prompt: `Sustituye x = ${ex.aTex}.`,
      line: `= \\frac{1}{${pSubTex(other, a)}} = \\slot`, done: `= \\frac{1}{${pSubTex(other, a)}} = \\ok{${qTex(val)}}`,
      options: valueOptions(val, [['0', 'Arriba quedó 1, no 0.'], [Qs(2 * a), 'El resultado es 1 entre ese número.'], [Qs(1, a), `${nTex(a)} + ${nP(a)} = ${nTex(2 * a)}.`]]),
      hints: ['Ya no aparece 0/0.', { mark: 'prev', text: 'Sustituye en la última expresión.' }, `Cambia x por ${ex.aTex}.`, `Abajo queda ${nTex(2 * a)}.`],
      success: '¡Pedido servido!',
    });
    return ex;
  }
}

/* =========================================================================
   4. ASPA SIMPLE   (x − r)(x − s) / (x − r)  ó  / ((x − r)(x − t))
   ========================================================================= */
function genAspa(level = 'medio') {
  for (;;) {
    const ex = baseExercise('aspa', level);
    const r = nz(-6, 6); const s = nz(-6, 6);
    if (s === r) continue;
    const variant = pick(['A', 'B', 'B']);
    let t = null;
    if (variant === 'B') { t = nz(-6, 6); if (t === r || t === s) continue; }
    ex.a = r; ex.aTex = nTex(r);
    const fr = linR(r); const fs = linR(s);
    const N = pMul(fr, fs);
    const D = variant === 'A' ? fr : pMul(fr, linR(t));
    const num = E.p(N); const den = E.p(D);
    ex.f = E.frac(num, den);
    ex.markTech = 'num';
    ex.fTex = `${lim(ex.aTex)} ${E.frac(E.mark('num', num), E.mark('den', den)).tex}`;
    const val = variant === 'A' ? Q(r - s) : Q(r - s, r - t);
    ex.answer = { tex: qTex(val), value: qVal(val) };
    ex.steps.push(substStep(ex, pSubTex(N, r), pSubTex(D, r)));
    ex.steps.push(techStep(ex, 'aspa', ['difCuadrados', 'conjugada'], 'Arriba hay un trinomio x² + bx + c: usa aspa simple.'));
    const L = (n, d) => `= ${lim(ex.aTex)} \\frac{${n}}{${d}}`;
    const nF = E.mul(E.pp(fr), E.pp(fs));
    const b = -(r + s); const c = r * s;
    ex.steps.push({
      kind: 'line', mode: 'append',
      prompt: 'Factoriza el numerador.',
      line: L('\\slot', den.tex), done: L(nF.tex, den.tex), verifyEv: E.frac(nF, den).ev,
      options: exprOptions(nF, [
        [E.mul(E.pp([1, r]), E.pp([1, s])), `Revisa los signos: deben multiplicar ${nTex(c)} y sumar ${nTex(b)}.`],
        [E.mul(E.pp(fr), E.pp([1, s])), `Revisa los signos: deben multiplicar ${nTex(c)} y sumar ${nTex(b)}.`],
        [E.mul(E.pp([1, -c]), E.pp([1, -1])), `Esos números multiplican ${nTex(c)} pero no suman ${nTex(b)}.`],
      ], r),
      hints: [
        'Aspa simple: x² + bx + c = (x + m)(x + n), con m·n = c y m + n = b.',
        { mark: 'num', text: 'Mira el trinomio del numerador.' },
        `Busca dos números que multipliquen ${nTex(c)} y sumen ${nTex(b)}.`,
        `Uno de los factores es ${par(fr)}.`,
      ],
      success: variant === 'A' ? 'Bien. El factor que causa 0/0 está arriba y abajo.' : 'Bien. Ahora el denominador.',
    });
    let dF = den; let cp;
    if (variant === 'B') {
      dF = E.mul(E.pp(fr), E.pp(linR(t)));
      const bt = -(r + t); const ct = r * t;
      ex.steps.push({
        kind: 'line', mode: 'replace',
        prompt: 'Ahora factoriza el denominador.',
        line: L(nF.tex, '\\slot'), done: L(nF.tex, dF.tex), verifyEv: E.frac(nF, dF).ev,
        options: exprOptions(dF, [
          [E.mul(E.pp([1, r]), E.pp([1, t])), `Revisa los signos: deben multiplicar ${nTex(ct)} y sumar ${nTex(bt)}.`],
          [E.mul(E.pp(fr), E.pp([1, t])), `Revisa los signos: deben multiplicar ${nTex(ct)} y sumar ${nTex(bt)}.`],
          [E.mul(E.pp([1, -ct]), E.pp([1, -1])), `Esos números multiplican ${nTex(ct)} pero no suman ${nTex(bt)}.`],
        ], r),
        hints: [
          'Usa la misma idea del aspa.',
          { mark: 'den', text: 'Mira el trinomio del denominador.' },
          `Busca dos números que multipliquen ${nTex(ct)} y sumen ${nTex(bt)}.`,
          `Uno de los factores es ${par(fr)}.`,
        ],
        success: 'Ahora el mismo factor está arriba y abajo.',
      });
      cp = L(`\\cancel{${par(fr)}}${par(fs)}`, `\\cancel{${par(fr)}}${par(linR(t))}`);
    } else cp = L(`\\cancel{${par(fr)}}${par(fs)}`, `\\cancel{${par(fr)}}`);
    const simp = variant === 'A' ? E.p(fs) : E.frac(E.p(fs), E.p(linR(t)));
    ex.steps.push({
      kind: 'line', mode: 'append',
      prompt: 'Simplifica. ¿Qué queda?', cancelPrev: cp,
      line: `= ${lim(ex.aTex)} \\slot`, done: `= ${lim(ex.aTex)} ${simp.tex}`, verifyEv: simp.ev,
      options: exprOptions(simp, variant === 'A'
        ? [[E.p(fr), `Se cancela ${par(fr)}; queda el otro factor.`], [E.p([1, s]), 'Revisa el signo del factor que queda.'], [E.frac(E.p(fs), E.p(fr)), 'El factor de abajo también se cancela.']]
        : [[E.frac(E.p(fr), E.p(linR(t))), `Se cancela ${par(fr)}; arriba queda ${par(fs)}.`], [E.frac(E.p(fs), E.p([1, t])), 'Revisa el signo del factor de abajo.'], [E.frac(E.p(linR(t)), E.p(fs)), 'No inviertas la fracción.']], r),
      hints: [`Puedes cancelar porque x se acerca a ${ex.aTex}, pero no es ${ex.aTex}.`, { mark: 'prev', text: `${par(fr)} está arriba y abajo.` }, 'Tacha el factor que se repite.', `Arriba queda ${par(fs)}.`],
      success: `Se canceló ${par(fr)}, el factor que producía 0/0.`,
    });
    const ev = variant === 'A' ? pSubTex(fs, r) : `\\frac{${pSubTex(fs, r)}}{${pSubTex(linR(t), r)}}`;
    const vw = variant === 'A'
      ? [['0', `Sustituye en ${pTex(fs)}.`], [Qs(r + s), 'Revisa el signo.'], [Qs(s - r), 'Revisa el orden de la resta.']]
      : [['0', 'Ya no hay 0/0: sustituye en la expresión simplificada.'], [Qs(r - t, r - s), 'No inviertas la fracción.'], [Qs(r + s, r + t), 'Revisa los signos.']];
    ex.steps.push({
      kind: 'line', mode: 'append', final: true,
      prompt: `Sustituye x = ${ex.aTex}.`,
      line: `= ${ev} = \\slot`, done: `= ${ev} = \\ok{${qTex(val)}}`,
      options: valueOptions(val, vw),
      hints: ['Ya no aparece 0/0.', { mark: 'prev', text: 'Sustituye en la última expresión.' }, `Cambia x por ${ex.aTex}.`, 'Calcula y simplifica.'],
      success: '¡Pedido servido!',
    });
    return ex;
  }
}

/* =========================================================================
   5. CONJUGADA   (√(x + k) − m)/(x − a)   ó   (x − b²)/(√x − b)
   ========================================================================= */
function genConjugada(level = 'medio') {
  const variant = pick(['A', 'A', 'B']);
  for (;;) {
    const ex = baseExercise('conjugada', level);
    if (variant === 'A') {
      const m = rnd(1, 4); const a = nz(-5, 8); const k = m * m - a;
      if (k === 0) continue;
      ex.a = a; ex.aTex = nTex(a);
      const R = [1, k]; // x + k
      const rad = E.sq(R);
      const num = E.sub(rad, E.k(m));
      const den = E.p(linR(a));
      ex.f = E.frac(num, den);
      ex.markTech = 'num';
      ex.fTex = `${lim(ex.aTex)} ${E.frac(E.mark('num', num), E.mark('den', den)).tex}`;
      const val = Q(1, 2 * m);
      ex.answer = { tex: qTex(val), value: qVal(val) };
      ex.steps.push(substStep(ex, `\\sqrt{${pSubTex(R, a)}} ${MINUS} ${m}`, pSubTex(linR(a), a)));
      ex.steps.push(techStep(ex, 'conjugada', ['difCuadrados', 'factorComun'], 'Hay una raíz y sale 0/0: multiplica por la conjugada.'));
      const conj = E.add(rad, E.k(m));
      const L = (body) => `= ${lim(ex.aTex)} ${body}`;
      const mulTex = `\\frac{${num.tex}}{${den.tex}} · \\slot`;
      ex.steps.push({
        kind: 'line', mode: 'append',
        prompt: 'Multiplica arriba y abajo por la conjugada.',
        line: L(mulTex), done: L(`\\frac{${num.tex}}{${den.tex}} · \\frac{${conj.tex}}{${conj.tex}}`),
        verifyEv: (x) => ex.f.ev(x) * conj.ev(x) / conj.ev(x),
        options: exprOptions(E.frac(conj, conj), [
          [E.frac(num, num), 'La conjugada cambia el signo del medio.'],
          [E.frac(den, den), 'Así la raíz no desaparece.'],
          [E.frac(conj, E.k(1)), 'Hay que multiplicar arriba y abajo por lo mismo.'],
        ], a + 0.01),
        hints: ['La conjugada de A − B es A + B.', { mark: 'num', text: 'Mira el numerador.' }, 'Multiplica arriba y abajo por la conjugada.', `La conjugada es ${conj.tex.replace(/\\sqrt\{([^}]*)\}/, '√($1)')}.`],
        success: 'Así aparece una diferencia de cuadrados arriba.',
      });
      const numRes = E.p(linR(a));
      const Lf = (n, d) => `= ${lim(ex.aTex)} \\frac{${n}}{${d}}`;
      const denConj = `${par(linR(a))}(${conj.tex})`;
      ex.steps.push({
        kind: 'line', mode: 'append',
        prompt: `Resuelve el numerador: (A ${MINUS} B)(A + B) = A² ${MINUS} B²`,
        line: Lf('\\slot', denConj), done: Lf(numRes.tex, denConj),
        verifyEv: (x) => numRes.ev(x) / (pEv(linR(a), x) * conj.ev(x)),
        options: exprOptions(numRes, [
          [E.p([1, k - m]), `(√(x + ${k}))² = x + ${k} y ${m}² = ${m * m}.`],
          [E.p([1, k + m * m]), 'A² − B² es una resta.'],
          [E.p([1, -m * m]), `Dentro de la raíz está x + ${k}; al elevar al cuadrado se queda.`],
        ], a),
        hints: ['(A − B)(A + B) = A² − B²', { mark: 'num', text: `A = √(x + ${k}) y B = ${m}.` }, `A² = x + ${k} y B² = ${m * m}.`, `Queda x + ${k} ${MINUS} ${m * m}.`],
        success: `Apareció ${par(linR(a))} arriba: el factor que causa 0/0.`,
      });
      const simp = E.frac(E.k(1), conj);
      ex.steps.push({
        kind: 'line', mode: 'append',
        prompt: 'Simplifica. ¿Qué queda?',
        cancelPrev: Lf(`\\cancel{${numRes.tex}}`, `\\cancel{${par(linR(a))}}(${conj.tex})`),
        line: L('\\slot'), done: L(simp.tex), verifyEv: simp.ev,
        options: exprOptions(simp, [
          [conj, 'Al cancelar todo el numerador, arriba queda 1.'],
          [E.frac(E.k(1), num), 'Revisa el signo de la conjugada.'],
          [E.frac(E.k(0), conj), 'Al cancelar arriba queda 1, no 0.'],
        ], a + 0.01),
        hints: [`Puedes cancelar porque x se acerca a ${ex.aTex}, pero no es ${ex.aTex}.`, { mark: 'prev', text: `${par(linR(a))} está arriba y abajo.` }, 'Cuando se cancela todo el numerador, queda 1.', 'Abajo queda la conjugada.'],
        success: `Se canceló ${par(linR(a))}.`,
      });
      ex.steps.push({
        kind: 'line', mode: 'append', final: true,
        prompt: `Sustituye x = ${ex.aTex}.`,
        line: `= \\frac{1}{\\sqrt{${pSubTex(R, a)}} + ${m}} = \\slot`,
        done: `= \\frac{1}{\\sqrt{${pSubTex(R, a)}} + ${m}} = \\ok{${qTex(val)}}`,
        options: valueOptions(val, [[Qs(1, m), `√(${m * m}) = ${m}: abajo queda ${m} + ${m}.`], ['0', 'Ya no hay 0/0.'], [Qs(2 * m), 'El resultado es 1 entre ese número.']]),
        hints: ['Ya no aparece 0/0.', { mark: 'prev', text: 'Sustituye en la última expresión.' }, `Dentro de la raíz queda ${m * m}.`, `Abajo queda ${m} + ${m}.`],
        success: '¡Pedido servido!',
      });
      return ex;
    }
    // B: (x − b²)/(√x − b) → 2b
    const bb = rnd(1, 5); const a = bb * bb;
    ex.a = a; ex.aTex = nTex(a);
    const rad = E.sq([1, 0]);
    const den = E.sub(rad, E.k(bb));
    const num = E.p(linR(a));
    ex.f = E.frac(num, den);
    ex.markTech = 'den';
    ex.fTex = `${lim(ex.aTex)} ${E.frac(E.mark('num', num), E.mark('den', den)).tex}`;
    const val = Q(2 * bb);
    ex.answer = { tex: qTex(val), value: qVal(val) };
    ex.steps.push(substStep(ex, pSubTex(linR(a), a), `\\sqrt{${a}} ${MINUS} ${bb}`));
    ex.steps.push(techStep(ex, 'conjugada', ['difCuadrados', 'aspa'], 'Hay una raíz abajo y sale 0/0: multiplica por la conjugada.'));
    const conj = E.add(rad, E.k(bb));
    const L = (body) => `= ${lim(ex.aTex)} ${body}`;
    ex.steps.push({
      kind: 'line', mode: 'append',
      prompt: 'Multiplica arriba y abajo por la conjugada.',
      line: L(`\\frac{${num.tex}}{${den.tex}} · \\slot`), done: L(`\\frac{${num.tex}}{${den.tex}} · \\frac{${conj.tex}}{${conj.tex}}`),
      verifyEv: (x) => ex.f.ev(x),
      options: exprOptions(E.frac(conj, conj), [[E.frac(den, den), 'La conjugada cambia el signo del medio.'], [E.frac(num, num), 'Así la raíz no desaparece.'], [E.frac(conj, E.k(1)), 'Hay que multiplicar arriba y abajo por lo mismo.']], a + 0.3),
      hints: ['La conjugada de A − B es A + B.', { mark: 'den', text: 'Mira el denominador.' }, 'Multiplica arriba y abajo por la conjugada.', `La conjugada es √x + ${bb}.`],
      success: 'Así aparece una diferencia de cuadrados abajo.',
    });
    const Lf = (n, d) => `= ${lim(ex.aTex)} \\frac{${n}}{${d}}`;
    const numConj = `${par(linR(a))}(${conj.tex})`;
    ex.steps.push({
      kind: 'line', mode: 'append',
      prompt: `Resuelve el denominador: (A ${MINUS} B)(A + B) = A² ${MINUS} B²`,
      line: Lf(numConj, '\\slot'), done: Lf(numConj, pTex(linR(a))),
      verifyEv: (x) => pEv(linR(a), x) * conj.ev(x) / pEv(linR(a), x),
      options: exprOptions(E.p(linR(a)), [[E.p([1, -bb]), `${bb}² = ${a}.`], [E.p([1, a]), 'A² − B² es una resta.'], [E.raw(`x^{2} ${MINUS} ${a}`, (x) => x * x - a), '(√x)² = x.']], a + 0.3),
      hints: ['(A − B)(A + B) = A² − B²', { mark: 'den', text: `A = √x y B = ${bb}.` }, `A² = x y B² = ${a}.`, `Queda x ${MINUS} ${a}.`],
      success: `Apareció ${par(linR(a))} abajo.`,
    });
    ex.steps.push({
      kind: 'line', mode: 'append',
      prompt: 'Simplifica. ¿Qué queda?',
      cancelPrev: Lf(`\\cancel{${par(linR(a))}}(${conj.tex})`, `\\cancel{${pTex(linR(a))}}`),
      line: L('\\slot'), done: L(conj.tex), verifyEv: conj.ev,
      options: exprOptions(conj, [[E.frac(E.k(1), conj), 'Lo que se cancela es abajo; arriba queda la conjugada.'], [den, 'Revisa el signo: queda la conjugada.'], [E.k(1), 'Arriba queda la conjugada.']], a + 0.3),
      hints: [`Puedes cancelar porque x se acerca a ${ex.aTex}, pero no es ${ex.aTex}.`, { mark: 'prev', text: `${par(linR(a))} está arriba y abajo.` }, 'Tacha el factor que se repite.', `Queda √x + ${bb}.`],
      success: `Se canceló ${par(linR(a))}.`,
    });
    ex.steps.push({
      kind: 'line', mode: 'append', final: true,
      prompt: `Sustituye x = ${ex.aTex}.`,
      line: `= \\sqrt{${a}} + ${bb} = \\slot`, done: `= \\sqrt{${a}} + ${bb} = \\ok{${qTex(val)}}`,
      options: valueOptions(val, [[Qs(bb), `√${a} = ${bb}: queda ${bb} + ${bb}.`], [Qs(a + bb), `Primero saca la raíz: √${a} = ${bb}.`], ['0', 'Ya no hay 0/0.']]),
      hints: ['Ya no aparece 0/0.', { mark: 'prev', text: 'Sustituye en la última expresión.' }, `√${a} = ${bb}.`, `Queda ${bb} + ${bb}.`],
      success: '¡Pedido servido!',
    });
    return ex;
  }
}

/* =========================================================================
   6. MAYOR POTENCIA   x → ∞   P(x)/Q(x)
   ========================================================================= */
function genPotencia(level = 'medio') {
  for (;;) {
    const ex = baseExercise('potencia', level);
    const m = rnd(1, 3);
    const n = level === 'alto' ? pick([m - 1, m + 1, m]) : m;
    if (n < 1 || n > 3) continue;
    const P = [nz(-6, 7), ...Array.from({ length: n }, () => rnd(-7, 7))];
    const Dd = [nz(-6, 7), ...Array.from({ length: m }, () => rnd(-7, 7))];
    if (P.slice(1).every((v) => v === 0) || Dd.slice(1).every((v) => v === 0)) continue;
    if (n === m && P.every((v, i) => v * Dd[0] === Dd[i] * P[0])) continue; // cociente constante: trivial
    ex.a = Infinity; ex.aTex = '∞';
    const num = E.p(P); const den = E.p(Dd);
    ex.f = E.frac(num, den);
    ex.markTech = 'den';
    ex.fTex = `${lim('∞')} ${E.frac(E.mark('num', num), E.mark('den', den)).tex}`;
    let val; let valTex;
    if (n === m) { val = Q(P[0], Dd[0]); valTex = qTex(val); }
    else if (n < m) { val = Q(0); valTex = '0'; }
    else { val = null; valTex = P[0] * Dd[0] > 0 ? '∞' : `${MINUS}∞`; }
    ex.answer = { tex: valTex, value: val ? qVal(val) : (P[0] * Dd[0] > 0 ? Infinity : -Infinity) };
    ex.steps.push({
      kind: 'form',
      prompt: 'Cuando x → ∞, ¿qué forma aparece?',
      line: '\\note{x → ∞:} \\frac{→ ∞}{→ ∞} \\to \\slot',
      done: '\\note{x → ∞:} \\frac{→ ∞}{→ ∞} \\to \\frac{∞}{∞}',
      tag: 'infinito',
      options: shuffle([
        { tex: '\\frac{∞}{∞}', ok: true },
        { tex: '1', ok: false, fb: '∞ entre ∞ no es 1: depende de cómo crece cada parte.' },
        { tex: '0', ok: false, fb: 'Numerador y denominador crecen sin límite.' },
      ]),
      hints: ['Mira qué pasa con cada parte cuando x crece mucho.', { mark: 'num', text: 'El término de mayor grado manda.' }, 'Arriba y abajo los valores crecen sin límite.', 'Es la forma ∞ entre ∞.'],
      success: 'Forma ∞/∞: divide entre la mayor potencia.',
    });
    ex.steps.push(techStep(ex, 'potencia', ['conjugada', 'aspa'], 'Es un cociente con x → ∞: divide entre la mayor potencia del denominador.'));
    const xm = m === 1 ? 'x' : `x^{${m}}`;
    const powOpts = [{ tex: xm, ok: true }];
    if (m > 1) powOpts.push({ tex: m - 1 === 1 ? 'x' : `x^{${m - 1}}`, ok: false, fb: `Usa la mayor potencia del denominador: ${xm.replace('^{', '').replace('}', '')}.` });
    powOpts.push({ tex: `x^{${m + 1}}`, ok: false, fb: `La mayor potencia del denominador es ${m === 1 ? 'x' : 'x' + (m === 2 ? '²' : '³')}.` });
    if (powOpts.length < 3) powOpts.push({ tex: '2', ok: false, fb: 'Se divide entre una potencia de x.' });
    ex.steps.push({
      kind: 'pick', mode: 'tag',
      prompt: '¿Entre qué potencia divides arriba y abajo?',
      tagText: `Divide entre ${m === 1 ? 'x' : 'x' + (m === 2 ? '²' : '³')}`,
      options: shuffle(powOpts),
      hints: ['Se divide entre la mayor potencia del denominador.', { mark: 'den', text: 'Mira el grado del denominador.' }, `El denominador es de grado ${m}.`, `Es x elevado a ${m}.`],
      success: 'Bien. Divide cada término.',
    });
    // dividir término a término
    const divTex = (c, keep = true) => {
      const deg = c.length - 1;
      const parts = [];
      c.forEach((a, i) => {
        const p = deg - i;
        if (a === 0) return;
        const e = p - m;
        let body;
        const abs = Math.abs(a);
        if (e === 0) body = String(abs);
        else if (e > 0) body = (abs === 1 ? '' : abs) + (e === 1 ? 'x' : `x^{${e}}`);
        else body = `\\frac{${abs}}{${-e === 1 ? 'x' : `x^{${-e}}`}}`;
        if (!keep && e < 0) body = String(abs);
        parts.push([a < 0, body]);
      });
      return parts.map(([neg, b], i) => (i === 0 ? (neg ? MINUS : '') + b : (neg ? ` ${MINUS} ` : ' + ') + b)).join('');
    };
    const divEv = (c) => (x) => pEv(c, x) / x ** m;
    const dN = E.raw(divTex(P), divEv(P)); const dD = E.raw(divTex(Dd), divEv(Dd));
    const right = E.frac(dN, dD);
    // error típico: el término independiente no se divide
    const divTexNC = (c) => {
      const deg = c.length - 1; const parts = [];
      c.forEach((a, i) => {
        const p = deg - i; if (a === 0) return; const e = p - m; const abs = Math.abs(a);
        let body;
        if (p === 0) body = String(abs);
        else if (e === 0) body = String(abs);
        else if (e > 0) body = (abs === 1 ? '' : abs) + (e === 1 ? 'x' : `x^{${e}}`);
        else body = `\\frac{${abs}}{${-e === 1 ? 'x' : `x^{${-e}}`}}`;
        parts.push([a < 0, body]);
      });
      return parts.map(([neg, b], i) => (i === 0 ? (neg ? MINUS : '') + b : (neg ? ` ${MINUS} ` : ' + ') + b)).join('');
    };
    const evNC = (c) => (x) => { const deg = c.length - 1; return c.reduce((s, a, i) => { const p = deg - i; return s + (p === 0 ? a : a * x ** (p - m)); }, 0); };
    const wrongConst = E.raw(`\\frac{${divTexNC(P)}}{${divTexNC(Dd)}}`, (x) => evNC(P)(x) / evNC(Dd)(x));
    ex.steps.push({
      kind: 'line', mode: 'append',
      prompt: 'Divide cada término entre esa potencia.',
      line: `= ${lim('∞')} \\slot`, done: `= ${lim('∞')} ${right.tex}`, verifyEv: right.ev,
      options: exprOptions(right, [
        [wrongConst, 'Cada término se divide, también los números solos.'],
        [E.raw(`\\frac{${divTex(Dd)}}{${divTex(P)}}`, (x) => divEv(Dd)(x) / divEv(P)(x)), 'No inviertas la fracción.'],
      ], 7),
      hints: ['Cada término se divide entre la misma potencia.', { mark: 'den', text: 'El término de mayor grado del denominador queda como número.' }, `Un término sin x queda como número entre ${xm.replace('^{', '').replace('}', '')}.`, 'Los términos con x abajo tienden a 0.'],
      success: 'Ahora los términos con x en el denominador tienden a 0.',
    });
    const zeros = (c) => {
      const deg = c.length - 1; const out = [];
      c.forEach((a, i) => { const p = deg - i; if (a === 0) return; const e = p - m; out.push([a < 0, e === 0 ? String(Math.abs(a)) : e > 0 ? '∞' : '0']); });
      return out.map(([neg, b], i) => (i === 0 ? (neg ? MINUS : '') + b : (neg ? ` ${MINUS} ` : ' + ') + b)).join('');
    };
    const options = n === m
      ? valueOptions(val, [[Qs(Dd[0], P[0]), 'No inviertas la fracción.'], ['0', 'Los términos sin x abajo no tienden a 0.'], ['∞', 'Arriba y abajo quedan números.']])
      : n < m
        ? shuffle([{ tex: '0', ok: true }, { tex: qTex(Q(P[0], Dd[0])), ok: false, fb: 'Arriba todos los términos tienden a 0.' }, { tex: '∞', ok: false, fb: 'El denominador crece más rápido.' }])
        : shuffle([{ tex: valTex, ok: true }, { tex: '0', ok: false, fb: 'Arriba queda un término con x que crece.' }, { tex: qTex(Q(P[0], Dd[0])), ok: false, fb: 'El numerador es de mayor grado: crece sin límite.' }]);
    const doneTex = n > m
      ? `= ${valTex === '∞' ? '\\ok{∞}' : `\\ok{${MINUS}∞}`}`
      : `= \\frac{${zeros(P)}}{${zeros(Dd)}} = \\ok{${valTex}}`;
    ex.steps.push({
      kind: 'line', mode: 'append', final: true,
      prompt: 'Cada número entre una potencia de x tiende a 0. ¿Cuánto vale el límite?',
      line: '= \\slot', done: doneTex,
      options,
      hints: ['Un número entre x, x² o x³ tiende a 0.', { mark: 'prev', text: 'Mira la última línea.' }, 'Reemplaza cada fracción con x abajo por 0.', n === m ? `Quedan ${nTex(P[0])} y ${nTex(Dd[0])}.` : n < m ? 'Arriba todo tiende a 0.' : 'Arriba queda un término con x.'],
      success: '¡Pedido servido!',
    });
    return ex;
  }
}

/* =========================================================================
   7. RUFFINI   N(x) = (x − r)(x² + bx + c)
   ========================================================================= */
function genRuffini(level = 'alto') {
  for (;;) {
    const ex = baseExercise('ruffini', level);
    const r = nz(-3, 3); const b = rnd(-5, 5); const c = rnd(-6, 6);
    const qd = [1, b, c];
    if (pEv(qd, r) === 0) continue; // que no vuelva a anularse
    const N = pMul(linR(r), qd);
    const variant = pick(['A', 'B']);
    const D = variant === 'A' ? linR(r) : [1, 0, -r * r];
    ex.a = r; ex.aTex = nTex(r);
    const num = E.p(N); const den = E.p(D);
    ex.f = E.frac(num, den);
    ex.markTech = 'num';
    ex.fTex = `${lim(ex.aTex)} ${E.frac(E.mark('num', num), E.mark('den', den)).tex}`;
    const qv = pEv(qd, r);
    const val = variant === 'A' ? Q(qv) : Q(qv, 2 * r);
    ex.answer = { tex: qTex(val), value: qVal(val) };
    ex.steps.push(substStep(ex, pSubTex(N, r), pSubTex(D, r)));
    ex.steps.push(techStep(ex, 'ruffini', ['aspa', 'difCuadrados'], 'El numerador es de grado 3 y se anula en x = a: divide por Ruffini.'));
    const L = (n, d) => `= ${lim(ex.aTex)} \\frac{${n}}{${d}}`;
    const nF = E.mul(E.pp(linR(r)), E.pp(qd));
    const wrongNeg = ruffini(N, -r).q;
    const wrongSub = (() => { const q = [N[0]]; for (let i = 1; i < N.length - 1; i++) q.push(N[i] - r * q[i - 1]); return q; })();
    ex.steps.push({
      kind: 'line', mode: 'append', ruffini: { coeffs: N, r },
      prompt: `Divide el numerador entre ${par(linR(r))} con Ruffini.`,
      line: L(`${par(linR(r))}(\\slot)`, den.tex), done: L(nF.tex, den.tex), verifyEv: E.frac(nF, den).ev,
      options: exprOptions(E.p(qd), [
        [E.p(wrongNeg), `En Ruffini se usa ${ex.aTex}, el valor que anula ${par(linR(r))}.`],
        [E.p(wrongSub), 'En Ruffini se suma: baja, multiplica y suma.'],
        [E.p([1, b, c + 1]), 'Revisa la última suma: el residuo debe ser 0.'],
      ], r),
      hints: ['Ruffini: baja el primer coeficiente, multiplica por r y suma.', { mark: 'num', text: `Coeficientes: ${N.map(nTex).join(', ')}.` }, `Usa r = ${ex.aTex}. El residuo debe dar 0.`, `El cociente empieza con x² ${b < 0 ? MINUS : '+'} …`],
      success: 'El residuo es 0: la división es exacta.',
    });
    let dF = den; let cp;
    if (variant === 'B') {
      dF = E.mul(E.pp(linR(r)), E.pp([1, r]));
      ex.steps.push({
        kind: 'line', mode: 'replace',
        prompt: 'Factoriza el denominador.',
        line: L(nF.tex, '\\slot'), done: L(nF.tex, dF.tex), verifyEv: E.frac(nF, dF).ev,
        options: exprOptions(dF, [[E.mul(E.pp(linR(r)), E.pp(linR(r))), 'Eso es un binomio al cuadrado.'], [E.mul(E.pp([1, -r * r]), E.pp([1, r * r])), `Busca el número que al cuadrado da ${r * r}.`]], r),
        hints: [`a² ${MINUS} b² = (a ${MINUS} b)(a + b)`, { mark: 'den', text: 'Abajo hay una diferencia de cuadrados.' }, `b = ${Math.abs(r)}.`, `Uno de los factores es ${par(linR(r))}.`],
        success: 'Ahora el factor que causa 0/0 está arriba y abajo.',
      });
      cp = L(`\\cancel{${par(linR(r))}}${par(qd)}`, `\\cancel{${par(linR(r))}}${par([1, r])}`);
    } else cp = L(`\\cancel{${par(linR(r))}}${par(qd)}`, `\\cancel{${par(linR(r))}}`);
    const simp = variant === 'A' ? E.p(qd) : E.frac(E.p(qd), E.p([1, r]));
    ex.steps.push({
      kind: 'line', mode: 'append',
      prompt: 'Simplifica. ¿Qué queda?', cancelPrev: cp,
      line: `= ${lim(ex.aTex)} \\slot`, done: `= ${lim(ex.aTex)} ${simp.tex}`, verifyEv: simp.ev,
      options: exprOptions(simp, variant === 'A'
        ? [[E.p(wrongNeg), 'Usa el cociente de Ruffini.'], [E.frac(E.p(qd), E.p(linR(r))), 'El factor de abajo también se cancela.']]
        : [[E.frac(E.p(qd), E.p(linR(r))), `Se cancela ${par(linR(r))}; abajo queda ${par([1, r])}.`], [E.p(qd), 'Abajo también queda un factor.']], r),
      hints: [`Puedes cancelar porque x se acerca a ${ex.aTex}, pero no es ${ex.aTex}.`, { mark: 'prev', text: `${par(linR(r))} está arriba y abajo.` }, 'Tacha el factor que se repite.', `Arriba queda ${par(qd)}.`],
      success: `Se canceló ${par(linR(r))}.`,
    });
    const evT = variant === 'A' ? pSubTex(qd, r) : `\\frac{${pSubTex(qd, r)}}{${pSubTex([1, r], r)}}`;
    ex.steps.push({
      kind: 'line', mode: 'append', final: true,
      prompt: `Sustituye x = ${ex.aTex}.`,
      line: `= ${evT} = \\slot`, done: `= ${evT} = \\ok{${qTex(val)}}`,
      options: valueOptions(val, [['0', 'Ya no hay 0/0: sustituye en el cociente.'], [Qs(pEv(qd, -r), variant === 'A' ? 1 : 2 * r), `Sustituye x = ${ex.aTex}, con su signo.`], [Qs(qv + 1, variant === 'A' ? 1 : 2 * r), 'Revisa la cuenta.']]),
      hints: ['Ya no aparece 0/0.', { mark: 'prev', text: 'Sustituye en la última expresión.' }, `Cambia x por ${ex.aTex}.`, 'Calcula con cuidado los signos.'],
      success: '¡Pedido servido!',
    });
    return ex;
  }
}

/* =========================================================================
   8. INFINITO MENOS INFINITO
      A: x → ∞   √(x² + bx + c) − x  →  b/2
      B: x → a   1/(x − a) − 2a/(x² − a²)  →  1/(2a)
   ========================================================================= */
function genInfMenosInf(level = 'alto') {
  const variant = pick(['A', 'B']);
  for (;;) {
    const ex = baseExercise('infMenosInf', level);
    if (variant === 'A') {
      const b = nz(-8, 8); const c = rnd(-6, 9);
      if (b < 0 && c < 0 && Math.random() < 0.5) continue;
      ex.a = Infinity; ex.aTex = '∞';
      const R = [1, b, c];
      const rad = E.sq(R);
      const X = E.raw('x', (t) => t);
      ex.f = E.sub(rad, X);
      ex.markTech = 'num';
      ex.fTex = `${lim('∞')} \\mark{num}{${ex.f.tex}}`;
      const val = Q(b, 2);
      ex.answer = { tex: qTex(val), value: qVal(val) };
      ex.steps.push({
        kind: 'form', prompt: 'Cuando x → ∞, ¿qué forma aparece?',
        line: '\\note{x → ∞:} ∞ − ∞ \\to \\slot', done: '\\note{x → ∞:} ∞ − ∞ \\to ∞ − ∞', tag: 'infmenosinf',
        options: shuffle([{ tex: '∞ − ∞', ok: true }, { tex: '0', ok: false, fb: '∞ − ∞ no es 0: es una forma indeterminada.' }, { tex: '∞', ok: false, fb: 'Las dos partes crecen: no se puede decidir así.' }]),
        hints: ['Mira cada parte de la resta por separado.', { mark: 'num', text: 'La raíz crece y x también crece.' }, 'Las dos partes tienden a ∞.', 'Es la forma ∞ − ∞.'],
        success: 'Forma ∞ − ∞: hay que convertirla en un cociente.',
      });
      ex.steps.push(techStep(ex, 'conjugada', ['potencia', 'aspa'], 'Es una raíz menos x: multiplica por la conjugada para formar un cociente.'));
      const conj = E.add(rad, X);
      const L = (body) => `= ${lim('∞')} ${body}`;
      ex.steps.push({
        kind: 'line', mode: 'append',
        prompt: 'Multiplica arriba y abajo por la conjugada.',
        line: L(`(${ex.f.tex}) · \\slot`), done: L(`(${ex.f.tex}) · \\frac{${conj.tex}}{${conj.tex}}`),
        verifyEv: ex.f.ev,
        options: exprOptions(E.frac(conj, conj), [[E.frac(ex.f, ex.f), 'La conjugada cambia el signo del medio.'], [E.frac(conj, E.k(1)), 'Hay que multiplicar arriba y abajo por lo mismo.'], [E.frac(X, X), 'Así no desaparece la raíz.']], 40),
        hints: ['La conjugada de A − B es A + B.', { mark: 'num', text: 'A es la raíz y B es x.' }, 'Multiplica por (A + B)/(A + B).', `La conjugada es √(${pTex(R)}) + x.`],
        success: 'Arriba aparece una diferencia de cuadrados.',
      });
      const numRes = E.p([b, c]);
      const Lf = (n, d) => `= ${lim('∞')} \\frac{${n}}{${d}}`;
      ex.steps.push({
        kind: 'line', mode: 'append',
        prompt: 'Resuelve el numerador: A² − B²',
        line: Lf('\\slot', conj.tex), done: Lf(numRes.tex, conj.tex), verifyEv: E.frac(numRes, conj).ev,
        options: exprOptions(numRes, [[E.p([2, b, c]), 'Es una resta: x² − x² se anula.'], [E.p([b, c - 1]), 'B² = x², no x.'], [E.p([1, b, c]), 'Falta restar x².']], 40),
        hints: ['(A − B)(A + B) = A² − B²', { mark: 'num', text: `A² = ${pTex(R)} y B² = x².` }, 'Resta y simplifica.', `x² se anula: queda ${pTex([b, c])}.`],
        success: 'Ahora es un cociente: forma ∞/∞.',
      });
      const fin = `\\frac{${nTex(b)}}{\\sqrt{1} + 1}`;
      ex.steps.push({
        kind: 'line', mode: 'append', final: true,
        prompt: 'Divide entre x. ¿Cuánto vale el límite?',
        line: `= ${lim('∞')} \\frac{${nTex(b)}${c ? (c < 0 ? ` ${MINUS} ` : ' + ') + `\\frac{${Math.abs(c)}}{x}` : ''}}{\\sqrt{1 ${b < 0 ? MINUS : '+'} \\frac{${Math.abs(b)}}{x}${c ? (c < 0 ? ` ${MINUS} ` : ' + ') + `\\frac{${Math.abs(c)}}{x^{2}}` : ''}} + 1} = \\slot`,
        done: `= ${lim('∞')} \\frac{${nTex(b)}${c ? (c < 0 ? ` ${MINUS} ` : ' + ') + `\\frac{${Math.abs(c)}}{x}` : ''}}{\\sqrt{1 ${b < 0 ? MINUS : '+'} \\frac{${Math.abs(b)}}{x}${c ? (c < 0 ? ` ${MINUS} ` : ' + ') + `\\frac{${Math.abs(c)}}{x^{2}}` : ''}} + 1} \\br = ${fin} = \\ok{${qTex(val)}}`,
        options: valueOptions(val, [[Qs(b), 'El denominador tiende a 1 + 1 = 2.'], ['∞', 'Ya es un cociente de números: no crece.'], [Qs(c, 2), 'Mira el término con x del numerador.']]),
        hints: ['Dentro de la raíz también se divide: √(x²) = x.', { mark: 'prev', text: 'Abajo, cada parte entre x.' }, 'Los términos con x abajo tienden a 0.', `Queda ${nTex(b)} entre 2.`],
        success: '¡Pedido servido!',
      });
      return ex;
    }
    // B
    const a = nz(-5, 5);
    ex.a = a; ex.aTex = nTex(a);
    const D1 = linR(a); const D2 = [1, 0, -a * a];
    const t1 = E.frac(E.k(1), E.p(D1));
    const t2 = E.frac(E.k(2 * a), E.p(D2));
    ex.f = E.raw(`${t1.tex} ${MINUS} ${t2.tex}`, (x) => t1.ev(x) - t2.ev(x));
    ex.markTech = 'num';
    ex.fTex = `${lim(ex.aTex)} \\mark{num}{${ex.f.tex}}`;
    const val = Q(1, 2 * a);
    ex.answer = { tex: qTex(val), value: qVal(val) };
    ex.steps.push({
      kind: 'form', prompt: `Cuando x → ${ex.aTex}, ¿qué forma aparece?`,
      line: `\\note{x → ${ex.aTex}:} ∞ − ∞ \\to \\slot`, done: `\\note{x → ${ex.aTex}:} ∞ − ∞ \\to ∞ − ∞`, tag: 'infmenosinf',
      options: shuffle([{ tex: '∞ − ∞', ok: true }, { tex: '0', ok: false, fb: '∞ − ∞ no es 0: es una forma indeterminada.' }, { tex: '\\frac{0}{0}', ok: false, fb: 'Cada fracción por separado crece: es una resta de infinitos.' }]),
      hints: ['Mira cada fracción por separado.', { mark: 'num', text: `Los dos denominadores se anulan en x = ${ex.aTex}.` }, 'Cada fracción crece sin límite.', 'Es la forma ∞ − ∞.'],
      success: 'Forma ∞ − ∞: une las fracciones en una sola.',
    });
    ex.steps.push(techStep(ex, 'infMenosInf', ['conjugada', 'potencia'], 'Es una resta de fracciones que crecen: únelas en una sola con el mcm.'));
    const Lf = (n, d) => `= ${lim(ex.aTex)} \\frac{${n}}{${d}}`;
    const numA = E.raw(`${par([1, a])} ${MINUS} ${nTex(2 * a).replace(MINUS, '(' + MINUS) + (2 * a < 0 ? ')' : '')}`, (x) => x + a - 2 * a);
    const dTex = pTex(D2);
    ex.steps.push({
      kind: 'line', mode: 'append',
      prompt: `Une en una fracción con denominador ${dTex}.`,
      line: Lf('\\slot', dTex), done: Lf(numA.tex, dTex), verifyEv: (x) => numA.ev(x) / pEv(D2, x),
      options: exprOptions(numA, [[E.raw(`1 ${MINUS} ${nP(2 * a)}`, () => 1 - 2 * a), `Multiplica 1 por ${par([1, a])} al pasar al mcm.`], [E.raw(`${par([1, a])} + ${Math.abs(2 * a)}`, (x) => x + a + 2 * a * Math.sign(a)), 'Es una resta: conserva el signo.']], a + 0.2),
      hints: [`El mcm es ${dTex} = ${par(D1)}${par([1, a])}.`, { mark: 'num', text: 'La primera fracción necesita multiplicarse.' }, `Multiplica arriba y abajo de la primera por ${par([1, a])}.`, `Arriba queda ${par([1, a])} ${MINUS} ${nP(2 * a)}.`],
      success: 'Ahora simplifica el numerador.',
    });
    const numS = E.p(D1);
    ex.steps.push({
      kind: 'line', mode: 'append',
      prompt: 'Simplifica el numerador y factoriza abajo.',
      line: Lf('\\slot', `${par(D1)}${par([1, a])}`), done: Lf(numS.tex, `${par(D1)}${par([1, a])}`), verifyEv: (x) => numS.ev(x) / pEv(D2, x),
      options: exprOptions(numS, [[E.p([1, 3 * a]), 'Es una resta: x + a − 2a = x − a.'], [E.p([1, a]), 'Revisa: se resta 2a.']], a + 0.2),
      hints: ['Reduce términos semejantes.', { mark: 'prev', text: 'Arriba hay una x y dos números.' }, `${nTex(a)} ${MINUS} ${nTex(2 * a).replace(MINUS, '(' + MINUS) + (2 * a < 0 ? ')' : '')} = ${nTex(-a)}`, `Queda ${pTex(D1)}.`],
      success: `Apareció ${par(D1)} arriba y abajo.`,
    });
    const simp = E.frac(E.k(1), E.p([1, a]));
    ex.steps.push({
      kind: 'line', mode: 'append',
      prompt: 'Simplifica. ¿Qué queda?',
      cancelPrev: Lf(`\\cancel{${pTex(D1)}}`, `\\cancel{${par(D1)}}${par([1, a])}`),
      line: `= ${lim(ex.aTex)} \\slot`, done: `= ${lim(ex.aTex)} ${simp.tex}`, verifyEv: simp.ev,
      options: exprOptions(simp, [[E.p([1, a]), 'Al cancelar todo el numerador, arriba queda 1.'], [E.frac(E.k(1), E.p(D1)), `Se cancela ${par(D1)}; abajo queda ${par([1, a])}.`]], a + 0.2),
      hints: [`Puedes cancelar porque x se acerca a ${ex.aTex}, pero no es ${ex.aTex}.`, { mark: 'prev', text: `${par(D1)} está arriba y abajo.` }, 'Cuando se cancela todo el numerador, queda 1.', `Abajo queda ${par([1, a])}.`],
      success: `Se canceló ${par(D1)}.`,
    });
    ex.steps.push({
      kind: 'line', mode: 'append', final: true,
      prompt: `Sustituye x = ${ex.aTex}.`,
      line: `= \\frac{1}{${pSubTex([1, a], a)}} = \\slot`, done: `= \\frac{1}{${pSubTex([1, a], a)}} = \\ok{${qTex(val)}}`,
      options: valueOptions(val, [[Qs(1, a), `${nTex(a)} + ${nP(a)} = ${nTex(2 * a)}.`], ['0', 'Ya no hay indeterminación.'], [Qs(2 * a), 'El resultado es 1 entre ese número.']]),
      hints: ['Ya no hay indeterminación.', { mark: 'prev', text: 'Sustituye en la última expresión.' }, `Cambia x por ${ex.aTex}.`, `Abajo queda ${nTex(2 * a)}.`],
      success: '¡Pedido servido!',
    });
    return ex;
  }
}

/* =========================================================================
   COMBINADO (Hora punta): factor común + diferencia de cuadrados
      (k x² − k a²)/(x − a)  →  2ka
   ========================================================================= */
function genCombo(level = 'alto') {
  for (;;) {
    const ex = baseExercise('factorComun', level);
    ex.combo = true;
    const k = pick([2, 3, 4, 5, -2, -3]); const a = nz(-5, 5);
    if (Math.abs(a) === 1) continue;
    ex.a = a; ex.aTex = nTex(a);
    const N = [k, 0, -k * a * a];
    const num = E.p(N); const den = E.p(linR(a));
    ex.f = E.frac(num, den);
    ex.markTech = 'num';
    ex.fTex = `${lim(ex.aTex)} ${E.frac(E.mark('num', num), E.mark('den', den)).tex}`;
    const val = Q(2 * k * a);
    ex.answer = { tex: qTex(val), value: qVal(val) };
    ex.steps.push(substStep(ex, pSubTex(N, a), pSubTex(linR(a), a)));
    ex.steps.push(techStep(ex, 'factorComun', ['aspa', 'conjugada'], `Primero saca ${nTex(k)} como factor común; luego aparece una diferencia de cuadrados.`));
    const L = (n, d) => `= ${lim(ex.aTex)} \\frac{${n}}{${d}}`;
    const K = E.raw(k === -1 ? MINUS : nTex(k), () => k);
    const s1 = E.mul(K, E.pp([1, 0, -a * a]));
    ex.steps.push({
      kind: 'line', mode: 'append',
      prompt: `Saca ${nTex(k)} como factor común arriba.`,
      line: L('\\slot', den.tex), done: L(s1.tex, den.tex), verifyEv: E.frac(s1, den).ev,
      options: exprOptions(s1, [[E.mul(K, E.pp([1, 0, -k * a * a])), `Al sacar ${nTex(k)}, el segundo término también se divide entre ${nTex(k)}.`], [E.mul(K, E.pp([1, 0, a * a])), 'Revisa el signo dentro del paréntesis.']], a),
      hints: ['Factor común: lo que se repite sale fuera.', { mark: 'num', text: `Los dos términos son múltiplos de ${nTex(k)}.` }, `Divide cada término entre ${nTex(k)}.`, `Queda ${nTex(k)}(x² ${MINUS} …)`],
      success: 'Ahora hay una diferencia de cuadrados dentro.',
    });
    const s2 = E.mul(K, E.pp(linR(a)), E.pp([1, a]));
    ex.steps.push({
      kind: 'line', mode: 'append',
      prompt: 'Factoriza la diferencia de cuadrados.',
      line: L(`${nTex(k)}\\slot`, den.tex), done: L(s2.tex, den.tex), verifyEv: E.frac(s2, den).ev,
      options: exprOptions(E.mul(E.pp(linR(a)), E.pp([1, a])), [[E.mul(E.pp(linR(a)), E.pp(linR(a))), 'Eso es un binomio al cuadrado.'], [E.mul(E.pp([1, -a * a]), E.pp([1, a * a])), `Busca el número que al cuadrado da ${a * a}.`]], a),
      hints: [`a² ${MINUS} b² = (a ${MINUS} b)(a + b)`, { mark: 'prev', text: 'Mira el paréntesis.' }, `b = ${Math.abs(a)}.`, `Uno de los factores es ${par(linR(a))}.`],
      success: 'El factor que causa 0/0 está arriba y abajo.',
    });
    const simp = E.mul(K, E.pp([1, a]));
    ex.steps.push({
      kind: 'line', mode: 'append',
      prompt: 'Simplifica. ¿Qué queda?',
      cancelPrev: L(`${nTex(k)}\\cancel{${par(linR(a))}}${par([1, a])}`, `\\cancel{${pTex(linR(a))}}`),
      line: `= ${lim(ex.aTex)} \\slot`, done: `= ${lim(ex.aTex)} ${simp.tex}`, verifyEv: simp.ev,
      options: exprOptions(simp, [[E.p([1, a]), `El ${nTex(k)} no se cancela: sigue multiplicando.`], [E.mul(K, E.pp(linR(a))), `Se cancela ${par(linR(a))}; queda ${par([1, a])}.`]], a),
      hints: [`Puedes cancelar porque x se acerca a ${ex.aTex}, pero no es ${ex.aTex}.`, { mark: 'prev', text: `${par(linR(a))} está arriba y abajo.` }, `El ${nTex(k)} se queda.`, `Queda ${nTex(k)}${par([1, a])}.`],
      success: `Se canceló ${par(linR(a))}.`,
    });
    ex.steps.push({
      kind: 'line', mode: 'append', final: true,
      prompt: `Sustituye x = ${ex.aTex}.`,
      line: `= ${nTex(k)}(${pSubTex([1, a], a)}) = \\slot`, done: `= ${nTex(k)}(${pSubTex([1, a], a)}) = \\ok{${qTex(val)}}`,
      options: valueOptions(val, [[Qs(2 * a), `Falta multiplicar por ${nTex(k)}.`], ['0', 'Ya no hay 0/0.'], [Qs(-2 * k * a), 'Revisa los signos.']]),
      hints: ['Ya no aparece 0/0.', { mark: 'prev', text: 'Sustituye en la última expresión.' }, `Cambia x por ${ex.aTex}.`, `${nTex(k)} por ${nP(2 * a)}.`],
      success: '¡Pedido servido!',
    });
    return ex;
  }
}

/* =========================================================================
   API
   ========================================================================= */
export const GENERATORS = {
  directa: genDirecta,
  factorComun: genFactorComun,
  difCuadrados: genDifCuadrados,
  aspa: genAspa,
  conjugada: genConjugada,
  potencia: genPotencia,
  ruffini: genRuffini,
  infMenosInf: genInfMenosInf,
  combo: genCombo,
};

export const LEVELS = {
  apertura: { name: 'Apertura', short: 'Desde 0', hour: '07:00', pool: { directa: 1 } },
  facil: { name: 'Mañana tranquila', short: 'Fácil', hour: '09:00', pool: { directa: 2, factorComun: 3, difCuadrados: 3 } },
  medio: { name: 'Mediodía', short: 'Medio', hour: '13:00', pool: { aspa: 3, conjugada: 2, potencia: 2, difCuadrados: 1 } },
  alto: { name: 'Hora punta', short: 'Alto', hour: '18:00', pool: { ruffini: 3, infMenosInf: 2, potencia: 1, combo: 2 } },
};

/* nivel por defecto de cada técnica cuando se practica en Estaciones */
export const TECH_LEVEL = {
  directa: 'facil', factorComun: 'facil', difCuadrados: 'medio', aspa: 'medio', conjugada: 'medio', potencia: 'medio', ruffini: 'alto', infMenosInf: 'alto',
};

function weighted(pool) {
  const entries = Object.entries(pool);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) { r -= w; if (r <= 0) return k; }
  return entries[0][0];
}

export function generate(techOrCombo, level) {
  const gen = GENERATORS[techOrCombo];
  for (let i = 0; i < 40; i++) {
    const ex = gen(level);
    if (verify(ex).ok) return ex;
  }
  throw new Error('No se pudo generar un ejercicio válido: ' + techOrCombo);
}

export function generateShift(level, count = 8) {
  const list = [];
  let last = null;
  while (list.length < count) {
    let t = weighted(LEVELS[level].pool);
    if (t === last && Object.keys(LEVELS[level].pool).length > 1 && Math.random() < 0.7) continue;
    last = t;
    list.push(generate(t, level));
  }
  return list;
}

/* =========================================================================
   VERIFICACIÓN — nunca se muestra un pedido que no pase estas pruebas
   ========================================================================= */
export function verify(ex) {
  const errors = [];
  const f = ex.f.ev;
  const close = (u, v) => Number.isFinite(u) && Number.isFinite(v) && Math.abs(u - v) <= 1e-6 * (1 + Math.abs(u) + Math.abs(v));
  // puntos de prueba lejos del punto límite
  const pts = Number.isFinite(ex.a)
    ? [ex.a + 0.371, ex.a - 0.613, ex.a + 1.27, ex.a + 2.19].filter((t) => Number.isFinite(f(t)))
    : [3.7, 11.3, 27.9, 103.1];
  // 1. el valor del límite
  if (Number.isFinite(ex.a)) {
    const h = 1e-6;
    const l = f(ex.a - h); const r = f(ex.a + h);
    if (!Number.isFinite(ex.answer.value)) errors.push('respuesta no finita');
    else if (!(Math.abs(l - ex.answer.value) < 1e-3 && Math.abs(r - ex.answer.value) < 1e-3)) errors.push(`límite numérico ${l} ${r} ≠ ${ex.answer.value}`);
  } else {
    const big = f(1e7);
    if (Number.isFinite(ex.answer.value)) { if (Math.abs(big - ex.answer.value) > 1e-3) errors.push(`límite ∞ ${big} ≠ ${ex.answer.value}`); }
    else if (Math.sign(big) !== Math.sign(ex.answer.value) || Math.abs(big) < 1e4) errors.push('límite infinito incorrecto');
  }
  // 2. cada paso transformado es equivalente a f
  for (const [i, s] of ex.steps.entries()) {
    if (s.verifyEv) {
      for (const t of pts) {
        const u = f(t); const v = s.verifyEv(t);
        if (Number.isFinite(u) && !close(u, v)) { errors.push(`paso ${i} no equivale (${t}: ${u} vs ${v})`); break; }
      }
    }
    const oks = s.options.filter((o) => o.ok);
    if (oks.length !== 1) errors.push(`paso ${i}: ${oks.length} correctas`);
    const texts = s.options.map((o) => o.tex);
    if (new Set(texts).size !== texts.length) errors.push(`paso ${i}: alternativas repetidas`);
    if (s.options.length < 2) errors.push(`paso ${i}: pocas alternativas`);
    for (const o of s.options) {
      if (!o.ok && !o.fb) errors.push(`paso ${i}: distractor sin retroalimentación`);
      if (!o.ok && o.ev && oks[0] && oks[0].ev) {
        const same = pts.filter((t) => Number.isFinite(oks[0].ev(t))).every((t) => close(o.ev(t), oks[0].ev(t)));
        if (same) errors.push(`paso ${i}: distractor equivalente al correcto`);
      }
      if (!o.ok && Number.isFinite(o.val) && oks[0] && Number.isFinite(oks[0].val) && close(o.val, oks[0].val)) errors.push(`paso ${i}: valor distractor igual al correcto`);
    }
    if (!s.hints || s.hints.length !== 4) errors.push(`paso ${i}: deben ser 4 pistas`);
  }
  // 3. indeterminación real 0/0 cuando el paso lo afirma
  const st0 = ex.steps[0];
  if (st0 && st0.tag === 'indet' && ex.numEv0 === undefined) {
    const v = f(ex.a);
    if (Number.isFinite(v)) errors.push('se dice 0/0 pero f(a) es finito');
  }
  return { ok: errors.length === 0, errors };
}
