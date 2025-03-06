// Load required libraries
let useRecommendedAge = false; // Track whether the recommended age is being used

function calculateRetirement() {
  try {
    // Clear any existing download button
    const pdfContainer = document.getElementById("pdf-download-container");
    if (pdfContainer) {
      pdfContainer.innerHTML = "";
    }

    console.log("Starting Retirement Calculation...");

    // Gather inputs
    const inputs = getInputs();
    console.log("User Inputs:", inputs);

    validateInputs(inputs);
    console.log("Inputs validated successfully");

    let balance = inputs.currentBalance;
    let runOutOfMoneyAge = null;
    let isSelfSustaining = true;

    const scheduleTable = document.getElementById("amortization-schedule");
    scheduleTable.innerHTML = `
            <tr>
                <th>Age</th>
                <th>Yearly Income</th>
                <th>Beginning Balance</th>
                <th>Earnings</th>
                <th>Est Annual Savings</th>
                <th>Annual Withdrawal</th>
                <th>Ending Balance</th>
                <th>Withdrawal Rate (%)</th>
            </tr>
        `;

    // Calculate initial withdrawal and simulate the plan
    const initialWithdrawal = Math.ceil(
      inputs.desiredIncome *
        Math.pow(
          1 + inputs.costInflation,
          inputs.retirementAge - inputs.currentAge
        )
    );
    let totalAmountNeeded = 0; // Track total amount needed for retirement
    const data = []; // Store data for chart rendering

    for (let age = inputs.currentAge; age <= inputs.lifeExpectancy; age++) {
      const isRetired = age >= inputs.retirementAge;
      const yearlyIncome = Math.ceil(
        inputs.currentIncome *
          Math.pow(1 + inputs.wageInflation, age - inputs.currentAge)
      );
      const annualSavings = isRetired
        ? 0
        : Math.ceil(yearlyIncome * inputs.annualSavingsRate);
      const earnings = Math.ceil(
        balance * (isRetired ? inputs.postRetReturn : inputs.preRetReturn)
      );
      const annualWithdrawal = isRetired
        ? Math.max(
            0, // Ensure no negative withdrawal
            Math.ceil(
                (initialWithdrawal - inputs.afterRetIncome) * 
                Math.pow(1 + inputs.costInflation, age - inputs.retirementAge)
            )
            )
        : 0;

      const beginningBalance = balance;
      balance = Math.ceil(
        balance + earnings + annualSavings - annualWithdrawal
      );

      // Add to total amount needed for retirement if retired
      if (isRetired) {
        totalAmountNeeded += Math.ceil(annualWithdrawal);
      }

      // Calculate withdrawal rate
      let withdrawalRate = 0;
      if (balance > 0) {
        withdrawalRate = (annualWithdrawal / beginningBalance) * 100;
        if (withdrawalRate > 100) {
          withdrawalRate = 0; // Set to 0% if it exceeds 100%
        }
      }

      // Track when funds run out
      if (balance < 0 && runOutOfMoneyAge === null) {
        runOutOfMoneyAge = age;
        isSelfSustaining = false;
        console.warn(
          `Run out of money at Age ${age}. Marking plan as unsustainable.`
        );
      }

      // Determine row highlight class
      let rowClass = "";
      if (annualWithdrawal > earnings) rowClass = "highlight-yellow"; // Withdrawal > Earnings
      if (balance < 0) rowClass = "highlight-red"; // Balance < 0

      // Store data for rendering
      data.push({
        age,
        yearlyIncome: isRetired && annualWithdrawal > 0 ? 0 : yearlyIncome,
        beginningBalance,
        earnings,
        annualSavings,
        annualWithdrawal,
        endingBalance: Math.max(0, balance),
        withdrawalRate: balance > 0 ? withdrawalRate : 0,
      });

      // Update the table
      scheduleTable.innerHTML += `
          <tr class="${rowClass}">
              <td>${age}</td>
              <td>${
                isRetired && annualWithdrawal > 0
                  ? "0"
                  : yearlyIncome.toLocaleString()
              }</td>
              <td>${Math.max(0, beginningBalance).toLocaleString()}</td>
              <td>${Math.max(0, earnings).toLocaleString()}</td>
              <td>${annualSavings.toLocaleString()}</td>
              <td>${annualWithdrawal.toLocaleString()}</td>
              <td>${Math.max(0, balance).toLocaleString()}</td>
              <td>${withdrawalRate.toFixed(2)}%</td>
          </tr>
      `;
    }

    let recommendedAge = inputs.retirementAge;

    // Determine the recommended age if the plan is unsustainable
    if (!isSelfSustaining) {
      console.log(
        "Plan is unsustainable. Calculating recommended retirement age..."
      );
      recommendedAge = findRecommendedRetirementAge(inputs);
    }

    // Update summary and render charts
    updateSummary(
      inputs,
      runOutOfMoneyAge,
      isSelfSustaining,
      recommendedAge,
      totalAmountNeeded
    );
    renderCharts(data);

    // Make "Save Scenario" button and Scenario Comparison Table visible
    document.getElementById("save-scenario").style.display = "block";
    document.getElementById("scenario-comparison-container").style.display = "block";

    // Add recalculate button if the plan is unsustainable
    const recalculateButton = document.getElementById("recalculate-button");
    recalculateButton.innerHTML = ""; // Clear existing button

    if (!isSelfSustaining) {
      recalculateButton.innerHTML = `
                <button onclick="recalculateWithRecommendedAge(${recommendedAge})">
                    Recalculate with Recommended Retirement Age (${recommendedAge})
                </button>
            `;
    }

    // Add download button only after successful calculation
    addDownloadButton();
  } catch (error) {
    // Clear any existing download button if calculation fails
    const pdfContainer = document.getElementById("pdf-download-container");
    if (pdfContainer) {
      pdfContainer.innerHTML = "";
    }
    

    console.error(
      "An error occurred during retirement calculation:",
      error.message
    );
    alert(`Error: ${error.message}`);
  }
}

function getInputs() {
  return {
    desiredIncome: parseFloat(document.getElementById("desired-income").value),
    afterRetIncome: parseFloat(document.getElementById("after-ret-income").value) || 0, // New input field
    preRetReturn: parseFloat(document.getElementById("pre-ret").value) / 100,
    postRetReturn: parseFloat(document.getElementById("post-ret").value) / 100,
    currentAge: parseInt(document.getElementById("current-age").value),
    retirementAge: parseInt(document.getElementById("retirement-age").value),
    currentBalance: parseFloat(
      document.getElementById("current-balance").value
    ),
    wageInflation:
      parseFloat(document.getElementById("wage-inflation").value) / 100,
    costInflation:
      parseFloat(document.getElementById("cost-living-inflation").value) / 100,
    currentIncome: parseFloat(document.getElementById("current-income").value),
    annualSavingsRate:
      parseFloat(document.getElementById("annual-savings").value) / 100,
    lifeExpectancy: parseInt(document.getElementById("life-expectancy").value),
  };
}

// Cache for storing calculation results
const calculationCache = new Map();

// Input validation schema
const validationRules = {
  desiredIncome: {
    min: 0,
    max: 1000000000,
    message: "Desired income must be between $0 and $1,000,000,000",
  },
  afterRetIncome: {
    min: 0,
    max: 1000000000,
    message: "After Retirement Income must be between $0 and $1,000,000,000",
  },
  preRetReturn: {
    min: -20,
    max: 30,
    message: "Pre-retirement return must be between -20% and 30%",
  },
  postRetReturn: {
    min: -20,
    max: 30,
    message: "Post-retirement return must be between -20% and 30%",
  },
  currentAge: {
    min: 18,
    max: 100,
    message: "Current age must be between 18 and 100",
  },
  retirementAge: {
    min: 18,
    max: 100,
    message: "Retirement age must be between 18 and 100",
  },
  currentBalance: {
    min: 0,
    max: 1000000000000,
    message: "Current balance must be between $0 and $1,000,000,000,000",
  },
  wageInflation: {
    min: -5,
    max: 20,
    message: "Wage inflation must be between -5% and 20%",
  },
  costInflation: {
    min: -5,
    max: 20,
    message: "Cost of living inflation must be between -5% and 20%",
  },
  currentIncome: {
    min: 0,
    max: 1000000000,
    message: "Current income must be between $0 and $1,000,000,000",
  },
  annualSavingsRate: {
    min: 0,
    max: 100,
    message: "Annual savings rate must be between 0% and 100%",
  },
  lifeExpectancy: {
    min: 18,
    max: 120,
    message: "Life expectancy must be between 18 and 120",
  },
};

function validateInputs(inputs) {
  const errors = [];

  // Check each input against validation rules
  for (const [key, value] of Object.entries(inputs)) {
    const rules = validationRules[key];
    if (!rules) continue;

    const numValue = Number(value);

    // Check if value is a valid number
    if (isNaN(numValue)) {
      errors.push(`${key} must be a valid number`);
      continue;
    }

    // Check min/max constraints
    if (numValue < rules.min || numValue > rules.max) {
      errors.push(rules.message);
    }
  }

  // Additional cross-field validations
  if (inputs.retirementAge <= inputs.currentAge) {
    errors.push("Retirement age must be greater than current age");
  }

  if (inputs.lifeExpectancy <= inputs.retirementAge) {
    errors.push("Life expectancy must be greater than retirement age");
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}

function findRecommendedRetirementAge(inputs) {
  let balance;
  let recommendedAge = inputs.retirementAge;

  console.log("=== Debugging Recommended Retirement Age ===");
  console.log(`Starting from Desired Retirement Age: ${inputs.retirementAge}`);

  while (true) {
    balance = inputs.currentBalance;
    let isSustainable = true;

    const initialWithdrawal =
      inputs.desiredIncome *
      Math.pow(1 + inputs.costInflation, recommendedAge - inputs.currentAge);

    for (let age = inputs.currentAge; age <= inputs.lifeExpectancy; age++) {
      const isRetired = age >= recommendedAge;
      const yearlyIncome =
        inputs.currentIncome *
        Math.pow(1 + inputs.wageInflation, age - inputs.currentAge);
      const annualSavings = isRetired
        ? 0
        : yearlyIncome * inputs.annualSavingsRate;
      const earnings =
        balance * (isRetired ? inputs.postRetReturn : inputs.preRetReturn);
      const annualWithdrawal = isRetired
        ? initialWithdrawal *
          Math.pow(1 + inputs.costInflation, age - recommendedAge)
        : 0;

      balance = balance + earnings + annualSavings - annualWithdrawal;

      if (balance < 0) {
        isSustainable = false;
        break;
      }
    }

    if (isSustainable) {
      return recommendedAge;
    }

    recommendedAge++;

    if (recommendedAge > inputs.lifeExpectancy) {
      throw new Error("Unable to find a sustainable retirement age.");
    }
  }
}

function recalculateWithRecommendedAge(recommendedAge) {
  document.getElementById("retirement-age").value = recommendedAge;
  calculateRetirement();
}

function updateSummary(
    inputs,
    runOutOfMoneyAge,
    isSelfSustaining,
    recommendedAge,
    totalAmountNeeded
  ) {
    const summaryDiv = document.getElementById("summary");
    summaryDiv.innerHTML = `
          <p><strong>Plan Sustainability:</strong> ${
            isSelfSustaining ? "Sustainable" : "Unsustainable"
          }</p>
          <p><strong>Run Out of Money Age:</strong> ${
            runOutOfMoneyAge || "Never"
          }</p>
          <p><strong>Recommended Retirement Age:</strong> ${recommendedAge}</p>
          <p><strong>Total Amount Needed for Retirement:</strong> $${totalAmountNeeded.toLocaleString()}</p>
          <p><strong>After Retirement Income:</strong> $${inputs.afterRetIncome.toLocaleString()}</p>
      `;
  }

  // Array to store saved scenarios
let savedScenarios = [];

// Function to save scenario
function saveScenario() {
  try {
      console.log("Saving scenario...");

      // Get input values
      const inputs = getInputs();
      console.log("User Inputs:", inputs);

      validateInputs(inputs);
      console.log("Inputs validated successfully");

      // Calculate the scenario
      let balance = inputs.currentBalance;
      let runOutOfMoneyAge = null;
      let totalAmountNeeded = 0;
      let isSelfSustaining = true;

      const initialWithdrawal = inputs.desiredIncome * Math.pow(1 + inputs.costInflation, inputs.retirementAge - inputs.currentAge);
      console.log("Initial Withdrawal:", initialWithdrawal);

      for (let age = inputs.currentAge; age <= inputs.lifeExpectancy; age++) {
          const isRetired = age >= inputs.retirementAge;
          const annualWithdrawal = isRetired 
              ? Math.max(0, initialWithdrawal - inputs.afterRetIncome) * Math.pow(1 + inputs.costInflation, age - inputs.retirementAge) 
              : 0;

          balance = balance + (balance * (isRetired ? inputs.postRetReturn : inputs.preRetReturn)) - annualWithdrawal;

          console.log(`Age: ${age}, Balance: ${balance}, Annual Withdrawal: ${annualWithdrawal}`);

          if (isRetired) {
              totalAmountNeeded += Math.ceil(annualWithdrawal);
          }

          if (balance < 0 && runOutOfMoneyAge === null) {
              runOutOfMoneyAge = age;
              isSelfSustaining = false;
              console.warn(`Funds run out at Age ${age}`);
          }
      }

      // Store scenario
      const scenario = {
          id: Date.now(),
          retirementAge: inputs.retirementAge,
          afterRetIncome: inputs.afterRetIncome,
          desiredIncome: inputs.desiredIncome,
          runOutOfMoneyAge: runOutOfMoneyAge || "Never",
          totalNeeded: totalAmountNeeded
      };

      savedScenarios.push(scenario);
      console.log("Scenario saved:", scenario);

      updateScenarioTable();
  } catch (error) {
      console.error("Error in saveScenario():", error);
      alert(`Error: ${error.message}`);
  }
}


// Function to update the scenario comparison table
function updateScenarioTable() {
  console.log("Updating Scenario Table...");
  console.log("Saved Scenarios:", savedScenarios);

  const table = document.getElementById("scenario-comparison");

  if (!table) {
      console.error("Scenario comparison table not found!");
      return;
  }

  // Clear existing rows except for headers
  table.innerHTML = `
      <tr>
          <th>Scenario</th>
          <th>Retirement Age</th>
          <th>After Retirement Income</th>
          <th>Yearly Desired Income</th>
          <th>Run Out of Money Age</th>
          <th>Total Needed</th>
          <th>Delete</th>
      </tr>
  `;

  // Check if there are any scenarios
  if (savedScenarios.length === 0) {
      console.log("No scenarios to display.");
      return;
  }

  // Add saved scenarios
  savedScenarios.forEach((scenario, index) => {
      console.log(`Rendering Scenario ${index + 1}:`, scenario);

      const row = document.createElement("tr");
      row.innerHTML = `
          <td>Scenario ${index + 1}</td>
          <td>${scenario.retirementAge}</td>
          <td>$${scenario.afterRetIncome.toLocaleString()}</td>
          <td>$${scenario.desiredIncome.toLocaleString()}</td>
          <td>${scenario.runOutOfMoneyAge}</td>
          <td>$${scenario.totalNeeded.toLocaleString()}</td>
          <td><button class="delete-btn" data-id="${scenario.id}">🗑</button></td>
      `;
      table.appendChild(row);
  });

  // Add delete event listeners
  document.querySelectorAll(".delete-btn").forEach(button => {
      button.addEventListener("click", deleteScenario);
  });
}


// Function to delete a scenario
function deleteScenario(event) {
    const id = parseInt(event.target.getAttribute("data-id"));
    savedScenarios = savedScenarios.filter(scenario => scenario.id !== id);
    updateScenarioTable();
}

// Event listener for "Save Scenario" button
document.getElementById("save-scenario").addEventListener("click", saveScenario);

function renderCharts(data) {
  const ages = data.map((row) => row.age);
  const balances = data.map((row) => row.endingBalance);
  const incomes = data.map((row) => row.yearlyIncome);
  const withdrawals = data.map((row) => row.annualWithdrawal);

  // Destroy existing charts if they exist
  if (window.balanceChart instanceof Chart) {
    window.balanceChart.destroy();
  }
  if (window.incomeWithdrawalChart instanceof Chart) {
    window.incomeWithdrawalChart.destroy();
  }

  // Create the balance chart (Line Chart)
  const balanceCtx = document.getElementById("balanceChart").getContext("2d");
  window.balanceChart = new Chart(balanceCtx, {
    type: "line",
    data: {
      labels: ages,
      datasets: [
        {
          label: "Ending Balance ($)",
          data: balances,
          borderColor: "rgba(75, 192, 192, 1)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderWidth: 2,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: (ctx) => `$${ctx.raw.toLocaleString()}`,
          },
        },
      },
      scales: {
        x: { title: { display: true, text: "Age" } },
        y: {
          title: { display: true, text: "Amount ($)" },
          ticks: { callback: (value) => `$${value.toLocaleString()}` },
        },
      },
    },
  });

  // Create the income vs. withdrawal chart (Bar Chart)
  const incomeWithdrawalCtx = document
    .getElementById("incomeWithdrawalChart")
    .getContext("2d");
  window.incomeWithdrawalChart = new Chart(incomeWithdrawalCtx, {
    type: "bar",
    data: {
      labels: ages,
      datasets: [
        {
          label: "Yearly Income ($)",
          data: incomes,
          backgroundColor: "rgba(54, 162, 235, 0.6)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
        {
          label: "Annual Withdrawal ($)",
          data: withdrawals,
          backgroundColor: "rgba(255, 99, 132, 0.6)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: (ctx) => `$${ctx.raw.toLocaleString()}`,
          },
        },
      },
      scales: {
        x: { title: { display: true, text: "Age" } },
        y: {
          title: { display: true, text: "Amount ($)" },
          ticks: { callback: (value) => `$${value.toLocaleString()}` },
        },
      },
    },
  });
}

function addDownloadButton() {
  console.log("Adding download button after successful calculation");

  const pdfContainer = document.getElementById("pdf-download-container");
  if (pdfContainer) {
    pdfContainer.innerHTML = ""; // Clear any existing button
    const downloadButton = document.createElement("button");
    downloadButton.textContent = "Download PDF";
    downloadButton.id = "download-pdf-button";
    downloadButton.onclick = () => {
      showFormPopup();
    };
    pdfContainer.appendChild(downloadButton);
  } else {
    console.error("Download container not found");
  }
}

function showFormPopup() {
  // Create popup container
  const popup = document.createElement("div");
  popup.id = "form-popup";

  const formDiv = document.createElement("div");
  formDiv.className = "form-content";
  formDiv.innerHTML = `
          <iframe
              src="https://api.leadconnectorhq.com/widget/form/e4jLoetFxe1NDyEW4eiP"
              id="inline-e4jLoetFxe1NDyEW4eiP" 
              data-layout="{'id':'INLINE'}"
              data-trigger-type="alwaysShow"
              data-trigger-value=""
              data-activation-type="alwaysActivated"
              data-activation-value=""
              data-deactivation-type="neverDeactivate"
              data-deactivation-value=""
              data-form-name="SDIRA Calculator Form"
              data-height="402"
              data-layout-iframe-id="inline-e4jLoetFxe1NDyEW4eiP"
              data-form-id="e4jLoetFxe1NDyEW4eiP"
              title="SDIRA Calculator Form">
          </iframe>
      `;

  // Add close button (X) to the popup
  const closeButton = document.createElement("span");
  closeButton.textContent = "×";
  closeButton.className = "close-button";
  closeButton.onclick = () => {
    popup.remove();
    overlay.remove();
  };

  // Create overlay
  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      popup.remove();
      overlay.remove();
    }
  };

  // Append elements to popup
  popup.appendChild(closeButton);
  popup.appendChild(formDiv);

  // Append popup to body
  document.body.appendChild(overlay);
  document.body.appendChild(popup);

  // Start 10-second delay before downloading the PDF
  setTimeout(() => {
    downloadPDF();
  }, 5000);
}

function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Adding Title to the PDF
  doc.setFontSize(14);
  doc.text("Retirement Calculation Results", 10, 10);

  // Adding Summary of Inputs as a Table
  doc.setFontSize(10);
  doc.text("Summary of Inputs:", 10, 20);
  doc.setFontSize(8);

  const inputs = getInputs();
  const summaryTable = [
    ["Desired Income", `$${inputs.desiredIncome.toLocaleString()}`],
    ["Pre-Retirement Return", `${(inputs.preRetReturn * 100).toFixed(2)}%`],
    ["Post-Retirement Return", `${(inputs.postRetReturn * 100).toFixed(2)}%`],
    ["Current Age", `${inputs.currentAge}`],
    ["Retirement Age", `${inputs.retirementAge}`],
    ["Current Balance", `$${inputs.currentBalance.toLocaleString()}`],
    ["Wage Inflation", `${(inputs.wageInflation * 100).toFixed(2)}%`],
    ["Cost of Living Inflation", `${(inputs.costInflation * 100).toFixed(2)}%`],
    ["Current Income", `$${inputs.currentIncome.toLocaleString()}`],
    ["Annual Savings Rate", `${(inputs.annualSavingsRate * 100).toFixed(2)}%`],
    ["Life Expectancy", `${inputs.lifeExpectancy}`],
  ];

  let startY = 25;
  summaryTable.forEach(([key, value]) => {
    doc.text(key, 10, startY);
    doc.text(value, 90, startY);
    doc.setDrawColor(200);
    doc.line(10, startY - 3, 200, startY - 3); // Top line
    doc.line(10, startY + 3, 200, startY + 3); // Bottom line
    doc.line(10, startY - 3, 10, startY + 3); // Left line
    doc.line(200, startY - 3, 200, startY + 3); // Right line
    startY += 6;
  });

  // Adding Charts to the PDF
  const balanceChartCanvas = document.getElementById("balanceChart");
  const incomeWithdrawalChartCanvas = document.getElementById(
    "incomeWithdrawalChart"
  );

  if (balanceChartCanvas && incomeWithdrawalChartCanvas) {
    const balanceChartImg = balanceChartCanvas.toDataURL("image/png");
    const incomeWithdrawalChartImg =
      incomeWithdrawalChartCanvas.toDataURL("image/png");

    // Add Balance Chart to PDF
    doc.addImage(balanceChartImg, "PNG", 10, startY + 10, 180, 70);
    // Add Income vs Withdrawal Chart to PDF
    doc.addImage(incomeWithdrawalChartImg, "PNG", 10, startY + 90, 180, 70);
  }

  // Add a new page for the table
  doc.addPage();

  // Adding Table to the PDF
  startY = 20;
  const lineHeight = 6;
  const scheduleTable = document.getElementById("amortization-schedule");
  if (scheduleTable) {
    const rows = scheduleTable.getElementsByTagName("tr");

    // Set up table headers
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(8, 32, 71);
    doc.rect(10, startY - 5, 190, 7, "F");
    doc.text("Age", 12, startY);
    doc.text("Yearly Income", 22, startY);
    doc.text("Beginning Balance", 42, startY);
    doc.text("Earnings", 70, startY);
    doc.text("Annual Savings", 95, startY);
    doc.text("Annual Withdrawal", 120, startY);
    doc.text("Ending Balance", 150, startY);
    doc.text("Withdrawal Rate (%)", 175, startY);
    startY += lineHeight;

    // Add table content
    doc.setTextColor(0, 0, 0);
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].getElementsByTagName("td");
      if (cells.length > 0) {
        const rowClass = rows[i].className;
        if (rowClass.includes("highlight-yellow")) {
          doc.setFillColor(255, 235, 59);
          doc.rect(10, startY - 5, 190, lineHeight, "F");
        } else if (rowClass.includes("highlight-red")) {
          doc.setFillColor(244, 67, 54);
          doc.rect(10, startY - 5, 190, lineHeight, "F");
        }

        // Draw grid lines
        doc.setDrawColor(200);
        doc.line(10, startY - 5, 200, startY - 5);
        doc.line(10, startY + 1, 200, startY + 1);
        doc.line(10, startY - 5, 10, startY + 1);
        doc.line(200, startY - 5, 200, startY + 1);

        // Add cell text
        doc.text(cells[0].innerText, 12, startY);
        doc.text(
          cells[1].innerText === "-" ? "0" : cells[1].innerText,
          22,
          startY
        );
        doc.text(
          Math.max(0, parseFloat(cells[2].innerText)).toFixed(2),
          42,
          startY
        );
        doc.text(
          Math.max(0, parseFloat(cells[3].innerText)).toFixed(2),
          70,
          startY
        );
        doc.text(cells[4].innerText, 95, startY);
        doc.text(cells[5].innerText, 120, startY);
        doc.text(cells[6].innerText, 150, startY);
        doc.text(cells[7].innerText, 175, startY);

        startY += lineHeight;

        if (startY > 280) {
          doc.addPage();
          startY = 20;
        }
      }
    }
  }

  // Save the PDF
  doc.save("retirement_calculation_results.pdf");
}



// Initialize the calculator when the document is ready
document.addEventListener("DOMContentLoaded", () => {
  console.log("Document is fully loaded");
  document.querySelectorAll(".info-icon").forEach(icon => {
    icon.addEventListener("click", (event) => {
        event.stopPropagation(); 
        alert(icon.getAttribute("data-tooltip"));
    });
  });
});
