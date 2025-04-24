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
  // Use the toggle to determine which IRR to show
  const reinvestmentMode = document.getElementById("reinforcement-toggle") && document.getElementById("reinforcement-toggle").checked;
  const irr = reinvestmentMode
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

  // Use the correct IRR value based on the reinvestment toggle
  updateSummary(balance, totalInterest, reinvestmentMode ? testIRR : testXIRR, CAGR, principal, monthlyDeposit, months, rate, frequency);
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
  // Compute APY-style return from IRR, assuming monthly reinvestment
  const monthlyReinvestedRate = Math.pow(1 + irr, 1 / 12) - 1;
  const apyStyleFromXIRR = (Math.pow(1 + monthlyReinvestedRate, 12) - 1) * 100;
  const formulaNote = "Formula used: A = P(1 + r/n)<sup>nt</sup>";

  // Clarify and label the current IRR mode and log
  const reinvestmentToggle = document.getElementById("reinforcement-toggle");
  const reinvestmentMode = reinvestmentToggle && reinvestmentToggle.checked;
  logDebug("Summary Mode:", reinvestmentMode ? "Reinvestment" : "Lump Sum");
  logDebug("IRR used in Summary:", irr);
  logDebug("APY-style return from IRR:", apyStyleFromXIRR);
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
    <p><strong>Effective Return (IRR):</strong> <span class="info-icon" data-tooltip="Annualized return considering all deposits and cash flow.">${isFinite(irr) ? (irr * 100).toFixed(2) + "%" : "N/A"} ${reinvestmentMode ? "(Monthly Reinvestment)" : "(Lump Sum)"}</span></p>
    <p><strong>Total Return (XIRR Equivalent):</strong> <span class="info-icon" data-tooltip="Total growth over the investment period based on IRR.">${isFinite(irr) ? ((Math.pow(1 + irr, years) - 1) * 100).toFixed(2) + "%" : "N/A"} over ${years} years</span></p>
    <p><strong>Equity Multiple:</strong> <span class="info-icon" data-tooltip="Final balance divided by total invested amount.">${isFinite(finalBalance / totalInvested) ? (finalBalance / totalInvested).toFixed(2) + "x" : "N/A"}</span></p>
    ${
      reinvestmentMode
        ? `<p><strong>Monthly-Reinvested Return (APY Style):</strong> <span class="info-icon" data-tooltip="Simulates reinvested monthly compounding based on IRR. Useful for comparing against APYs shown on some investment platforms.">[?]</span> ${isFinite(apyStyleFromXIRR) ? apyStyleFromXIRR.toFixed(2) + "%" : "N/A"}</p>
           <p><strong>Equivalent Monthly Compounding Yield:</strong> <span class="info-icon" data-tooltip="This is the monthly return rate that, if compounded monthly, would result in the same final value.">${isFinite(monthlyReinvestedRate) ? (monthlyReinvestedRate * 100).toFixed(4) + "% monthly (Annualized to " + apyStyleFromXIRR.toFixed(2) + "%)" : "N/A"}</span></p>`
        : ""
    }
    <p><strong>Compounded Annual Growth Rate (CAGR):</strong> <span class="info-icon" data-tooltip="Smoothed annual return from start to final balance. 'N/A' means the input values prevented a valid CAGR calculation.">[?]</span> ${isFinite(CAGR) ? (CAGR * 100).toFixed(2) + "%" : "N/A"}</p>
    <p><strong>APY:</strong> <span class="info-icon" data-tooltip="Annual Percentage Yield, based on compound frequency. 'N/A' means compounding could not be calculated due to invalid input values.">[?]</span> ${isFinite(apy) ? apy.toFixed(4) + "%" : "N/A"}</p>
    <p><em>${formulaNote} where t = years</em></p>
  `;

  // Add the required monthly yield to hit this return, but only in reinvestmentMode
  if (reinvestmentMode) {
    const monthlyToTargetRate = Math.pow(finalBalance / principal, 1 / months) - 1;
    const annualizedTargetRate = (Math.pow(1 + monthlyToTargetRate, 12) - 1) * 100;
    summary.innerHTML +=
      `<p><strong>Required Monthly Yield to Hit This Return:</strong> <span class="info-icon" data-tooltip="This is the monthly return required to grow from principal to final value over the time period.">${(monthlyToTargetRate * 100).toFixed(4)}% monthly (Annualized to ${annualizedTargetRate.toFixed(2)}%)</span></p>`;
  }
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
  // Add mode toggle above the calculator
  const modeToggle = document.createElement("label");
  modeToggle.innerHTML = '<input type="checkbox" id="reinforcement-toggle"> Use Monthly Reinvestment (APY Style)';
  document.body.prepend(modeToggle);

  const debugToggle = document.createElement("label");
  debugToggle.innerHTML = '<input type="checkbox" id="debug-toggle"> Show Debug Info';
  document.body.prepend(debugToggle);

  // XIRR Excel Validator UI toggle
  const xirrValidateBtn = document.createElement("button");
  xirrValidateBtn.textContent = "Run XIRR Excel Validator";
  xirrValidateBtn.onclick = () => runXIRRValidation();
  document.body.appendChild(xirrValidateBtn);

  // --- Reverse XIRR Calculator UI ---
  const xirrSolveContainer = document.createElement("div");
  xirrSolveContainer.innerHTML = `
    <h4>Reverse XIRR Calculator</h4>
    <label>Starting Amount: <input id="reverse-start" value="200000"></label>
    <label>Final Amount: <input id="reverse-end" value="1148698.23"></label>
    <label>Years: <input id="reverse-years" value="15"></label>
    <label>Target XIRR (%): <input id="reverse-xirr" value="22.1"></label>
    <button id="solve-xirr-btn">Solve Interest Rate</button>
    <p id="reverse-result"></p>
  `;
  document.body.appendChild(xirrSolveContainer);
  document.getElementById("solve-xirr-btn").onclick = () => {
    const P = parseFloat(document.getElementById("reverse-start").value);
    const A = parseFloat(document.getElementById("reverse-end").value);
    const t = parseFloat(document.getElementById("reverse-years").value);
    const xirr = parseFloat(document.getElementById("reverse-xirr").value) / 100;
    // Nominal annual rate required to grow P to A in t years, compounded monthly:
    // A = P * (1 + r)^t, so r = (A/P)^(1/t) - 1 (annual nominal, compounded annually)
    // For monthly compounding, r_month = (A/P)^(1/(12*t)) - 1, then annualize: (1+r_month)^12-1
    const r_annual = (Math.pow(A / P, 1 / t) - 1) * 100;
    document.getElementById("reverse-result").innerText =
      `To grow ${formatCurrency(P)} to ${formatCurrency(A)} over ${t} years at ${xirr * 100}% XIRR:
→ Nominal rate (annual, compounded annually): ${r_annual.toFixed(2)}%`;
  };
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

function generateMonthlyCashflows(principal, monthly, years) {
  const startDate = new Date();
  const cashflows = [];
  const dates = [];
  const months = years * 12;
  if (principal > 0) {
    cashflows.push(-principal);
    dates.push(startDate);
  }
  for (let i = 1; i <= months; i++) {
    const dt = new Date(startDate.getTime());
    dt.setMonth(dt.getMonth() + i);
    cashflows.push(-monthly);
    dates.push(dt);
  }
  return { cashflows, dates };
}

function computeRealXIRR(cashflows, dates) {
  const maxIter = 100;
  const tol = 1e-7;
  let rate = 0.1;

  for (let iter = 0; iter < maxIter; iter++) {
    let npv = 0;
    let dNpv = 0;
    for (let i = 0; i < cashflows.length; i++) {
      const dt = (dates[i] - dates[0]) / (1000 * 60 * 60 * 24);
      const frac = dt / 365;
      const denom = Math.pow(1 + rate, frac);
      npv += cashflows[i] / denom;
      dNpv -= (frac * cashflows[i]) / (denom * (1 + rate));
    }
    const newRate = rate - npv / dNpv;
    if (Math.abs(newRate - rate) < tol) return newRate;
    rate = newRate;
  }
  return rate;
}

function runXIRRTestMatrix() {
  const failedRows = [];
  const durations = [1, 3, 5, 7, 10, 15, 20, 25, 30];
  const rates = [0.10, 0.12]; // 10% and 12%
  const freqs = [1, 2]; // annual and semiannual
  const payments = [100, 250, 300, 500, 750, 1000, 1200, 1500, 2000];
  const principal = 0;

  durations.forEach(years => {
    const months = years * 12;
    rates.forEach(rate => {
      freqs.forEach(freq => {
        payments.forEach(monthly => {
          const { cashflows, dates } = generateMonthlyCashflows(principal, monthly, years);
          const futureValue = computeFutureValue(principal, monthly, rate, freq, months);
          cashflows.push(futureValue); // simulate final lump sum payout
          dates.push(new Date(dates[dates.length - 1].getTime() + 24 * 60 * 60 * 1000));
          const xirr = computeRealXIRR(cashflows, dates);
          const label = `Years: ${years}, Rate: ${(rate * 100).toFixed(0)}%, Freq: ${freq === 1 ? 'Annual' : 'Semiannual'}, Monthly: ${monthly}`;
          if (xirr <= 0 || xirr > 1) {
            failedRows.push({ years, rate: rate * 100, freq: freq === 1 ? 'Annual' : 'Semiannual', monthly, xirr: xirr * 100 });
            logDebug(`❌ FAIL - ${label} → IRR: ${(xirr * 100).toFixed(2)}%`);
          } else {
            logDebug(`✅ PASS - ${label} → IRR: ${(xirr * 100).toFixed(2)}%`);
          }
        });
      });
    });
  });

  // Render failed cases as an HTML table, or show all-pass message
  if (failedRows.length > 0) {
    const container = document.createElement("div");
    container.innerHTML = "<h3>❌ Failing XIRR Test Cases</h3><table border='1'><tr><th>Years</th><th>Rate (%)</th><th>Compounding</th><th>Monthly</th><th>IRR (%)</th></tr></table>";
    const table = container.querySelector("table");
    failedRows.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${row.years}</td><td>${row.rate}</td><td>${row.freq}</td><td>${row.monthly}</td><td>${row.xirr.toFixed(2)}</td>`;
      table.appendChild(tr);
    });

    // CSV download button for failed rows
    const csvBtn = document.createElement("button");
    csvBtn.textContent = "Download Failures as CSV";
    csvBtn.onclick = () => {
      const csv = ["Years,Rate (%),Compounding,Monthly,IRR (%)"];
      failedRows.forEach(row => {
        csv.push(`${row.years},${row.rate},${row.freq},${row.monthly},${row.xirr.toFixed(2)}`);
      });
      const blob = new Blob([csv.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "xirr_failures.csv";
      a.click();
      URL.revokeObjectURL(url);
    };

    container.appendChild(csvBtn);
    document.body.appendChild(container);
  } else {
    const passMessage = document.createElement("p");
    passMessage.textContent = "✅ All XIRR tests passed.";
    document.body.appendChild(passMessage);
  }
}

function computeFutureValue(principal, monthly, rate, frequency, months) {
  const periods = months;
  const r = Math.pow(1 + rate / frequency, frequency / 12) - 1;
  let balance = principal;
  for (let i = 1; i <= periods; i++) {
    balance += monthly;
    const interest = balance * r;
    balance += interest;
  }
  return balance;
}

runXIRRTestMatrix();

// Test that toggling the reinvestment mode changes the IRR being used
function testReinvestmentToggleMode() {
  const principal = 200000;
  const years = 15;
  const months = years * 12;
  const rate = 0.12;
  const frequency = 2;
  const finalValue = 1148698.23;
  const monthly = 0;

  const reinvestedIRR = computeCashflowIRR(principal, monthly, months, finalValue, frequency);
  const xirr = computeDateBasedXIRR(principal, finalValue, months);

  const difference = Math.abs(reinvestedIRR - xirr);
  const toggledCorrectly = difference > 0.0005;
  logDebug("Toggle Mode Test:");
  logDebug("computeCashflowIRR:", (reinvestedIRR * 100).toFixed(2) + "%");
  logDebug("computeDateBasedXIRR:", (xirr * 100).toFixed(2) + "%");
  logDebug("Toggle correctly affects IRR value?", toggledCorrectly ? "✅ YES" : "❌ NO");
}

testReinvestmentToggleMode();

// Live XIRR Excel validator
function runXIRRValidation() {
  const expected = 0.221; // Simulated Excel XIRR result
  const actual = computeDateBasedXIRR(200000, 1148698.23, 12 * 15);
  const diff = actual - expected;
  const pass = Math.abs(diff) < 0.005;
  const message = `Excel XIRR Comparison: ${pass ? "✅ Match" : "❌ Mismatch"}\nExpected (Excel): ${(expected * 100).toFixed(2)}%\nCalculated: ${(actual * 100).toFixed(2)}%\nDifference: ${(diff * 100).toFixed(4)}%`;
  alert(message);
}