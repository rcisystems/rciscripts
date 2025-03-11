let currentQuestion = 0;
const totalQuestions = 10; // Reflects the number of existing questions in the HTML
const maxTotalScore = totalQuestions * 20; // Max achievable score is totalQuestions * 20
const sectionScores = { assetVariety: 0, riskCorrelation: 0 };

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
    let assetVarietyInputs = document.querySelectorAll('[name^="q1"]:checked, [name^="q2"]:checked, [name^="q3"]:checked, [name^="q4"]:checked, [name^="q5"]:checked');
    let riskCorrelationInputs = document.querySelectorAll('[name^="q6"]:checked, [name^="q7"]:checked, [name^="q8"]:checked, [name^="q9"]:checked, [name^="q10"]:checked');
    
    console.log("Asset Variety Selected Inputs:", assetVarietyInputs);
    console.log("Risk Correlation Selected Inputs:", riskCorrelationInputs);

    sectionScores.assetVariety = [...assetVarietyInputs].reduce((sum, input) => {
        let value = parseInt(input.value || "0");
        console.log(`Adding ${value} to Asset Variety`);
        return sum + value;
    }, 0);
    
    sectionScores.riskCorrelation = [...riskCorrelationInputs].reduce((sum, input) => {
        let value = parseInt(input.value || "0");
        console.log(`Adding ${value} to Risk Correlation`);
        return sum + value;
    }, 0);
    
    console.log("Final Asset Variety Score: ", sectionScores.assetVariety);
    console.log("Final Risk Correlation Score: ", sectionScores.riskCorrelation);
    
    // Ensure scores are valid
    if (isNaN(sectionScores.assetVariety) || isNaN(sectionScores.riskCorrelation)) {
        console.error("Error: Invalid score detected. Resetting scores to 0.");
        sectionScores.assetVariety = 0;
        sectionScores.riskCorrelation = 0;
    }

    totalScore = sectionScores.assetVariety + sectionScores.riskCorrelation;
    let totalPercentage = (totalScore / maxTotalScore) * 100;
    console.log("Total Score: ", totalScore);
    console.log("Total Percentage: ", totalPercentage.toFixed(1) + "%");

    let resultText = "";
    if (totalPercentage >= 80) {
        resultText = "True Diversification – You’re Ahead of the Game!";
    } else if (totalPercentage >= 50) {
        resultText = "Moderately Diversified – But You Have Gaps.";
    } else {
        resultText = "Portfolio Illusion – You’re Not Diversified, Just Overexposed.";
    }
    
    document.getElementById("result").innerHTML = `
        <h3 style="margin-bottom: 15px;">Your Overall Score: ${totalScore} / ${maxTotalScore} (${totalPercentage.toFixed(1)}%)</h3>
        <p style="margin-bottom: 20px;">${resultText}</p>
        <h3 style="margin-bottom: 10px;">Section Scores:</h3>
        <p style="margin-bottom: 15px;">Asset Variety: ${sectionScores.assetVariety}</p>
        <p style="margin-bottom: 15px;">Risk Correlation: ${sectionScores.riskCorrelation}</p>`;
    
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
