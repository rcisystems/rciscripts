// compound-calculator.js
function calculateCompound() {
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

  for (let i = 1; i <= totalPeriods; i++) {
    const isDepositMonth = granularity === "monthly" || (i % Math.floor(frequency / 12) === 0);
    const deposit = isDepositMonth ? monthly : 0;
    const interest = frequency > 0 ? balance * periodRate : 0;

    balance += interest + deposit;
    totalInterest += interest;

    const label = granularity === "monthly"
      ? `Month ${i}`
      : `Period ${i}`;

    data.push({
      label,
      balance: balance,
      interest: interest,
      deposit: deposit
    });
  }

  const totalInvested = principal + (monthly * months);
  const irr = computeIRR(principal, monthly, months, balance);
  const CAGR = Math.pow(balance / totalInvested, 12 / months) - 1;

  document.getElementById("summary").style.display = "block";
  document.querySelector(".charts-container").style.display = "block";

  updateSummary(balance, totalInterest, irr, CAGR);
  renderTable(data);
  renderChart(data);
  showDownloadButton(data);
}

function updateSummary(finalBalance, totalInterest, irr, CAGR) {
  const summary = document.getElementById("summary");
  summary.innerHTML = `
    <p><strong>Final Balance:</strong> $${finalBalance.toFixed(2)}</p>
    <p><strong>Total Interest Earned:</strong> $${totalInterest.toFixed(2)}</p>
    <p><strong>Estimated IRR:</strong> ${(irr * 100).toFixed(2)}%</p>
    <p><strong>Compounded Annual Growth Rate (CAGR):</strong> ${(CAGR * 100).toFixed(2)}%</p>
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
  document.getElementById("pdf-download-container").innerHTML = "";
  document.querySelector(".charts-container").style.display = "none";
  if (window.compChart) window.compChart.destroy();
}

function showDownloadButton(data) {
  const container = document.getElementById("pdf-download-container");
  container.innerHTML = `<button onclick="downloadPDF()">Download PDF</button>`;

  window.compoundData = data;
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

document.addEventListener("DOMContentLoaded", () => {
  console.log("Compound Calculator Loaded");
});