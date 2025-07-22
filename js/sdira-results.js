console.log('DEBUG: sdira-results.js loaded');
// Utility to fetch required elements and fail early if missing
function getRequiredEl(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Required element with ID '${id}' not found`);
  return el;
}

// PDF generation using jsPDF
async function generatePDF() {
  // Temporarily hide download button during PDF rendering
  const downloadContainer = getRequiredEl('download-container');
  let prevDisplay = downloadContainer.style.display;
  downloadContainer.style.display = 'none';

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'pt', 'letter');
  try {
    // Page 1: summary and charts
    const page1 = document.getElementById('pdf-page1');
    await doc.html(page1, { x:20, y:20, html2canvas:{ scale:0.5, width:550 } });
    doc.addPage();
    // Page 2: amortization table
    const page2 = document.getElementById('pdf-page2');
    await doc.html(page2, { x:20, y:20, html2canvas:{ scale:0.5, width:550 } });
    // Save after both pages
    doc.save('SDIRA_Results.pdf');
    // Restore button
    if (downloadContainer) downloadContainer.style.display = prevDisplay || '';
  } catch(error) {
    console.error('PDF generation failed:', error);
    alert('Could not generate PDF: ' + error.message);
    if (downloadContainer) {
      downloadContainer.style.display = prevDisplay || '';
    }
  }
}

// Utility to render or update a chart by ID
function renderOrUpdateChart(id, configFn) {
  const canvas = document.getElementById(id);
  if (!canvas || typeof Chart !== 'function') return;
  const existing = Chart.getChart(canvas);
  if (existing) {
    existing.destroy();
  }
  const ctx = canvas.getContext('2d');
  return new Chart(ctx, configFn());
}

// Initialize results page when ready
function initResultsPage() {
  console.log('DEBUG: initResultsPage running');
  // Retrieve amortization data from sessionStorage
  const amortData = JSON.parse(sessionStorage.getItem('amortData') || '[]');
  console.log('DEBUG: amortData from sessionStorage:', amortData);

  // Cache progress bar elements
  const fillEl = document.getElementById('progress-bar-fill');
  const textEl = document.getElementById('progress-text');

  // Render retirement savings progress bar
  const inputs = JSON.parse(sessionStorage.getItem('inputParams') || '{}');
  console.log('DEBUG: inputs from sessionStorage:', inputs);
  if (inputs.currentBalance !== undefined && inputs.retirementAge !== undefined && amortData.length) {
    const targetRow = amortData.find(r => r.age === inputs.retirementAge);
    if (targetRow) {
      const current = inputs.currentBalance;
      const target = targetRow.endingBalance;
      const rawPercent = target > 0 ? (current / target) * 100 : 0;
      const clampedPercent = Math.min(Math.max(rawPercent, 0), 100);

      if (fillEl) {
        fillEl.style.width = clampedPercent + '%';
      }
      if (textEl) {
        const message = rawPercent > 100
          ? `${Math.floor(rawPercent)}% funded (Surpassed goal!)`
          : `${Math.floor(clampedPercent)}% funded`;
        textEl.textContent = message;
      }
    }
  }

  // ==== Summary Section ====
  const planEl   = document.getElementById('plan-sustainability');
  const runOutEl = document.getElementById('run-out-age');
  const recEl    = document.getElementById('recommended-age');
  const totalEl  = document.getElementById('total-needed');
  console.log('DEBUG: About to populate summary elements', planEl, runOutEl, recEl, totalEl);
  if (amortData.length && inputs.retirementAge !== undefined) {
    const targetRow = amortData.find(r => r.age === inputs.retirementAge);
    const totalNeeded = targetRow ? targetRow.endingBalance : 0;
    planEl.textContent   = inputs.currentBalance >= totalNeeded ? 'Sustainable' : 'Not sustainable';
    const runOutRow      = amortData.find(r => r.endingBalance <= 0);
    runOutEl.textContent = runOutRow ? runOutRow.age : 'Never';
    recEl.textContent    = findRecommendedRetirementAge(inputs);
    totalEl.textContent  = `$${totalNeeded.toLocaleString()}`;
  }

  // Render amortization table
  const table = document.getElementById('amortization-schedule');
  console.log('DEBUG: About to render table, table element:', table);
  if (table && amortData.length) {
    const getRowDescription = row => {
      if (row.endingBalance <= 0) return 'Ending balance falls below or equals $0';
      if (row.annualWithdrawal > row.earnings) return 'Withdrawal exceeds earnings';
      return '';
    };
    const renderRow = row => {
      const desc = getRowDescription(row);
      const titleAttr = desc ? ` title="${desc}"` : '';
      const cls = row.endingBalance <= 0
        ? 'highlight-red'
        : (row.annualWithdrawal > row.earnings ? 'highlight-yellow' : '');
      return `
        <tr${cls ? ` class="${cls}"` : ''}${titleAttr}>
          <td>${row.age}</td>
          <td>$${row.yearlyIncome.toLocaleString()}</td>
          <td>$${row.beginningBalance.toLocaleString()}</td>
          <td>$${row.earnings.toLocaleString()}</td>
          <td>${row.annualSavings !== undefined ? '$' + row.annualSavings.toLocaleString() : ''}</td>
          <td>$${row.annualWithdrawal.toLocaleString()}</td>
          <td>$${row.endingBalance.toLocaleString()}</td>
        </tr>
      `;
    };
    let html = `
      <tr>
        <th>Age</th>
        <th>Yearly Income</th>
        <th>Beginning Balance</th>
        <th>Earnings</th>
        <th>Annual Savings</th>
        <th>Annual Withdrawal</th>
        <th>Ending Balance</th>
      </tr>
    `;
    amortData.forEach(row => {
      html += renderRow(row);
    });
    table.innerHTML = html;
    console.log('DEBUG: Amortization table HTML set');
  }

  // Render charts
  console.log('DEBUG: About to parse chartData');
  const chartData = JSON.parse(sessionStorage.getItem('chartData') || '{}');
  console.log('DEBUG: chartData:', chartData);
  // Render Balance Over Time line chart
  console.log('DEBUG: Calling renderOrUpdateChart for balanceChart');
  renderOrUpdateChart('balanceChart', () => ({
    type: 'line',
    data: {
      labels: chartData.ages,
      datasets: [{
        label: 'Ending Balance ($)',
        data: chartData.balances,
        fill: false,
        tension: 0.1
      }]
    },
    options: {
      scales: {
        x: { title: { display: true, text: 'Age' } },
        y: { title: { display: true, text: 'Ending Balance ($)' }, beginAtZero: true }
      }
    }
  }));
  console.log('DEBUG: Balance Over Time chart rendered');
  console.log('DEBUG: Calling renderOrUpdateChart for incomeWithdrawalChart');
  renderOrUpdateChart('incomeWithdrawalChart', () => ({
    type: 'bar',
    data: {
      labels: chartData.ages,
      datasets: [
        {
          label: 'Yearly Income ($)',
          data: chartData.incomes,
          yAxisID: 'y',
        },
        {
          label: 'Annual Withdrawal ($)',
          data: chartData.balances.map((bal, i) =>
            bal === 0 ? 0 : chartData.withdrawals[i]
          ),
          yAxisID: 'y1',
          backgroundColor: chartData.withdrawals.map((w, i) =>
            w > chartData.incomes[i] ? '#f8e8a2f1' : undefined
          ),
        }
      ]
    },
    options: {
      scales: {
        x: { title: { display: true, text: 'Age' } },
        y: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Amount ($)' },
          beginAtZero: true
        },
        y1: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Amount ($)' },
          beginAtZero: true
        }
      }
    }
  }));

  // Add Download PDF button
  const downloadContainer = getRequiredEl('download-container');
  console.log('DEBUG: About to add Download PDF button');
  console.log('DEBUG: downloadContainer:', downloadContainer);
  downloadContainer.innerHTML = '';
  const pdfButton = document.createElement('button');
  pdfButton.textContent = 'Download PDF';
  pdfButton.onclick = generatePDF;
  downloadContainer.appendChild(pdfButton);
  console.log('DEBUG: Download button appended');
}

// Hook init to DOM ready or run immediately
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initResultsPage);
} else {
  initResultsPage();
}