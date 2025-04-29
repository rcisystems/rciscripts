let currentQuestion = 0;
const totalQuestions = 10; // Reflects the number of existing questions in the HTML
const maxTotalScore = 200; // Max achievable score is 200 (5 sections * 40)
const sectionScores = {
    assetVariety: 0,
    riskCorrelation: 0,
    liquidityCashFlow: 0,
    marketExposure: 0,
    alternativeInvestments: 0
};

function showQuestion(index) {
    const questions = document.querySelectorAll('.question');
    questions.forEach((q, i) => q.classList.toggle('active', i === index));
    document.getElementById('progress').innerText = `Question ${index + 1} of ${totalQuestions}`;
    document.getElementById('prevButton').style.display = index === 0 ? 'none' : 'inline';
    document.getElementById('nextButton').style.display = index === totalQuestions - 1 ? 'none' : 'inline';
    document.getElementById('submitButton').style.display = index === totalQuestions - 1 ? 'inline' : 'none';
    document.getElementById('resetButton').style.display = 'none';
}

function isAnswered() {
    const currentQ = document.querySelectorAll('.question')[currentQuestion];
    const inputs = currentQ.querySelectorAll('input[type=radio]:checked');
    return inputs.length > 0;
}

function nextQuestion() {
    if (!isAnswered()) {
        alert("Please answer the question before proceeding.");
        return;
    }
    if (currentQuestion < totalQuestions - 1) {
        currentQuestion++;
        showQuestion(currentQuestion);
    }
}

function prevQuestion() {
    if (currentQuestion > 0) {
        currentQuestion--;
        showQuestion(currentQuestion);
    }
}

function calculateScore() {
    if (!isAnswered()) {
        alert("Please answer the question before submitting.");
        return;
    }
    let totalScore = 0;
    
    // Debugging logs
    console.clear();
    console.log("Calculating scores...");

    // Fetch only selected answers for each section
    const assetVarietyInputs = document.querySelectorAll('[name^="q1"]:checked, [name^="q2"]:checked');
    const riskCorrelationInputs = document.querySelectorAll('[name^="q3"]:checked, [name^="q4"]:checked');
    const liquidityCashFlowInputs = document.querySelectorAll('[name^="q5"]:checked, [name^="q6"]:checked');
    const marketExposureInputs = document.querySelectorAll('[name^="q7"]:checked, [name^="q8"]:checked');
    const alternativeInvestmentsInputs = document.querySelectorAll('[name^="q9"]:checked, [name^="q10"]:checked');
    
    console.log("Asset Variety Selected Inputs:", assetVarietyInputs);
    console.log("Risk Correlation Selected Inputs:", riskCorrelationInputs);
    console.log("Liquidity & Cash Flow Selected Inputs:", liquidityCashFlowInputs);
    console.log("Market Exposure Selected Inputs:", marketExposureInputs);
    console.log("Alternative Investments Selected Inputs:", alternativeInvestmentsInputs);

    sectionScores.assetVariety = [...assetVarietyInputs].reduce((sum, input) => sum + parseInt(input.value || "0"), 0);
    sectionScores.riskCorrelation = [...riskCorrelationInputs].reduce((sum, input) => sum + parseInt(input.value || "0"), 0);
    sectionScores.liquidityCashFlow = [...liquidityCashFlowInputs].reduce((sum, input) => sum + parseInt(input.value || "0"), 0);
    sectionScores.marketExposure = [...marketExposureInputs].reduce((sum, input) => sum + parseInt(input.value || "0"), 0);
    sectionScores.alternativeInvestments = [...alternativeInvestmentsInputs].reduce((sum, input) => sum + parseInt(input.value || "0"), 0);
    
    console.log("Final Asset Variety Score: ", sectionScores.assetVariety);
    console.log("Final Risk Correlation Score: ", sectionScores.riskCorrelation);
    console.log("Final Liquidity & Cash Flow Score: ", sectionScores.liquidityCashFlow);
    console.log("Final Market Exposure Score: ", sectionScores.marketExposure);
    console.log("Final Alternative Investments Score: ", sectionScores.alternativeInvestments);
    
    // Validate scores
    if (isNaN(sectionScores.assetVariety) || isNaN(sectionScores.riskCorrelation) || isNaN(sectionScores.liquidityCashFlow) || isNaN(sectionScores.marketExposure) || isNaN(sectionScores.alternativeInvestments)) {
        console.error("Error: Invalid score detected. Resetting scores to 0.");
        sectionScores.assetVariety = 0;
        sectionScores.riskCorrelation = 0;
        sectionScores.liquidityCashFlow = 0;
        sectionScores.marketExposure = 0;
        sectionScores.alternativeInvestments = 0;
    }

    function getScoreColor(score) {
        if (score >= 32) return 'green';       // 80-100%
        if (score >= 24) return 'orange';      // 60-79%
        if (score >= 12) return 'orangered';   // 30-59%
        return 'red';                          // 0-29%
    }

    function getScoreLabel(score) {
        if (score >= 32) return 'Strong';
        if (score >= 24) return 'Moderate';
        if (score >= 12) return 'Needs Improvement';
        return 'Weak';
    }

    totalScore = sectionScores.assetVariety + sectionScores.riskCorrelation + sectionScores.liquidityCashFlow + sectionScores.marketExposure + sectionScores.alternativeInvestments;
    let totalPercentage = (totalScore / maxTotalScore) * 100;
    
    console.log("Total Score: ", totalScore);
    console.log("Total Percentage: ", totalPercentage.toFixed(1) + "%");

    let resultText = totalPercentage >= 80 ? "True Diversification – You’re Ahead of the Game!" :
                     totalPercentage >= 50 ? "Moderately Diversified – But You Have Gaps." :
                     "Portfolio Illusion – You’re Not Diversified, Just Overexposed.";
    
    document.getElementById("result").innerHTML = `
        <h2>Your Diversification Results</h2>
        <h3>Overall Score: ${totalScore} / ${maxTotalScore} (${totalPercentage.toFixed(1)}%)</h3>
        <p style="margin-bottom: 20px;">${resultText}</p>
        <h3>Section Scores:</h3>
        <ul style="list-style: none; padding-left: 0; margin-bottom: 20px;">
            <li><strong>Asset Variety:</strong> 
                <span style="color:${getScoreColor(sectionScores.assetVariety)};">
                    ${sectionScores.assetVariety} / 40 (${getScoreLabel(sectionScores.assetVariety)})
                </span>
            </li>
            <li><strong>Risk Correlation:</strong> 
                <span style="color:${getScoreColor(sectionScores.riskCorrelation)};">
                    ${sectionScores.riskCorrelation} / 40 (${getScoreLabel(sectionScores.riskCorrelation)})
                </span>
            </li>
            <li><strong>Liquidity & Cash Flow:</strong> 
                <span style="color:${getScoreColor(sectionScores.liquidityCashFlow)};">
                    ${sectionScores.liquidityCashFlow} / 40 (${getScoreLabel(sectionScores.liquidityCashFlow)})
                </span>
            </li>
            <li><strong>Market Exposure:</strong> 
                <span style="color:${getScoreColor(sectionScores.marketExposure)};">
                    ${sectionScores.marketExposure} / 40 (${getScoreLabel(sectionScores.marketExposure)})
                </span>
            </li>
            <li><strong>Alternative Investments:</strong> 
                <span style="color:${getScoreColor(sectionScores.alternativeInvestments)};">
                    ${sectionScores.alternativeInvestments} / 40 (${getScoreLabel(sectionScores.alternativeInvestments)})
                </span>
            </li>
        </ul>
        <button type="button" id="restartQuiz" onclick="resetQuiz()">Restart Quiz</button>
    `;
    
    document.getElementById('resetButton').style.display = 'inline';
}

function resetQuiz() {
    currentQuestion = 0;
    document.getElementById("quizForm").reset();
    document.getElementById("result").innerHTML = "";
    console.clear(); // Clear console on reset
    console.log("Quiz reset.");
    showQuestion(currentQuestion);
}

document.addEventListener("DOMContentLoaded", () => showQuestion(0));
