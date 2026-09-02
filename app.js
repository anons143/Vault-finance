'use strict';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DEFAULT STATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const DEFAULT_STATE = {
  transactions: [],
  goals: [],
  incCats: [
    'Personal classes (1-on-1)',
    'Group paid class',
    'YouTube',
    'Freelance / Bug bounty',
    'Other income',
  ],
  // Parent category — always kept separate, never split into buckets
  parentCat: 'Parents monthly budget',
  expCats: [
    'Daily living',
    'Invest (SIP/Gold)',
    'Emergency fund',
    'Business',
    'Personal growth',
    'Donations',
    'Protein & longevity',
    'Other',
  ],
  buckets: [
    { id: 'b1', name: 'Daily living',    pct: 30, color: '#c9a84c', expCat: 'Daily living'    },
    { id: 'b2', name: 'Invest',          pct: 20, color: '#2980b9', expCat: 'Invest (SIP/Gold)'},
    { id: 'b3', name: 'Emergency fund',  pct: 10, color: '#27ae60', expCat: 'Emergency fund'  },
    { id: 'b4', name: 'Business',        pct: 20, color: '#8e44ad', expCat: 'Business'        },
    { id: 'b5', name: 'Personal growth', pct: 10, color: '#e67e22', expCat: 'Personal growth' },
    { id: 'b6', name: 'Donations',       pct:  5, color: '#e84393', expCat: 'Donations'       },
    { id: 'b7', name: 'Protein & longevity', pct: 5, color: '#1abc9c', expCat: 'Protein & longevity' },
  ],
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   STATE & STORAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
let S = {};

function loadState() {
  try {
    const raw = localStorage.getItem('vault_v2');
    S = raw ? JSON.parse(raw) : deepCopy(DEFAULT_STATE);
    // migrate missing keys
    if (!S.incCats)   S.incCats   = DEFAULT_STATE.incCats;
    if (!S.expCats)   S.expCats   = DEFAULT_STATE.expCats;
    if (!S.buckets)   S.buckets   = DEFAULT_STATE.buckets;
    if (!S.parentCat) S.parentCat = DEFAULT_STATE.parentCat;
    if (!S.goals)     S.goals     = [];
    if (!S.transactions) S.transactions = [];
  } catch(e) { S = deepCopy(DEFAULT_STATE); }
}

function save() {
  try { localStorage.setItem('vault_v2', JSON.stringify(S)); } catch(e) {}
}

function deepCopy(o) { return JSON.parse(JSON.stringify(o)); }

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   HELPERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const fmt  = n => '₹' + Math.abs(Math.round(n)).toLocaleString('en-IN');
const esc  = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const today = () => new Date().toISOString().slice(0,10);
const monthOf = d => d ? d.slice(0,7) : '';
const nowMonth = () => today().slice(0,7);
function fmtMonth(m) {
  if (!m) return '';
  const [y,mo] = m.split('-');
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+mo-1]+' '+y;
}
function allMonths() {
  const ms = [...new Set(S.transactions.map(t => monthOf(t.date)))].sort().reverse();
  if (!ms.includes(nowMonth())) ms.unshift(nowMonth());
  return ms;
}

/* KEY FORMULA — only earned income splits into buckets */
function earnedIncome(txns) {
  return (txns || S.transactions)
    .filter(t => t.type === 'income' && t.cat !== S.parentCat)
    .reduce((s,t) => s + t.amt, 0);
}
function parentIncome(txns) {
  return (txns || S.transactions)
    .filter(t => t.type === 'income' && t.cat === S.parentCat)
    .reduce((s,t) => s + t.amt, 0);
}
function totalIncome(txns) {
  return (txns || S.transactions)
    .filter(t => t.type === 'income')
    .reduce((s,t) => s + t.amt, 0);
}
function totalExpense(txns) {
  return (txns || S.transactions)
    .filter(t => t.type === 'expense')
    .reduce((s,t) => s + t.amt, 0);
}
function spentOn(cat, txns) {
  return (txns || S.transactions)
    .filter(t => t.type === 'expense' && t.cat === cat)
    .reduce((s,t) => s + t.amt, 0);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   NAVIGATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
let activePage = 'log';
function nav(page, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-item,.bn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll(`[data-page="${page}"]`).forEach(b => b.classList.add('active'));
  activePage = page;
  if (page === 'dashboard') renderDashboard();
  if (page === 'history')   { selMonth = ''; renderHistory(); }
  if (page === 'goals')     renderGoals();
  if (page === 'settings')  renderSettings();
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   POPULATE SELECTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function populateSelects() {
  // Income select — earned + parent as separate option
  const incSel = document.getElementById('inc-cat');
  const prevInc = incSel.value;
  incSel.innerHTML = '';
  // Parent first, visually separated
  const pOpt = document.createElement('option');
  pOpt.value = S.parentCat;
  pOpt.textContent = S.parentCat + '  (living allowance — not split into buckets)';
  incSel.appendChild(pOpt);
  // earned categories
  S.incCats.forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c;
    incSel.appendChild(o);
  });
  if (prevInc) incSel.value = prevInc;

  // Expense select
  const expSel = document.getElementById('exp-cat');
  const prevExp = expSel.value;
  expSel.innerHTML = '';
  S.expCats.forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c;
    expSel.appendChild(o);
  });
  if (prevExp) expSel.value = prevExp;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   LOG — ADD TRANSACTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function addTxn(type) {
  const pfx  = type === 'income' ? 'inc' : 'exp';
  const date = document.getElementById(pfx+'-date').value;
  const cat  = document.getElementById(pfx+'-cat').value;
  const desc = document.getElementById(pfx+'-desc').value.trim();
  const amt  = parseFloat(document.getElementById(pfx+'-amt').value);
  const err  = document.getElementById(pfx+'-err');
  err.textContent = '';

  if (!date)        { err.textContent = 'Select a date.'; return; }
  if (!amt || amt <= 0) { err.textContent = 'Enter a valid amount.'; return; }

  S.transactions.unshift({
    id: Date.now() + Math.random(),
    type, date, cat,
    desc: desc || cat,
    amt: Math.round(amt),
  });
  save();

  document.getElementById(pfx+'-amt').value  = '';
  document.getElementById(pfx+'-desc').value = '';
  renderTxnList();
  updateSidebarMonth();
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   LOG — RENDER TRANSACTION LIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderTxnList() {
  const el    = document.getElementById('txn-list');
  const query = (document.getElementById('search-input')?.value || '').toLowerCase();
  let txns = S.transactions;
  if (query) txns = txns.filter(t =>
    t.desc.toLowerCase().includes(query) ||
    t.cat.toLowerCase().includes(query)  ||
    t.date.includes(query)
  );

  if (!txns.length) {
    el.innerHTML = `<div class="txn-empty">${query ? 'No results found.' : 'No transactions yet — add your first one above.'}</div>`;
    return;
  }

  el.innerHTML = txns.map(t => `
    <div class="txn-item">
      <div class="txn-dot ${t.type}"></div>
      <div class="txn-info">
        <div class="txn-desc">${esc(t.desc)}</div>
        <div class="txn-meta">${esc(t.cat)}${t.cat === S.parentCat ? ' <span style="color:#7a6230;font-size:10px">· parent allowance</span>' : ''}</div>
      </div>
      <div class="txn-date">${t.date}</div>
      <div class="txn-amt ${t.type}">${t.type==='income'?'+':'−'}${fmt(t.amt)}</div>
      <div class="txn-actions">
        <button class="icon-btn edit" onclick="openEditTxn('${t.id}')" title="Edit">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="icon-btn del" onclick="deleteTxn('${t.id}')" title="Delete">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    </div>`).join('');
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   LOG — EDIT TRANSACTION (MODAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function openEditTxn(id) {
  const t = S.transactions.find(x => String(x.id) === String(id));
  if (!t) return;

  const allCats = t.type === 'income'
    ? [S.parentCat, ...S.incCats]
    : S.expCats;

  const catOpts = allCats.map(c =>
    `<option value="${esc(c)}" ${c===t.cat?'selected':''}>${esc(c)}</option>`
  ).join('');

  document.getElementById('modal-title').textContent = 'Edit ' + t.type;
  document.getElementById('modal-body').innerHTML = `
    <div class="frow"><label>Date</label><input type="date" id="m-date" value="${t.date}"></div>
    <div class="frow"><label>${t.type==='income'?'Source':'Bucket'}</label>
      <select id="m-cat">${catOpts}</select>
    </div>
    <div class="frow"><label>Description</label><input type="text" id="m-desc" value="${esc(t.desc)}"></div>
    <div class="frow"><label>Amount (₹)</label>
      <div class="amt-wrap"><span class="rs">₹</span><input type="number" id="m-amt" value="${t.amt}" min="0"></div>
    </div>`;

  document.getElementById('modal-err').textContent = '';
  document.getElementById('modal-save-btn').onclick = () => saveEditTxn(id);
  openModal();
}

function saveEditTxn(id) {
  const t    = S.transactions.find(x => String(x.id) === String(id));
  const date = document.getElementById('m-date').value;
  const cat  = document.getElementById('m-cat').value;
  const desc = document.getElementById('m-desc').value.trim();
  const amt  = parseFloat(document.getElementById('m-amt').value);
  const err  = document.getElementById('modal-err');
  err.textContent = '';

  if (!date)        { err.textContent = 'Select a date.'; return; }
  if (!amt || amt <= 0) { err.textContent = 'Enter a valid amount.'; return; }

  t.date = date; t.cat = cat;
  t.desc = desc || cat; t.amt = Math.round(amt);
  save(); closeModal(); renderTxnList();
  if (activePage === 'dashboard') renderDashboard();
  if (activePage === 'history')   renderHistory();
}

function deleteTxn(id) {
  if (!confirm('Delete this transaction?')) return;
  S.transactions = S.transactions.filter(t => String(t.id) !== String(id));
  save(); renderTxnList();
  if (activePage === 'dashboard') renderDashboard();
  if (activePage === 'history')   renderHistory();
}

function confirmClear() {
  if (!S.transactions.length) return;
  if (confirm('Delete ALL transactions? This cannot be undone.')) {
    S.transactions = []; save(); renderTxnList();
  }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderDashboard() {
  const txns    = S.transactions;
  const earned  = earnedIncome(txns);
  const parent  = parentIncome(txns);
  const totInc  = earned + parent;
  const totExp  = totalExpense(txns);
  const net     = totInc - totExp;
  const invested= spentOn('Invest (SIP/Gold)', txns);

  /* Daily living available:
     Parent money is already for daily living.
     Earned 30% is additional daily budget.
     Subtract daily living expenses from combined. */
  const dailyBudget  = parent + (earned * 0.30);
  const dailySpent   = spentOn('Daily living', txns);
  const dailyLeft    = Math.max(0, dailyBudget - dailySpent);

  document.getElementById('dash-avail').textContent = fmt(dailyLeft);
  document.getElementById('dash-sub').textContent   =
    `Budget: ${fmt(dailyBudget)}  (Parent: ${fmt(parent)} + Earned 30%: ${fmt(earned*0.30)})  ·  Spent: ${fmt(dailySpent)}`;

  document.getElementById('k-inc').textContent = fmt(totInc);
  document.getElementById('k-exp').textContent = fmt(totExp);
  document.getElementById('k-net').textContent = fmt(net);
  document.getElementById('k-inv').textContent = fmt(invested);
  document.getElementById('d-total').textContent = fmt(totExp);

  /* buckets based on earned income only */
  const bucketData = S.buckets.map(b => ({
    ...b,
    spent:  spentOn(b.expCat, txns),
    budget: earned * (b.pct / 100),
  }));

  drawDonut(bucketData);
  renderLegend(bucketData);
  renderBuckets(bucketData, earned);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DONUT CANVAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
let donutSegs = [];
function drawDonut(data) {
  const cv  = document.getElementById('donut');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const cx  = cv.width/2, cy = cv.height/2;
  const R   = cx * 0.84, r = cx * 0.54;
  ctx.clearRect(0, 0, cv.width, cv.height);
  donutSegs = [];

  const total = data.reduce((s,d) => s + d.spent, 0);
  if (!total) {
    ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2);
    ctx.fillStyle = '#1e1e1e'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.fillStyle = '#111'; ctx.fill();
    return;
  }

  let angle = -Math.PI/2;
  data.forEach(d => {
    if (!d.spent) return;
    const sweep = (d.spent/total) * Math.PI*2;
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,R,angle,angle+sweep);
    ctx.closePath(); ctx.fillStyle = d.color; ctx.fill();
    donutSegs.push({...d, a0:angle, a1:angle+sweep});
    angle += sweep;
  });

  /* inner */
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.fillStyle = '#111'; ctx.fill();

  /* gaps */
  ctx.lineWidth = 2; ctx.strokeStyle = '#111';
  donutSegs.forEach(s => {
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.lineTo(cx + Math.cos(s.a0)*R, cy + Math.sin(s.a0)*R);
    ctx.stroke();
  });
}

function renderLegend(data) {
  const el    = document.getElementById('d-legend');
  const total = data.reduce((s,d) => s + d.spent, 0) || 1;
  el.innerHTML = data
    .filter(d => d.spent > 0)
    .sort((a,b) => b.spent - a.spent)
    .map(d => `
      <div class="leg-row">
        <div class="leg-dot" style="background:${d.color}"></div>
        <span class="leg-name">${esc(d.name)}</span>
        <span class="leg-amt">${fmt(d.spent)}</span>
        <span class="leg-pct">${Math.round((d.spent/total)*100)}%</span>
      </div>`).join('');
}

function renderBuckets(data, earned) {
  const el = document.getElementById('bucket-list');
  el.innerHTML = data.map((b,i) => {
    const pct   = b.budget > 0 ? Math.min(120, Math.round((b.spent/b.budget)*100)) : 0;
    const over  = b.spent > b.budget && b.budget > 0;
    const left  = b.budget - b.spent;
    return `
      <div class="bucket-item">
        <div class="bucket-top">
          <div>
            <button class="bucket-name-edit" onclick="editBucketName(${i})">${esc(b.name)}</button>
            <button class="bucket-pct-edit" onclick="editBucketPct(${i})">${b.pct}%</button>
          </div>
          <span class="bucket-nums ${over?'bucket-over':''}">${fmt(b.spent)} / ${fmt(b.budget)}</span>
        </div>
        <div class="prog-track">
          <div class="prog-fill" style="width:${pct}%;background:${over?'var(--exp)':b.color}"></div>
        </div>
        <div class="prog-sub">
          <span>${over?'⚠ over by '+fmt(b.spent-b.budget):fmt(left)+' left'}</span>
          <span style="color:${over?'var(--exp)':'var(--t3)'}">${pct}%</span>
        </div>
      </div>`;
  }).join('');
}

/* inline bucket edits */
function editBucketName(i) {
  const b = S.buckets[i];
  const val = prompt('Rename bucket:', b.name);
  if (val && val.trim()) { S.buckets[i].name = val.trim(); save(); renderDashboard(); }
}
function editBucketPct(i) {
  const b = S.buckets[i];
  const val = prompt(`Set % for "${b.name}" (current: ${b.pct}%):`, b.pct);
  const n = parseFloat(val);
  if (!isNaN(n) && n >= 0 && n <= 100) {
    S.buckets[i].pct = n;
    save(); renderDashboard(); renderSettings();
  }
}

/* donut tooltip */
function initDonutTooltip() {
  const cv  = document.getElementById('donut');
  const tip = document.getElementById('d-tooltip');
  if (!cv || !tip) return;

  cv.addEventListener('mousemove', e => {
    const rect = cv.getBoundingClientRect();
    const scX  = cv.width  / rect.width;
    const scY  = cv.height / rect.height;
    const mx   = (e.clientX - rect.left) * scX - cv.width/2;
    const my   = (e.clientY - rect.top)  * scY - cv.height/2;
    const dist = Math.sqrt(mx*mx + my*my);
    const R    = cv.width/2*0.84, r = cv.width/2*0.54;

    if (dist > r && dist < R && donutSegs.length) {
      let a = Math.atan2(my, mx);
      if (a < -Math.PI/2) a += Math.PI*2;
      const seg = donutSegs.find(s => a >= s.a0 && a < s.a1);
      if (seg) {
        const total = donutSegs.reduce((s,d) => s+d.spent, 0);
        const pct   = Math.round((seg.spent/total)*100);
        tip.innerHTML = `<span style="color:${seg.color};font-weight:500">${esc(seg.name)}</span><br>${fmt(seg.spent)} · ${pct}% of spending`;
        tip.style.opacity = '1';
        tip.style.left = (e.clientX+16)+'px';
        tip.style.top  = (e.clientY-10)+'px';
        return;
      }
    }
    tip.style.opacity = '0';
  });
  cv.addEventListener('mouseleave', () => tip.style.opacity = '0');
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   HISTORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
let selMonth = '';
function renderHistory() {
  const months = allMonths();
  if (!selMonth || !months.includes(selMonth)) selMonth = months[0] || nowMonth();

  document.getElementById('month-tabs').innerHTML = months.map(m =>
    `<button class="month-tab ${m===selMonth?'active':''}" onclick="pickMonth('${m}')">${fmtMonth(m)}</button>`
  ).join('');

  const txns   = S.transactions.filter(t => monthOf(t.date) === selMonth);
  const earned = earnedIncome(txns);
  const parent = parentIncome(txns);
  const inc    = earned + parent;
  const exp    = totalExpense(txns);
  const net    = inc - exp;
  const inv    = spentOn('Invest (SIP/Gold)', txns);

  document.getElementById('hist-kpis').innerHTML = [
    {v:fmt(inc),  l:'Income',   c:'var(--inc)'},
    {v:fmt(exp),  l:'Spent',    c:'var(--exp)'},
    {v:fmt(net),  l:'Net',      c:'var(--gold)'},
    {v:fmt(inv),  l:'Invested', c:'var(--inv)'},
  ].map(k => `
    <div class="kpi">
      <div class="kpi-val" style="color:${k.c}">${k.v}</div>
      <div class="kpi-lbl">${k.l}</div>
    </div>`).join('');

  /* expense by cat */
  const expMap = {};
  txns.filter(t => t.type==='expense').forEach(t => { expMap[t.cat]=(expMap[t.cat]||0)+t.amt; });
  const maxE = Math.max(...Object.values(expMap), 1);
  const bColors = Object.fromEntries(S.buckets.map(b => [b.expCat, b.color]));

  document.getElementById('h-exp-cats').innerHTML =
    Object.entries(expMap).sort((a,b)=>b[1]-a[1]).map(([cat,amt]) => `
      <div class="hcat-row">
        <span class="hcat-name">${esc(cat)}</span>
        <div class="hcat-bar-wrap"><div class="hcat-bar" style="width:${Math.round((amt/maxE)*100)}%;background:${bColors[cat]||'#555'}"></div></div>
        <span class="hcat-amt">${fmt(amt)}</span>
      </div>`).join('') || '<div style="color:var(--t3);font-size:13px">No expenses</div>';

  /* income by source */
  const incMap = {};
  txns.filter(t => t.type==='income').forEach(t => { incMap[t.cat]=(incMap[t.cat]||0)+t.amt; });
  const maxI = Math.max(...Object.values(incMap), 1);

  document.getElementById('h-inc-cats').innerHTML =
    Object.entries(incMap).sort((a,b)=>b[1]-a[1]).map(([cat,amt]) => {
      const isParent = cat === S.parentCat;
      return `
        <div class="hcat-row">
          <span class="hcat-name">${esc(cat)}</span>
          <div class="hcat-bar-wrap"><div class="hcat-bar" style="width:${Math.round((amt/maxI)*100)}%;background:${isParent?'var(--gold)':'var(--inc)'}"></div></div>
          <span class="hcat-amt" style="color:${isParent?'var(--gold)':'var(--inc)'}">${fmt(amt)}</span>
        </div>`;
    }).join('') || '<div style="color:var(--t3);font-size:13px">No income</div>';

  /* earned vs parent note */
  if (parent > 0) {
    document.getElementById('h-inc-cats').innerHTML +=
      `<div style="margin-top:10px;font-size:11px;color:var(--t3);border-top:1px solid var(--b1);padding-top:8px">
        Earned: ${fmt(earned)} &nbsp;·&nbsp; Parent allowance: ${fmt(parent)} (not split into buckets)
      </div>`;
  }

  /* txn list */
  const hTxn = document.getElementById('h-txns');
  if (!txns.length) {
    hTxn.innerHTML = `<div class="txn-empty">No transactions for ${fmtMonth(selMonth)}</div>`;
  } else {
    hTxn.innerHTML = txns.map(t => `
      <div class="txn-item">
        <div class="txn-dot ${t.type}"></div>
        <div class="txn-info">
          <div class="txn-desc">${esc(t.desc)}</div>
          <div class="txn-meta">${esc(t.cat)}</div>
        </div>
        <div class="txn-date">${t.date}</div>
        <div class="txn-amt ${t.type}">${t.type==='income'?'+':'−'}${fmt(t.amt)}</div>
        <div class="txn-actions">
          <button class="icon-btn edit" onclick="openEditTxn('${t.id}');nav('log',document.querySelector('[data-page=log]'))" title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn del" onclick="deleteTxn('${t.id}')" title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </div>`).join('');
  }
}

function pickMonth(m) { selMonth = m; renderHistory(); }

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   GOALS — fully inline editable
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderGoals() {
  const el = document.getElementById('goals-grid');
  if (!S.goals.length) {
    el.innerHTML = '<div style="color:var(--t3);font-size:13px;grid-column:1/-1">No goals yet — add one below.</div>';
    return;
  }
  el.innerHTML = S.goals.map((g,i) => {
    const pct = g.target > 0 ? Math.min(100, Math.round((g.saved/g.target)*100)) : 0;
    const rem = Math.max(0, g.target - g.saved);
    return `
      <div class="goal-card">
        <button class="icon-btn del goal-del" onclick="deleteGoal(${i})" title="Delete goal">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div class="goal-card-top">
          <div style="flex:1;min-width:0">
            <input class="goal-name-field" value="${esc(g.name)}"
              onchange="updateGoal(${i},'name',this.value)"
              title="Click to rename">
            <input type="date" class="goal-deadline-field" value="${g.deadline||''}"
              onchange="updateGoal(${i},'deadline',this.value)"
              title="Click to change deadline">
          </div>
          <div class="goal-pct">${pct}%</div>
        </div>
        <div class="goal-amts">
          <span>
            <span style="color:var(--t3);font-size:11px">saved &nbsp;</span>
            <input class="goal-field" type="number" value="${g.saved}" min="0"
              onchange="updateGoal(${i},'saved',this.value)"
              title="Click to update amount saved">
          </span>
          <span>
            <span style="color:var(--t3);font-size:11px">target &nbsp;</span>
            <input class="goal-field" type="number" value="${g.target}" min="0"
              onchange="updateGoal(${i},'target',this.value)"
              title="Click to change target">
          </span>
        </div>
        <div class="goal-track">
          <div class="goal-fill" style="width:${pct}%"></div>
        </div>
        <div class="goal-remaining">
          ${pct>=100
            ? '<span style="color:var(--inc)">✓ Goal reached!</span>'
            : fmt(rem)+' to go'}
        </div>
      </div>`;
  }).join('');
}

function updateGoal(i, key, val) {
  if (key === 'saved' || key === 'target') {
    const n = parseFloat(val);
    if (isNaN(n) || n < 0) return;
    S.goals[i][key] = Math.round(n);
  } else {
    S.goals[i][key] = val;
  }
  save(); renderGoals();
}

function addGoal() {
  const name     = document.getElementById('g-name').value.trim();
  const target   = parseFloat(document.getElementById('g-target').value);
  const saved    = parseFloat(document.getElementById('g-saved').value) || 0;
  const deadline = document.getElementById('g-deadline').value;
  const err      = document.getElementById('g-err');
  err.textContent = '';

  if (!name)           { err.textContent = 'Enter a goal name.'; return; }
  if (!target || target<=0){ err.textContent = 'Enter a valid target.'; return; }

  S.goals.push({ name, target:Math.round(target), saved:Math.round(saved), deadline });
  save();
  document.getElementById('g-name').value = '';
  document.getElementById('g-target').value = '';
  document.getElementById('g-saved').value = '';
  document.getElementById('g-deadline').value = '';
  renderGoals();
}

function deleteGoal(i) {
  if (!confirm('Delete this goal?')) return;
  S.goals.splice(i,1); save(); renderGoals();
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SETTINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderSettings() {
  /* Income categories */
  document.getElementById('inc-cats-list').innerHTML = S.incCats.map((c,i) => `
    <div class="cat-row">
      <input class="cat-row-name" value="${esc(c)}"
        onchange="renameIncCat(${i},this.value)" title="Click to rename">
      <button class="icon-btn del" onclick="deleteIncCat(${i})" title="Delete">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`).join('');

  /* Parent category row — always shown, not deletable */
  document.getElementById('inc-cats-list').innerHTML += `
    <div class="cat-row" style="border-color:var(--gold-d);background:var(--gold-bg)">
      <span style="flex:1;font-size:13px;color:var(--gold)">${esc(S.parentCat)}</span>
      <span style="font-size:11px;color:var(--gold-d)">Living allowance — locked</span>
    </div>`;

  /* Expense categories */
  document.getElementById('exp-cats-list').innerHTML = S.expCats.map((c,i) => `
    <div class="cat-row">
      <input class="cat-row-name" value="${esc(c)}"
        onchange="renameExpCat(${i},this.value)" title="Click to rename">
      <button class="icon-btn del" onclick="deleteExpCat(${i})" title="Delete">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`).join('');

  /* Buckets config */
  const totalPct = S.buckets.reduce((s,b) => s+b.pct, 0);
  document.getElementById('b-err').textContent =
    totalPct !== 100 ? `⚠ Bucket %s total ${totalPct}% (should be 100%)` : '';

  document.getElementById('buckets-config').innerHTML = S.buckets.map((b,i) => `
    <div class="bcfg-row">
      <input class="bcfg-name" value="${esc(b.name)}"
        onchange="S.buckets[${i}].name=this.value;save();populateSelects();renderSettings()"
        title="Bucket name">
      <input class="bcfg-pct" type="number" value="${b.pct}" min="0" max="100"
        onchange="S.buckets[${i}].pct=parseFloat(this.value)||0;save();renderSettings()"
        title="% of earned income">
      <input class="bcfg-color" type="color" value="${b.color}"
        oninput="S.buckets[${i}].color=this.value;save();renderSettings()">
      <button class="icon-btn del" onclick="deleteBucket(${i})" title="Delete bucket">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`).join('');
}

/* cat CRUD */
function renameIncCat(i, v) {
  if (!v.trim()) return;
  S.transactions.forEach(t => { if (t.cat===S.incCats[i]&&t.type==='income') t.cat=v.trim(); });
  S.incCats[i] = v.trim(); save(); populateSelects();
}
function deleteIncCat(i) {
  if (!confirm('Delete income category "'+S.incCats[i]+'"?')) return;
  S.incCats.splice(i,1); save(); populateSelects(); renderSettings();
}
function renameExpCat(i, v) {
  if (!v.trim()) return;
  const old = S.expCats[i];
  S.transactions.forEach(t => { if (t.cat===old&&t.type==='expense') t.cat=v.trim(); });
  S.buckets.forEach(b => { if (b.expCat===old) b.expCat=v.trim(); });
  S.expCats[i] = v.trim(); save(); populateSelects();
}
function deleteExpCat(i) {
  if (!confirm('Delete expense category "'+S.expCats[i]+'"?')) return;
  S.expCats.splice(i,1); save(); populateSelects(); renderSettings();
}
function addCat(type) {
  const inputId = type==='income' ? 'new-inc-cat' : 'new-exp-cat';
  const errId   = type==='income' ? 'inc-cat-err' : 'exp-cat-err';
  const v = document.getElementById(inputId).value.trim();
  document.getElementById(errId).textContent = '';
  if (!v) { document.getElementById(errId).textContent='Enter a name.'; return; }
  if (type==='income') S.incCats.push(v);
  else { S.expCats.push(v); }
  document.getElementById(inputId).value = '';
  save(); populateSelects(); renderSettings();
}

/* bucket CRUD */
function addBucket() {
  S.buckets.push({ id:'b'+Date.now(), name:'New bucket', pct:0, color:'#888888', expCat:'Other' });
  save(); renderSettings();
}
function deleteBucket(i) {
  if (!confirm('Delete bucket "'+S.buckets[i].name+'"?')) return;
  S.buckets.splice(i,1); save(); renderSettings();
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MODAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function openModal()  { document.getElementById('modal-overlay').classList.add('open'); }
function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SIDEBAR MONTH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function updateSidebarMonth() {
  const el = document.getElementById('sidebar-month');
  if (el) el.textContent = fmtMonth(nowMonth());
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   EXPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function exportData() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type:'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'vault-backup-' + today() + '.json';
  a.click();
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DEFAULT GOALS SEED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function seedGoals() {
  if (S.goals.length) return;
  S.goals = [
    { name:'TTD Balaji Donation',    target:15000,  saved:13975, deadline:'2026-09-30' },
    { name:'CPTS Certification',     target:40000,  saved:0,     deadline:'2027-01-01' },
    { name:'Emergency Fund',         target:50000,  saved:0,     deadline:'2027-03-01' },
    { name:'YouTube Setup',          target:5000,   saved:0,     deadline:'2026-10-01' },
    { name:'Company Registration',   target:20000,  saved:0,     deadline:'2027-03-01' },
    { name:'OSCP Certification',     target:125000, saved:0,     deadline:'2027-06-01' },
  ];
  save();
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   BOOT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
loadState();
seedGoals();

document.getElementById('inc-date').value = today();
document.getElementById('exp-date').value = today();

populateSelects();
renderTxnList();
updateSidebarMonth();
initDonutTooltip();
