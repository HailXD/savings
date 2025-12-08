// Savings Dashboard - minimal dark theme logic
// Data definitions (copied from original inline script)

const salaryData = {
  "2023-11": 755, "2023-12": 679.4,
  "2024-01": 711.8, "2024-02": 711.8, "2024-03": 711.8, "2024-04": 711.8,
  "2024-05": 711.8, "2024-06": 920.19, "2024-07": 852.4, "2024-08": 841.73,
  "2024-09": 841.73, "2024-10": 2365.1, "2024-11": 2331.1, "2024-12": 4546.69,
  "2025-01": 2331.1, "2025-02": 2324.28, "2025-03": 2923.9, "2025-04": 2331.1,
  "2025-05": 3124.6, "2025-06": 2481.82, "2025-07": 3832.95, "2025-08": 2546.45,
  "2025-09": 2629.79, "2025-10": 2661.45, "2025-11": 3160.95, "2025-12": 9080.96,
  "2026-01": 2331, "2026-02": 2331, "2026-03": 2331, "2026-04": 2331,
  "2026-05": 3263, "2026-06": 2331, "2026-07": 3832, "2026-08": 2331,
  "2026-09": 2331, "2026-10": 2331, "2026-11": 2331, "2026-12": 6650,
  "2027-01": 2331, "2027-02": 2331, "2027-03": 2331, "2027-04": 2331,
  "2027-05": 3263, "2027-06": 2331, "2027-07": 7993
};

const loanData = {
  "2024-05": 10000, "2024-06": 10000, "2025-06": 8000, "2025-09": -8000, "2025-10": 19968.6, "2025-11": 11523.03
};

const actualSavings = {
  "2023-10": 7985.16,
  "2024-05": 22978.56,
  "2024-06": 32978.56,
  "2025-06": 68274.11,
  "2025-08": 77085.43,
  "2025-09": 71002.89,
  "2025-10": 91463.12,
  "2025-11": 105753.65,
  "2025-12": 113469.86
};

document.addEventListener('DOMContentLoaded', () => {
  const state = {
    interest: 2.6,
    range: 'all'
  };

  const el = {
    chartCanvas: document.getElementById('savingsChart'),
    salaryChartCanvas: document.getElementById('salaryChart'),
    // Stats
    statNet: document.getElementById('stat-net'),
    statSavings: document.getElementById('stat-savings'),
    statDebt: document.getElementById('stat-debt'),
    statProjected: document.getElementById('stat-projected'),
    asOf: document.getElementById('asOf'),
    projectionEnd: document.getElementById('projectionEnd'),
    // Info
    info12mGain: document.getElementById('info-12m-gain'),
    infoAvgSalary: document.getElementById('info-avg-salary'),
    infoMedSalary: document.getElementById('info-med-salary'),
    infoTopSalary: document.getElementById('info-top-salary'),
    infoAvgExpenditure: document.getElementById('info-avg-expenditure'),
    infoAvgSavings: document.getElementById('info-avg-savings'),
    infoInterest: document.getElementById('info-interest'),
  };

  const toCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const formatMonth = (s) => {
    if (typeof s !== 'string') return s;
    const m = s.match(/^(\d{4})-(\d{2})$/);
    if (!m) return s;
    const mm = m[2];
    const yy = m[1].slice(2);
    return `${mm}/${yy}`;
  };

  const computeRangeStart = (len, range) => {
    if (range === 'all') return 0;
    const n = parseInt(range, 10);
    return Math.max(0, len - n);
  };

  const projectedTooltipFilter = (item) => {
    const chartInstance = item && item.chart;
    const lastActualIndex = chartInstance ? chartInstance.$lastActualViewIndex : null;
    const isProjected = item && item.dataset && typeof item.dataset.label === 'string'
      && item.dataset.label.includes('(Projected)');
    if (isProjected && lastActualIndex != null && item.dataIndex === lastActualIndex) return false;
    return true;
  };

  function processData(interestRate) {
    // Build a sorted list of all months (YYYY-MM sorts lexicographically)
    const baselineMonth = '2023-10';
    const all = Array.from(new Set([baselineMonth, ...Object.keys(salaryData)])).sort();

    // Determine last actual savings month
    const actualMonths = Object.keys(actualSavings).sort();
    const lastActualSavingsMonth = actualMonths[actualMonths.length - 1];

    let cumulativeSavings = actualSavings[baselineMonth] || 0;
    let loanBalance = 0;
    const monthlyRate = interestRate / 100 / 12;

    const labels = [];
    const actualSavingsLine = [];
    const loanLine = [];
    const personalSavingsLine = [];

    let lastActualIndex = -1;

    all.forEach((month, idx) => {
      labels.push(month);
      if (idx > 0) loanBalance = loanBalance * (1 + monthlyRate);
      if (loanData[month] != null) loanBalance += loanData[month];

      if (actualSavings[month] != null) cumulativeSavings = actualSavings[month];
      else if (salaryData[month] != null) cumulativeSavings += salaryData[month];

      actualSavingsLine.push(cumulativeSavings);
      loanLine.push(loanBalance);
      personalSavingsLine.push(cumulativeSavings - loanBalance);

      if (month === lastActualSavingsMonth) lastActualIndex = idx;
    });

    // Projection from last actual
    let projectedSavings = actualSavings[lastActualSavingsMonth];
    let projectedLoan = loanLine[lastActualIndex];

    const futureActualSavings = actualSavingsLine.slice();
    const futureLoanBalance = loanLine.slice();
    const futurePersonalSavings = personalSavingsLine.slice();

    for (let i = lastActualIndex + 1; i < all.length; i++) {
      const month = all[i];
      projectedLoan = projectedLoan * (1 + monthlyRate);
      if (loanData[month] != null) projectedLoan += loanData[month];
      if (salaryData[month] != null) projectedSavings += salaryData[month];

      futureActualSavings[i] = projectedSavings;
      futureLoanBalance[i] = projectedLoan;
      futurePersonalSavings[i] = projectedSavings - projectedLoan;
    }

    return {
      labels: all,
      actualSavingsLine,
      loanLine,
      personalSavingsLine,
      futureActualSavings,
      futureLoanBalance,
      futurePersonalSavings,
      lastActualIndex,
    };
  }

  function buildDatasets(data) {
    const historical = {
      actual: data.actualSavingsLine.map((v, i) => (i <= data.lastActualIndex ? v : null)),
      loan: data.loanLine.map((v, i) => (i <= data.lastActualIndex ? v : null)),
      personal: data.personalSavingsLine.map((v, i) => (i <= data.lastActualIndex ? v : null)),
    };
    const future = {
      // Include the last actual point so the dotted projection starts there, but suppress its tooltip for projections.
      actual: data.futureActualSavings.map((v, i) => (i >= data.lastActualIndex ? v : null)),
      loan: data.futureLoanBalance.map((v, i) => (i >= data.lastActualIndex ? v : null)),
      personal: data.futurePersonalSavings.map((v, i) => (i >= data.lastActualIndex ? v : null)),
    };
    return { historical, future };
  }

  function applyRange(labels, datasets, range) {
    if (range === 'all') return { labels, datasets };
    const start = computeRangeStart(labels.length, range);
    const slice = (arr) => arr.slice(start);
    return {
      labels: labels.slice(start),
      datasets: {
        historical: {
          actual: slice(datasets.historical.actual),
          loan: slice(datasets.historical.loan),
          personal: slice(datasets.historical.personal),
        },
        future: {
          actual: slice(datasets.future.actual),
          loan: slice(datasets.future.loan),
          personal: slice(datasets.future.personal),
        }
      }
    };
  }

  function updateStats(data) {
    const i = data.lastActualIndex;
    const currentSavings = data.actualSavingsLine[i];
    const currentLoan = data.loanLine[i];
    const currentNet = currentSavings - currentLoan;
    const endNet = data.futurePersonalSavings[data.futurePersonalSavings.length - 1];

    // 12-month projected net gain
    const horizonIdx = Math.min(data.labels.length - 1, i + 12);
    const gain12m = data.futurePersonalSavings[horizonIdx] - currentNet;

    // Salary insights
    const salaries = Object.values(salaryData);
    const avgSalary = salaries.reduce((a, b) => a + b, 0) / salaries.length;
    const sorted = salaries.slice().sort((a, b) => a - b);
    const medSalary = (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.ceil((sorted.length - 1) / 2)]) / 2;
    let maxSalary = -Infinity, maxMonth = null;
    for (const [m, v] of Object.entries(salaryData)) { if (v > maxSalary) { maxSalary = v; maxMonth = m; } }

    // Average Savings (monthly)
    const avgSavings = avgSalary;

    // Approximate Average Expenditure: salary minus monthly net worth delta (clamped >= 0)
    let expSum = 0, expCount = 0;
    for (let idx = 1; idx < data.labels.length; idx++) {
      const month = data.labels[idx];
      const sal = salaryData[month];
      if (sal == null) continue;
      const prevIdx = idx - 1;
      const netPrev = idx <= data.lastActualIndex
        ? data.personalSavingsLine[prevIdx]
        : data.futurePersonalSavings[prevIdx];
      const netCurr = idx <= data.lastActualIndex
        ? data.personalSavingsLine[idx]
        : data.futurePersonalSavings[idx];
      const deltaNet = netCurr - netPrev;
      const exp = Math.max(0, sal - deltaNet);
      expSum += exp; expCount++;
    }
    const avgExpenditure = expCount ? (expSum / expCount) : 0;

    // Update DOM
    el.statNet.textContent = toCurrency(currentNet);
    el.statSavings.textContent = toCurrency(currentSavings);
    el.statDebt.textContent = toCurrency(currentLoan);
    el.statProjected.textContent = toCurrency(endNet);
    el.asOf.textContent = formatMonth(data.labels[i]);
    el.projectionEnd.textContent = formatMonth(data.labels[data.labels.length - 1]);

    el.info12mGain.textContent = toCurrency(gain12m);
    el.infoAvgSalary.textContent = toCurrency(avgSalary);
    el.infoMedSalary.textContent = toCurrency(medSalary);
    el.infoTopSalary.textContent = `${toCurrency(maxSalary)} in ${formatMonth(maxMonth)}`;
    if (el.infoAvgExpenditure) el.infoAvgExpenditure.textContent = toCurrency(avgExpenditure);
    if (el.infoAvgSavings) el.infoAvgSavings.textContent = toCurrency(avgSavings);
    el.infoInterest.textContent = `${state.interest}% APR`;
  }

  function makeChart(labels, ds) {
    const ctx = el.chartCanvas.getContext('2d');
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Savings', data: ds.historical.actual, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)', borderWidth: 2, tension: 0.35, fill: true, pointRadius: 2, pointHoverRadius: 4 },
          { label: 'Loan', data: ds.historical.loan, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 2, tension: 0.35, fill: true, pointRadius: 2, pointHoverRadius: 4 },
          { label: 'Net', data: ds.historical.personal, borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.06)', borderWidth: 2, tension: 0.35, fill: true, pointRadius: 2, pointHoverRadius: 4 },
          { label: 'Savings (Projected)', data: ds.future.actual, borderColor: '#22c55e', borderDash: [6,6], backgroundColor: 'transparent', borderWidth: 2, tension: 0.35, fill: false, pointRadius: 0, pointHoverRadius: 0 },
          { label: 'Loan (Projected)', data: ds.future.loan, borderColor: '#ef4444', borderDash: [6,6], backgroundColor: 'transparent', borderWidth: 2, tension: 0.35, fill: false, pointRadius: 0, pointHoverRadius: 0 },
          { label: 'Net (Projected)', data: ds.future.personal, borderColor: '#8b5cf6', borderDash: [6,6], backgroundColor: 'transparent', borderWidth: 2, tension: 0.35, fill: false, pointRadius: 0, pointHoverRadius: 0 },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.9)',
            borderColor: '#1f2937',
            borderWidth: 1,
            padding: 10,
            titleColor: '#e5e7eb',
            bodyColor: '#e5e7eb',
            filter: projectedTooltipFilter,
            callbacks: {
              title: (items) => (items && items.length ? formatMonth(items[0].label) : ''),
              label: (ctx) => `${ctx.dataset.label}: ${toCurrency(ctx.parsed.y)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148,163,184,0.1)' },
            ticks: { color: '#94a3b8', callback: (v) => '$' + v.toLocaleString() }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: '#94a3b8',
              maxRotation: 0,
              callback: function(value) {
                const label = (this && typeof this.getLabelForValue === 'function')
                  ? this.getLabelForValue(value)
                  : value;
                return formatMonth(label);
              }
            }
          }
        }
      }
    });
  }

  function makeSalaryChart(labels, series) {
    if (!el.salaryChartCanvas) return null;
    const ctx = el.salaryChartCanvas.getContext('2d');
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Salary', data: series, backgroundColor: 'rgba(56,189,248,0.35)', borderColor: '#38bdf8', borderWidth: 1 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.9)',
            borderColor: '#1f2937',
            borderWidth: 1,
            padding: 10,
            titleColor: '#e5e7eb',
            bodyColor: '#e5e7eb',
            callbacks: {
              title: (items) => (items && items.length ? formatMonth(items[0].label) : ''),
              label: (ctx) => `${ctx.dataset.label}: ${toCurrency(ctx.parsed.y)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148,163,184,0.1)' },
            ticks: { color: '#94a3b8', callback: (v) => '$' + v.toLocaleString() }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: '#94a3b8',
              maxRotation: 0,
              callback: function(value) {
                const label = (this && typeof this.getLabelForValue === 'function')
                  ? this.getLabelForValue(value)
                  : value;
                return formatMonth(label);
              }
            }
          }
        }
      }
    });
  }

  function buildSalarySeriesForLabels(labels) {
    return labels.map(m => (m in salaryData ? salaryData[m] : null));
  }

  let processed = processData(state.interest);
  let baseDatasets = buildDatasets(processed);
  let filtered = applyRange(processed.labels, baseDatasets, state.range);
  const rangeStart = computeRangeStart(processed.labels.length, state.range);
  const viewLastActualIndex = processed.lastActualIndex - rangeStart;
  let chart = makeChart(filtered.labels, filtered.datasets);
  chart.$lastActualViewIndex = (viewLastActualIndex >= 0 && viewLastActualIndex < filtered.labels.length)
    ? viewLastActualIndex
    : null;
  // Salary chart
  let salarySeries = buildSalarySeriesForLabels(processed.labels);
  let salaryChartRangeStart = rangeStart;
  let salaryLabelsFiltered = processed.labels.slice(salaryChartRangeStart);
  let salarySeriesFiltered = salarySeries.slice(salaryChartRangeStart);
  let salaryChart = makeSalaryChart(salaryLabelsFiltered, salarySeriesFiltered);
  updateStats(processed);

  function redraw() {
    processed = processData(state.interest);
    baseDatasets = buildDatasets(processed);
    filtered = applyRange(processed.labels, baseDatasets, state.range);

    const start = computeRangeStart(processed.labels.length, state.range);
    const lastActualViewIndex = processed.lastActualIndex - start;

    chart.data.labels = filtered.labels;
    chart.data.datasets[0].data = filtered.datasets.historical.actual;
    chart.data.datasets[1].data = filtered.datasets.historical.loan;
    chart.data.datasets[2].data = filtered.datasets.historical.personal;
    chart.data.datasets[3].data = filtered.datasets.future.actual;
    chart.data.datasets[4].data = filtered.datasets.future.loan;
    chart.data.datasets[5].data = filtered.datasets.future.personal;
    chart.$lastActualViewIndex = (lastActualViewIndex >= 0 && lastActualViewIndex < filtered.labels.length)
      ? lastActualViewIndex
      : null;
    updateStats(processed);
    chart.update();

    // Update salary chart
    if (salaryChart) {
      const series = buildSalarySeriesForLabels(processed.labels);
      salaryChart.data.labels = processed.labels.slice(start);
      salaryChart.data.datasets[0].data = series.slice(start);
      salaryChart.update();
    }
  }

  // No event wiring needed: static view without controls
});
