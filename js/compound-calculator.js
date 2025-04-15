// compound-calculator.js

function getPeriodLabel(index, frequency) {
  const unit = {
    365: 'Day',
    52: 'Week',
    12: 'Month',
    4: 'Quarter',
    2: 'Half-Year',
    1: 'Year',
    0: 'Period'
  }[frequency] || 'Period';
  return `${unit} ${index}`;
}

function calculateCompound() {
  const fields = ["principal", "monthly", "years", "rate", "compound"];
  for (const id of fields) {
    if (!document.getElementById(id)) {
      alert(`Form element "${id}" not found. Please check your HTML.`);
      return;
    }
  }

  const principal = parseFloat(document.getElementById("principal").value);
  const monthlyDeposit = parseFloat(document.getElementById("monthly").value);
  const years = parseFloat(document.getElementById("years").value);
  // Total months to simulate
  const months = Math.round(years * 12);
  if (years <= 0) {
    alert("Investment period must be greater than zero.");
    return;
  }

  const rate = parseFloat(document.getElementById("rate").value) / 100;
  const frequency = parseInt(document.getElementById("compound").value);

  // Effective monthly rate based on the user-selected compounding frequency:
  // For example, for semiannual (2 compounds per year),
  // effectiveMonthlyRate = (1 + r/2)^(2/12) - 1.
  const effectiveMonthlyRate = frequency > 0 ?
    Math.pow(1 + rate / frequency, frequency / 12) - 1 : 0;

  let balance = principal;
  let totalInterest = 0;

  // We'll accumulate monthly results but group them into annual buckets.
  const annualData = [];
  // Temporary accumulators for the current year.
  let annualDeposit = 0;
  let annualInterest = 0;
  let currentYear = 1;

  for (let i = 1; i <= months; i++) {
    // Each month: add the monthly deposit and record it.
    balance += monthlyDeposit;
    annualDeposit += monthlyDeposit;

    // Calculate interest using the effective monthly rate.
    const interest = balance * effectiveMonthlyRate;
    balance += interest;
    annualInterest += interest;
    totalInterest += interest;

    // When a full year is complete, or if it is the final month:
    if (i % 12 === 0 || i === months) {
      const label = `Year ${currentYear}`;
      annualData.push({
        label,
        deposit: annualDeposit,
        interest: annualInterest,
        balance: balance
      });
      // Reset the yearly accumulators for the next year.
      annualDeposit = 0;
      annualInterest = 0;
      currentYear++;
    }
  }

  const totalInvested = principal + (monthlyDeposit * months);
  const irr = computeIRR(principal, monthlyDeposit, months, balance);
  // CAGR calculated annually.
  const CAGR = Math.pow(balance / totalInvested, 1 / years) - 1;

  document.getElementById("summary").style.display = "block";
  document.querySelector(".charts-container").style.display = "block";
  const amortTable = document.getElementById("amortization-schedule");
  amortTable.style.opacity = 0;
  amortTable.style.display = "table";
  setTimeout(() => {
    amortTable.style.transition = "opacity 0.5s";
    amortTable.style.opacity = 1;
  }, 10);

  updateSummary(balance, totalInterest, irr, CAGR, principal, monthlyDeposit, months, rate, frequency);
  renderTable(annualData);
  renderChart(annualData);
  showDownloadButton(annualData);
  showCSVExportButton(annualData);
}

function updateSummary(finalBalance, totalInterest, irr, CAGR, principal, monthlyDeposit, months, rate, frequency) {
  const summary = document.getElementById("summary");
  const years = months / 12;
  const totalInvested = principal + (monthlyDeposit * months);

  // Compute the APY based on the selected compounding frequency
  const apy = frequency > 0 ? (Math.pow(1 + rate / frequency, frequency) - 1) * 100 : rate * 100;
  const formulaNote = "Formula used: A = P(1 + r/n)<sup>nt</sup>";

  summary.innerHTML = `
    <style>
      .info-icon {
        cursor: help;
        border-bottom: 1px dotted #000;
      }
    </style>
    <p><strong>Final Balance:</strong> <span class="info-icon" data-tooltip="Your ending balance after all deposits and interest.">[?]</span> $${finalBalance.toFixed(2)}</p>
    <p><strong>Total Interest Earned:</strong> <span class="info-icon" data-tooltip="Total interest earned over the entire investment period.">[?]</span> $${(finalBalance - totalInvested).toFixed(2)}</p>
    <p><strong>Estimated IRR (Annualized):</strong> <span class="info-icon" data-tooltip="Annualized return considering all deposits and cash flow.">[?]</span> ${((Math.pow(1 + irr, 12) - 1) * 100).toFixed(2)}%</p>
    <p><strong>Compounded Annual Growth Rate (CAGR):</strong> <span class="info-icon" data-tooltip="Smoothed annual return from start to final balance.">[?]</span> ${(CAGR * 100).toFixed(2)}%</p>
    <p><strong>APY:</strong> <span class="info-icon" data-tooltip="Annual Percentage Yield, based on compound frequency.">[?]</span> ${apy.toFixed(4)}%</p>
    <p><em>${formulaNote} where t = years</em></p>
  `;
}

function computeIRR(initial, monthly, months, finalValue, guess = 0.1) {
  let rate = guess;
  const maxIter = 1000;
  const tol = 1e-6;

  for (let iter = 0; iter < maxIter; iter++) {
    let npv = -initial;
    let dNpv = 0;

    for (let i = 1; i <= months; i++) {
      const df = Math.pow(1 + rate, i);
      npv += monthly / df;
      dNpv -= (i * monthly) / (df * (1 + rate));
    }

    npv += finalValue / Math.pow(1 + rate, months);
    dNpv -= (months * finalValue) / (Math.pow(1 + rate, months + 1));

    const newRate = rate - npv / dNpv;
    if (Math.abs(newRate - rate) < tol) return newRate;
    rate = newRate;
  }
  return rate;
}

function renderTable(data) {
  // Render a table with one row per year.
  const table = document.getElementById("amortization-schedule");
  table.innerHTML = `
    <tr>
      <th>Year</th>
      <th>Total Deposits in Year ($)</th>
      <th>Interest Earned in Year ($)</th>
      <th>Year-End Balance ($)</th>
    </tr>
  `;

  data.forEach(row => {
    table.innerHTML += `
      <tr>
        <td>${row.label}</td>
        <td>${row.deposit.toFixed(2)}</td>
        <td>${row.interest.toFixed(2)}</td>
        <td>${row.balance.toFixed(2)}</td>
      </tr>
    `;
  });
}

function renderChart(data) {
  const ctx = document.getElementById("balanceChart").getContext("2d");

  if (window.compChart) {
    window.compChart.destroy();
  }

  window.compChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map(row => row.label),
      datasets: [{
        label: "Year-End Balance",
        data: data.map(row => row.balance),
        borderColor: "#4a90e2",
        backgroundColor: "rgba(74, 144, 226, 0.2)",
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => `$${ctx.raw.toFixed(2)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => `$${value}`
          }
        }
      }
    }
  });
}

function resetCompoundForm() {
  document.getElementById("compound-calculator").reset();
  document.getElementById("summary").innerHTML = "";
  document.getElementById("summary").style.display = "none";
  document.getElementById("amortization-schedule").innerHTML = "";
  document.getElementById("amortization-schedule").style.display = "none";
  document.getElementById("pdf-download-container").innerHTML = "";
  document.querySelector(".charts-container").style.display = "none";
  if (window.compChart) window.compChart.destroy();
}

function showDownloadButton(data) {
  const container = document.getElementById("pdf-download-container");
  container.innerHTML = `<button onclick="downloadPDF()">Download PDF</button>`;
  window.compoundData = data;
}

function showCSVExportButton(data) {
  const container = document.getElementById("pdf-download-container");
  const csvButton = document.createElement("button");
  csvButton.textContent = "Export CSV";
  csvButton.onclick = () => downloadCSV(data);
  container.appendChild(csvButton);
}

function downloadCSV(data) {
  const csvRows = ["Year,Total Deposits,Interest,Balance"];
  data.forEach(row => {
    csvRows.push(`${row.label},${row.deposit.toFixed(2)},${row.interest.toFixed(2)},${row.balance.toFixed(2)}`);
  });
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "compound_interest.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("Compound Interest Results", 10, 10);

  doc.setFontSize(10);
  const data = window.compoundData;
  let y = 20;
  data.slice(0, 40).forEach(row => {
    doc.text(`${row.label}: Balance $${row.balance.toFixed(2)}, Interest $${row.interest.toFixed(2)}, Deposits $${row.deposit.toFixed(2)}`, 10, y);
    y += 6;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save("compound_interest.pdf");
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("Compound Calculator Loaded");
});