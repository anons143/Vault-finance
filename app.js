'use strict';

/* ── BUCKETS CONFIG ── */
const BUCKETS = [
  { id: 'Daily living',   label: 'Daily living',    pct: 30, color: '#c9a84c' },
  { id: 'Invest',         label: 'Invest',           pct: 20, color: '#2980b9' },
  { id: 'Emergency fund', label: 'Emergency fund',   pct: 10, color: '#27ae60' },
  { id: 'Business',       label: 'Business',         pct: 20, color: '#8e44ad' },
  { id: 'Personal growth',label: 'Personal growth',  pct: 10, color: '#e67e22' },
  { id: 'Donations',      label: 'Donations',        pct: 5,  color: '#e84393' },
  { id: 'Protein & longevity', label: 'Protein & longevity', pct: 5, color: '#1abc9c' },
];

const BUCKET_IDS_MAIN = ['Daily living','Invest','Emergency fund','Business','Personal growth'];

/* ── STATE ── */
let state = {
  transactions: [],
  goals: [],
};

/* ── STORAGE ── */
function loadState() {
  try {
    const raw = localStorage.getItem('vault_state');
    if (raw) state = JSON.parse(raw);
    if (!state.transactions) state.transactions = [];
    if (!state.goals) state.goals = [];
  } catch(e) { /* fresh start */ }
}
function saveState() {
  try { localStorage.setItem('vault_state', JSON.stringify(state)); } catch(e) {}
}

/* ── HELPERS ── */
function fmt(n) {
  const abs = Math.abs(Math.round(n));
  return '₹' + abs.toLocaleString('en-IN');
}
function fmtSign(n) {
  return (n >= 0 ? '+' : '−') + fmt(n);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function monthOf(dateStr) {
  return dateStr ? dateStr.slice(0, 7) : '';
}
function formatMonth(m) {
  if (!m) return '';
  const [y, mo] = m.split('-');
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return names[parseInt(mo, 10) - 1] + ' ' + y;
}
function allMonths() {
  const months = [...new Set(state.transactions.map(t => monthOf(t.date)))].sort().reverse();
  const cur = today().slice(0, 7);
  if (!months.includes(cur)) months.unshift(cur);
  return months;
}
function currentMonth() {
  return today().slice(0, 7);
}

/* ── INIT DATES ── */
function initDates() {
  const d = today();
  document.getElementById('inc-date').value = d;
  document.getElementById('exp-date').value = d;
}

/* ── NAVIGATION ── */
let activePage = 'log';
function showPage(page, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');

  document.querySelectorAll('.nav-item, .bnav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll(`[data-page="${page}"]`).forEach(b => b.classList.add('active'));

  activePage = page;
  if (page === 'dashboard') renderDashboard();
  if (page === 'history')   renderHistory();
  if (page === 'goals')     renderGoals();
}

/* ── ADD TRANSACTION ── */
function addTransaction(type) {
  const dateEl  = document.getElementById(type === 'income' ? 'inc-date'  : 'exp-date');
  const catEl   = document.getElementById(type === 'income' ? 'inc-cat'   : 'exp-cat');
  const descEl  = document.getElementById(type === 'income' ? 'inc-desc'  : 'exp-desc');
  const amtEl   = document.getElementById(type === 'income' ? 'inc-amt'   : 'exp-amt');
  const errEl   = document.getElementById(type === 'income' ? 'inc-err'   : 'exp-err');

  errEl.textContent = '';

  const date = dateEl.value;
  if (!date) { errEl.textContent = 'Select a date.'; return; }

  const amt = parseFloat(amtEl.value);
  if (!amt || amt <= 0) { errEl.textContent = 'Enter a valid amount.'; return; }

  const txn = {
    id: Date.now() + Math.random(),
    type,
    date,
    cat: catEl.value,
    desc: descEl.value.trim() || catEl.value,
    amt: Math.round(amt),
  };

  state.transactions.unshift(txn);
  saveState();

  amtEl.value = '';
  descEl.value = '';

  renderTxnList();
  updateSidebarMonth();
}

/* ── DELETE TRANSACTION ── */
function deleteTxn(id) {
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveState();
  renderTxnList();
  if (activePage === 'dashboard') renderDashboard();
  if (activePage === 'history')   renderHistory();
}

function confirmClear() {
  if (state.transactions.length === 0) return;
  if (confirm('Delete all transactions? This cannot be undone.')) {
    state.transactions = [];
    saveState();
    renderTxnList();
  }
}

/* ── RENDER TRANSACTIONS ── */
function renderTxnList() {
  const el = document.getElementById('txn-list');
  if (!state.transactions.length) {
    el.innerHTML = '<div class="txn-empty">No transactions yet — add your first one above.</div>';
    return;
  }
  el.innerHTML = state.transactions.slice(0, 60).map(t => `
    <div class="txn-item">
      <div class="txn-dot ${t.type}"></div>
      <div class="txn-info">
        <div class="txn-desc">${escHtml(t.desc)}</div>
        <div class="txn-meta">${escHtml(t.cat)}</div>
      </div>
      <div class="txn-date">${t.date}</div>
      <div class="txn-amt ${t.type}">${t.type === 'income' ? '+' : '−'}${fmt(t.amt)}</div>
      <button class="txn-del" onclick="deleteTxn(${t.id})" title="Delete">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
    </div>`).join('');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── DASHBOARD ── */
function renderDashboard() {
  const txns = state.transactions;
  const totalInc  = txns.filter(t => t.type === 'income').reduce((s,t) => s + t.amt, 0);
  const totalExp  = txns.filter(t => t.type === 'expense').reduce((s,t) => s + t.amt, 0);
  const net       = totalInc - totalExp;
  const invested  = txns.filter(t => t.type === 'expense' && t.cat === 'Invest').reduce((s,t) => s + t.amt, 0);

  const dailySpent  = txns.filter(t => t.type === 'expense' && t.cat === 'Daily living').reduce((s,t) => s + t.amt, 0);
  const dailyBudget = totalInc * 0.30;
  const dailyLeft   = Math.max(0, dailyBudget - dailySpent);

  document.getElementById('dash-available').textContent = fmt(dailyLeft);
  document.getElementById('dash-sub').textContent =
    `Budget: ${fmt(dailyBudget)}  ·  Spent: ${fmt(dailySpent)}`;

  document.getElementById('kpi-income').textContent   = fmt(totalInc);
  document.getElementById('kpi-expense').textContent  = fmt(totalExp);
  document.getElementById('kpi-net').textContent      = fmt(net);
  document.getElementById('kpi-invested').textContent = fmt(invested);
  document.getElementById('donut-total').textContent  = fmt(totalExp);

  /* bucket data */
  const catMap = {};
  txns.filter(t => t.type === 'expense').forEach(t => {
    catMap[t.cat] = (catMap[t.cat] || 0) + t.amt;
  });

  const bucketData = BUCKETS.map(b => ({
    ...b,
    spent:  catMap[b.id] || 0,
    budget: totalInc * (b.pct / 100),
  }));

  drawDonut(bucketData);
  renderLegend(bucketData);
  renderBuckets(bucketData);
}

/* ── DONUT ── */
let donutSegments = [];

function drawDonut(data) {
  const canvas = document.getElementById('donut-canvas');
  const ctx    = canvas.getContext('2d');
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;
  const R  = cx * 0.82;
  const r  = cx * 0.52;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const total = data.reduce((s, d) => s + d.spent, 0);
  donutSegments = [];

  if (!total) {
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = '#222';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();
    return;
  }

  let angle = -Math.PI / 2;
  data.forEach(d => {
    if (!d.spent) return;
    const sweep = (d.spent / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = d.color;
    ctx.fill();
    donutSegments.push({ ...d, startAngle: angle, endAngle: angle + sweep });
    angle += sweep;
  });

  /* inner circle */
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#111';
  ctx.fill();

  /* subtle gap lines */
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#111';
  donutSegments.forEach(seg => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(seg.startAngle) * R, cy + Math.sin(seg.startAngle) * R);
    ctx.stroke();
  });
}

/* Tooltip on hover */
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('donut-canvas');
  const tooltip = document.getElementById('donut-tooltip');

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX - canvas.width  / 2;
    const my = (e.clientY - rect.top)  * scaleY - canvas.height / 2;
    const dist = Math.sqrt(mx * mx + my * my);
    const R = canvas.width / 2 * 0.82;
    const r = canvas.width / 2 * 0.52;

    if (dist > r && dist < R && donutSegments.length) {
      let a = Math.atan2(my, mx);
      if (a < -Math.PI / 2) a += Math.PI * 2;
      const seg = donutSegments.find(s => a >= s.startAngle && a < s.endAngle);
      if (seg) {
        const total = donutSegments.reduce((s, d) => s + d.spent, 0);
        const pct   = Math.round((seg.spent / total) * 100);
        tooltip.innerHTML = `<span style="color:${seg.color};font-weight:500">${seg.label}</span><br>${fmt(seg.spent)} &nbsp;<span style="color:#666">${pct}% of spending</span>`;
        tooltip.style.opacity = '1';
        tooltip.style.left = (e.clientX + 16) + 'px';
        tooltip.style.top  = (e.clientY - 10) + 'px';
        return;
      }
    }
    tooltip.style.opacity = '0';
  });

  canvas.addEventListener('mouseleave', () => {
    document.getElementById('donut-tooltip').style.opacity = '0';
  });
});

function renderLegend(data) {
  const total = data.reduce((s, d) => s + d.spent, 0) || 1;
  document.getElementById('donut-legend').innerHTML = data
    .filter(d => d.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .map(d => `
      <div class="legend-row">
        <div class="legend-dot" style="background:${d.color}"></div>
        <span class="legend-name">${d.label}</span>
        <span class="legend-amt">${fmt(d.spent)}</span>
        <span class="legend-pct">${Math.round((d.spent / total) * 100)}%</span>
      </div>`).join('');
}

function renderBuckets(data) {
  const mainBuckets = data.filter(b => BUCKET_IDS_MAIN.includes(b.id));
  document.getElementById('bucket-list').innerHTML = mainBuckets.map(b => {
    const pct  = b.budget > 0 ? Math.min(110, Math.round((b.spent / b.budget) * 100)) : 0;
    const over = b.spent > b.budget && b.budget > 0;
    return `
      <div class="bucket-item">
        <div class="bucket-top">
          <span class="bucket-name">${b.label} <span style="color:#555;font-size:11px">${b.pct}%</span></span>
          <span class="bucket-numbers ${over ? 'bucket-over' : ''}">${fmt(b.spent)} / ${fmt(b.budget)}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${pct}%;background:${over ? '#c0392b' : b.color}"></div>
        </div>
        <div class="bucket-pct-label ${over ? 'bucket-over' : ''}">${pct}%${over ? ' — over budget' : ''}</div>
      </div>`;
  }).join('');
}

/* ── HISTORY ── */
let selectedMonth = '';

function renderHistory() {
  const months = allMonths();
  if (!selectedMonth || !months.includes(selectedMonth)) {
    selectedMonth = months[0] || currentMonth();
  }

  /* tabs */
  document.getElementById('month-tabs').innerHTML = months.map(m => `
    <button class="month-tab ${m === selectedMonth ? 'active' : ''}"
      onclick="selectMonth('${m}')">${formatMonth(m)}</button>`).join('');

  const txns = state.transactions.filter(t => monthOf(t.date) === selectedMonth);
  const inc  = txns.filter(t => t.type === 'income').reduce((s,t) => s + t.amt, 0);
  const exp  = txns.filter(t => t.type === 'expense').reduce((s,t) => s + t.amt, 0);
  const net  = inc - exp;
  const inv  = txns.filter(t => t.type === 'expense' && t.cat === 'Invest').reduce((s,t) => s + t.amt, 0);

  document.getElementById('hist-kpis').innerHTML = [
    { val: fmt(inc),  label: 'Income',   color: '#3d9970' },
    { val: fmt(exp),  label: 'Spent',    color: '#c0392b' },
    { val: fmt(net),  label: 'Net',      color: '#c9a84c' },
    { val: fmt(inv),  label: 'Invested', color: '#2980b9' },
  ].map(k => `
    <div class="kpi-card">
      <div class="kpi-val" style="color:${k.color}">${k.val}</div>
      <div class="kpi-label">${k.label}</div>
    </div>`).join('');

  /* expense by cat */
  const expCat = {};
  txns.filter(t => t.type === 'expense').forEach(t => {
    expCat[t.cat] = (expCat[t.cat] || 0) + t.amt;
  });
  const maxExp = Math.max(...Object.values(expCat), 1);
  const bucketColors = Object.fromEntries(BUCKETS.map(b => [b.id, b.color]));

  document.getElementById('hist-cat-list').innerHTML = Object.entries(expCat)
    .sort((a,b) => b[1] - a[1])
    .map(([cat, amt]) => {
      const color = bucketColors[cat] || '#555';
      return `<div class="hist-cat-row">
        <span class="hist-cat-name">${cat}</span>
        <div class="hist-bar-wrap"><div class="hist-bar" style="width:${Math.round((amt/maxExp)*100)}%;background:${color}"></div></div>
        <span class="hist-cat-amt">${fmt(amt)}</span>
      </div>`;
    }).join('') || '<div style="color:#555;font-size:13px">No expenses this month</div>';

  /* income by source */
  const incCat = {};
  txns.filter(t => t.type === 'income').forEach(t => {
    incCat[t.cat] = (incCat[t.cat] || 0) + t.amt;
  });
  const maxInc = Math.max(...Object.values(incCat), 1);

  document.getElementById('hist-inc-list').innerHTML = Object.entries(incCat)
    .sort((a,b) => b[1] - a[1])
    .map(([cat, amt]) => `
      <div class="hist-cat-row">
        <span class="hist-cat-name">${cat}</span>
        <div class="hist-bar-wrap"><div class="hist-bar" style="width:${Math.round((amt/maxInc)*100)}%;background:#3d9970"></div></div>
        <span class="hist-cat-amt">${fmt(amt)}</span>
      </div>`).join('') || '<div style="color:#555;font-size:13px">No income this month</div>';

  /* transaction list */
  const histTxnEl = document.getElementById('hist-txn-list');
  if (!txns.length) {
    histTxnEl.innerHTML = '<div class="txn-empty">No transactions for ' + formatMonth(selectedMonth) + '</div>';
  } else {
    histTxnEl.innerHTML = txns.map(t => `
      <div class="txn-item">
        <div class="txn-dot ${t.type}"></div>
        <div class="txn-info">
          <div class="txn-desc">${escHtml(t.desc)}</div>
          <div class="txn-meta">${escHtml(t.cat)}</div>
        </div>
        <div class="txn-date">${t.date}</div>
        <div class="txn-amt ${t.type}">${t.type === 'income' ? '+' : '−'}${fmt(t.amt)}</div>
      </div>`).join('');
  }
}

function selectMonth(m) {
  selectedMonth = m;
  renderHistory();
}

/* ── GOALS ── */
function renderGoals() {
  const el = document.getElementById('goals-grid');
  if (!state.goals.length) {
    el.innerHTML = '<div style="color:#555;font-size:13px;grid-column:1/-1">No goals yet — add your first one below.</div>';
    return;
  }
  el.innerHTML = state.goals.map((g, i) => {
    const pct = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0;
    const remaining = Math.max(0, g.target - g.saved);
    return `
      <div class="goal-card">
        <button class="goal-del" onclick="deleteGoal(${i})" title="Delete goal">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div class="goal-card-top">
          <div>
            <div class="goal-card-name">${escHtml(g.name)}</div>
            <div class="goal-card-deadline">${g.deadline ? 'By ' + g.deadline : 'No deadline'}</div>
          </div>
          <div class="goal-card-pct">${pct}%</div>
        </div>
        <div class="goal-card-amounts">
          <span>${fmt(g.saved)} saved</span>
          <span>${fmt(g.target)} target</span>
        </div>
        <div class="goal-track">
          <div class="goal-fill" style="width:${pct}%"></div>
        </div>
        <div class="goal-remaining">${remaining > 0 ? fmt(remaining) + ' to go' : 'Goal reached!'}</div>
      </div>`;
  }).join('');
}

function addGoal() {
  const name    = document.getElementById('goal-name').value.trim();
  const target  = parseFloat(document.getElementById('goal-target').value);
  const saved   = parseFloat(document.getElementById('goal-saved').value) || 0;
  const deadline= document.getElementById('goal-deadline').value;
  const err     = document.getElementById('goal-err');

  err.textContent = '';
  if (!name)           { err.textContent = 'Enter a goal name.'; return; }
  if (!target || target <= 0) { err.textContent = 'Enter a valid target amount.'; return; }

  state.goals.push({ name, target: Math.round(target), saved: Math.round(saved), deadline });
  saveState();

  document.getElementById('goal-name').value = '';
  document.getElementById('goal-target').value = '';
  document.getElementById('goal-saved').value = '';
  document.getElementById('goal-deadline').value = '';

  renderGoals();
}

function deleteGoal(i) {
  if (!confirm('Delete this goal?')) return;
  state.goals.splice(i, 1);
  saveState();
  renderGoals();
}

/* ── SIDEBAR MONTH ── */
function updateSidebarMonth() {
  const el = document.getElementById('sidebar-month');
  if (el) el.textContent = formatMonth(currentMonth());
}

/* ── PRESET GOALS ── */
function seedDefaultGoals() {
  if (state.goals.length > 0) return;
  state.goals = [
    { name: 'TTD Balaji Donation', target: 15000, saved: 13975, deadline: '2026-09-15' },
    { name: 'CPTS Certification',  target: 40000, saved: 0,     deadline: '2027-01-01' },
    { name: 'Emergency Fund',      target: 50000, saved: 0,     deadline: '2027-03-01' },
    { name: 'YouTube Setup',       target: 5000,  saved: 0,     deadline: '2026-10-01' },
    { name: 'OSCP Certification',  target: 125000,saved: 0,     deadline: '2027-06-01' },
  ];
  saveState();
}

/* ── BOOT ── */
loadState();
seedDefaultGoals();
initDates();
renderTxnList();
updateSidebarMonth();
