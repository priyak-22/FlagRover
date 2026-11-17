const continentCountries = {
    Africa: [
        ["Egypt", "eg"], ["Ghana", "gh"], ["Kenya", "ke"],
        ["Morocco", "ma"], ["Nigeria", "ng"], ["South Africa", "za"]
    ],
    Asia: [
        ["Russia", "ru"], ["Armenia", "am"], ["Qatar", "qa"], ["Afghanistan", "af"],
        ["Thailand", "th"], ["Japan", "jp"], ["Cyprus", "cy"], ["Malaysia", "my"],
        ["Tajikistan", "tj"], ["Timor-Leste", "tl"], ["North Korea", "kp"], ["Syria", "sy"],
        ["Oman", "om"], ["India", "in"], ["Vietnam", "vn"], ["South Korea", "kr"],
        ["Lebanon", "lb"], ["Turkey", "tr"], ["Kyrgyzstan", "kg"], ["China", "cn"],
        ["Mongolia", "mn"], ["Israel", "il"], ["Iran", "ir"], ["Sri Lanka", "lk"],
        ["Brunei", "bn"], ["Kazakhstan", "kz"], ["Jordan", "jo"], ["Maldives", "mv"],
        ["Cambodia", "kh"], ["Myanmar", "mm"], ["Azerbaijan", "az"], ["Iraq", "iq"],
        ["Uzbekistan", "uz"], ["Bangladesh", "bd"], ["Indonesia", "id"], ["Georgia", "ge"],
        ["Saudi Arabia", "sa"], ["United Arab Emirates", "ae"], ["Kuwait", "kw"],
        ["Turkmenistan", "tm"], ["Yemen", "ye"], ["Pakistan", "pk"], ["Laos", "la"],
        ["Philippines", "ph"], ["Nepal", "np"]
    ],
    Europe: [
        ["Denmark", "dk"], ["Finland", "fi"], ["France", "fr"], ["Germany", "de"],
        ["Greece", "gr"], ["Italy", "it"], ["Norway", "no"], ["Portugal", "pt"],
        ["Spain", "es"], ["Sweden", "se"], ["Ukraine", "ua"], ["United Kingdom", "gb"]
    ],
    "North America": [["Canada", "ca"], ["Cuba", "cu"], ["Jamaica", "jm"], ["Mexico", "mx"], ["Panama", "pa"], ["United States", "us"]],
    "South America": [["Argentina", "ar"], ["Bolivia", "bo"], ["Brazil", "br"], ["Chile", "cl"], ["Colombia", "co"], ["Peru", "pe"]],
    Oceania: [["Australia", "au"], ["Fiji", "fj"], ["New Zealand", "nz"], ["Papua New Guinea", "pg"], ["Samoa", "ws"], ["Tonga", "to"]]
};

const countries = Object.entries(continentCountries).flatMap(([continent, entries]) =>
    entries.map(([name, code]) => ({ name, code, continent }))
);

const livesDisplay = document.querySelector("#lives");
const scoreDisplay = document.querySelector("#score");
const highScoreDisplay = document.querySelector("#high-score");
const flagDisplay = document.querySelector("#flag");
const optionsDisplay = document.querySelector("#options");
const feedbackDisplay = document.querySelector("#feedback");
const questionDisplay = document.querySelector("#question");
const continentSelect = document.querySelector("#continent-select");
const startButton = document.querySelector("#start-expedition");
const stampsDisplay = document.querySelector("#stamps");
const progressDisplay = document.querySelector("#progress");
const stampsCountDisplay = document.querySelector("#stamps-count");

const livesPerExpedition = 3;
const stampsKey = "flagrover-continent-passport";
let lives = livesPerExpedition;
let score = 0;
let questionDeck = [];
let questionIndex = 0;
let currentCountry = null;
let selectedContinent = "Asia";
let answerLocked = true;
let feedbackTimer = null;
let stamps = loadStamps();

function loadStamps() {
    try {
        const saved = JSON.parse(localStorage.getItem(stampsKey) || "[]");
        const validCodes = new Set(countries.map(country => country.code));
        return Array.isArray(saved) ? [...new Set(saved.filter(code => validCodes.has(code)))] : [];
    } catch {
        return [];
    }
}

function saveStamps() {
    try { localStorage.setItem(stampsKey, JSON.stringify(stamps)); } catch { /* Storage may be disabled by the browser. */ }
}

function shuffle(items) {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function highScoreKey(continent) { return `flagrover-high-score-${continent.toLowerCase().replaceAll(" ", "-")}`; }

function getHighScore(continent) {
    try {
        const value = Number.parseInt(localStorage.getItem(highScoreKey(continent)) || "0", 10);
        return Number.isFinite(value) ? value : 0;
    } catch { return 0; }
}

function saveHighScore(continent, value) {
    try { localStorage.setItem(highScoreKey(continent), String(value)); } catch { /* Keep the current session playable without storage. */ }
}

function renderStamps() {
    stampsDisplay.replaceChildren();
    Object.entries(continentCountries).forEach(([continent, entries]) => {
        const card = document.createElement("article");
        card.className = "continent-passport";
        const heading = document.createElement("h2");
        const name = document.createElement("span");
        name.textContent = continent;
        const found = entries.filter(([, code]) => stamps.includes(code)).length;
        const count = document.createElement("span");
        count.className = "continent-count";
        count.textContent = `${found} / ${entries.length}`;
        heading.append(name, count);

        const collection = document.createElement("div");
        collection.className = "continent-stamps";
        const collected = entries.filter(([, code]) => stamps.includes(code));
        if (collected.length === 0) {
            const empty = document.createElement("p");
            empty.className = "empty-passport";
            empty.textContent = "Your first stamp is waiting.";
            collection.append(empty);
        } else {
            collected.forEach(([countryName, code]) => {
                const stamp = document.createElement("p");
                stamp.className = "passport-stamp";
                const image = document.createElement("img");
                image.src = `https://flagcdn.com/w80/${code}.png`;
                image.alt = "";
                image.loading = "lazy";
                const label = document.createElement("span");
                label.textContent = countryName;
                stamp.append(image, label);
                collection.append(stamp);
            });
        }
        card.append(heading, collection);
        stampsDisplay.append(card);
    });
    stampsCountDisplay.textContent = String(stamps.length);
    progressDisplay.textContent = `${stamps.length} / ${countries.length}`;
}

function renderStats() {
    livesDisplay.textContent = String(lives);
    scoreDisplay.textContent = String(score);
    highScoreDisplay.textContent = String(getHighScore(selectedContinent));
}

function updateSelection() {
    selectedContinent = continentSelect.value;
    highScoreDisplay.textContent = String(getHighScore(selectedContinent));
    startButton.textContent = `Start ${selectedContinent} expedition →`;
}

function createQuestion() {
    if (questionIndex >= questionDeck.length) {
        finishGame(`Expedition complete! You explored every flag in ${selectedContinent}.`);
        return;
    }

    currentCountry = questionDeck[questionIndex];
    questionIndex += 1;
    flagDisplay.hidden = false;
    flagDisplay.style.backgroundImage = `url("https://flagcdn.com/w320/${currentCountry.code}.png")`;
    flagDisplay.setAttribute("aria-label", `Flag to identify from ${currentCountry.continent}`);
    questionDisplay.textContent = `${selectedContinent} expedition · Flag ${questionIndex} of ${questionDeck.length}`;
    feedbackDisplay.textContent = "Choose the country that matches this flag.";
    optionsDisplay.replaceChildren();

    const regionalCountries = continentCountries[selectedContinent].map(([name, code]) => ({ name, code, continent: selectedContinent }));
    const decoys = shuffle(regionalCountries.filter(country => country.code !== currentCountry.code)).slice(0, 3);
    shuffle([currentCountry, ...decoys]).forEach(country => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "answer-option";
        option.textContent = country.name;
        option.addEventListener("click", () => chooseAnswer(country, option));
        optionsDisplay.append(option);
    });
    answerLocked = false;
}

function chooseAnswer(country, selectedButton) {
    if (answerLocked || !currentCountry) return;
    answerLocked = true;
    const buttons = [...optionsDisplay.querySelectorAll("button")];
    buttons.forEach(button => {
        button.disabled = true;
        if (button.textContent === currentCountry.name) button.classList.add("is-correct");
    });

    if (country.code === currentCountry.code) {
        score += 1;
        feedbackDisplay.textContent = `Correct! ${currentCountry.name} is in ${selectedContinent}.`;
        if (!stamps.includes(currentCountry.code)) {
            stamps.push(currentCountry.code);
            saveStamps();
            renderStamps();
        }
        saveHighScore(selectedContinent, Math.max(score, getHighScore(selectedContinent)));
    } else {
        lives -= 1;
        selectedButton.classList.add("is-wrong");
        feedbackDisplay.textContent = `Not quite — this flag belongs to ${currentCountry.name}.`;
    }

    renderStats();
    if (lives === 0) {
        feedbackTimer = window.setTimeout(() => finishGame(`Expedition over! You scored ${score} in ${selectedContinent}.`), 1100);
    } else {
        feedbackTimer = window.setTimeout(createQuestion, 1100);
    }
}

function finishGame(message) {
    window.clearTimeout(feedbackTimer);
    currentCountry = null;
    answerLocked = true;
    flagDisplay.hidden = true;
    flagDisplay.style.backgroundImage = "none";
    optionsDisplay.replaceChildren();
    questionDisplay.textContent = `${selectedContinent} expedition`;
    feedbackDisplay.textContent = message;
    startButton.textContent = `Explore ${selectedContinent} again →`;
}

function startGame() {
    window.clearTimeout(feedbackTimer);
    updateSelection();
    lives = livesPerExpedition;
    score = 0;
    questionDeck = shuffle(continentCountries[selectedContinent].map(([name, code]) => ({ name, code, continent: selectedContinent })));
    questionIndex = 0;
    renderStats();
    createQuestion();
}

Object.keys(continentCountries).forEach(continent => {
    const option = document.createElement("option");
    option.value = continent;
    option.textContent = continent;
    continentSelect.append(option);
});
continentSelect.value = selectedContinent;
updateSelection();
continentSelect.addEventListener("change", () => {
    window.clearTimeout(feedbackTimer);
    currentCountry = null;
    answerLocked = true;
    optionsDisplay.replaceChildren();
    flagDisplay.hidden = true;
    questionDisplay.textContent = "Choose a continent and start your expedition.";
    feedbackDisplay.textContent = "Your lives and score reset when you start a new continent expedition.";
    updateSelection();
    lives = livesPerExpedition;
    score = 0;
    renderStats();
});
startButton.addEventListener("click", startGame);
renderStats();
renderStamps();
