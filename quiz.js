// quiz.js - JavaScript for the HTTP quiz page (quiz.html)
// Click Start -> timer starts -> answer questions -> Submit -> see score -> Reset to try again


// ===== Quiz settings =====
var timeLimit = 600;        // 10 minutes in seconds
var pointsEach = 10;        // each question is worth 10 points
var passScore = 70;         // need 70 out of 100 to pass


// ===== Answer key =====
// type tells the code how to read the answer:
//   "text"     = fill in the blank
//   "radio"    = multiple choice, one answer
//   "select"   = drop-down list
//   "checkbox" = select all that apply
// correct = the right value(s), lowercase for text answers
// show = what to print as the correct answer in the results
var questions = [
    { name: "q1",  type: "text",     correct: ["404"],                   show: "404" },
    { name: "q2",  type: "radio",    correct: ["b"],                     show: "The client, such as a web browser" },
    { name: "q3",  type: "checkbox", correct: ["get", "post", "delete"], show: "GET, POST, DELETE" },
    { name: "q4",  type: "text",     correct: ["get"],                   show: "GET" },
    { name: "q5",  type: "radio",    correct: ["d"],                     show: "Something went wrong on the server" },
    { name: "q6",  type: "select",   correct: ["2015"],                  show: "2015" },
    { name: "q7",  type: "radio",    correct: ["b"],                     show: "Each request stands on its own" },
    { name: "q8",  type: "text",     correct: ["quic"],                  show: "QUIC" },
    { name: "q9",  type: "radio",    correct: ["b"],                     show: "Head-of-line blocking at the TCP level" },
    { name: "q10", type: "checkbox", correct: ["mux", "binary", "hpack"], show: "Multiplexing, binary framing, HPACK header compression" }
];


// ===== Get the parts of the page we need =====
var form = document.getElementById("quiz-form");
var quizFields = document.getElementById("quiz-fields");
var startBtn = document.getElementById("start-btn");
var submitBtn = document.getElementById("submit-btn");
var resetBtn = document.getElementById("reset-btn");
var intro = document.getElementById("quiz-intro");
var timerBar = document.getElementById("timer-bar");
var timeLeftText = document.getElementById("time-left");
var timerFill = document.getElementById("timer-fill");
var results = document.getElementById("results");
var resultRows = document.getElementById("result-rows");


// ===== Timer =====
var startTime = 0;     // the time when Start was clicked
var timer = null;      // holds the setInterval so we can stop it later

// how many seconds since Start was clicked (max 600)
function getSecondsUsed() {
    var seconds = Math.round((Date.now() - startTime) / 1000);
    if (seconds > timeLimit) {
        seconds = timeLimit;
    }
    return seconds;
}

// turns seconds into a clock like 9:05
function clockText(totalSeconds) {
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    if (seconds < 10) {
        seconds = "0" + seconds;   // add a 0 so it shows 9:05 not 9:5
    }
    return minutes + ":" + seconds;
}

// turns seconds into words like 4 min 12 sec
function timeSpentText(totalSeconds) {
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    if (minutes == 0) {
        return seconds + " sec";
    }
    return minutes + " min " + seconds + " sec";
}

// runs every second while the quiz is going
function updateTimer() {
    var secondsLeft = timeLimit - getSecondsUsed();

    // update the clock and shrink the bar
    timeLeftText.textContent = clockText(secondsLeft);
    timerFill.style.width = (secondsLeft / timeLimit * 100) + "%";

    // orange when under 2 minutes, red when under 1 minute
    timerBar.classList.remove("warning");
    timerBar.classList.remove("danger");
    if (secondsLeft <= 60) {
        timerBar.classList.add("danger");
    } else if (secondsLeft <= 120) {
        timerBar.classList.add("warning");
    }

    // time is up, so submit the quiz for them
    if (secondsLeft <= 0) {
        submitQuiz(true);
    }
}

function stopTimer() {
    clearInterval(timer);
    timer = null;
}


// ===== Start button =====
function startQuiz() {
    // hide the rules, show the timer, unlock the questions
    intro.hidden = true;
    timerBar.hidden = false;
    quizFields.disabled = false;
    submitBtn.disabled = false;

    // start counting
    startTime = Date.now();
    updateTimer();
    timer = setInterval(updateTimer, 1000);   // call updateTimer every 1000 ms (1 second)
}


// ===== Reading answers =====

// gets what the user picked for one question
// returns an object with:
//   values = what we compare to the answer key
//   text   = what we show in the results table
function getAnswer(question) {
    var values = [];
    var text = "";

    if (question.type == "text") {
        var box = form.elements[question.name];
        text = box.value.trim();                  // trim removes extra spaces
        values.push(text.toLowerCase());          // lowercase so "Get" and "GET" both count
    }
    else if (question.type == "select") {
        var dropdown = form.elements[question.name];
        values.push(dropdown.value);
        if (dropdown.value != "") {
            text = dropdown.options[dropdown.selectedIndex].text;
        }
    }
    else {
        // radio or checkbox: find every box that is checked in this question
        var block = document.getElementById(question.name + "-block");
        var checked = block.querySelectorAll("input:checked");
        var labels = [];
        for (var i = 0; i < checked.length; i++) {
            values.push(checked[i].value);
            labels.push(checked[i].parentElement.textContent.trim());   // the label text next to the box
        }
        text = labels.join(", ");
    }

    return { values: values, text: text };
}

// checks if the answer is right
function checkAnswer(question, values) {
    if (question.type == "checkbox") {
        // they must pick the same number of boxes as the key...
        if (values.length != question.correct.length) {
            return false;
        }
        // ...and every box they picked must be in the key
        for (var i = 0; i < values.length; i++) {
            if (question.correct.indexOf(values[i]) == -1) {
                return false;
            }
        }
        return true;
    }

    // text, radio, select: one answer that has to match the key
    if (values.length == 0 || values[0] == "") {
        return false;   // left blank
    }
    return question.correct.indexOf(values[0]) != -1;
}


// ===== Submit =====
// timeUp is true if the timer ran out, false if they clicked Submit
function submitQuiz(timeUp) {
    stopTimer();
    var secondsUsed = getSecondsUsed();
    var numberCorrect = 0;
    resultRows.innerHTML = "";    // clear old rows

    // go through every question
    for (var i = 0; i < questions.length; i++) {
        var question = questions[i];
        var answer = getAnswer(question);
        var isRight = checkAnswer(question, answer.values);
        var points = 0;
        if (isRight) {
            points = pointsEach;
            numberCorrect++;
        }

        // color the question box and write feedback under it
        var block = document.getElementById(question.name + "-block");
        var feedback = block.querySelector(".feedback");
        if (isRight) {
            block.classList.add("correct");
            feedback.textContent = "Correct! +" + points + " points";
        } else {
            block.classList.add("incorrect");
            feedback.textContent = "Incorrect. The correct answer is: " + question.show;
        }

        // add a row to the results table
        var yourAnswer = answer.text;
        if (yourAnswer == "") {
            yourAnswer = "(no answer)";
        }
        var resultWord = "Incorrect";
        var rowClass = "row-incorrect";
        if (isRight) {
            resultWord = "Correct";
            rowClass = "row-correct";
        }
        addRow(i + 1, yourAnswer, question.show, resultWord, points + " / " + pointsEach, rowClass);
    }

    showResults(numberCorrect, secondsUsed, timeUp);

    // lock the quiz so answers can't be changed after submitting
    quizFields.disabled = true;
    submitBtn.disabled = true;
    timerBar.hidden = true;

    // jump up to the results
    results.scrollIntoView({ behavior: "smooth" });
}

// makes one row in the results table
function addRow(number, yourAnswer, correctAnswer, resultWord, scoreText, rowClass) {
    var row = document.createElement("tr");
    row.className = rowClass;

    var cells = [number, yourAnswer, correctAnswer, resultWord, scoreText];
    for (var i = 0; i < cells.length; i++) {
        var td = document.createElement("td");
        td.textContent = cells[i];
        row.appendChild(td);
    }

    resultRows.appendChild(row);
}

// fills in the pass/fail banner, total score and time
function showResults(numberCorrect, secondsUsed, timeUp) {
    var score = numberCorrect * pointsEach;
    var total = questions.length * pointsEach;

    var banner = document.getElementById("result-banner");
    var scoreText = document.getElementById("stat-score");

    if (score >= passScore) {
        banner.textContent = "PASSED - Nice work! You know your HTTP.";
        banner.className = "result-banner pass";      // green
        scoreText.className = "stat-value text-pass";
    } else {
        banner.textContent = "NOT PASSED - Review the pages and try again. You need " + passScore + " to pass.";
        banner.className = "result-banner fail";      // red
        scoreText.className = "stat-value text-fail";
    }

    scoreText.textContent = score + " / " + total;
    document.getElementById("stat-correct").textContent = numberCorrect + " of " + questions.length;
    document.getElementById("stat-time").textContent = timeSpentText(secondsUsed);

    // only show the "time ran out" message if the timer ended it
    document.getElementById("timeout-note").hidden = !timeUp;

    results.hidden = false;
}


// ===== Retake / Reset button =====
function resetQuiz() {
    stopTimer();

    // clears all text boxes, radio buttons, checkboxes and the drop-down
    form.reset();

    // take off the green/red colors and feedback
    var blocks = document.querySelectorAll(".question");
    for (var i = 0; i < blocks.length; i++) {
        blocks[i].classList.remove("correct");
        blocks[i].classList.remove("incorrect");
        blocks[i].querySelector(".feedback").textContent = "";
    }

    // hide and empty the results
    results.hidden = true;
    resultRows.innerHTML = "";

    // put everything back how it was before Start
    quizFields.disabled = true;
    submitBtn.disabled = true;
    timerBar.hidden = true;
    timerBar.classList.remove("warning");
    timerBar.classList.remove("danger");
    timeLeftText.textContent = clockText(timeLimit);
    timerFill.style.width = "100%";
    intro.hidden = false;

    window.scrollTo({ top: 0, behavior: "smooth" });
}


// ===== Connect the buttons to the functions =====
startBtn.addEventListener("click", startQuiz);
resetBtn.addEventListener("click", resetQuiz);

form.addEventListener("submit", function (event) {
    event.preventDefault();   // stops the page from reloading when the form is submitted
    submitQuiz(false);
});
