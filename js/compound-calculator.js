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
  const fields = ["principal", "monthly", "months", "rate", "compound", "granularity"];
  for (const id of fields) {
    if (!document.getElementById(id)) {
      alert(`Form element "${id}" not found. Please check your HTML.`);
      return;
    }
  }
  const principal = parseFloat(document.getElementById("principal").value);
  const monthly = parseFloat(document.getElementById("monthly").value);
  const months = parseInt(document.getElementById("months").value);
  const rate = parseFloat(document.getElementById("rate").value) / 100;
  const frequency = parseInt(document.getElementById("compound").value);
  const granularity = document.getElementById("granularity").value;

  const totalPeriods = months;
  const interval = granularity === "monthly" ? 12 : frequency;
  const periodRate = frequency > 0 ? rate / frequency : 0;

  let balance = principal;
  const data = [];
  let totalInterest = 0;

  if (monthly === 0) {
    const compoundingsPerYear = frequency;
    const tYears = months / 12;
    const maturity = frequency > 0
      ? principal * Math.pow(1 + rate / compoundingsPerYear, compoundingsPerYear * tYears)
      : principal;
    totalInterest = maturity - principal;
    balance = maturity;
    data.push({
      label: getPeriodLabel(months, frequency),
      deposit: 0,
      interest: totalInterest,
      balance: balance
    });
  } else {
    for (let i = 1; i <= totalPeriods; i++) {
      const isDepositMonth = granularity === "monthly" || (i % Math.floor(frequency / 12) === 0);
      const deposit = isDepositMonth ? monthly : 0;
      const interest = frequency > 0 ? balance * periodRate : 0;

      balance += interest + deposit;
      totalInterest += interest;

      const label = getPeriodLabel(i, frequency);

      data.push({
        label,
        balance: balance,
        interest: interest,
        deposit: deposit
      });
    }
  }

  const totalInvested = principal + (monthly * months);
  const irr = computeIRR(principal, monthly, months, balance);
  const CAGR = Math.pow(balance / totalInvested, 12 / months) - 1;

  document.getElementById("summary").style.display = "block";
  document.querySelector(".charts-container").style.display = "block";
  document.getElementById("comparison-section").style.display = "block";
  const amortTable = document.getElementById("amortization-schedule");
  amortTable.style.opacity = 0;
  amortTable.style.display = "table";
  setTimeout(() => { amortTable.style.transition = "opacity 0.5s"; amortTable.style.opacity = 1; }, 10);

  updateSummary(balance, totalInterest, irr, CAGR);
  renderTable(data);
  renderChart(data);
  showDownloadButton(data);
  showCSVExportButton(data);
}

function compareScenarios(scenarios) {
  const container = document.getElementById("comparison-results");
  const section = document.getElementById("comparison-section");
  section.style.display = "block";

  let html = '<table><thead><tr><th>Scenario</th><th>Final Balance</th><th>Total Interest</th><th>IRR</th><th>CAGR</th><th>APY</th></tr></thead><tbody>';

  scenarios.forEach(({ name, principal, monthly, months, rate, frequency }) => {
    const compoundingsPerYear = frequency;
    const tYears = months / 12;
    const maturity = frequency > 0
      ? principal * Math.pow(1 + rate / 100 / compoundingsPerYear, compoundingsPerYear * tYears)
      : principal;

    const totalInterest = maturity - principal;
    const totalInvested = principal + (monthly * months);
    const irr = computeIRR(principal, monthly, months, maturity);
    const CAGR = Math.pow(maturity / totalInvested, 1 / tYears) - 1;
    const APY = (Math.pow(1 + (rate / 100) / compoundingsPerYear, compoundingsPerYear) - 1) * 100;

    html += `<tr>
      <td>${name}</td>
      <td>$${maturity.toFixed(2)}</td>
      <td>$${totalInterest.toFixed(2)}</td>
      <td>${(irr * 100).toFixed(2)}%</td>
      <td>${(CAGR * 100).toFixed(2)}%</td>
      <td>${APY.toFixed(4)}%</td>
    </tr>`;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function updateSummary(finalBalance, totalInterest, irr, CAGR) {
  const summary = document.getElementById("summary");
  const months = parseFloat(document.getElementById("months").value);
  const apy = ((1 + (totalInterest / (finalBalance - totalInterest))) ** (12 / months) - 1) * 100;
  const formulaNote = "Formula used: A = P(1 + r/n)<sup>nt</sup>";
  summary.innerHTML = `
    <style>
      .info-icon {
        cursor: help;
        border-bottom: 1px dotted #000;
      }
    </style>
    <p><strong>Final Balance:</strong> <span class="info-icon" title="This is your ending balance after all deposits and interest are applied.">[?]</span> $${finalBalance.toFixed(2)}</p>
    <p><strong>Total Interest Earned:</strong> <span class="info-icon" title="Total amount of interest earned over the entire investment period.">[?]</span> $${totalInterest.toFixed(2)}</p>
    <p><strong>Estimated IRR:</strong> <span class="info-icon" title="Internal Rate of Return: Annualized return considering all cash flows.">[?]</span> ${(irr * 100).toFixed(2)}%</p>
    <p><strong>Compounded Annual Growth Rate (CAGR):</strong> <span class="info-icon" title="Average annual return assuming steady growth from start to end balance.">[?]</span> ${(CAGR * 100).toFixed(2)}%</p>
    <p><strong>APY:</strong> <span class="info-icon" title="Annual Percentage Yield: Total effective yield based on compound interest.">[?]</span> ${apy.toFixed(4)}%</p>
    <p><em>${formulaNote}</em></p>
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
  const table = document.getElementById("amortization-schedule");
  table.innerHTML = `
    <tr>
      <th>Period</th>
      <th>Deposit ($)</th>
      <th>Interest ($)</th>
      <th>Balance ($)</th>
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
  if (window.compChart) window.compChart.destroy();

  window.compChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map(row => row.label),
      datasets: [{
        label: "Balance Over Time",
        data: data.map(row => row.balance),
        borderColor: "#b5833c",
        backgroundColor: "rgba(181, 131, 60, 0.2)",
        fill: true,
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
  const csvRows = ["Period,Deposit,Interest,Balance"];
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
    doc.text(`${row.label}: Balance $${row.balance.toFixed(2)}, Interest $${row.interest.toFixed(2)}, Deposit $${row.deposit.toFixed(2)}`, 10, y);
    y += 6;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save("compound_interest.pdf");
}

compareScenarios([
  { name: "Monthly", principal: 10000, monthly: 0, months: 12, rate: 10, frequency: 12 },
  { name: "Quarterly", principal: 10000, monthly: 0, months: 12, rate: 10, frequency: 4 },
  { name: "Annually", principal: 10000, monthly: 0, months: 12, rate: 10, frequency: 1 }
]);

document.addEventListener("DOMContentLoaded", () => {
  console.log("Compound Calculator Loaded");
});
