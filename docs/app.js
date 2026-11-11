/* 슬룸 교환·반품 리포트 — JSON 렌더러 (2026-11 · 프레임·시트형)
   모든 달의 JSON 을 같은 코드로 그린다. 과거 달에 없는 필드는 그 카드만 건너뛴다. */
var D = null, dayNames = ['월','화','수','목','금','토','일'];
var SER = ['var(--s1)','var(--s2)','var(--s3)','var(--s4)','var(--s5)'];
var RC  = ['var(--accent)','var(--flat)','var(--flat-2)'];
var NS  = 'http://www.w3.org/2000/svg';

function n(v){ return Number(v).toLocaleString('ko-KR'); }
/* 본문에 섞인 그림문자는 쓰지 않는다 (과거 달 JSON 포함) */
function T(s){
  return String(s == null ? '' : s)
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/<span style="font-size:11\.5px;color:var\(--muted\)">/g, '<span class="fine">')
    .replace(/\s{2,}/g, ' ')
    /* 문장이 끝나면 줄을 바꾼다 — "~입니다. 다음 문장"이 한 줄로 이어지면 읽기 어렵다 (소수점 '5.25'는 공백이 없어 제외) */
    .replace(/([다요음함]\.|\)\.|%\.|건\.|원\.)\s+(?!<br)(?=\S)/g, '$1<br>');
}
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function pctRound(values, total){
  if (!total) return values.map(function(){ return 0; });
  var raw = values.map(function(v){ return v / total * 100; });
  var out = raw.map(function(v){ return Math.floor(v); });
  var rest = 100 - out.reduce(function(a, b){ return a + b; }, 0);
  var order = raw.map(function(v, i){ return { i: i, frac: v - Math.floor(v) }; }).sort(function(a, b){ return b.frac - a.frac; });
  for (var k = 0; k < rest && k < order.length; k++) out[order[k].i]++;
  return out;
}

/* ---------- 조각 ---------- */
function card(title, desc, body, cls, aria){
  return '<section class="card'+(cls ? ' '+cls : '')+'"'+(aria ? ' aria-label="'+esc(aria)+'"' : '')+'>'
    + (title ? '<div class="ch"><div class="t">'+T(title)+'</div>'+(desc ? '<div class="d">'+T(desc)+'</div>' : '')+'</div>' : '')
    + body + '</section>';
}
function kpiCell(k){
  return '<div><div class="l">'+T(k.label)+(k.note ? ' <span class="fine">'+T(k.note)+'</span>' : '')+'</div>'
    + '<div class="v num">'+k.value+'<small>'+(k.unit || '')+'</small>'
    + (k.badge ? '<span class="chip '+(k.badge.type || '')+'">'+T(k.badge.text)+'</span>' : '')+'</div>'
    + (k.sub ? '<div class="s num">'+T(k.sub)+'</div>' : '')+'</div>';
}
function statRow(items, cols){
  return '<div class="stat" style="grid-template-columns:repeat('+(cols || items.length)+',1fr)">'
    + items.map(function(k){
        return '<div><div class="k">'+T(k.label)+'</div><div class="v num'+(k.hl ? ' hl' : '')+'">'+k.value+'<small>'+(k.unit || '')+'</small>'
          + (k.badge ? '<span class="chip '+(k.badge.type || '')+'">'+T(k.badge.text)+'</span>' : '')+'</div>'
          + (k.sub ? '<div class="k sub">'+T(k.sub)+'</div>' : '')+'</div>';
      }).join('') + '</div>';
}
function quote(q){
  return '<div class="quote"><span class="dt">'+esc(q[0])+'</span><span>'+esc(q[1])+(q[2] ? '<span class="cls">'+esc(q[2])+'</span>' : '')+'</span></div>';
}
function miniTable(head, rows){
  return '<table class="t num"><tr>'+head.map(function(h, i){ return '<th'+(i ? ' class="n"' : '')+'>'+h+'</th>'; }).join('')+'</tr>'
    + rows.map(function(r){ return '<tr>'+r.map(function(c, i){ return '<td class="'+(i ? 'n' : 'name')+'">'+c+'</td>'; }).join('')+'</tr>'; }).join('')
    + '</table>';
}
function trackRow(label, w, on){
  return '<td class="name">'+esc(label)+'<div class="mini"><i'+(on ? ' class="on"' : '')+' style="width:'+w.toFixed(1)+'%"></i></div></td>';
}

/* ---------- 차트 (SVG) ---------- */
function ticks(max, count){
  var step = Math.pow(10, Math.floor(Math.log10(max || 1)));
  var cand = [1, 2, 2.5, 5, 10].map(function(x){ return x * step; });
  var s = cand.filter(function(x){ return max / x <= count; })[0] || step * 10;
  var out = []; for (var v = 0; v <= max + 1e-9; v += s) out.push(+v.toFixed(6));
  if (out[out.length - 1] < max) out.push(+(out[out.length - 1] + s).toFixed(6));
  return out;
}
function svgEl(tag, attrs, parent){
  var e = document.createElementNS(NS, tag);
  for (var k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function drawBars(el, labels, values, opt){
  opt = opt || {}; el.innerHTML = '';
  var W = el.clientWidth || 500, H = opt.height || 150, padL = 44, padB = 24, padT = 8;
  var yt = ticks(Math.max.apply(null, values), 4), max = yt[yt.length - 1];
  var s = svgEl('svg', { viewBox: '0 0 '+W+' '+H, width: '100%', height: H, role: 'img' }, el);
  yt.forEach(function(v){
    var y = padT + (1 - v / max) * (H - padT - padB);
    svgEl('line', { x1: padL, x2: W - 4, y1: y, y2: y, stroke: 'var(--grid)' }, s);
    var t = svgEl('text', { x: padL - 6, y: y + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--faint)' }, s);
    t.textContent = (opt.fmt || n)(v);
  });
  var slot = (W - padL - 8) / values.length, bw = Math.min(slot * 0.56, 76);
  values.forEach(function(v, i){
    var x = padL + 4 + slot * i + (slot - bw) / 2, h = v / max * (H - padT - padB);
    var lit = opt.highlight == null ? true : (Array.isArray(opt.highlight) ? opt.highlight.indexOf(i) >= 0 : opt.highlight === i);
    svgEl('rect', { x: x, y: padT + (H - padT - padB) - h, width: bw, height: Math.max(h, v ? 1 : 0), fill: lit ? 'var(--accent)' : 'var(--flat-2)' }, s);
    var t = svgEl('text', { x: x + bw / 2, y: H - 7, 'text-anchor': 'middle', 'font-size': 11.5, fill: 'var(--muted)' }, s);
    t.textContent = labels[i];
  });
}
function drawLine(el, labels, values, opt){
  opt = opt || {}; el.innerHTML = '';
  var W = el.clientWidth || 500, H = opt.height || 150, padL = 46, padB = 24, padT = 14, padR = 10;
  var yt = ticks(Math.max.apply(null, values), 4), max = yt[yt.length - 1];
  var s = svgEl('svg', { viewBox: '0 0 '+W+' '+H, width: '100%', height: H, role: 'img' }, el);
  yt.forEach(function(v){
    var y = padT + (1 - v / max) * (H - padT - padB);
    svgEl('line', { x1: padL, x2: W - padR, y1: y, y2: y, stroke: 'var(--grid)' }, s);
    var t = svgEl('text', { x: padL - 6, y: y + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--faint)' }, s);
    t.textContent = (opt.fmt || n)(v);
  });
  var nPts = values.length;
  function X(i){ return nPts === 1 ? (padL + W - padR) / 2 : padL + i / (nPts - 1) * (W - padL - padR); }
  function Y(v){ return padT + (1 - v / max) * (H - padT - padB); }
  var pts = values.map(function(v, i){ return X(i) + ',' + Y(v); });
  if (opt.fill) svgEl('polygon', { points: padL+','+Y(0)+' '+pts.join(' ')+' '+X(nPts - 1)+','+Y(0), fill: 'var(--accent)', opacity: .1 }, s);
  svgEl('polyline', { points: pts.join(' '), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-linejoin': 'round' }, s);
  var every = opt.every || Math.max(1, Math.ceil(nPts / 8));
  values.forEach(function(v, i){
    if (i === nPts - 1 || !opt.fill) svgEl('circle', { cx: X(i), cy: Y(v), r: 3, fill: 'var(--accent)' }, s);
    if (i % every === 0 || i === nPts - 1){
      var t = svgEl('text', { x: X(i), y: H - 7, 'text-anchor': i === nPts - 1 ? 'end' : (i === 0 ? 'start' : 'middle'), 'font-size': 11.5, fill: 'var(--muted)' }, s);
      t.textContent = labels[i];
    }
  });
  if (opt.annot){
    var a = svgEl('text', { x: X(nPts - 1), y: Math.max(10, Y(values[nPts - 1]) - 9), 'text-anchor': 'end', 'font-size': 11, fill: 'var(--muted)' }, s);
    a.textContent = opt.annot;
  }
}

/* ---------- 본문 ---------- */
function render(d){
  D = d;
  var ml = d.monthLabel, shortMonth = ml.replace(/^\d+년\s*/, '');
  document.title = '슬룸 ' + ml + ' 교환·반품 리포트';
  document.getElementById('crumbM').textContent = ml;
  var H = '';

  /* 머리 */
  var lead = d.lead || (d.insights && d.insights[0] ? d.insights[0].title : '');
  H += '<div class="title"><div><h1>자사몰 교환·반품 리포트</h1>'
     + (lead ? '<p class="find">'+T(lead)+'</p>' : '') + '</div>'
     + '<div class="stamp">'+T(d.stamp || ('슬룸 · '+d.channel))+'</div></div>';

  /* 핵심 요약 */
  var K = [d.kpi.curRate, d.kpi.prevRate, d.kpi.count, d.kpi.defectShare].filter(Boolean);
  H += '<div id="summary" class="anchor"></div>'
     + '<section class="card kpi" aria-label="핵심 지표">'+K.map(kpiCell).join('')+'</section>'
     + (d.basisNote ? '<div class="basis">'+T(d.basisNote)+'</div>' : '')
     + (d.insights && d.insights.length ? '<div class="r3">'+d.insights.map(function(i, k){
         return '<section class="card"><div class="find-card"><div class="tagline">발견 '+(k + 1)+'</div>'
           + '<div class="h">'+T(i.title)+'</div><div class="b">'+T(i.body)+'</div></div></section>';
       }).join('')+'</div>' : '');

  /* 규모 — 증감 · 추이 */
  H += '<div id="scale" class="anchor"></div>';
  var rowA = [];
  if (d.reasonDelta) rowA.push(card((d.reasonDelta.prevLabel || '전월')+' 대비 무엇이 늘었나', '사유 대분류 · 건수 증감', '<div class="delta" id="delta"></div><table class="t num" id="deltaTable" style="margin-top:0"></table>'+(d.reasonDelta.note ? '<p class="note" style="margin-top:12px">'+T(d.reasonDelta.note)+'</p>' : ''), '', '전월 대비 사유별 증감'));
  if (d.trend && d.trend.months && d.trend.months.length) rowA.push(card(d.trend.title || '최근 추이', d.trend.desc || '그 달에 출고된 주문 기준 · 출고 대비', '<div id="trendLine" class="chart"></div><table class="t num" id="trendTable"></table>', '', '월별 추이'));
  if (rowA.length) H += '<div class="r2">'+rowA.join('')+'</div>';

  var s2 = d.section2;
  var typeTable = miniTable(['유형', '건수', '비중'], s2.bars.map(function(b){
      return [T(b.l), n(b.v), '<span class="faint">'+(b.v / s2.bars.reduce(function(a, x){ return a + x.v; }, 0) * 100).toFixed(1)+'%</span>'];
    }).concat([['<b>'+T(s2.total.k)+'</b>', '<b>'+n(s2.bars.reduce(function(a, x){ return a + x.v; }, 0))+'</b>', '<span class="faint">100.0%</span>']]));
  var cmax = Math.max.apply(null, d.skuComp.map(function(x){ return x.v; })), ctot = d.skuComp.reduce(function(a, x){ return a + x.v; }, 0);
  var compPct = pctRound(d.skuComp.map(function(x){ return x.v; }), ctot);
  var compTable = '<table class="t num"><tr><th>제품</th><th class="n">건수</th><th class="n">비중</th></tr>'
    + d.skuComp.map(function(x, i){ return '<tr>'+trackRow(x.n, x.v / cmax * 100, i === 0)+'<td class="n top">'+n(x.v)+'</td><td class="n top faint">'+compPct[i]+'%</td></tr>'; }).join('')+'</table>';
  H += '<div class="r2">'
     + card(s2.panelTitle || '유형별 건수', s2.panelDesc, '<div id="typeBars" class="chart"></div>'+typeTable, '', '유형별 건수')
     + card('제품별 접수 구성', n(ctot)+'건', compTable + (d.skuCompDesc ? '<p class="note">'+T(d.skuCompDesc)+'</p>' : ''), '', '제품별 접수 구성')
     + '</div>';

  /* 사유 · 제품 */
  H += '<div id="reasons" class="anchor"></div>';
  var rq = d.reasons.reduce(function(a, r){ return a + (r.quotes || []).length; }, 0);
  H += card('왜 반품했나 — 사유별 고객의 말', n(d.kpi.count.value)+'건 · 원문 '+rq+'건',
      '<div class="stackb">'+d.reasons.map(function(r, i){ return '<i style="width:'+(r.barPct != null ? r.barPct : r.pct)+'%;background:'+RC[i]+'"></i>'; }).join('')+'</div>'
      + '<div class="rsn-grid">'+d.reasons.map(function(r, i){
          return '<div class="rsn"><div class="lab"><span>'+T(r.label)+'</span><span class="pct num">'+r.pct+'%</span></div>'
            + '<div class="bar"><i style="width:'+(r.barPct != null ? r.barPct : r.pct)+'%;background:'+RC[i]+'"></i></div>'
            + '<div class="qwrap tight">'+(r.quotes || []).map(quote).join('')+'</div></div>';
        }).join('')+'</div>', '', '사유 구성');

  var rmax = Math.max.apply(null, d.skuRate.map(function(x){ return x.r; })) * 1.15;
  var rateTable = '<table class="t num"><tr><th>제품</th><th class="n">접수</th><th class="n">출고</th><th class="n">비율</th></tr>'
    + d.skuRate.map(function(x, i){ return '<tr>'+trackRow(x.n, x.r / rmax * 100, i === 0)+'<td class="n top">'+n(x.c)+'</td><td class="n top faint">'+n(x.s)+'</td><td class="n top">'+Number(x.r).toFixed(2)+'%</td></tr>'; }).join('')+'</table>';
  var topSku = d.skuComp[0] && d.skuDetail[d.skuComp[0].n] ? d.skuComp[0].n : Object.keys(d.skuDetail)[0];
  var defs = topSku && d.skuDetail[topSku] ? (d.skuDetail[topSku].defects || []) : [];
  var dtot = defs.reduce(function(a, x){ return a + x[1]; }, 0), dmax = Math.max.apply(null, defs.map(function(x){ return x[1]; }).concat([1]));
  var defTable = defs.length ? '<table class="t num"><tr><th>항목</th><th class="n">건수</th><th class="n">비중</th></tr>'
    + defs.map(function(x){ return '<tr>'+trackRow(x[0], x[1] / dmax * 100, false)+'<td class="n top">'+n(x[1])+'</td><td class="n top faint">'+(x[1] / dtot * 100).toFixed(1)+'%</td></tr>'; }).join('')+'</table>'
    : '<p class="note" style="margin-top:14px">세부 항목이 기재된 건이 없습니다.</p>';
  H += '<div class="r2">'
     + card('제품별 출고 대비 반품 비율', '출고 100개 이상인 제품', rateTable + '<p class="note">출고가 적은 제품은 한 건만 늘어도 비율이 크게 움직입니다.</p>', '', '제품별 반품 비율')
     + card('제품 문제 세부 항목', topSku ? esc(topSku)+' · 상위 '+defs.length+'종' : '', defTable, '', '제품 문제 세부 항목')
     + '</div>';

  if (d.crossRows && d.crossRows.length){
    H += card('제품별 사유 구성 비교', '같은 반품이라도 제품마다 사유가 다릅니다',
      '<div class="xleg">'+d.crossCats.map(function(c, i){ return '<span><i style="background:'+SER[i]+'"></i>'+T(c.n)+'</span>'; }).join('')+'</div>'
      + '<div class="xrows">'+d.crossRows.map(function(row){
          var tot = row.v.reduce(function(a, b){ return a + b; }, 0), pp = pctRound(row.v, tot);
          return '<div class="xr"><span class="nm">'+esc(row.n)+'</span><span class="xb">'
            + row.v.map(function(v, i){ return v ? '<i style="width:'+(v / tot * 100).toFixed(2)+'%;background:'+SER[i]+'" title="'+esc(d.crossCats[i].n)+' '+v+'건 ('+pp[i]+'%)">'+(pp[i] >= 8 ? pp[i]+'%' : '')+'</i>' : ''; }).join('')
            + '</span><span class="num tot">'+n(tot)+'건</span></div>';
        }).join('')+'</div>'
      + (d.skuCallout ? '<p class="note" style="margin-top:14px">'+T(d.skuCallout)+'</p>' : ''), '', '제품별 사유 구성 비교');
  }

  var names = Object.keys(d.skuDetail || {});
  if (names.length){
    H += '<div class="r3">'+names.map(function(name){
      var x = d.skuDetail[name];
      return '<section class="card"><div class="pd"><div class="nm">'+esc(name)+'</div>'
        + '<div class="tp">가장 많은 사유 · '+esc(x.top)+' '+n(x.topCnt)+'건 ('+x.topPct+'%)</div>'
        + '<dl>'+x.reasons.map(function(r){ return '<dt>'+esc(r[0])+'</dt><dd>'+n(r[1])+'</dd>'; }).join('')+'</dl>'
        + ((x.defects || []).length ? '<div class="sub">제품 문제 세부</div><dl>'+x.defects.slice(0, 4).map(function(r){ return '<dt>'+esc(r[0])+'</dt><dd>'+n(r[1])+'</dd>'; }).join('')+'</dl>' : '')
        + ((x.quotes || []).length ? '<div class="sub">고객의 말</div>'+x.quotes.map(function(q){ return '<div class="qq"><span class="src">'+esc(q[0])+'</span>'+esc(q[1])+'</div>'; }).join('') : '')
        + '</div></section>';
    }).join('')+'</div>';
  }

  /* 30일 무료체험 신청 */
  var ev = d.event;
  H += '<div id="event" class="anchor"></div>';
  var half = Math.ceil(ev.daily.length / 2), emax = Math.max.apply(null, ev.daily.map(function(x){ return x[2]; }));
  function dayTable(rows, last){
    return '<table class="dayt num"><tr><th>날짜</th><th>요일</th><th>추이</th><th>건수</th></tr>'
      + rows.map(function(x){ return '<tr><td>'+esc(x[0])+'</td><td class="faint">'+(x[1] != null ? dayNames[x[1]] : '')+'</td><td><i class="bar" style="width:'+Math.max(2, Math.round(x[2] / emax * 48))+'px"></i></td><td>'+n(x[2])+'</td></tr>'; }).join('')
      + (last ? '<tr><td><b>누계</b></td><td></td><td></td><td><b>'+n(ev.daily.reduce(function(a, x){ return a + x[2]; }, 0))+'</b></td></tr>' : '<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>')+'</table>';
  }
  H += '<div class="r2">'
     + card(ev.chartTitle || shortMonth+' 신청 일별 건수', ev.chartDesc, statRow(ev.kpi || [], Math.min(3, (ev.kpi || []).length || 1)) + '<div id="evLine" class="chart"></div>' + (ev.note ? '<p class="note">'+T(ev.note)+'</p>' : ''), '', '일별 신청 추이')
     + card('일별 신청', ev.tableTag, '<div class="daywrap">'+dayTable(ev.daily.slice(0, half), false)+dayTable(ev.daily.slice(half), true)+'</div>', '', '일별 신청 표')
     + '</div>';

  /* 반품 불가 안내 결과 */
  var rj = d.reject, ks = d.keySku;
  H += '<div id="reject" class="anchor"></div>';
  var convPct = Number(rj.convPct) || 0;
  var rejBody = statRow(rj.kpi || [], Math.min(3, (rj.kpi || []).length || 1))
    + '<div class="track"><i style="width:'+convPct.toFixed(1)+'%"></i></div>'
    + '<div class="ends"><span class="num">'+T(rj.conv.label)+' '+rj.conv.n+' ('+T(rj.conv.r).replace(/^[^\d]*/, '')+')</span><span class="num">'+T(rj.defend.label)+' '+rj.defend.n+' ('+T(rj.defend.r).replace(/^[^\d]*/, '')+')</span></div>'
    + (rj.base ? '<p class="note" style="margin-top:14px">'+T(rj.base)+'</p>' : '')
    + (rj.note ? '<p class="note">'+T(rj.note)+'</p>' : '');
  var ksBody = (ks.items || []).map(function(it){
    var def = it.rej - it.conv, defR = it.rej ? def / it.rej * 100 : 0, convR = it.rej ? it.conv / it.rej * 100 : 0;
    return '<div class="ksi"><div class="two"><div><div class="k">'+esc(it.n)+'</div><div class="v num" style="font-size:24px">'+defR.toFixed(1)+'<small>% 그대로 사용</small></div></div>'
      + '<div class="right"><div class="k">안내 / 다시 신청</div><div class="v num" style="font-size:19px">'+it.rej+' / '+it.conv+'</div></div></div>'
      + '<div class="track"><i style="width:'+convR.toFixed(1)+'%"></i></div>'
      + (it.note ? '<p class="note" style="margin-top:12px">'+T(it.note)+'</p>' : '')+'</div>';
  }).join('');
  H += '<div class="r2">'
     + card(rj.panelTitle || rj.title, rj.panelDesc, rejBody, '', '반품 불가 안내 결과')
     + card(ks.title, ks.desc || (ks.cohortLabel ? ks.cohortLabel+' 주문' : ''), ksBody + (ks.note ? '<p class="note" style="margin-top:14px">'+T(ks.note)+'</p>' : ''), '', '주요 제품')
     + '</div>';

  /* CX 코멘트 */
  var cx = d.cxComment, cr = cx.critical;
  H += '<div id="cx" class="anchor"></div>';
  if (cr){
    H += card(cr.title, '<span class="badge num">'+(cr.kpi && cr.kpi[0] ? cr.kpi[0].value+'건 중 ' : '')+cr.value+'건</span>',
      (cr.desc ? '<p class="note" style="margin-top:12px;margin-bottom:0">'+T(cr.desc)+'</p>' : '')
      + (cr.body ? '<div class="body" style="padding-bottom:0">'+T(cr.body)+'</div>' : '')
      + ((cr.kpi || []).length ? statRow(cr.kpi.map(function(k, i){ return Object.assign({}, k, { hl: i > 0 }); }), Math.min(3, cr.kpi.length)) : '')
      + ((cr.quotes || []).length ? '<div class="qwrap" style="border-top:1px solid var(--rule);padding-top:8px">'+cr.quotes.map(function(q){
          var p = String(q[0]).split(' · '); return quote([p[0], q[1], p[1] || '']); }).join('')+'</div>' : ''),
      'crit', '강한 불만 상담');
  }
  var cxCard = card(cx.title, shortMonth+' · 자사몰',
      ((cx.kpi || []).length ? statRow(cx.kpi, Math.min(2, cx.kpi.length)) : '') + '<div class="body">'+T(cx.body)+'</div>', '', 'CX팀 코멘트');
  if (cx.safety && cx.safety.quotes && cx.safety.quotes.length){
    H += '<div class="r21">'+cxCard+card('안전 관련 접수', cx.safety.count+'건 · 원문', '<div class="qwrap">'+cx.safety.quotes.map(quote).join('')+'</div>', '', '안전 관련 접수')+'</div>';
  } else H += '<div class="r1">'+cxCard+'</div>';

  document.getElementById('content').innerHTML = H;
  drawAll(d);
  initNav();
}

function drawAll(d){
  var s2 = d.section2;
  var tb = document.getElementById('typeBars');
  if (tb) drawBars(tb, s2.bars.map(function(b){ return T(b.l); }), s2.bars.map(function(b){ return b.v; }), { highlight: [0], fmt: function(v){ return n(v)+'건'; } });

  if (d.reasonDelta){
    var rows = d.reasonDelta.rows.map(function(r){ return { label: r[0], was: r[1], now: r[2], d: r[2] - r[1] }; });
    var span = Math.max.apply(null, rows.map(function(r){ return Math.abs(r.d); })) || 1;
    var axisMax = Math.ceil(span / 10) * 10;
    document.getElementById('delta').innerHTML = rows.map(function(r){
      var w = Math.abs(r.d) / axisMax * 48, up = r.d > 0;
      return '<div class="drow"><div class="lb">'+esc(r.label)+'</div><div class="dtrack"><span class="zero"></span>'
        + '<i style="'+(up ? 'left:50%' : 'right:50%')+';width:'+w.toFixed(1)+'%;background:'+(up ? 'var(--accent)' : 'var(--flat)')+'"></i></div>'
        + '<div class="dval num '+(up ? 'up' : 'dn')+'">'+(up ? '+' : '−')+Math.abs(r.d)+'건</div></div>';
    }).join('') + '<div class="axis"><div></div><div><span>−'+axisMax+'</span><span>0</span><span>+'+axisMax+'</span></div><div></div></div>';
    var tw = rows.reduce(function(a, r){ return a + r.was; }, 0), tn = rows.reduce(function(a, r){ return a + r.now; }, 0);
    document.getElementById('deltaTable').innerHTML = '<tr><th>사유</th><th class="n">'+esc(d.reasonDelta.prevLabel || '전월')+'</th><th class="n">'+esc(d.reasonDelta.curLabel || '이번 달')+'</th><th class="n">증감</th></tr>'
      + rows.concat([{ label: '합계', was: tw, now: tn, d: tn - tw, bold: true }]).map(function(r){
          return '<tr><td class="name">'+(r.bold ? '<b>'+r.label+'</b>' : esc(r.label))+'</td><td class="n faint">'+n(r.was)+'</td><td class="n">'+(r.bold ? '<b>'+n(r.now)+'</b>' : n(r.now))+'</td>'
            + '<td class="n" style="color:'+(r.d > 0 ? 'var(--negative)' : (r.d < 0 ? 'var(--positive)' : 'var(--muted)'))+'">'+(r.d > 0 ? '+' : (r.d < 0 ? '−' : ''))+Math.abs(r.d)+'</td></tr>';
        }).join('');
  }

  if (d.trend && d.trend.months && d.trend.months.length){
    var ms = d.trend.months;
    drawLine(document.getElementById('trendLine'), ms.map(function(m){ return m.m; }), ms.map(function(m){ return m.rate; }), { fmt: function(v){ return v.toFixed(2)+'%'; }, annot: '집계 중', every: 1 });
    document.getElementById('trendTable').innerHTML = '<tr><th>구분</th>'+ms.map(function(m){ return '<th class="n">'+esc(m.m)+'</th>'; }).join('')+'</tr>'
      + (d.trend.rows || []).map(function(r){ return '<tr><td class="name">'+T(r.k)+'</td>'+ms.map(function(m){ var v = m[r.f]; return '<td class="n">'+(typeof v === 'number' ? n(v) : esc(v))+'</td>'; }).join('')+'</tr>'; }).join('')
      + '<tr><td class="name">반품·교환 비율</td>'+ms.map(function(m){ return '<td class="n">'+Number(m.rate).toFixed(2)+'%</td>'; }).join('')+'</tr>';
  }

  var ev = d.event, el = document.getElementById('evLine');
  if (el) drawLine(el, ev.daily.map(function(x){ return x[0].slice(3); }), ev.daily.map(function(x){ return x[2]; }), { fill: true, fmt: function(v){ return n(v)+'건'; }, every: 3 });
}

function initNav(){
  var links = [].slice.call(document.querySelectorAll('.side a[href^="#"]'));
  var secs = links.map(function(a){ return document.querySelector(a.getAttribute('href')); });
  function sync(){
    var y = window.pageYOffset + 120, idx = 0;
    secs.forEach(function(s, i){ if (s && s.getBoundingClientRect().top + window.pageYOffset <= y) idx = i; });
    if (window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 6) idx = secs.length - 1;
    links.forEach(function(a, i){ a.classList.toggle('on', i === idx); });
  }
  var tick = false;
  window.onscroll = function(){ if (tick) return; tick = true; requestAnimationFrame(function(){ sync(); tick = false; }); };
  var rz = null;
  window.onresize = function(){ clearTimeout(rz); rz = setTimeout(function(){ if (D) drawAll(D); }, 150); };
  sync();
}

/* ---------- 부팅 ---------- */
(function(){
  function fail(msg, e){ document.getElementById('content').innerHTML = '<div class="loading">'+msg+'<br><span class="fine">'+esc(e)+'</span></div>'; }
  function load(mm){
    document.getElementById('content').innerHTML = '<div class="loading">데이터를 불러오는 중…</div>';
    window.scrollTo(0, 0);
    fetch('data/'+mm+'.json', { cache: 'no-store' })
      .then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(render)
      .catch(function(e){ fail(mm+'.json을 불러오지 못했습니다.', e); });
  }
  fetch('data/manifest.json', { cache: 'no-store' })
    .then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function(m){
      var sel = document.getElementById('monthSel');
      m.months.slice().sort().reverse().forEach(function(mm){
        var o = document.createElement('option'); o.value = mm; o.textContent = mm.replace('-', '년 ').replace(/^(\d{4}년 )0?(\d+)$/, '$1$2월'); sel.appendChild(o);
      });
      sel.value = m.latest || m.months[m.months.length - 1];
      sel.onchange = function(){ load(sel.value); };
      load(sel.value);
    })
    .catch(function(e){ fail('manifest.json을 불러오지 못했습니다.', e); });
})();
