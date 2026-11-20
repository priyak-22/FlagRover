// Country data lives in flags-data.js, loaded before this file on every page that needs it.

// Make one flat list so totals and saved passport codes can be checked easily.
const countries = Object.entries(continentCountries).flatMap(
  ([continent, entries]) =>
    entries.map(([name, code]) => ({ name, code, continent })),
);

// Connect the JavaScript game logic to the elements in index.html.
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
const answerEffect = document.querySelector("#answer-effect");
// Two minutes, stored in milliseconds for JavaScript timers.
const recoveryDuration = 2 * 60 * 1000;

// Current expedition state. Stamps are saved separately so they survive page reloads.
const livesPerExpedition = 5;
const stampsKey = "flagrover-continent-passport";
let lives = livesPerExpedition;
let score = 0;
let questionDeck = [];
let questionIndex = 0;
let currentCountry = null;
let selectedContinent = "Asia";
let answerLocked = true;
let feedbackTimer = null;
let countdownTimer = null;
let stamps = loadStamps();

function loadStamps() {
  try {
    // Read saved country codes; ignore codes that are not part of the current game data.
    const saved = JSON.parse(localStorage.getItem(stampsKey) || "[]");
    const validCodes = new Set(countries.map((country) => country.code));
    return Array.isArray(saved)
      ? [...new Set(saved.filter((code) => validCodes.has(code)))]
      : [];
  } catch {
    return [];
  }
}

function saveStamps() {
  try {
    // localStorage keeps the passport collection after the browser is closed.
    localStorage.setItem(stampsKey, JSON.stringify(stamps));
  } catch {
    /* Storage may be disabled by the browser. */
  }
}

function shuffle(items) {
  // Return a randomized copy without changing the original country list.
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function highScoreKey(continent) {
  // Give each continent its own saved high-score entry.
  return `flagrover-high-score-${continent.toLowerCase().replaceAll(" ", "-")}`;
}

function getHighScore(continent) {
  try {
    // Read this continent's saved score; use zero when none exists.
    const value = Number.parseInt(
      localStorage.getItem(highScoreKey(continent)) || "0",
      10,
    );
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(continent, value) {
  try {
    // Store the best score reached for this continent.
    localStorage.setItem(highScoreKey(continent), String(value));
  } catch {
    /* Keep the current session playable without storage. */
  }
}

function renderStamps() {
  // Rebuild the passport cards from the stamps currently collected.
  stampsDisplay.replaceChildren();
  Object.entries(continentCountries).forEach(([continent, entries]) => {
    const card = document.createElement("article");
    card.className = "continent-passport";
    const heading = document.createElement("h2");
    const name = document.createElement("span");
    name.textContent = continent;
    // Count collected flags for this continent and show its progress.
    const found = entries.filter(([, code]) => stamps.includes(code)).length;
    const count = document.createElement("span");
    count.className = "continent-count";
    count.textContent = `${found} / ${entries.length}`;
    heading.append(name, count);

    const collection = document.createElement("div");
    collection.className = "continent-stamps";
    // Display collected flags, or a placeholder when there are none yet.
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
  renderContinentOptions();
}

function isContinentComplete(continent) {
  // A continent is complete only after every country has a passport stamp.
  return continentCountries[continent].every(([, code]) => stamps.includes(code));
}

function firstIncompleteContinent() {
  // Find the next continent in the progression that still has flags to collect.
  return continentOrder.find((continent) => !isContinentComplete(continent)) || null;
}

function renderContinentOptions() {
  // Keep future continents locked until the previous continent is fully collected.
  const firstIncomplete = firstIncompleteContinent();
  [...continentSelect.options].forEach((option) => {
    const index = continentOrder.indexOf(option.value);
    // Asia is first, so it has no previous continent to complete.
    option.disabled = index > 0 && !isContinentComplete(continentOrder[index - 1]);
    option.textContent = option.disabled ? `${option.value} (Locked)` : option.value;
  });
  if (firstIncomplete && continentSelect.selectedOptions[0]?.disabled) {
    selectedContinent = firstIncomplete;
    continentSelect.value = firstIncomplete;
  }
}

function renderStats() {
  // Update the visible lives, score, and selected continent's high score.
  livesDisplay.textContent = String(lives);
  scoreDisplay.textContent = String(score);
  highScoreDisplay.textContent = String(getHighScore(selectedContinent));
}

function updateSelection() {
  // Keep the selected continent and button label in sync with the dropdown.
  selectedContinent = continentSelect.value;
  highScoreDisplay.textContent = String(getHighScore(selectedContinent));
  startButton.textContent = `Start ${selectedContinent} expedition →`;
}

function createQuestion() {
  // End the round when every flag in the current shuffled deck has been shown.
  if (questionIndex >= questionDeck.length) {
    finishGame(
      `Expedition complete! You explored every flag in ${selectedContinent}.`,
    );
    return;
  }

  // Select the next flag and move the deck pointer forward.
  currentCountry = questionDeck[questionIndex];
  questionIndex += 1;
  flagDisplay.hidden = false;
  flagDisplay.style.backgroundImage = `url("https://flagcdn.com/w320/${currentCountry.code}.png")`;
  flagDisplay.setAttribute(
    "aria-label",
    `Flag to identify from ${currentCountry.continent}`,
  );
  questionDisplay.textContent = `${selectedContinent} expedition · Flag ${questionIndex} of ${questionDeck.length}`;
  feedbackDisplay.textContent = "Choose the country that matches this flag.";
  feedbackDisplay.dataset.mood = "";
  optionsDisplay.replaceChildren();

  // Wrong-answer choices come from the same continent as the flag.
  const regionalCountries = continentCountries[selectedContinent].map(
    ([name, code]) => ({ name, code, continent: selectedContinent }),
  );
  // Choose three different countries as decoys, then mix all four answers.
  const decoys = shuffle(
    regionalCountries.filter((country) => country.code !== currentCountry.code),
  ).slice(0, 3);
  shuffle([currentCountry, ...decoys]).forEach((country) => {
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
  // Ignore extra clicks while the current answer is being processed.
  if (answerLocked || !currentCountry) return;
  answerLocked = true;
  const buttons = [...optionsDisplay.querySelectorAll("button")];
  // Disable all choices and highlight the correct country immediately.
  buttons.forEach((button) => {
    button.disabled = true;
    if (button.textContent === currentCountry.name)
      button.classList.add("is-correct");
  });

  if (country.code === currentCountry.code) {
    // Correct answer: score a point and add this flag to the persistent passport.
    score += 1;
    feedbackDisplay.dataset.mood = "cheer";
    showAnswerEffect("cheer");
    feedbackDisplay.textContent = `Correct! ${currentCountry.name} is in ${selectedContinent}.`;
    // Avoid duplicate stamps while still allowing score to increase on repeats.
    if (!stamps.includes(currentCountry.code)) {
      stamps.push(currentCountry.code);
      saveStamps();
      renderStamps();
    }
    saveHighScore(
      selectedContinent,
      Math.max(score, getHighScore(selectedContinent)),
    );
  } else {
    // Wrong answer: remove one life and show the selected choice as incorrect.
    lives -= 1;
    feedbackDisplay.dataset.mood = "disappointed";
    showAnswerEffect("disappointed");
    selectedButton.classList.add("is-wrong");
    feedbackDisplay.textContent = `Not quite — this flag belongs to ${currentCountry.name}.`;
  }

  renderStats();
  // Let the on-screen reaction finish before moving to the next flag.
  if (country.code === currentCountry.code) {
    feedbackTimer = window.setTimeout(createQuestion, 2300);
  } else if (lives === 0) {
    pauseAfterLostLife();
  } else {
    feedbackTimer = window.setTimeout(createQuestion, 2300);
  }
}

function showAnswerEffect(mood) {
  // Restart the matching celebration or disappointment animation for each answer.
  answerEffect.className = "answer-effect";
  answerEffect.textContent = mood === "cheer" ? "🎉 Great job! ✨" : "😞 Oops! Try again";
  void answerEffect.offsetWidth;
  answerEffect.classList.add(`is-${mood}`);
}

function pauseAfterLostLife() {
  // Stop play only after all five lives are gone; keep the current flag for resuming.
  answerLocked = true;
  continentSelect.disabled = true;
  startButton.disabled = true;
  optionsDisplay.querySelectorAll("button").forEach((button) => { button.disabled = true; });
  window.clearTimeout(feedbackTimer);
  window.clearInterval(countdownTimer);
  // Use a target time so the countdown stays accurate if a timer tick is delayed.
  const resumeAt = Date.now() + recoveryDuration;
  const updateCountdown = () => {
    const secondsLeft = Math.max(0, Math.ceil((resumeAt - Date.now()) / 1000));
    feedbackDisplay.textContent = `Out of lives. Expedition resumes in ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}. Your collected stamps are safe.`;
    // When the two minutes end, restore five lives and continue the same deck.
    if (secondsLeft === 0) {
      window.clearInterval(countdownTimer);
      continentSelect.disabled = false;
      startButton.disabled = false;
      if (lives === 0) {
        lives = livesPerExpedition;
        score = 0;
        renderStats();
        feedbackDisplay.textContent = `New ${selectedContinent} expedition started. Your passport stamps are kept.`;
      }
      createQuestion();
    }
  };
  updateCountdown();
  countdownTimer = window.setInterval(updateCountdown, 1000);
}

function finishGame(message) {
  // Clear timers and hide the question when a continent deck is finished.
  window.clearTimeout(feedbackTimer);
  window.clearInterval(countdownTimer);
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
  // Start a fresh shuffled deck for the selected, unlocked continent.
  window.clearTimeout(feedbackTimer);
  window.clearInterval(countdownTimer);
  renderContinentOptions();
  updateSelection();
  lives = livesPerExpedition;
  score = 0;
  questionDeck = shuffle(
    continentCountries[selectedContinent].map(([name, code]) => ({
      name,
      code,
      continent: selectedContinent,
    })),
  );
  questionIndex = 0;
  renderStats();
  createQuestion();
}

// Build the dropdown in progression order so Asia appears first.
continentOrder.forEach((continent) => {
  const option = document.createElement("option");
  option.value = continent;
  option.textContent = continent;
  continentSelect.append(option);
});
continentSelect.value = selectedContinent;
updateSelection();
continentSelect.addEventListener("change", () => {
  // Changing continents clears the current question and resets lives and score.
  if (continentSelect.disabled) return;
  window.clearTimeout(feedbackTimer);
  currentCountry = null;
  answerLocked = true;
  optionsDisplay.replaceChildren();
  flagDisplay.hidden = true;
  questionDisplay.textContent = "Choose a continent and start your expedition.";
  feedbackDisplay.textContent =
    "Your lives and score reset when you start a new continent expedition.";
  updateSelection();
  lives = livesPerExpedition;
  score = 0;
  renderStats();
});
startButton.addEventListener("click", startGame);
// Draw the initial statistics and passport when the page first loads.
renderStats();
renderStamps();
