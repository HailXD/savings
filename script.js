// ---------- Data ----------
const salaryData = {
  "2023-11": 755, "2023-12": 679.4,
  "2024-01": 711.8, "2024-02": 711.8, "2024-03": 711.8, "2024-04": 711.8,
  "2024-05": 711.8, "2024-06": 920.19, "2024-07": 852.4, "2024-08": 841.73,
  "2024-09": 841.73, "2024-10": 2365.1, "2024-11": 2331.1, "2024-12": 4546.69,
  "2025-01": 2331.1, "2025-02": 2324.28, "2025-03": 2923.9, "2025-04": 2331.1,
  "2025-05": 3124.6, "2025-06": 2481.82, "2025-07": 3832.95, "2025-08": 2546.45,
  "2025-09": 2629.79, "2025-10": 2331, "2025-11": 2331, "2025-12": 6800,
  "2026-01": 2331, "2026-02": 2331, "2026-03": 2331, "2026-04": 2331,
  "2026-05": 3263, "2026-06": 2331, "2026-07": 3832, "2026-08": 2331,
  "2026-09": 2331, "2026-10": 2331, "2026-11": 2331, "2026-12": 6650,
  "2027-01": 2331, "2027-02": 2331, "2027-03": 2331, "2027-04": 2331,
  "2027-05": 3263, "2027-06": 2331, "2027-07": 7993
};

const loanData = {
  "2024-05": 10000, "2024-06": 10000, "2025-06": 8000, "2025-09": -8000, "2025-10": 19968.6
};

// Annual interest rate on loans (APR)
const interest = 2.6;

// Actual cumulative savings (bank balance) snapshots, by YYYY-MM
const actualSavings = {
  "2023-10": 7985.16,
  "2025-08": 77085.43,
  "2025-09": 79002.89,
  "2025-10": 73994.51
};

// ---------- Helpers ----------
const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
function formatCurrency(n) { return fmt.format(n || 0); }
function getYear(monthStr) { return monthStr.split('-')[0]; }

// Build complete sorted month list from all sources
const allMonths = Array.from(new Set([
  ...Object.keys(salaryData),
  ...Object.keys(actualSavings),
  ...Object.keys(loanData)
])).sort();

// Cutoff is the last month with actual savings data
const actualMonths = Object.keys(actualSavings).sort();
const cutoffMonth = actualMonths.length ? actualMonths[actualMonths.length - 1] : allMonths[0];
const cutoffIndex = allMonths.indexOf(cutoffMonth);

// ---------- Series computation ----------
let cumulativeLoan = 0;
const loanPoints = allMonths.map((month) => {
  if (cumulativeLoan > 0) {
    cumulativeLoan += cumulativeLoan * (interest / 100 / 12);
  }
  if (loanData[month]) {
    cumulativeLoan += loanData[month];
  }
  return cumulativeLoan;
});

let cumulativeNet = 0; // Net worth approximation
const netPoints = allMonths.map((month, i) => {
  if (actualSavings[month] !== undefined) {
    // Net = actual savings (bank) minus outstanding loans
    cumulativeNet = actualSavings[month] - loanPoints[i];
  } else {
    // Project net by adding expected monthly delta (salary)
    cumulativeNet += (salaryData[month] || 0);
  }
  return cumulativeNet;
});

// Savings balance (bank) = net + outstanding loan
const savingsPoints = netPoints.map((net, i) => net + loanPoints[i]);

// Split actual vs projected
const netSolid = netPoints.map((v, i) => (i <= cutoffIndex ? v : null));
const netDotted = netPoints.map((v, i) => (i >= cutoffIndex ? v : null));
const savSolid = savingsPoints.map((v, i) => (i <= cutoffIndex ? v : null));
const savDotted = savingsPoints.map((v, i) => (i >= cutoffIndex ? v : null));

// ---------- UI State ----------
const els = {
  range: document.getElementById('rangeSelect'),
  tNet: document.getElementById('toggleNet'),
  tSav: document.getElementById('toggleSavings'),
  tLoan: document.getElementById('toggleLoans'),
  kNet: document.getElementById('kpiNet'),
  kNetDelta: document.getElementById('kpiNetDelta'),
  kSav: document.getElementById('kpiSavings'),
  kSavDelta: document.getElementById('kpiSavingsDelta'),
  kLoan: document.getElementById('kpiLoans'),
  kLoanDelta: document.getElementById('kpiLoansDelta'),
  kProj12: document.getElementById('kpiProj12'),
  kProj12Delta: document.getElementById('kpiProj12Delta'),
  asOf: document.getElementById('asOfText'),
  themeToggle: document.getElementById('themeToggle'),
  downloadBtn: document.getElementById('downloadBtn'),
};

// Theme boot
const savedTheme = localStorage.getItem('theme') || 'dark';
document.body.setAttribute('data-theme', savedTheme);
els.themeToggle.addEventListener('click', () => {
  const next = document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  document.body.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

// ---------- Chart setup ----------
Chart.register(window['chartjs-plugin-annotation']);

const ctxMain = document.getElementById('financialChart').getContext('2d');
const ctxDonut = document.getElementById('allocationChart').getContext('2d');

function makeGradient(ctx, c1, c2) {
  const g = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  return g;
}

const colors = {
  net: ['#8b5cf6', '#06b6d4'], // purple -> cyan
  sav: ['#22c55e', '#16a34a'], // green shades
  loan: ['#ef4444', '#b91c1c'], // red shades
};

const gradients = {
  net: makeGradient(ctxMain, colors.net[0], colors.net[1]),
  sav: makeGradient(ctxMain, colors.sav[0], colors.sav[1]),
  loan: makeGradient(ctxMain, colors.loan[0], colors.loan[1])
};

const baseDatasets = [
  {
    key: 'loan',
    label: 'Loan Outstanding',
    data: loanPoints,
    borderColor: gradients.loan,
    backgroundColor: 'transparent',
    fill: false,
    tension: 0.25,
    pointRadius: 0,
    borderWidth: 2
  },
  {
    key: 'netActual',
    label: 'Net Worth (Actual)',
    data: netSolid,
    borderColor: gradients.net,
    backgroundColor: 'transparent',
    fill: false,
    tension: 0.25,
    pointRadius: 0,
    borderWidth: 2.5
  },
  {
    key: 'netProj',
    label: 'Net Worth (Projected)',
    data: netDotted,
    borderColor: gradients.net,
    backgroundColor: 'transparent',
    borderDash: [6, 6],
    fill: false,
    tension: 0.25,
    pointRadius: 0,
    borderWidth: 2.5
  },
  {
    key: 'savActual',
    label: 'Savings Balance (Actual)',
    data: savSolid,
    borderColor: gradients.sav,
    backgroundColor: 'transparent',
    fill: false,
    tension: 0.25,
    pointRadius: 0,
    borderWidth: 2
  },
  {
    key: 'savProj',
    label: 'Savings Balance (Projected)',
    data: savDotted,
    borderColor: gradients.sav,
    backgroundColor: 'transparent',
    borderDash: [6, 6],
    fill: false,
    tension: 0.25,
    pointRadius: 0,
    borderWidth: 2
  }
];

let financialChart = new Chart(ctxMain, {
  type: 'line',
  data: {
    labels: allMonths,
    datasets: baseDatasets
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#94a3b8',
          callback: (v) => '$' + Number(v).toLocaleString()
        },
        grid: { color: 'rgba(148,163,184,0.15)' }
      },
      x: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(148,163,184,0.08)' }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.9)',
        borderColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        titleColor: '#e5e7eb',
        bodyColor: '#e5e7eb',
        callbacks: {
          label: (ctx) => {
            const lab = ctx.dataset.label || '';
            const val = ctx.parsed.y != null ? formatCurrency(ctx.parsed.y) : '-';
            return `${lab}: ${val}`;
          }
        }
      },
      annotation: {
        annotations: {
          cutoff: {
            type: 'line',
            xMin: cutoffMonth,
            xMax: cutoffMonth,
            borderColor: 'rgba(148,163,184,0.6)',
            borderWidth: 1.5,
            borderDash: [4, 4],
            label: {
              display: true,
              backgroundColor: 'rgba(0,0,0,0)',
              color: '#94a3b8',
              content: ['Cutoff'],
              position: 'start',
              yAdjust: -6
            }
          }
        }
      }
    }
  }
});

// Donut chart for current allocation
let allocationChart = new Chart(ctxDonut, {
  type: 'doughnut',
  data: {
    labels: ['Savings Balance', 'Loan Outstanding'],
    datasets: [{
      data: [0, 0],
      backgroundColor: [colors.sav[0], colors.loan[0]],
      borderColor: ['transparent', 'transparent'],
      hoverOffset: 4
    }]
  },
  options: {
    plugins: {
      legend: { position: 'bottom', labels: { color: getComputedStyle(document.body).color } }
    }
  }
});

// ---------- Range handling ----------
function rangeSlice(range) {
  if (range === 'ALL') return [0, allMonths.length];

  const end = allMonths.length;
  let start = 0;
  if (range === '1Y') start = Math.max(0, end - 12);
  else if (range === '3Y') start = Math.max(0, end - 36);
  else if (range === 'YTD') {
    const jan = `${getYear(cutoffMonth)}-01`;
    start = Math.max(0, allMonths.indexOf(jan));
  }
  return [start, end];
}

function applyRange(range) {
  const [s, e] = rangeSlice(range);
  financialChart.data.labels = allMonths.slice(s, e);
  financialChart.data.datasets[0].data = loanPoints.slice(s, e);
  financialChart.data.datasets[1].data = netSolid.slice(s, e);
  financialChart.data.datasets[2].data = netDotted.slice(s, e);
  financialChart.data.datasets[3].data = savSolid.slice(s, e);
  financialChart.data.datasets[4].data = savDotted.slice(s, e);
  financialChart.update();
}

els.range.addEventListener('change', (e) => applyRange(e.target.value));

// ---------- Toggles ----------
function setVisibility() {
  const showNet = els.tNet.checked;
  const showSav = els.tSav.checked;
  const showLoan = els.tLoan.checked;
  // datasets: 0 loan, 1 netA, 2 netP, 3 savA, 4 savP
  financialChart.data.datasets[0].hidden = !showLoan;
  financialChart.data.datasets[1].hidden = !showNet;
  financialChart.data.datasets[2].hidden = !showNet;
  financialChart.data.datasets[3].hidden = !showSav;
  financialChart.data.datasets[4].hidden = !showSav;
  financialChart.update();
}
els.tNet.addEventListener('change', setVisibility);
els.tSav.addEventListener('change', setVisibility);
els.tLoan.addEventListener('change', setVisibility);

// ---------- KPIs & Allocation ----------
function computeStats() {
  const idx = cutoffIndex;
  const prev = Math.max(0, idx - 1);
  const netNow = netPoints[idx] ?? 0;
  const netPrev = netPoints[prev] ?? 0;
  const savNow = savingsPoints[idx] ?? 0;
  const loanNow = loanPoints[idx] ?? 0;
  const ahead = Math.min(allMonths.length - 1, idx + 12);
  const net12 = netPoints[ahead] ?? netNow;
  return { idx, netNow, netPrev, savNow, loanNow, net12, ahead };
}

function updateKPIs() {
  const st = computeStats();
  els.kNet.textContent = formatCurrency(st.netNow);
  els.kNetDelta.textContent = `Monthly change ${formatCurrency(st.netNow - st.netPrev)}`;

  els.kSav.textContent = formatCurrency(st.savNow);
  els.kSavDelta.textContent = `Net of loans: ${formatCurrency(st.savNow - st.loanNow)}`;

  els.kLoan.textContent = formatCurrency(st.loanNow);
  els.kLoanDelta.textContent = `Rate: ${interest}% APR`;

  els.kProj12.textContent = formatCurrency(st.net12);
  els.kProj12Delta.textContent = `+12m change ${formatCurrency(st.net12 - st.netNow)}`;

  els.asOf.textContent = `As of ${cutoffMonth} - ${allMonths.length} months total`;

  allocationChart.data.datasets[0].data = [st.savNow, st.loanNow];
  allocationChart.update();
}

// ---------- Download ----------
els.downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.href = financialChart.toBase64Image();
  link.download = `financial-projection-${new Date().toISOString().slice(0,10)}.png`;
  link.click();
});

// ---------- Init ----------
applyRange(els.range.value);
setVisibility();
updateKPIs();
