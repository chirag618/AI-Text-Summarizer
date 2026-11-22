(function(){
'use strict';

/* Frontend: sends the text to the backend (POST /api/summarize) and shows the results. */
var API_URL = '/api/summarize';

var SAMPLE = [
"Cities are often several degrees warmer than the countryside around them. Scientists call this effect the urban heat island. It happens because roads, roofs and car parks absorb sunlight during the day and release it slowly after sunset. Dark surfaces take in far more energy than grass or soil, so a paved neighbourhood can stay hot long into the night.",
"Buildings make the problem worse in other ways. Tall blocks trap heat between them and slow the wind that would normally carry it away. Air conditioners move heat from indoors to the street, and traffic and industry add even more. Dense districts don't have many trees or open water, which cool the air as they evaporate moisture. In some large cities the night-time difference between the centre and the suburbs reaches approximately five degrees Celsius.",
"The consequences are serious. Hot nights give the body less chance to recover, which raises the risk of illness among older people and children. Power demand for cooling climbs, and that can't be ignored, because it strains the electricity grid during a heatwave. Planners can utilize several tools to respond. Light-coloured roofs reflect sunlight, new parks and street trees provide shade, and green roofs absorb heat. Consequently, cities that combine these measures can lower local temperatures noticeably within a few years."
].join("\n\n");

var TAB_LABEL = { summary:'Summary', bullets:'Key points', keywords:'Keywords', rewrite:'Rewrite tone', short:'Short form', highlights:'Highlights' };

function $(id){ return document.getElementById(id); }
function el(tag, cls, txt){ var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
function words(t){ return (t.match(/\S+/g) || []).length; }

var state = { tab:'summary', data:null, copy:'', reqId:0 };
var out = $('out'), ta = $('src');

/* ---------- rendering (data comes from the backend) ---------- */
function clearStats(){
  ['s-in','s-out','s-sent','s-cut','s-time','s-read'].forEach(function(id){ $(id).textContent = '–'; });
}
function renderEmpty(){
  out.replaceChildren(el('p','empty','Nothing to summarize yet. Paste text on the left, upload a .txt file, or load the sample.'));
  $('outMeta').textContent = '';
  state.copy = '';
  clearStats();
}
function renderError(msg){
  state.data = null;
  state.reqId++;

  out.replaceChildren(el('p','empty', msg));
  $('outMeta').textContent = '';
  state.copy = '';
  clearStats();
}

function renderSummary(d){
  d.summary.forEach(function(g){ out.appendChild(el('p', null, g)); });
  state.copy = d.summary.join('\n\n');
  $('outMeta').textContent = d.stats.sentencesKept + ' of ' + d.stats.sentencesTotal + ' sentences kept';
}
function renderBullets(d){
  var ul = el('ul','pts');
  d.bullets.forEach(function(b){ ul.appendChild(el('li', null, b)); });
  out.appendChild(ul);
  state.copy = d.bullets.map(function(b){ return '- ' + b; }).join('\n');
  $('outMeta').textContent = d.bullets.length + ' key points';
}
function renderKeywords(d){
  var kws = d.keywords;
  if (!kws.length){ out.appendChild(el('p','empty','Not enough text to find keywords.')); state.copy = ''; return; }
  var wrap = el('div','kw'), top = kws[0].count;
  kws.forEach(function(k){
    var row = el('div','kw-row');
    row.appendChild(el('span', null, k.word));
    var bar = el('div','kw-bar'), fill = el('span');
    fill.style.width = Math.round(k.count / top * 100) + '%';
    bar.appendChild(fill); row.appendChild(bar);
    row.appendChild(el('span','kw-n', String(k.count)));
    wrap.appendChild(row);
  });
  out.appendChild(wrap);
  var lines = kws.map(function(k){ return k.word + ' (' + k.count + ')'; });
  if (d.phrases.length){
    out.appendChild(el('div','sub','Repeated phrases'));
    var chips = el('div','chips');
    d.phrases.forEach(function(p){ chips.appendChild(el('span','chip', p.phrase + ' ×' + p.count)); });
    out.appendChild(chips);
    lines.push('', 'Phrases: ' + d.phrases.map(function(p){ return p.phrase; }).join(', '));
  }
  state.copy = lines.join('\n');
  $('outMeta').textContent = 'Ranked by how often each word appears';
}
function renderRewrite(d){
  d.rewrite.paragraphs.forEach(function(par){
    var p = el('p');
    par.forEach(function(seg){
      if (seg.changed) p.appendChild(el('mark', null, seg.text));
      else p.appendChild(document.createTextNode(seg.text));
    });
    out.appendChild(p);
  });
  state.copy = d.rewrite.plain;
  var n = d.rewrite.changes;
  $('outMeta').textContent = n + (n === 1 ? ' change' : ' changes') + ' (highlighted)';
}
function renderShort(d){
  var s = d.short;
  var blocks = [['Headline', s.headline], ['TL;DR', s.tldr], ['Post · ' + s.postLength + ' of 280 characters', s.post]];
  blocks.forEach(function(b){
    var div = el('div','block');
    div.appendChild(el('div','sub', b[0]));
    div.appendChild(el('p', null, b[1]));
    out.appendChild(div);
  });
  state.copy = blocks.map(function(b){ return b[0] + '\n' + b[1]; }).join('\n\n');
  $('outMeta').textContent = 'Built from the top-scoring sentences';
}
function renderHighlights(d){
  out.appendChild(el('p','note','Highlighted sentences are the ones kept in the summary. Hover a sentence to see its score.'));
  d.highlights.forEach(function(group){
    var p = el('p');
    group.forEach(function(s, i){
      if (s.kept){
        var m = el('mark', null, s.text); m.title = 'Score ' + s.score.toFixed(2);
        p.appendChild(m);
      } else {
        p.appendChild(document.createTextNode(s.text));
      }
      if (i < group.length - 1) p.appendChild(document.createTextNode(' '));
    });
    out.appendChild(p);
  });
  state.copy = ta.value.trim();
  $('outMeta').textContent = d.stats.sentencesKept + ' of ' + d.stats.sentencesTotal + ' sentences highlighted';
}
function renderStats(d){
  var s = d.stats;
  $('s-in').textContent = s.wordsIn.toLocaleString();
  $('s-out').textContent = s.wordsOut.toLocaleString();
  $('s-sent').textContent = s.sentencesKept + ' of ' + s.sentencesTotal;
  $('s-cut').textContent = s.reducedPct + '%';
  $('s-time').textContent = s.readMinIn + ' → ' + s.readMinOut + ' min';
  var dd = $('s-read'); dd.textContent = '';
  if (s.readability == null){ dd.textContent = '–'; }
  else { dd.appendChild(document.createTextNode(s.readability + ' ')); dd.appendChild(el('small', null, s.readabilityLabel)); }
}

function render(){
  var d = state.data;
  if (!d) return;
  out.replaceChildren();
  ({ summary:renderSummary, bullets:renderBullets, keywords:renderKeywords, rewrite:renderRewrite, short:renderShort, highlights:renderHighlights }[state.tab])(d);
  renderStats(d);
}

/* ---------- talking to the backend ---------- */
function currentTone(){ var r = document.querySelector('input[name="tone"]:checked'); return r ? r.value : 'formal'; }

function request(){
  var text = ta.value.trim();
  var pct = +$('ratio').value;
  $('ratioOut').textContent = pct + '%';
  var w = words(ta.value);
  if (!text){
    state.data = null; state.reqId++;
    $('counter').textContent = '0 words · 0 sentences';
    renderEmpty();
    return;
  }
  $('counter').textContent = w.toLocaleString() + ' words';
  var id = ++state.reqId;
  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text, ratio: pct / 100, tone: currentTone(), summaryOnly: $('sumOnly').checked })
  }).then(function(res){
    return res.json().then(function(j){ return { ok: res.ok, j: j }; });
  }).then(function(res){
    if (id !== state.reqId) return;
    if (!res.ok){ state.data = null; renderError(res.j.error || 'Server error.'); return; }
    state.data = res.j;
    $('counter').textContent = w.toLocaleString() + ' words · ' + res.j.stats.sentencesTotal + ' sentences';
    $('ratioOut').textContent = pct + '% · ' + res.j.stats.sentencesKept + ' of ' + res.j.stats.sentencesTotal + ' sentences';
    render();
  }).catch(function(){
    if (id !== state.reqId) return;
    state.data = null;
    renderError('Cannot reach the backend. Start it with "npm start" and open http://localhost:3000 in your browser.');
  });
}

/* ---------- wiring ---------- */
function setTab(name, focus){
  state.tab = name;
  document.querySelectorAll('.tab').forEach(function(t){
    var on = t.dataset.tab === name;
    t.setAttribute('aria-selected', on ? 'true' : 'false');
    t.tabIndex = on ? 0 : -1;
    if (on && focus) t.focus();
  });
  $('rewriteOpts').hidden = name !== 'rewrite';
  out.setAttribute('aria-labelledby', 'tab-' + name);
  if (state.data) render();
}
document.querySelector('.tabs').addEventListener('click', function(e){
  var t = e.target.closest('.tab'); if (t) setTab(t.dataset.tab, false);
});
document.querySelector('.tabs').addEventListener('keydown', function(e){
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  var names = Object.keys(TAB_LABEL), i = names.indexOf(state.tab);
  i = (i + (e.key === 'ArrowRight' ? 1 : names.length - 1)) % names.length;
  setTab(names[i], true); e.preventDefault();
});

var timer = null;
function later(){ clearTimeout(timer); timer = setTimeout(request, 200); }
ta.addEventListener('input', later);
$('ratio').addEventListener('input', later);
document.querySelectorAll('input[name="tone"]').forEach(function(r){ r.addEventListener('change', request); });
$('sumOnly').addEventListener('change', request);

$('btnSample').addEventListener('click', function(){ ta.value = SAMPLE; request(); });
$('btnClear').addEventListener('click', function(){ ta.value = ''; request(); ta.focus(); });
$('btnUpload').addEventListener('click', function(){ $('file').click(); });
$('file').addEventListener('change', function(e){
  var f = e.target.files && e.target.files[0]; if (!f) return;
  if (f.size > 1024 * 1024){ renderError('That file is larger than 1 MB. Try a shorter text file.'); return; }
  var rd = new FileReader();
  rd.onload = function(){ ta.value = String(rd.result || ''); request(); };
  rd.readAsText(f);
  e.target.value = '';
});

var copyTimer = null;
$('btnCopy').addEventListener('click', function(){
  var btn = this;
  function done(msg){ btn.textContent = msg; clearTimeout(copyTimer); copyTimer = setTimeout(function(){ btn.textContent = 'Copy'; }, 1600); }
  if (!state.copy){ done('Nothing to copy'); return; }
  var p;
  try { p = navigator.clipboard.writeText(state.copy); } catch (err) { p = Promise.reject(err); }
  p.then(function(){ done('Copied'); }, function(){
    var sel = window.getSelection(), range = document.createRange();
    range.selectNodeContents(out); sel.removeAllRanges(); sel.addRange(range);
    done('Selected, press Ctrl+C');
  });
});

ta.value = SAMPLE;
request();
})();
