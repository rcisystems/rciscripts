console.log('DEBUG: sdira-results.js loaded');
// Utility to fetch required elements and fail early if missing
function getRequiredEl(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Required element with ID '${id}' not found`);
  return el;
}

// PDF generation using jsPDF
function generatePDF() {
  // Temporarily hide download button during PDF rendering
  const downloadContainer = getRequiredEl('download-container');
  let prevDisplay = downloadContainer.style.display;
  downloadContainer.style.display = 'none';

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'pt', 'a4');
  try {
    const containerEl = document.getElementById('results-container');
    doc.html(containerEl, {
      callback: function (pdf) {
        pdf.save('SDIRA_Results.pdf');
        // Restore the download button display
        if (downloadContainer) {
          downloadContainer.style.display = prevDisplay || '';
        }
      },
      x: 20,
      y: 20,
      html2canvas: {
        scale: 0.5,
        width: 550
      }
    });
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

document.addEventListener('DOMContentLoaded', () => {
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

      // Update bar width
      if (fillEl) {
        fillEl.style.width = clampedPercent + '%';
      }

      // Update text with fallback for surpassing goal
      if (textEl) {
        const message = rawPercent > 100
          ? `${Math.floor(rawPercent)}% funded (Surpassed goal!)`
          : `${Math.floor(clampedPercent)}% funded`;
        textEl.textContent = message;
      }
    }
  }

  // ==== Summary Section ====
    const planEl = document.getElementById('plan-sustainability');
    const runOutEl = document.getElementById('run-out-age');
    const recEl    = document.getElementById('recommended-age');
    const totalEl  = document.getElementById('total-needed');

    console.log('DEBUG: About to populate summary elements');
    console.log('DEBUG: planEl, runOutEl, recEl, totalEl:', planEl, runOutEl, recEl, totalEl);

    if (amortData.length && inputs.retirementAge !== undefined) {
    // Find target row at user’s desired retirement age
    const targetRow = amortData.find(r => r.age === inputs.retirementAge);
    const totalNeeded = targetRow ? targetRow.endingBalance : 0;

    // Sustainable if current balance ≥ that amount
    const sustainable = inputs.currentBalance >= totalNeeded;
    planEl.textContent = sustainable ? 'Sustainable' : 'Not sustainable';

    // Run-out age: first age where endingBalance ≤ 0
    const runOutRow = amortData.find(r => r.endingBalance <= 0);
    runOutEl.textContent = runOutRow ? runOutRow.age : 'Never';

    // Recommended age using existing logic
    const recommended = findRecommendedRetirementAge(inputs);
    recEl.textContent = recommended;

    // Total needed for retirement
    totalEl.textContent = `$${totalNeeded.toLocaleString()}`;
    }

  // Render amortization table
  const table = document.getElementById('amortization-schedule');
  console.log('DEBUG: About to render table, table element:', table);
  if (table && amortData.length) {
    // compute row styling based on thresholds
    // (No longer used, replaced by CSS classes)

    // Describe why a row is highlighted (for accessibility)
    const getRowDescription = row => {
      if (row.endingBalance < 0) {
        return 'Ending balance falls below $0';
      }
      if (row.annualWithdrawal > row.earnings) {
        return 'Withdrawal exceeds earnings';
      }
      return '';
    };

    // Render a single table row
    const renderRow = row => {
      const desc = getRowDescription(row);
      const titleAttr = desc ? ` title="${desc}"` : '';
      // Determine CSS class for row highlighting
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

  console.log('DEBUG: About to parse chartData');
  // Render charts using the existing renderCharts function
  if (typeof renderCharts === 'function') {
    renderCharts(amortData);
  }

  const chartData = JSON.parse(sessionStorage.getItem('chartData') || '{}');
  console.log('DEBUG: chartData:', chartData);
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
  downloadContainer.innerHTML = ''; // clear any existing content
  const pdfButton = document.createElement('button');
  pdfButton.textContent = 'Download PDF';
  pdfButton.onclick = generatePDF;
  downloadContainer.appendChild(pdfButton);
  console.log('DEBUG: Download button appended');
});