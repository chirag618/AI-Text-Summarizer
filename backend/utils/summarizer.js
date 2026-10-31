'use strict';

/*
 * Core text-processing logic (runs on the server).
 * Extractive summarization using word-frequency scoring,
 * plus keyword extraction, tone rewriting and short-form copy.
 */

const STOP = new Set(
  "a about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its just me more most my no nor not now of off on once only or other our out over own same she should so some such than that the their them then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours one two may many much even still however often".split(" ")
);

const words = (t) => (t.match(/\S+/g) || []).length;
const tokenize = (t) => t.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || [];

function stem(w) {
  if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
  if (w.length > 3 && /s$/.test(w) && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
  return w;
}

/* Step 1: split text into paragraphs and sentences */
function splitSentences(text) {
  const paras = text
    .replace(/\r/g, '')
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
  const out = [];
  let idx = 0;
  paras.forEach((p, pi) => {
    const prot = p
      .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|Fig|No)\./g, '$1\u0000')
      .replace(/\b([A-Za-z])\.(?=[A-Za-z]\.)/g, '$1\u0000')
      .replace(/(\d)\.(\d)/g, '$1\u0000$2');
    const parts = prot.match(/[^.!?]+(?:[.!?]+["”')\]]*|$)/g) || [prot];
    let first = true;
    parts.forEach((t) => {
      t = t.replace(/\u0000/g, '.').trim();
      if (!t) return;
      out.push({ text: t, para: pi, first, idx: idx++ });
      first = false;
    });
  });
  return out;
}

/* Readability (Flesch Reading Ease) */
function syllables(w) {
  w = w.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}
function flesch(text, sentCount) {
  const toks = tokenize(text);
  if (!toks.length || !sentCount) return null;
  let syl = 0;
  toks.forEach((t) => { syl += syllables(t); });
  return 206.835 - 1.015 * (toks.length / sentCount) - 84.6 * (syl / toks.length);
}
function fleschLabel(v) {
  if (v == null) return '';
  if (v >= 70) return 'Easy';
  if (v >= 50) return 'Standard';
  if (v >= 30) return 'Difficult';
  return 'Very difficult';
}

/* Steps 2-4: clean words, weigh them, score every sentence */
function analyze(text) {
  const sents = splitSentences(text);
  const freq = new Map();
  const surface = new Map();
  const pairs = new Map();
  sents.forEach((s) => {
    s.tokens = tokenize(s.text);
    s.content = [];
    let prev = null;
    s.tokens.forEach((t) => {
      const low = t.toLowerCase().replace(/’/g, "'");
      const isContent = !(STOP.has(low) || low.length < 3);
      if (isContent) {
        const st = stem(low);
        s.content.push(st);
        freq.set(st, (freq.get(st) || 0) + 1);
        const m = surface.get(st) || new Map();
        m.set(low, (m.get(low) || 0) + 1);
        surface.set(st, m);
        if (prev) {
          const key = prev + ' ' + low;
          pairs.set(key, (pairs.get(key) || 0) + 1);
        }
        prev = low;
      } else {
        prev = null;
      }
    });
  });
  let max = 1;
  freq.forEach((v) => { if (v > max) max = v; });
  sents.forEach((s) => {
    const n = s.content.length;
    let sum = 0;
    s.content.forEach((st) => { sum += freq.get(st) / max; });
    let score = n ? sum / Math.pow(n, 0.6) : 0;
    if (s.idx === 0) score *= 1.25;
    else if (s.first) score *= 1.1;
    const wc = s.tokens.length;
    if (wc < 6) score *= 0.5;
    else if (wc > 40) score *= 0.8;
    s.score = score;
  });
  return { sents, freq, surface, pairs };
}

/* Step 5: pick the top sentences, keep original order */
function select(a, ratio) {
  const total = a.sents.length;
  const n = Math.max(1, Math.min(total, Math.round(total * ratio)));
  const ranked = a.sents.slice().sort((x, y) => y.score - x.score);
  const set = new Set(ranked.slice(0, n).map((s) => s.idx));
  return { n, set, ranked, list: a.sents.filter((s) => set.has(s.idx)) };
}

function groupByPara(list) {
  const groups = [];
  let cur = null;
  let last = -1;
  list.forEach((s) => {
    if (s.para !== last) { cur = []; groups.push(cur); last = s.para; }
    cur.push(s.text);
  });
  return groups.map((g) => g.join(' '));
}

function topKeywords(a, n) {
  const arr = [];
  a.freq.forEach((count, st) => {
    let best = '';
    let bc = 0;
    a.surface.get(st).forEach((cnt, w) => { if (cnt > bc) { bc = cnt; best = w; } });
    arr.push({ word: best, count });
  });
  arr.sort((x, y) => y.count - x.count || x.word.localeCompare(y.word));
  return arr.slice(0, n);
}

/* ---------- tone rewrite (rule based) ---------- */
function matchCase(src, out) {
  if (!out) return out;
  const c = src.charAt(0);
  if (c && c === c.toUpperCase() && c !== c.toLowerCase()) return out.charAt(0).toUpperCase() + out.slice(1);
  return out;
}
const pairsToRules = (list) => list.map((p) => [new RegExp('\\b' + p[0] + '\\b', 'gi'), p[1]]);

/* changed words are wrapped in \u0001 ... \u0002 so the frontend can highlight them */
function applyRules(text, rules) {
  let n = 0;
  rules.forEach((r) => {
    text = text.replace(r[0], (...a) => {
      n++;
      const out = r[1].replace(/\$(\d)/g, (_, i) => a[+i] || '');
      return '\u0001' + matchCase(a[0], out) + '\u0002';
    });
  });
  return { text, n };
}

const EXPAND = [
  [/\bcan't\b/gi, 'cannot'], [/\bwon't\b/gi, 'will not'], [/\blet's\b/gi, 'let us'],
  [/\b(\w+)n't\b/gi, '$1 not'], [/\bI'm\b/g, 'I am'], [/\b(\w+)'re\b/gi, '$1 are'],
  [/\b(\w+)'ve\b/gi, '$1 have'], [/\b(\w+)'ll\b/gi, '$1 will'],
  [/\b(it|that|there|here|what|who|he|she)'s\b/gi, '$1 is'],
];
const FORMAL_WORDS = pairsToRules([
  ['kids', 'children'], ['a lot of', 'a great deal of'], ['lots of', 'many'],
  ['big', 'large'], ['buy', 'purchase'], ['enough', 'sufficient'],
]);
const CONTRACT = [
  [/\bcannot\b/gi, "can't"], [/\bwill not\b/gi, "won't"],
  [/\b(do|does|did|is|are|was|were|has|have|had|would|could|should) not\b/gi, "$1n't"],
  [/\b(it|that|there) is\b/gi, "$1's"], [/\b(they|we|you) are\b/gi, "$1're"], [/\bI am\b/g, "I'm"],
];
const CASUAL_WORDS = pairsToRules([
  ['utili[sz]e', 'use'], ['approximately', 'about'], ['numerous', 'many'], ['in order to', 'to'],
  ['therefore', 'so'], ['consequently', 'so'], ['additionally', 'also'], ['furthermore', 'also'],
  ['purchase', 'buy'], ['commence', 'start'], ['demonstrate', 'show'],
]);
const SIMPLE_WORDS = pairsToRules([
  ['utili[sz]e', 'use'], ['demonstrate', 'show'], ['approximately', 'about'], ['numerous', 'many'],
  ['sufficient', 'enough'], ['commence', 'start'], ['terminate', 'end'], ['endeavou?r', 'try'],
  ['facilitate', 'help'], ['subsequently', 'later'], ['consequently', 'so'], ['nevertheless', 'still'],
  ['in order to', 'to'], ['due to the fact that', 'because'], ['a majority of', 'most'],
  ['prior to', 'before'], ['in the event that', 'if'], ['with regard to', 'about'],
  ['assist', 'help'], ['obtain', 'get'], ['require', 'need'], ['indicate', 'show'],
  ['purchase', 'buy'], ['additional', 'more'], ['individuals', 'people'], ['attempt', 'try'],
  ['noticeably', 'clearly'],
]);

function rewrite(text, tone) {
  text = text.replace(/’/g, "'");
  if (tone === 'formal') {
    const r1 = applyRules(text, EXPAND);
    const r2 = applyRules(r1.text, FORMAL_WORDS);
    return { text: r2.text, n: r1.n + r2.n };
  }
  if (tone === 'casual') {
    const r1 = applyRules(text, CONTRACT);
    const r2 = applyRules(r1.text, CASUAL_WORDS);
    return { text: r2.text, n: r1.n + r2.n };
  }
  const r = applyRules(text, SIMPLE_WORDS);
  let semi = 0;
  const t = r.text.replace(/;\s+([a-z])/g, (_, c) => { semi++; return '. ' + c.toUpperCase(); });
  return { text: t, n: r.n + semi };
}

function toSegments(markedText) {
  return markedText.split(/\n\s*\n+/).map((par) =>
    par
      .split(/(\u0001[^\u0002]*\u0002)/)
      .filter(Boolean)
      .map((piece) =>
        piece.charAt(0) === '\u0001'
          ? { text: piece.slice(1, -1), changed: true }
          : { text: piece, changed: false }
      )
  );
}

/* ---------- short form ---------- */
function trimTo(text, maxWords) {
  const w = text.replace(/[.!?]+$/, '').split(/\s+/);
  if (w.length <= maxWords) return w.join(' ');
  return w.slice(0, maxWords).join(' ') + '…';
}
function shortForm(a, sel) {
  const best = sel.ranked[0];
  let lead = best.text.replace(/^(however|meanwhile|consequently|additionally|furthermore|therefore|moreover|also|but|and|so)[, ]+/i, '');
  lead = lead.charAt(0).toUpperCase() + lead.slice(1);
  const headline = trimTo(lead, 14);
  const tags = topKeywords(a, 3).map((k) => '#' + k.word.replace(/[^\p{L}\p{N}]/gu, '')).join(' ');
  const room = 280 - (tags ? tags.length + 1 : 0);
  let post = '';
  sel.list.some((s) => {
    const next = post ? post + ' ' + s.text : s.text;
    if (next.length > room) {
      if (!post) post = s.text.slice(0, room - 1).replace(/\s+\S*$/, '') + '…';
      return true;
    }
    post = next;
    return false;
  });
  if (tags) post += ' ' + tags;
  return { headline, tldr: best.text, post, postLength: post.length };
}

/* ---------- main entry used by the API route ---------- */
function summarizeText({ text, ratio = 0.3, tone = 'formal', summaryOnly = false }) {
  text = String(text).trim();
  const a = analyze(text);
  const sel = select(a, ratio);

  const summaryParas = groupByPara(sel.list);
  const summaryText = sel.list.map((s) => s.text).join(' ');

  const keywords = topKeywords(a, 10);
  const phrases = [];
  a.pairs.forEach((count, phrase) => { if (count >= 2) phrases.push({ phrase, count }); });
  phrases.sort((x, y) => y.count - x.count);

  const rw = rewrite(summaryOnly ? summaryParas.join('\n\n') : text, tone);

  const byPara = [];
  a.sents.forEach((s) => { (byPara[s.para] = byPara[s.para] || []).push(s); });
  const highlights = byPara
    .filter(Boolean)
    .map((g) => g.map((s) => ({ text: s.text, kept: sel.set.has(s.idx), score: Number(s.score.toFixed(2)) })));

  const wi = words(text);
  const wo = words(summaryText);
  const f = flesch(text, a.sents.length);

  return {
    stats: {
      wordsIn: wi,
      wordsOut: wo,
      sentencesTotal: a.sents.length,
      sentencesKept: sel.n,
      reducedPct: wi ? Math.max(0, Math.round((1 - wo / wi) * 100)) : 0,
      readMinIn: Math.max(1, Math.round(wi / 220)),
      readMinOut: Math.max(1, Math.round(wo / 220)),
      readability: f == null ? null : Math.round(f),
      readabilityLabel: fleschLabel(f),
    },
    summary: summaryParas,
    bullets: sel.list.map((s) => s.text),
    keywords,
    phrases: phrases.slice(0, 6),
    rewrite: {
      tone,
      changes: rw.n,
      paragraphs: toSegments(rw.text),
      plain: rw.text.replace(/[\u0001\u0002]/g, ''),
    },
    short: shortForm(a, sel),
    highlights,
  };
}

module.exports = { summarizeText };
