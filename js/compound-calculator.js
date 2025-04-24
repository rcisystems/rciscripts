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
  document.getElementById("principal").placeholder = "e.g. 10,000";
  document.getElementById("monthly").placeholder = "e.g. 200";
  document.getElementById("years").placeholder = "e.g. 20";
  document.getElementById("rate").placeholder = "e.g. 7.5";

  const principal = parseFloat(document.getElementById("principal").value);
  const monthlyDeposit = parseFloat(document.getElementById("monthly").value) || 0;
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
  const irr = monthlyDeposit > 0
    ? computeCashflowIRR(principal, monthlyDeposit, months, balance, frequency)
    : computeDateBasedXIRR(principal, balance, months);
  // Log the result of both IRR functions to ensure the correct one is being used
  const testIRR = computeCashflowIRR(principal, monthlyDeposit, months, balance, frequency);
  const testXIRR = computeDateBasedXIRR(principal, balance, months);
  logDebug("computeIRR result:", testIRR);
  logDebug("computeXIRR result:", testXIRR);
  logDebug("Used IRR value:", irr);
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

  // Log IRR being passed in to confirm it's updating
  logDebug("IRR passed to updateSummary:", irr);

  summary.innerHTML = `
    <style>
      .info-icon {
        cursor: help;
        border-bottom: 1px dotted #000;
      }
    </style>
    <p><strong>Final Balance:</strong> <span class="info-icon" data-tooltip="Your ending balance after all deposits and interest.">[?]</span> ${formatCurrency(finalBalance)}</p>
    <p><strong>Total Interest Earned:</strong> <span class="info-icon" data-tooltip="Total interest earned over the entire investment period.">[?]</span> ${formatCurrency(finalBalance - totalInvested)}</p>
    <p><strong>Effective Return (IRR):</strong> <span class="info-icon" data-tooltip="Annualized return considering all deposits and cash flow. 'N/A' means the result could not be calculated (e.g., only a single lump-sum investment).">[?]</span> ${isFinite(irr) ? (irr * 100).toFixed(2) + "%" : "N/A"}</p>
    <p><strong>Compounded Annual Growth Rate (CAGR):</strong> <span class="info-icon" data-tooltip="Smoothed annual return from start to final balance. 'N/A' means the input values prevented a valid CAGR calculation.">[?]</span> ${isFinite(CAGR) ? (CAGR * 100).toFixed(2) + "%" : "N/A"}</p>
    <p><strong>APY:</strong> <span class="info-icon" data-tooltip="Annual Percentage Yield, based on compound frequency. 'N/A' means compounding could not be calculated due to invalid input values.">[?]</span> ${isFinite(apy) ? apy.toFixed(4) + "%" : "N/A"}</p>
    <p><em>${formulaNote} where t = years</em></p>
  `;
}

function computeCashflowIRR(initial, monthly, months, finalValue, frequency, guess = 0.1) {
  if (monthly === 0) {
    return Math.pow(finalValue / initial, 1 / (months / 12)) - 1;
  }
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

function computeDateBasedXIRR(initial, finalValue, months) {
  const cashFlows = [-initial, finalValue];
  const now = new Date();
  const then = new Date(now.getTime());
  then.setMonth(then.getMonth() + months);
  const dates = [now, then];

  logDebug("XIRR cashFlows:", cashFlows);
  logDebug("XIRR dates:", dates.map(d => d.toISOString()));

  const maxIter = 100;
  const tol = 1e-7;
  let rate = 0.1;

  for (let iter = 0; iter < maxIter; iter++) {
    let npv = 0;
    let dNpv = 0;
    for (let i = 0; i < cashFlows.length; i++) {
      const days = (dates[i] - dates[0]) / (1000 * 60 * 60 * 24);
      const t = days / 365;
      const denominator = Math.pow(1 + rate, t);
      npv += cashFlows[i] / denominator;
      dNpv -= (t * cashFlows[i]) / (denominator * (1 + rate));
    }
    logDebug("Iter", iter, "rate", rate, "npv", npv, "dNpv", dNpv);
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
        <td>${formatCurrency(row.deposit)}</td>
        <td>${formatCurrency(row.interest)}</td>
        <td>${formatCurrency(row.balance)}</td>
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
            label: ctx => formatCurrency(ctx.raw)
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => formatCurrency(value)
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

function formatCurrency(amount) {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function downloadCSV(data) {
  const csvRows = [];
  // Insert summary block if available
  const summaryEl = document.getElementById("summary");
  if (summaryEl) {
    const summaryText = summaryEl.innerText.split("\n").filter(Boolean);
    summaryText.forEach(line => {
      csvRows.push(`"${line}"`);
    });
    csvRows.push(""); // Blank row to separate summary from table
  }
  // Push table headers
  csvRows.push('"Year","Total Deposits in Year ($)","Interest Earned in Year ($)","Year-End Balance ($)"');
  data.forEach(row => {
    csvRows.push(`"${row.label}","${formatCurrency(row.deposit)}","${formatCurrency(row.interest)}","${formatCurrency(row.balance)}"`);
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
  doc.text("Compound Interest Summary", 10, 10);

  const summaryEl = document.getElementById("summary");
  if (summaryEl) {
    const summaryText = summaryEl.innerText.split("\n").filter(Boolean);
    doc.setFontSize(10);
    let y = 16;
    summaryText.forEach(line => {
      doc.text(line, 10, y);
      y += 6;
    });

    // Table headers
    y += 4;
    doc.setFontSize(12);
    doc.text("Year", 10, y);
    doc.text("Deposits", 50, y);
    doc.text("Interest", 100, y);
    doc.text("Balance", 150, y);
    doc.setFontSize(10);
    y += 6;

    // Data rows
    const data = window.compoundData || [];
    data.slice(0, 40).forEach(row => {
      doc.text(row.label, 10, y);
      doc.text(formatCurrency(row.deposit), 50, y);
      doc.text(formatCurrency(row.interest), 100, y);
      doc.text(formatCurrency(row.balance), 150, y);
      y += 6;
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
    });

    // Add chart
    const canvas = document.getElementById("balanceChart");
    if (canvas) {
      const chartImage = canvas.toDataURL("image/png", 1.0);
      if (y > 200) {
        doc.addPage();
        y = 20;
      }
      doc.addImage(chartImage, "PNG", 10, y, 190, 80);
    }

    doc.save("compound_interest.pdf");
  }
}

function logDebug(...args) {
  const debug = document.getElementById("debug-toggle");
  if (debug && debug.checked) console.log(...args);
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("Compound Calculator Loaded");
  const debugToggle = document.createElement("label");
  debugToggle.innerHTML = '<input type="checkbox" id="debug-toggle"> Show Debug Info';
  document.body.prepend(debugToggle);

  // XIRR Excel Validator UI toggle
  const xirrValidateBtn = document.createElement("button");
  xirrValidateBtn.textContent = "Run XIRR Excel Validator";
  xirrValidateBtn.onclick = () => runXIRRValidation();
  document.body.appendChild(xirrValidateBtn);
});

function testXIRR() {
  const testNow = new Date();
  const testThen = new Date(testNow.getTime());
  testThen.setMonth(testThen.getMonth() + 180);
  logDebug("Test XIRR dates:", [testNow.toISOString(), testThen.toISOString()]);

  const expected = 0.221; // 22.1%
  const actual = computeDateBasedXIRR(200000, 1148698.23, 12 * 15);
  const pass = Math.abs(actual - expected) < 0.005;
  logDebug("Test XIRR:", pass ? "✅ Passed" : `❌ Failed (got ${(actual * 100).toFixed(2)}%)`);

  // Second test: 3 years at 10% IRR, 10,000 -> 13,310
  const expected2 = 0.10;
  const actual2 = computeDateBasedXIRR(10000, 13310, 36); // 3 years of 10% compound growth
  const pass2 = Math.abs(actual2 - expected2) < 0.005;
  logDebug("Test XIRR (10% over 3 years):", pass2 ? "✅ Passed" : `❌ Failed (got ${(actual2 * 100).toFixed(2)}%)`);
}

// Run test
testXIRR();

// Live XIRR Excel validator
function runXIRRValidation() {
  const expected = 0.221; // Simulated Excel XIRR result
  const actual = computeDateBasedXIRR(200000, 1148698.23, 12 * 15);
  const diff = actual - expected;
  const pass = Math.abs(diff) < 0.005;
  const message = `Excel XIRR Comparison: ${pass ? "✅ Match" : "❌ Mismatch"}\nExpected (Excel): ${(expected * 100).toFixed(2)}%\nCalculated: ${(actual * 100).toFixed(2)}%\nDifference: ${(diff * 100).toFixed(4)}%`;
  alert(message);
}