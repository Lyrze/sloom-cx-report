/* 슬룸 교환·반품 리포트 — JSON 렌더러 */
var dayNames = ['월','화','수','목','금','토','일'];
var donutColors = ['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)'];
var NS = 'http://www.w3.org/2000/svg';
var D = null;

/* 정수 %로 반올림하되 합이 정확히 100이 되게 (최대 잔여법) */
function pctRound(values, total){
  if (!total) return values.map(function(){ return 0; });
  var raw = values.map(function(v){ return v / total * 100; });
  var out = raw.map(function(v){ return Math.floor(v); });
  var rest = 100 - out.reduce(function(a, b){ return a + b; }, 0);
  var order = raw.map(function(v, i){ return { i: i, frac: v - Math.floor(v) }; })
                 .sort(function(a, b){ return b.frac - a.frac; });
  for (var k = 0; k < rest && k < order.length; k++) out[order[k].i]++;
  return out;
}

function badge(b){ return b ? '<span class="badge '+(b.type||'neutral')+'">'+b.text+'</span>' : ''; }

function kpiCard(k){
  return '<div class="card kpi'+(k.hl?' hl':'')+(k.prev?' prev':'')+'">'
    + '<div class="label strong">'+k.label+(k.note?'<br><span class="note">'+k.note+'</span>':'')+'</div>'
    + '<div class="value-line"><span class="value">'+k.value+'</span><span class="unit">'+(k.unit||'')+'</span></div>'
    + '<div class="delta-line">'+badge(k.badge)+(k.sub?'<span class="sub">'+k.sub+'</span>':'')+'</div></div>';
}

function render(d){
  D = d;
  var shortMonth = d.monthLabel.replace(/^\d+년\s*/, '');
  document.getElementById('navMonth').textContent = d.navMonthLabel || d.monthLabel;
  document.getElementById('navEvent').textContent = shortMonth + ' 접수 현황';
  document.getElementById('chPill').textContent = '채널 · ' + d.channel;
  document.title = '슬룸 ' + d.monthLabel + ' 교환·반품 리포트';

  var H = '';
  H += '<div class="page-head"><div><div class="eyebrow">슬룸 · 자사몰 단독</div>'
     + '<h1>'+d.monthLabel+' 교환·반품 리포트</h1></div></div>';

  /* 1. 핵심 요약 */
  H += '<section id="summary"><div class="sec-head"><span class="num">1</span><h2>핵심 요약</h2></div>'
     + '<div class="row" style="margin-bottom:16px">'
     + kpiCard(Object.assign({hl:true}, d.kpi.curRate))
     + kpiCard(Object.assign({prev:true}, d.kpi.prevRate))
     + kpiCard(Object.assign({hl:true}, d.kpi.count))
     + kpiCard(Object.assign({hl:true}, d.kpi.defectShare))
     + '</div>'
     + '<div class="callout" style="margin-bottom:16px"><span class="ic">⏱️</span><p>'+d.basisNote+'</p></div>'
     + '<div class="insight-strip">'
     + d.insights.map(function(i){
         return '<div class="insight '+i.type+'"><span class="ico">'+i.icon+'</span>'
              + '<div><div class="h">'+i.title+'</div><div class="b">'+i.body+'</div></div></div>';
       }).join('')
     + '</div></section>';

  /* 2. 유형별 */
  var s2 = d.section2;
  H += '<section id="trend"><div class="sec-head"><span class="num">2</span><h2>'+s2.title+'</h2></div>'
     + '<div class="card panel"><div class="panel-head"><div><div class="t">'+s2.panelTitle+'</div>'
     + '<div class="d" style="font-weight:700;color:var(--text-2)">'+s2.panelDesc+'</div></div></div>'
     + '<div class="row"><div style="flex:2;min-width:280px">'
     + '<div style="position:relative;height:150px"><div style="position:absolute;inset:0;display:flex;align-items:flex-end;gap:10px" id="typeBars"></div></div>'
     + '<div class="chart-axis" id="typeAxis"></div></div>'
     + '<div style="flex:1;min-width:190px;display:flex;flex-direction:column;justify-content:center;gap:7px">'
     + s2.summary.map(function(x){
         return '<div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:var(--text-2)">'+x.k+'</span><b>'+x.v+'</b></div>';
       }).join('')
     + '<div style="border-top:1px solid var(--border);margin-top:4px;padding-top:8px;display:flex;justify-content:space-between;font-size:13px"><span style="font-weight:700">'+s2.total.k+'</span><b style="color:var(--accent)">'+s2.total.v+'</b></div>'
     + '<div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--muted)"><span>'+s2.totalNote+'</span></div>'
     + '</div></div></div>'
     + (d.trend ? '<div class="card panel" style="margin-top:16px">'
         + '<div class="panel-head"><div><div class="t">'+d.trend.title+'</div>'
         + '<div class="d">'+d.trend.desc+'</div></div></div>'
         + '<div style="position:relative;height:120px"><div style="position:absolute;inset:0;display:flex;align-items:flex-end;gap:14px" id="trendBars"></div></div>'
         + '<div class="chart-axis" id="trendAxis"></div>'
         + '<div style="overflow-x:auto;margin-top:14px"><table id="trendTable"></table></div>'
         + '</div>' : '')
     + '</section>';

  /* 3. 사유 · 제품 */
  H += '<section id="reason-sku"><div class="sec-head"><span class="num">3</span><h2>사유 · 제품 분석</h2></div>'
     + '<div class="card panel" style="margin-bottom:16px">'
     + '<div class="panel-head"><div><div class="t">사유 TOP — 펼치면 상세 사유 확인 가능</div></div></div>'
     + d.reasons.map(function(r, i){
         var w = (r.barPct !== undefined ? r.barPct : r.pct);
         return '<details class="reason-item"'+(r.open?' open':'')+'><summary>'
              + '<span class="r-rank">'+(i+1)+'</span>'
              + '<div class="r-mid"><div class="r-top"><span class="r-label">'+r.label+'</span>'
              + '<span class="r-pct"'+(r.pctColor?' style="color:'+r.pctColor+'"':'')+'>'+r.pct+'%</span></div>'
              + '<div class="r-track"><div class="r-fill" data-w="'+w+'%" style="width:0;background:'+r.color+'"></div></div></div>'
              + '<span class="r-chev">▼</span></summary><div class="r-body">'
              + r.quotes.map(function(q){
                  return '<div class="quote"><span class="src">'+q[0]+'</span>"'+q[1]+'"'+(q[2]?'<span class="cls">'+q[2]+'</span>':'')+'</div>';
                }).join('')
              + '</div></details>';
       }).join('')
     + '</div>'
     + '<div class="donut-row2" style="margin-bottom:16px">'
     + '<div class="card panel"><div class="panel-head"><div><div class="t">제품별 교환·반품 건수 TOP</div><div class="d">'+d.skuCompDesc+'</div></div></div>'
     + '<div class="donut-flex"><svg class="donut" id="skuDonut" viewBox="0 0 42 42" role="img" aria-label="제품별 구성비"></svg><div class="donut-legend" id="skuLegend"></div></div></div>'
     + '<div class="card panel"><div class="panel-head"><div><div class="t">제품별 출고 대비 반품률 TOP</div><div class="d">최소 출고량 100건 이상 · 출고량 대비 반품 비율</div></div></div>'
     + '<div class="gauge-row" id="gaugeRow"></div></div></div>'
     + '<div class="sku-detail" id="skuDetail" style="margin-bottom:16px"><div class="sd-empty">위 차트에서 <strong style="color:var(--text)">제품명을 클릭</strong>하면 해당 제품의 최다 반품 사유와 고객 발화 예시를 볼 수 있습니다.</div></div>'
     + '<div class="card panel" style="margin-bottom:16px"><div class="panel-head"><div><div class="t">제품별 반품·교환 사유 비교 (TOP 3)</div><div class="d">같은 반품이라도 제품마다 사유 구성이 다릅니다</div></div></div>'
     + '<div class="xlegend" id="crossLegend"></div><div id="crossChart"></div></div>'
     + '<div class="callout"><span class="ic">⚠️</span><p>'+d.skuCallout+'</p></div></section>';

  /* 4. 이벤트 접수 */
  var ev = d.event;
  H += '<section id="event"><div class="sec-head"><span class="num">4</span><h2>'+shortMonth+' 접수 현황</h2>'
     + '<span class="desc" style="font-weight:700;color:var(--text-2)">100%환불이벤트 · 접수일 기준</span></div>'
     + '<div class="row" style="margin-bottom:16px">' + ev.kpi.map(kpiCard).join('') + '</div>'
     + '<div class="card panel" style="margin-bottom:16px"><div class="panel-head">'
     + '<div><div class="t">'+ev.chartTitle+'</div><div class="d">'+ev.chartDesc+'</div></div>'
     + '<div class="legend"><span class="item"><span class="sw" style="background:var(--accent)"></span>일별 접수</span>'
     + '<span class="item"><span class="sw" style="background:var(--warn-dot);border-radius:50%"></span>월요일</span></div></div>'
     + '<svg class="line-chart" id="eventLine" viewBox="0 0 720 190" preserveAspectRatio="none"></svg>'
     + '<div class="chart-axis" id="eventAxis"></div></div>'
     + '<div class="card panel"><div class="panel-head"><div><div class="t">일별 참여자 테이블</div></div>'
     + '<span class="tag warn">'+ev.tableTag+'</span></div>'
     + '<div class="callout info" style="margin-bottom:14px"><span class="ic">🗓️</span><p>'+ev.note+'</p></div>'
     + '<div style="overflow-x:auto"><table><thead id="evtThead"></thead><tbody id="eventTbody"></tbody></table></div></div></section>';

  /* 5. 반려 · 전환 */
  var rj = d.reject;
  H += '<section id="reject"><div class="sec-head"><span class="num">5</span><h2>'+rj.title+'</h2></div>'
     + '<div class="row" style="margin-bottom:16px">' + rj.kpi.map(kpiCard).join('') + '</div>'
     + '<div class="card panel"><div class="panel-head"><div><div class="t">'+rj.panelTitle+'</div>'
     + '<div class="d">'+rj.panelDesc+'</div></div><span class="tag good">확정</span></div>'
     + '<div class="def-wrap"><div class="def-card conv"><div class="dl">'+rj.conv.label+'</div>'
     + '<div class="dv">'+rj.conv.n+'</div><div class="dr">'+rj.conv.r+'</div></div>'
     + '<div class="def-card defend"><div class="dl">'+rj.defend.label+'</div>'
     + '<div class="dv">'+rj.defend.n+'</div><div class="dr">'+rj.defend.r+'</div></div></div>'
     + '<div class="def-base">'+rj.base+'</div>'
     + '<div class="def-bar"><div class="seg-conv" data-w="'+rj.convPct+'%" style="width:0"></div></div>'
     + '<div class="callout info" style="margin-top:16px"><span class="ic">📌</span><p>'+rj.note+'</p></div></div></section>';

  /* 6. 주요 제품 + CX 코멘트 */
  var ks = d.keySku, cx = d.cxComment;
  H += '<section id="key-sku"><div class="sec-head"><span class="num">6</span><h2>'+ks.title+'</h2></div>'
     + '<div class="card panel"><div class="panel-head"><div><div class="t" id="ksTitle">—</div><div class="d" id="ksDesc">—</div></div>'
     + '<div class="seg-toggle" id="ksTabs"></div></div>'
     + '<div class="row" style="margin-bottom:16px">'
     + '<div class="card kpi" style="box-shadow:none"><div class="label">반품 불가 반려 건수</div>'
     + '<div class="value-line"><span class="value" id="ksRej">—</span><span class="unit">건</span></div>'
     + '<div class="delta-line"><span class="sub">신청 마감 경과 · 결과 확정</span></div></div>'
     + '<div class="card kpi hl" style="box-shadow:none"><div class="label">반품 방어율</div>'
     + '<div class="value-line"><span class="value" id="ksDef">—</span><span class="unit">%</span></div>'
     + '<div class="delta-line"><span class="sub" id="ksDefSub">—</span></div></div></div>'
     + '<div class="def-wrap"><div class="def-card conv"><div class="dl">100%환불이벤트 재인입</div>'
     + '<div class="dv" id="ksConvN">—</div><div class="dr" id="ksConvR">—</div></div>'
     + '<div class="def-card defend"><div class="dl">반품 방어 성공</div>'
     + '<div class="dv" id="ksDefN">—</div><div class="dr" id="ksDefR">—</div></div></div>'
     + '<div class="def-base" id="ksBase">—</div>'
     + '<div class="def-bar"><div class="seg-conv" id="ksBar" style="width:0"></div></div>'
     + '<div class="callout info" style="margin-top:16px"><span class="ic">📌</span><p id="ksNote">—</p></div></div>'
     + '<div class="card panel" style="margin-top:16px"><div class="panel-head"><div><div class="t">'+cx.title+'</div></div></div>'
     + '<div class="row" style="margin-bottom:16px">' + cx.kpi.map(function(k){ return kpiCard(Object.assign({}, k)); }).join('') + '</div>'
     + '<div class="callout info"><span class="ic">💬</span><p>'+cx.body+'</p></div>'
     + (cx.safety ? '<details class="reason-item" style="margin-top:12px"><summary>'
         + '<span class="r-rank" style="background:var(--bad-bg);color:var(--bad)">⚠</span>'
         + '<div class="r-mid"><div class="r-top"><span class="r-label">'+cx.safety.label+'</span>'
         + '<span class="r-pct" style="color:var(--bad)">'+cx.safety.count+'건</span></div></div>'
         + '<span class="r-chev">▼</span></summary><div class="r-body">'
         + cx.safety.quotes.map(function(q){
             return '<div class="quote"><span class="src">'+q[0]+'</span>"'+q[1]+'"</div>';
           }).join('')
         + '</div></details>' : '')
     + '</div></section>';

  document.getElementById('content').innerHTML = H;
  buildCharts(d);
  initMotion();
}

function buildTrend(t){
  var wrap = document.getElementById('trendBars');
  var ax = document.getElementById('trendAxis');
  var tbl = document.getElementById('trendTable');
  if (!wrap || !ax || !tbl) return;
  var ms = t.months || [];
  if (!ms.length) return;
  // 0 기준 + 최대값에 15% 여유 (막대 차이를 부풀리지 않도록)
  var top = Math.max.apply(null, ms.map(function(x){ return x.rate; })) * 1.15;
  ms.forEach(function(x, i){
    var col = document.createElement('div');
    col.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%';
    var lab = document.createElement('div');
    lab.textContent = x.rate.toFixed(2) + '%';
    lab.style.cssText = 'font-size:11.5px;font-weight:800;margin-bottom:5px;'
      + (i === ms.length - 1 ? 'color:var(--accent)' : 'color:var(--text-2)');
    var bar = document.createElement('div');
    bar.style.cssText = 'width:100%;max-width:74px;height:0%;border-radius:6px 6px 0 0;'
      + 'transition:height .9s cubic-bezier(.22,1,.36,1);background:'
      + (i === ms.length - 1 ? 'var(--accent)' : 'var(--c2)');
    bar.setAttribute('data-h', Math.max(4, x.rate / top * 100) + '%');
    bar.title = x.m + ' 반품·교환률 ' + x.rate + '% (' + x.cases + '건 / 출고 ' + x.ship.toLocaleString() + '개)';
    col.appendChild(lab); col.appendChild(bar); wrap.appendChild(col);
    var sp = document.createElement('span'); sp.textContent = x.m; ax.appendChild(sp);
  });
  var th = '<thead><tr><th>구분</th>'
    + ms.map(function(x, i){
        return '<th class="num"' + (i === ms.length - 1 ? ' style="color:var(--text)"' : '') + '>' + x.m + '</th>';
      }).join('') + '</tr></thead>';
  var tb = '<tbody>' + (t.rows || []).map(function(r){
      return '<tr><td>' + r.k + '</td>'
        + ms.map(function(x, i){
            var v = x[r.f];
            return '<td class="num"' + (i === ms.length - 1 ? ' style="font-weight:800"' : '') + '>'
              + (typeof v === 'number' ? v.toLocaleString() : v) + '</td>';
          }).join('') + '</tr>';
    }).join('') + '</tbody>';
  tbl.innerHTML = th + tb;
}

function buildCharts(d){
  /* 유형별 막대 */
  var max = Math.max.apply(null, d.section2.bars.map(function(x){ return x.v; }));
  var bars = document.getElementById('typeBars'), ax = document.getElementById('typeAxis');
  d.section2.bars.forEach(function(x){
    var w = document.createElement('div');
    w.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%';
    var l = document.createElement('div'); l.textContent = x.v;
    l.style.cssText = 'font-size:11px;font-weight:700;margin-bottom:4px';
    var b = document.createElement('div');
    b.style.cssText = 'width:100%;height:0%;background:'+x.c+';border-radius:5px 5px 0 0;transition:height .9s cubic-bezier(.22,1,.36,1)';
    b.setAttribute('data-h', Math.max(4, x.v/max*100)+'%');
    w.appendChild(l); w.appendChild(b); bars.appendChild(w);
    var s = document.createElement('span'); s.textContent = x.l; ax.appendChild(s);
  });

  /* 월별 추이 (선택) */
  if (d.trend) buildTrend(d.trend);

  /* 도넛 */
  var tot = d.skuComp.reduce(function(a,x){ return a+x.v; }, 0), off = 25;
  var svg = document.getElementById('skuDonut');
  d.skuComp.forEach(function(x, i){
    var pct = x.v/tot*100;
    var c = document.createElementNS(NS,'circle');
    c.setAttribute('cx',21); c.setAttribute('cy',21); c.setAttribute('r',15.9); c.setAttribute('fill','none');
    c.setAttribute('stroke', donutColors[i]); c.setAttribute('stroke-width',6);
    c.setAttribute('data-da', pct.toFixed(2)+' '+(100-pct).toFixed(2));
    c.setAttribute('stroke-dasharray','0 100'); c.setAttribute('stroke-dashoffset', off.toFixed(2));
    c.setAttribute('transform','rotate(-90 21 21)'); svg.appendChild(c); off -= pct;
  });
  var t1 = document.createElementNS(NS,'text');
  t1.setAttribute('x',21); t1.setAttribute('y',20); t1.setAttribute('text-anchor','middle');
  t1.setAttribute('font-size','7'); t1.setAttribute('font-weight','800'); t1.setAttribute('fill','var(--text)');
  t1.textContent = d.skuCompTotal; svg.appendChild(t1);
  var t2 = document.createElementNS(NS,'text');
  t2.setAttribute('x',21); t2.setAttribute('y',26); t2.setAttribute('text-anchor','middle');
  t2.setAttribute('font-size','3.6'); t2.setAttribute('fill','var(--muted)');
  t2.textContent = '반품·교환'; svg.appendChild(t2);

  var leg = document.getElementById('skuLegend');
  var legPct = pctRound(d.skuComp.map(function(x){ return x.v; }), tot);
  d.skuComp.forEach(function(x, i){
    var row = document.createElement('div'); row.className = 'dl';
    row.innerHTML = '<span class="dot" style="background:'+donutColors[i]+'"></span><span class="nm">'+x.n+'</span>'
                  + '<span class="vl">'+x.v+'건 · '+legPct[i]+'%</span>';
    if (d.skuDetail[x.n]) {
      row.classList.add('clickable'); row.setAttribute('data-sku', x.n);
      row.onclick = function(){ showSkuDetail(x.n); };
    }
    leg.appendChild(row);
  });

  /* 게이지 */
  var row = document.getElementById('gaugeRow');
  d.skuRate.forEach(function(x){
    var col = x.r >= 10 ? 'var(--bad)' : (x.r >= 6 ? 'var(--warn)' : 'var(--good)');
    var g = document.createElement('div'); g.className = 'gauge';
    var sv = document.createElementNS(NS,'svg'); sv.setAttribute('viewBox','0 0 42 42');
    var bg = document.createElementNS(NS,'circle');
    bg.setAttribute('cx',21); bg.setAttribute('cy',21); bg.setAttribute('r',15.9);
    bg.setAttribute('fill','none'); bg.setAttribute('stroke','var(--border)'); bg.setAttribute('stroke-width',5);
    sv.appendChild(bg);
    var arc = document.createElementNS(NS,'circle');
    arc.setAttribute('cx',21); arc.setAttribute('cy',21); arc.setAttribute('r',15.9);
    arc.setAttribute('fill','none'); arc.setAttribute('stroke',col); arc.setAttribute('stroke-width',5);
    arc.setAttribute('stroke-linecap','round');
    arc.setAttribute('data-da', x.r.toFixed(1)+' '+(100-x.r).toFixed(1));
    arc.setAttribute('stroke-dasharray','0 100'); arc.setAttribute('stroke-dashoffset',25);
    arc.setAttribute('transform','rotate(-90 21 21)'); sv.appendChild(arc);
    var tx = document.createElementNS(NS,'text');
    tx.setAttribute('x',21); tx.setAttribute('y',23.2); tx.setAttribute('text-anchor','middle');
    // 링 안쪽 지름(약 26.8)을 넘지 않도록 축소 — '8.37%'처럼 5글자여도 겹치지 않게
    tx.setAttribute('font-size','7.2'); tx.setAttribute('font-weight','800'); tx.setAttribute('fill',col);
    tx.setAttribute('textLength','22'); tx.setAttribute('lengthAdjust','spacingAndGlyphs');
    tx.textContent = Number(x.r).toFixed(2)+'%'; sv.appendChild(tx);
    g.appendChild(sv);
    var nm = document.createElement('div'); nm.className = 'gnm'; nm.textContent = x.n; g.appendChild(nm);
    var sb = document.createElement('div'); sb.className = 'gsub';
    sb.textContent = x.c+'건 / '+x.s.toLocaleString()+'개'; g.appendChild(sb);
    if (d.skuDetail[x.n]) {
      g.classList.add('clickable'); g.setAttribute('data-sku', x.n);
      g.onclick = function(){ showSkuDetail(x.n); };
    }
    row.appendChild(g);
  });

  /* 제품×사유 누적바 */
  var cl = document.getElementById('crossLegend'), cc = document.getElementById('crossChart');
  var ETC_MIN = 5;        // 이 % 미만 조각은 막대 폭이 좁아 글자가 안 들어감
  var ETC_COLOR = 'var(--muted)';
  var needEtc = d.crossRows.some(function(r){
    var t = r.v.reduce(function(a,b){ return a+b; }, 0);
    return r.v.some(function(v){ return v && v/t*100 < ETC_MIN; });
  });
  d.crossCats.forEach(function(c){
    var s = document.createElement('span'); s.className = 'i';
    s.innerHTML = '<i style="background:'+c.c+'"></i>'+c.n; cl.appendChild(s);
  });
  if (needEtc) {
    var se = document.createElement('span'); se.className = 'i';
    se.innerHTML = '<i style="background:'+ETC_COLOR+'"></i>기타 (5% 미만 합계)';
    cl.appendChild(se);
  }
  d.crossRows.forEach(function(r){
    var t = r.v.reduce(function(a,b){ return a+b; }, 0);
    var rowPct = pctRound(r.v, t);   // 라벨용 정수 %, 행 합계 100% 보장
    var rw = document.createElement('div'); rw.className = 'xbar-row';
    var nm = document.createElement('div'); nm.className = 'xbar-name'; nm.textContent = r.n;
    var bar = document.createElement('div'); bar.className = 'xbar';
    var etcV = 0, etcP = 0, etcParts = [];
    r.v.forEach(function(v, i){
      if (!v) return;
      var pct = v/t*100;
      if (pct < ETC_MIN) {   // 작은 조각은 모아서 '기타' 한 칸으로
        etcV += v; etcP += rowPct[i];
        etcParts.push(d.crossCats[i].n+' '+v+'건 ('+pct.toFixed(1)+'%)');
        return;
      }
      var sg = document.createElement('div'); sg.className = 'xseg';
      sg.setAttribute('data-w', pct.toFixed(2)+'%'); sg.style.width = '0';
      sg.style.background = d.crossCats[i].c;
      sg.title = d.crossCats[i].n+' '+v+'건 ('+pct.toFixed(1)+'%)';
      sg.textContent = rowPct[i]+'%';
      bar.appendChild(sg);
    });
    if (etcV) {
      var eg = document.createElement('div'); eg.className = 'xseg';
      eg.setAttribute('data-w', (etcV/t*100).toFixed(2)+'%'); eg.style.width = '0';
      eg.style.background = ETC_COLOR;
      eg.title = '기타 — ' + etcParts.join(' · ');
      eg.textContent = etcP+'%';
      bar.appendChild(eg);
    }
    var tt = document.createElement('div'); tt.className = 'xbar-total'; tt.textContent = t+'건';
    rw.appendChild(nm); rw.appendChild(bar); rw.appendChild(tt); cc.appendChild(rw);
  });

  renderEvtDaily(d);

  var tabs = document.getElementById('ksTabs');
  d.keySku.items.forEach(function(x, i){
    var b = document.createElement('button'); b.textContent = x.n;
    b.onclick = function(){ setKeySku(i); }; tabs.appendChild(b);
  });
  setKeySku(0);
}

var _evtPoints = null, _evtEvery = 2;
function drawEvtLine(points, labelEvery){
  var svg = document.getElementById('eventLine'); svg.innerHTML = '';
  _evtPoints = points; _evtEvery = labelEvery;
  var H = 190, pad = 16;
  // viewBox 폭을 실제 렌더 폭에 맞춘다. 고정값(720) + preserveAspectRatio="none"으로 두면
  // 컨테이너가 넓을 때 가로로만 늘어나 점이 타원이 되고 숫자가 찌그러진다.
  var box = svg.getBoundingClientRect ? svg.getBoundingClientRect().width : 0;
  var W = Math.round(box) || 720;
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  var n = points.length;
  var maxV = Math.max.apply(null, points.map(function(x){ return x.v; }));
  function X(i){ return n === 1 ? W/2 : i/(n-1)*(W-20)+10; }
  function Y(v){ return H-pad-(v/maxV)*(H-pad*2); }
  var base = document.createElementNS(NS,'line');
  base.setAttribute('x1',10); base.setAttribute('x2',W-10);
  base.setAttribute('y1',H-pad); base.setAttribute('y2',H-pad);
  base.setAttribute('stroke','var(--border)'); svg.appendChild(base);
  var area = '10,'+(H-pad)+' '+points.map(function(x,i){ return X(i)+','+Y(x.v); }).join(' ')+' '+(W-10)+','+(H-pad);
  var ar = document.createElementNS(NS,'polygon');
  ar.setAttribute('points', area); ar.setAttribute('fill','var(--accent)'); ar.setAttribute('opacity','0.1');
  svg.appendChild(ar);
  var pl = document.createElementNS(NS,'polyline');
  pl.setAttribute('points', points.map(function(x,i){ return X(i)+','+Y(x.v); }).join(' '));
  pl.setAttribute('fill','none'); pl.setAttribute('stroke','var(--accent)'); pl.setAttribute('stroke-width','2.5');
  pl.setAttribute('stroke-linejoin','round'); pl.setAttribute('vector-effect','non-scaling-stroke');
  svg.appendChild(pl);
  try {
    var L = pl.getTotalLength();
    pl.style.strokeDasharray = L; pl.style.strokeDashoffset = L;
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ pl.style.strokeDashoffset = 0; }); });
  } catch(e) {}
  points.forEach(function(x, i){
    var c = document.createElementNS(NS,'circle');
    c.setAttribute('cx', X(i)); c.setAttribute('cy', Y(x.v));
    c.setAttribute('r', x.hi ? 5 : 3.2);
    c.setAttribute('fill', x.hi ? 'var(--warn-dot)' : 'var(--accent)');
    c.setAttribute('stroke','var(--card)'); c.setAttribute('stroke-width','1.5');
    var t = document.createElementNS(NS,'title'); t.textContent = x.tip; c.appendChild(t);
    svg.appendChild(c);
    if (x.hi || x.v === maxV) {
      var tx = document.createElementNS(NS,'text');
      tx.setAttribute('x', X(i)); tx.setAttribute('y', Y(x.v)-9); tx.setAttribute('text-anchor','middle');
      tx.setAttribute('font-size','10'); tx.setAttribute('font-weight','700');
      tx.setAttribute('fill', x.hi ? 'var(--warn)' : 'var(--accent)');
      tx.textContent = x.v; svg.appendChild(tx);
    }
  });
  var ax = document.getElementById('eventAxis'); ax.innerHTML = '';
  points.forEach(function(x, i){
    var s = document.createElement('span'); s.textContent = (i % labelEvery === 0) ? x.ax : ''; ax.appendChild(s);
  });
}

function renderEvtDaily(d){
  var thead = document.getElementById('evtThead'), tb = document.getElementById('eventTbody');
  tb.innerHTML = '';
  var pts = d.event.daily.map(function(x){
    return { v:x[2], hi:x[1]===0, ax:x[0].slice(3), tip:x[0]+' ('+dayNames[x[1]]+') '+x[2]+'건' };
  });
  drawEvtLine(pts, 2);
  thead.innerHTML = '<tr><th>일자</th><th>요일</th><th class="num">접수 건수</th><th>비고</th></tr>';
  d.event.daily.forEach(function(x){
    var mon = x[1] === 0;
    var tr = document.createElement('tr'); if (mon) tr.className = 'is-monday';
    tr.innerHTML = '<td'+(mon?' class="mon-day"':'')+'>'+x[0]+'</td>'
                 + '<td'+(mon?' class="mon-day"':'')+'>'+dayNames[x[1]]+'</td>'
                 + '<td class="num"'+(mon?' style="font-weight:800"':'')+'>'+x[2]+'</td>'
                 + '<td style="font-size:11.5px;color:var(--muted)">'+(mon?'주말 접수분 누적 처리':'')+'</td>';
    tb.appendChild(tr);
  });
}

function showSkuDetail(name){
  var d = D.skuDetail[name]; if (!d) return;
  document.querySelectorAll('.dl.clickable,.gauge.clickable').forEach(function(el){
    el.classList.toggle('sel', el.getAttribute('data-sku') === name);
  });
  var maxR = d.reasons[0][1], maxD = d.defects[0][1];
  var html = '<div class="sd-head"><div class="sd-name">'+name+'</div>'
    + '<div class="sd-top">최다 사유 <span class="tag bad">'+d.top+' '+d.topCnt+'건 · '+d.topPct+'%</span></div></div>'
    + '<div class="sd-grid"><div class="sd-col"><div class="sd-label">사유 구성</div>'
    + d.reasons.map(function(r){
        return '<div class="sd-bar"><div class="sd-bt"><span>'+r[0]+'</span><span style="font-weight:700">'+r[1]+'건</span></div>'
             + '<div class="sd-track"><div class="sd-fill" data-w="'+(r[1]/maxR*100)+'%" style="width:0;background:var(--accent)"></div></div></div>';
      }).join('')
    + '</div><div class="sd-col"><div class="sd-label">불량 세부 사유</div>'
    + d.defects.map(function(r){
        return '<div class="sd-bar"><div class="sd-bt"><span>'+r[0]+'</span><span style="font-weight:700">'+r[1]+'건</span></div>'
             + '<div class="sd-track"><div class="sd-fill" data-w="'+(r[1]/maxD*100)+'%" style="width:0"></div></div></div>';
      }).join('')
    + '</div><div class="sd-col"><div class="sd-label">고객 발화 예시</div>'
    + d.quotes.map(function(q){
        return '<div class="sd-quote"><span class="src">'+q[0]+'</span>"'+q[1]+'"</div>';
      }).join('')
    + '</div></div>';
  var box = document.getElementById('skuDetail'); box.innerHTML = html;
  requestAnimationFrame(function(){
    [].forEach.call(box.querySelectorAll('[data-w]'), function(el){ el.style.width = el.getAttribute('data-w'); });
  });
}

function setKeySku(i){
  var d = D.keySku.items[i]; if (!d) return;
  [].forEach.call(document.querySelectorAll('#ksTabs button'), function(b, j){ b.classList.toggle('on', j === i); });
  var def = d.rej - d.conv;
  var convR = d.rej ? d.conv/d.rej*100 : 0, defR = d.rej ? def/d.rej*100 : 0;
  document.getElementById('ksTitle').textContent = d.n;
  var coh = D.keySku.cohortLabel || '';
  document.getElementById('ksDesc').textContent =
    (coh ? coh + ' 주문 · ' : '') + '반려 '+d.rej+'건 → 재인입 '+d.conv+'건 / 방어 '+def+'건';
  document.getElementById('ksRej').textContent = d.rej;
  document.getElementById('ksDef').textContent = defR.toFixed(1);
  document.getElementById('ksDefSub').textContent = def+'건 방어 · 전체 평균 '+D.keySku.avgDefendRate;
  document.getElementById('ksConvN').textContent = d.conv+'건';
  document.getElementById('ksConvR').textContent = '재인입률 '+convR.toFixed(1)+'%';
  document.getElementById('ksDefN').textContent = def+'건';
  document.getElementById('ksDefR').textContent = '방어율 '+defR.toFixed(1)+'%';
  document.getElementById('ksBase').textContent =
    '모수 '+d.rej+'건' + (coh ? ' (' + coh + ' 주문 순수 반려)' : '');
  var bar = document.getElementById('ksBar'); bar.style.width = '0';
  requestAnimationFrame(function(){ bar.style.width = convR.toFixed(1)+'%'; });
  document.getElementById('ksNote').innerHTML = '<strong>'+d.n+'</strong> — '+d.note;
}

function initMotion(){
  var links = [].slice.call(document.querySelectorAll('.nav-link'));
  var secs = links.map(function(a){ return document.querySelector(a.getAttribute('href')); });
  function topOf(el){ return el.getBoundingClientRect().top + window.pageYOffset; }
  function sync(){
    var y = window.pageYOffset + 130, idx = 0;
    secs.forEach(function(s, i){ if (s && topOf(s) <= y) idx = i; });
    if (window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 6) idx = secs.length - 1;
    links.forEach(function(a, i){ a.classList.toggle('active', i === idx); });
  }
  var tick = false;
  window.addEventListener('scroll', function(){
    if (tick) return; tick = true;
    requestAnimationFrame(function(){ sync(); tick = false; });
  }, { passive: true });
  var rzT = null;
  window.addEventListener('resize', function(){
    sync();
    clearTimeout(rzT);
    rzT = setTimeout(function(){ if (_evtPoints) drawEvtLine(_evtPoints, _evtEvery); }, 150);
  });
  sync();

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var els = [].slice.call(document.querySelectorAll('.content .card, .content .insight, .content .sku-detail'));
  function countUp(el){
    if (reduce || el.dataset.done) return; el.dataset.done = '1';
    var txt = el.textContent.trim(), target = parseFloat(txt.replace(/,/g,''));
    if (isNaN(target)) return;
    var dec = (txt.split('.')[1] || '').length, t0 = null, dur = 750;
    function step(ts){
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts-t0)/dur), v = target*(1-Math.pow(1-p,3));
      el.textContent = dec ? v.toFixed(dec) : Math.round(v).toLocaleString();
      if (p < 1) requestAnimationFrame(step); else el.textContent = txt;
    }
    requestAnimationFrame(step);
  }
  function play(root){
    [].forEach.call(root.querySelectorAll('[data-h]'), function(b){ b.style.height = b.getAttribute('data-h'); });
    [].forEach.call(root.querySelectorAll('[data-da]'), function(c){ c.setAttribute('stroke-dasharray', c.getAttribute('data-da')); });
    [].forEach.call(root.querySelectorAll('[data-w]'), function(w){ w.style.width = w.getAttribute('data-w'); });
    var vals = root.classList.contains('kpi') ? root.querySelectorAll('.value') : root.querySelectorAll('.kpi .value');
    [].forEach.call(vals, countUp);
  }
  // 초기 렌더가 레이아웃 완료 전이면 라인차트 viewBox가 fallback(720)으로 잡힌다.
  // 실제 폭이 다르면 한 번만 다시 그린다(같으면 재그리기 없음 → 애니메이션 중복 방지).
  requestAnimationFrame(function(){
    var sv = document.getElementById('eventLine');
    if (!sv || !_evtPoints) return;
    var real = Math.round(sv.getBoundingClientRect().width);
    var cur = parseFloat((sv.getAttribute('viewBox') || '0 0 720 190').split(' ')[2]);
    if (real && Math.abs(real - cur) > 1) drawEvtLine(_evtPoints, _evtEvery);
  });

  if (reduce || !('IntersectionObserver' in window)) { els.forEach(play); return; }
  els.forEach(function(el){ el.classList.add('reveal'); });
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      setTimeout(function(){ play(e.target); }, 140);
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach(function(el){ io.observe(el); });
}

/* ---- 부팅 ---- */
(function(){
  function fail(msg, e){
    document.getElementById('content').innerHTML =
      '<div class="loading">'+msg+'<br><span style="font-size:12px">'+e+'</span></div>';
  }
  function load(mm){
    document.getElementById('content').innerHTML = '<div class="loading">데이터를 불러오는 중…</div>';
    fetch('data/'+mm+'.json', { cache:'no-store' })
      .then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
      .then(render)
      .catch(function(e){ fail(mm+'.json을 불러오지 못했습니다.', e); });
  }
  fetch('data/manifest.json', { cache:'no-store' })
    .then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
    .then(function(m){
      var sel = document.getElementById('monthSel');
      m.months.slice().sort().reverse().forEach(function(mm){
        var o = document.createElement('option'); o.value = mm; o.textContent = '기간 · ' + mm; sel.appendChild(o);
      });
      sel.value = m.latest || m.months[m.months.length-1];
      sel.onchange = function(){ load(sel.value); };
      load(sel.value);
    })
    .catch(function(e){ fail('manifest.json을 불러오지 못했습니다.', e); });
})();
