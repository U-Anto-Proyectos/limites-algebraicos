import { GENERATORS, verify, generateShift, LEVELS } from '../assets/js/generator.js';
let total = 0, bad = 0; const fails = {};
const N = Number(process.argv[2] || 3000);
for (const [name, gen] of Object.entries(GENERATORS)) {
  for (const level of ['facil', 'medio', 'alto']) {
    for (let i = 0; i < N; i++) {
      let ex;
      try { ex = gen(level); } catch (e) { bad++; (fails[name] ||= []).push('THROW ' + e.message); continue; }
      total++;
      const v = verify(ex);
      if (!v.ok) { bad++; (fails[name] ||= []).push(v.errors.join(' | ') + '  ::  ' + ex.fTex); }
    }
  }
}
for (const lv of Object.keys(LEVELS)) generateShift(lv, 8);
console.log(`ejercicios: ${total}  con fallas: ${bad}`);
for (const [k, v] of Object.entries(fails)) { console.log(`\n== ${k}: ${v.length}`); [...new Set(v)].slice(0, 6).forEach((x) => console.log('  ' + x)); }

// ---- revisión de notación en todo el texto que se muestra ----
const BAD = [/\+ −/, /− −/, /(^|[^0-9])1x/, /\(\)/, /x\^\{1\}/, /NaN|undefined|Infinity|null/, /\+ \+/, /\{\}/];
let notation = 0; const samples = [];
for (const [name, gen] of Object.entries(GENERATORS)) for (const level of ['facil','medio','alto']) for (let i = 0; i < 300; i++) {
  const ex = gen(level);
  const texts = [ex.fTex, ex.answer.tex];
  for (const s of ex.steps) { texts.push(s.line || '', s.done || '', s.cancelPrev || '', s.prompt || ''); for (const o of s.options) texts.push(o.tex, o.fb || ''); for (const h of s.hints) texts.push(typeof h === 'string' ? h : h.text); }
  for (const t of texts) for (const re of BAD) if (re.test(t)) { notation++; if (samples.length < 12) samples.push(`${name}: ${re} → ${t}`); }
}
console.log(`problemas de notación: ${notation}`); samples.forEach((s) => console.log('  ' + s));
