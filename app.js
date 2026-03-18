let tipPct    = 15;
let mode      = 'equal';
let people    = [];
let personId  = 0;

// ---- TIP ----
function setTip(pct) {
  tipPct = pct;
  document.getElementById('customTip').value = '';
  document.querySelectorAll('.tip-btn').forEach(btn => {
    btn.className = 'tip-btn px-4 py-2 rounded-xl border text-sm font-semibold transition-all border-white/20 bg-white/5';
  });
  const el = document.getElementById('tip' + pct);
  if (el) el.className = 'tip-btn px-4 py-2 rounded-xl border text-sm font-semibold transition-all border-rose-500 bg-rose-600/30 ring-2 ring-rose-500';
  updateTipAmount();
}

document.getElementById('customTip').addEventListener('input', e => {
  tipPct = parseFloat(e.target.value) || 0;
  document.querySelectorAll('.tip-btn').forEach(btn => {
    btn.className = 'tip-btn px-4 py-2 rounded-xl border text-sm font-semibold transition-all border-white/20 bg-white/5';
  });
  updateTipAmount();
});

document.getElementById('totalInput').addEventListener('input', updateTipAmount);

function updateTipAmount() {
  const total = parseFloat(document.getElementById('totalInput').value) || 0;
  const tip   = total * tipPct / 100;
  document.getElementById('tipAmount').textContent = tip > 0 ? `+€${tip.toFixed(2)}` : '';
}

// ---- MODE ----
function setMode(m) {
  mode = m;
  document.getElementById('equalPanel').classList.toggle('hidden',   m !== 'equal');
  document.getElementById('unequalPanel').classList.toggle('hidden', m !== 'unequal');
  document.getElementById('btnEqual').className   = `flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${m==='equal'   ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`;
  document.getElementById('btnUnequal').className = `flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${m==='unequal' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`;
}

// ---- EQUAL SPLIT ----
let numPeople = 2;
function adjustPeople(delta) {
  numPeople = Math.max(1, Math.min(20, numPeople + delta));
  document.getElementById('peopleCount').textContent = numPeople;
}

// ---- UNEQUAL SPLIT ----
function addPerson() {
  const id = ++personId;
  people.push({ id, name: '', amount: '' });
  renderPersons();
}

function removePerson(id) {
  people = people.filter(p => p.id !== id);
  renderPersons();
}

function renderPersons() {
  const list = document.getElementById('personsList');
  list.innerHTML = '';
  people.forEach(p => {
    const row = document.createElement('div');
    row.className = 'flex gap-2 items-center';
    row.innerHTML = `
      <input type="text" placeholder="Name" maxlength="20" value="${p.name}"
        class="flex-1 p-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-rose-500 focus:outline-none text-sm"
        oninput="updatePerson(${p.id}, 'name', this.value)">
      <input type="number" inputmode="decimal" placeholder="€0.00" value="${p.amount}"
        class="w-24 p-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-rose-500 focus:outline-none text-sm"
        oninput="updatePerson(${p.id}, 'amount', this.value)">
      <button onclick="removePerson(${p.id})" class="w-10 h-10 bg-white/5 hover:bg-red-600/40 rounded-xl transition-all text-slate-400 hover:text-white">✕</button>
    `;
    list.appendChild(row);
  });
}

function updatePerson(id, field, value) {
  const p = people.find(p => p.id === id);
  if (p) p[field] = value;
}

// ---- CALCULATE ----
function calculate() {
  const total = parseFloat(document.getElementById('totalInput').value);
  if (!total || total <= 0) { alert('Enter the bill total first.'); return; }

  const grandTotal = total * (1 + tipPct / 100);

  if (mode === 'equal') {
    calcEqual(grandTotal);
  } else {
    if (people.length === 0) { alert('Add at least one person in Custom mode.'); return; }
    calcUnequal(grandTotal);
  }

  document.getElementById('shareCard').classList.remove('hidden');
  document.getElementById('shareCard').scrollIntoView({ behavior: 'smooth' });
}

function calcEqual(grandTotal) {
  const per = grandTotal / numPeople;
  document.getElementById('equalResult').classList.remove('hidden');
  document.getElementById('perPersonAmount').textContent = '€' + per.toFixed(2);
  document.getElementById('equalBreakdown').textContent  =
    `€${grandTotal.toFixed(2)} total (incl. ${tipPct}% tip) ÷ ${numPeople} people`;
}

function calcUnequal(grandTotal) {
  const assigned = people.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const remainder = grandTotal - assigned * (1 + tipPct / 100);
  const blanks = people.filter(p => !p.amount || parseFloat(p.amount) === 0);

  // Each person's share with tip
  const shares = people.map((p, i) => {
    let base;
    if (!p.amount || parseFloat(p.amount) === 0) {
      base = blanks.length > 0 ? Math.max(0, remainder) / blanks.length : 0;
    } else {
      base = parseFloat(p.amount) * (1 + tipPct / 100);
    }
    return { name: p.name || `Person ${i + 1}`, owes: base };
  });

  // Render per-person breakdown
  const breakdownEl = document.getElementById('unequalBreakdown');
  breakdownEl.innerHTML = shares.map(s => `
    <div class="flex justify-between p-3 bg-white/5 rounded-xl">
      <span class="font-semibold">${s.name}</span>
      <span class="font-mono font-bold text-rose-300">€${s.owes.toFixed(2)}</span>
    </div>
  `).join('');

  // Settle up — minimize transactions algorithm
  const settle = minimizeTransactions(shares);
  const settleEl = document.getElementById('settleUp');
  settleEl.innerHTML = settle.length
    ? settle.map(t => `
        <div class="flex items-center gap-2 p-3 bg-emerald-900/20 border border-emerald-500/20 rounded-xl text-sm">
          <span class="font-semibold text-rose-300">${t.from}</span>
          <span class="text-slate-400">pays</span>
          <span class="font-semibold text-emerald-300">${t.to}</span>
          <span class="ml-auto font-mono font-bold">€${t.amount.toFixed(2)}</span>
        </div>
      `).join('')
    : '<div class="text-slate-400 text-sm p-3">Everyone paid equally — nothing to settle!</div>';

  document.getElementById('unequalResult').classList.remove('hidden');
}

function minimizeTransactions(shares) {
  // Build balance array
  const balances = shares.map(s => ({ name: s.name, bal: s.owes }));
  const avg = balances.reduce((s, b) => s + b.bal, 0) / balances.length;
  balances.forEach(b => b.bal = +(b.bal - avg).toFixed(2));

  const transactions = [];
  const debtors  = balances.filter(b => b.bal > 0.01).sort((a,b) => b.bal - a.bal);
  const creditors = balances.filter(b => b.bal < -0.01).sort((a,b) => a.bal - b.bal);

  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].bal, -creditors[j].bal);
    transactions.push({ from: debtors[i].name, to: creditors[j].name, amount });
    debtors[i].bal   -= amount;
    creditors[j].bal += amount;
    if (Math.abs(debtors[i].bal)   < 0.01) i++;
    if (Math.abs(creditors[j].bal) < 0.01) j++;
  }
  return transactions;
}

// ---- SHARE ----
function buildSummaryText() {
  const total = parseFloat(document.getElementById('totalInput').value) || 0;
  const grandTotal = total * (1 + tipPct / 100);
  let text = `💸 BillSplit Pro\nTotal: €${grandTotal.toFixed(2)} (${tipPct}% tip)\n\n`;

  if (mode === 'equal') {
    const per = grandTotal / numPeople;
    text += `${numPeople} people — €${per.toFixed(2)} each`;
  } else {
    const shares = [...document.querySelectorAll('#unequalBreakdown > div')];
    shares.forEach(row => {
      const cols = row.querySelectorAll('span');
      text += `${cols[0].textContent}: ${cols[1].textContent}\n`;
    });
    text += '\nSettle up:\n';
    const txns = [...document.querySelectorAll('#settleUp > div')];
    txns.forEach(row => {
      const spans = row.querySelectorAll('span');
      if (spans.length >= 4) text += `${spans[0].textContent} → ${spans[2].textContent}: ${spans[3].textContent}\n`;
    });
  }
  return text;
}

function shareAsText() {
  const text = buildSummaryText();
  navigator.clipboard.writeText(text)
    .then(() => alert('✅ Copied! Paste in your group chat.'))
    .catch(() => prompt('Copy this:', text));
}

async function shareAsImage() {
  const target = mode === 'equal'
    ? document.getElementById('equalResult')
    : document.getElementById('unequalResult');

  try {
    const canvas = await html2canvas(target, {
      backgroundColor: '#0f172a',
      scale: 2,
      useCORS: true,
      logging: false
    });
    canvas.toBlob(async blob => {
      const file = new File([blob], 'billsplit.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: 'Bill Split', files: [file] });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'billsplit.png';
        a.click();
      }
    }, 'image/png');
  } catch(e) {
    console.error(e);
    alert('Could not generate image. Try Copy text instead.');
  }
}

// Init
setTip(15);
setMode('equal');
addPerson();
addPerson();
addPerson();
