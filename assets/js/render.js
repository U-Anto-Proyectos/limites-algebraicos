/* =========================================================================
   Render de la notación matemática (sin librerías)
   DSL:  \frac{A}{B}  \sqrt{A}  \lim{a}  \slot  \cancel{A}  \mark{k}{A}
         \ok{A}  \note{texto}  \to  x^{n}
   ========================================================================= */

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function readGroup(src, i) {
  // src[i] debe ser '{'
  if (src[i] !== '{') return [null, i];
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return [src.slice(i + 1, j), j + 1]; }
  }
  return [src.slice(i + 1), src.length];
}

function text(s) {
  // x y f en cursiva; el signo − pegado a un número es unario (sin espacios)
  let out = '';
  const chars = [...s];
  chars.forEach((ch, i) => {
    if (ch === 'x' || ch === 'f') out += `<i>${ch}</i>`;
    else if (ch === ' ') out += ' ';
    else if (ch === '−' && chars[i + 1] && chars[i + 1] !== ' ') out += '<span class="neg">−</span>';
    else if ('=+−·'.includes(ch)) out += `<span class="op">${ch}</span>`;
    else out += esc(ch);
  });
  return out;
}

export function renderMath(src) {
  let out = '';
  let buf = '';
  const flush = () => { if (buf) { out += text(buf); buf = ''; } };
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') {
      const m = /^\\([a-z]+)/.exec(src.slice(i));
      if (!m) { buf += ch; i++; continue; }
      flush();
      const cmd = m[1];
      i += m[0].length;
      if (cmd === 'frac') {
        const [a, j] = readGroup(src, i); const [b, k] = readGroup(src, j); i = k;
        out += `<span class="frac"><span class="num">${renderMath(a)}</span><span class="den">${renderMath(b)}</span></span>`;
      } else if (cmd === 'sqrt') {
        const [a, j] = readGroup(src, i); i = j;
        out += `<span class="sqrt"><svg class="rad" viewBox="0 0 12 24" preserveAspectRatio="none" aria-hidden="true"><path d="M0.5 14.2 L3.2 12.6 L6.4 22.6 L11.6 0.8" /></svg><span class="rc">${renderMath(a)}</span></span>`;
      } else if (cmd === 'lim') {
        const [a, j] = readGroup(src, i); i = j;
        out += `<span class="lim"><span class="lw">lím</span><span class="ls"><i>x</i> → ${text(a)}</span></span>`;
      } else if (cmd === 'slot') {
        out += '<span class="slot" data-slot aria-label="espacio para completar">?</span>';
      } else if (cmd === 'cancel') {
        const [a, j] = readGroup(src, i); i = j;
        out += `<span class="cancel">${renderMath(a)}</span>`;
      } else if (cmd === 'mark') {
        const [k, j] = readGroup(src, i); const [a, l] = readGroup(src, j); i = l;
        out += `<span class="mk" data-mk="${esc(k)}">${renderMath(a)}</span>`;
      } else if (cmd === 'ok') {
        const [a, j] = readGroup(src, i); i = j;
        out += `<span class="okbox">${renderMath(a)}</span>`;
      } else if (cmd === 'note') {
        const [a, j] = readGroup(src, i); i = j;
        out += `<span class="note">${text(a)}</span>`;
      } else if (cmd === 'to') {
        out += '<span class="op arrow">→</span>';
      } else {
        buf += '\\' + cmd;
      }
      continue;
    }
    if (ch === '^') {
      flush();
      let a;
      if (src[i + 1] === '{') { const r = readGroup(src, i + 1); a = r[0]; i = r[1]; }
      else { a = src[i + 1] || ''; i += 2; }
      out += `<sup>${renderMath(a)}</sup>`;
      continue;
    }
    buf += ch;
    i++;
  }
  flush();
  return out;
}

/* texto con fragmentos matemáticos: lo que empieza con \ se dibuja; el resto es texto */
export function renderRich(s) {
  if (!/[\\^]/.test(s)) return esc(s);
  return renderMath(s);
}

/* ---------- lectura en voz (lector de pantalla) ---------- */
export function speak(src) {
  let s = src;
  for (let n = 0; n < 6; n++) {
    s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, ' ($1) entre ($2) ')
      .replace(/\\sqrt\{([^{}]*)\}/g, ' raíz de ($1) ')
      .replace(/\\(cancel|ok|note)\{([^{}]*)\}/g, ' $2 ')
      .replace(/\\mark\{[^{}]*\}\{([^{}]*)\}/g, ' $1 ');
  }
  return s
    .replace(/\\lim\{([^{}]*)\}/g, ' límite cuando x tiende a $1 de ')
    .replace(/\\slot/g, ' espacio por completar ')
    .replace(/\\to/g, ' da ')
    .replace(/\^\{2\}/g, ' al cuadrado').replace(/\^\{3\}/g, ' al cubo').replace(/\^\{(\d)\}/g, ' a la $1')
    .replace(/−/g, ' menos ').replace(/·/g, ' por ').replace(/∞/g, ' infinito ')
    .replace(/[{}\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ---------- tabla de Ruffini ---------- */
export function renderRuffini(coeffs, r) {
  const q = [coeffs[0]];
  const mul = [''];
  for (let i = 1; i < coeffs.length; i++) { mul.push(r * q[i - 1]); q.push(coeffs[i] + r * q[i - 1]); }
  const n = (v) => (v === '' ? '' : v < 0 ? '−' + Math.abs(v) : String(v));
  const cells = (arr, cls = '') => arr.map((v, i) => `<span class="rc-cell ${cls} ${i === arr.length - 1 ? 'last' : ''}">${n(v)}</span>`).join('');
  return `<div class="ruffini" role="img" aria-label="Tabla de Ruffini con r igual a ${r}" style="--cols:${coeffs.length}">
    <span class="rc-r"></span>${cells(coeffs)}
    <span class="rc-r">${n(r)}</span>${cells(mul, 'mul')}
    <span class="rc-r"></span>${cells(q, 'res')}
  </div>`;
}
