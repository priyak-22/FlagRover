// Builds the Records page from the same localStorage data the game writes:
// per-continent high scores and the persistent passport stamp collection.
const recordsStampsKey = "flagrover-continent-passport";
const recordsSummary = document.querySelector("#records-summary");
const recordsGrid = document.querySelector("#records-grid");
const recordsEmpty = document.querySelector("#records-empty");

function highScoreKeyFor(continent) {
  // Must match the key format used by script.js.
  return `flagrover-high-score-${continent.toLowerCase().replaceAll(" ", "-")}`;
}

function readNumber(key) {
  try {
    const value = Number.parseInt(localStorage.getItem(key) || "0", 10);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function loadRecordsStamps() {
  try {
    const saved = JSON.parse(localStorage.getItem(recordsStampsKey) || "[]");
    const validCodes = new Set(
      Object.values(continentCountries).flat().map(([, code]) => code),
    );
    return Array.isArray(saved)
      ? [...new Set(saved.filter((code) => validCodes.has(code)))]
      : [];
  } catch {
    return [];
  }
}

const recordsStamps = loadRecordsStamps();
const allCountries = Object.values(continentCountries).flat();
const totalStamps = recordsStamps.length;
const discoveredTotal = allCountries.filter(([, code]) =>
  recordsStamps.includes(code),
).length;

const continentStats = continentOrder.map((continent) => {
  const entries = continentCountries[continent];
  const found = entries.filter(([, code]) => recordsStamps.includes(code)).length;
  return {
    continent,
    label: continentLabels[continent] || continent,
    highScore: readNumber(highScoreKeyFor(continent)),
    found,
    total: entries.length,
    complete: found === entries.length,
  };
});

const hasActivity =
  totalStamps > 0 || continentStats.some((stat) => stat.highScore > 0);
recordsEmpty.hidden = hasActivity;

// Summary chips: lifetime stamps plus best score across all continents.
const bestScore = Math.max(0, ...continentStats.map((stat) => stat.highScore));
const completeContinents = continentStats.filter((stat) => stat.complete).length;
const summaryItems = [
  [`${discoveredTotal} / ${allCountries.length}`, "flags discovered"],
  [String(bestScore), "best expedition score"],
  [`${completeContinents} / ${continentOrder.length}`, "continents completed"],
];
summaryItems.forEach(([value, label]) => {
  const chip = document.createElement("div");
  chip.className = "record-total";
  const strong = document.createElement("strong");
  strong.textContent = value;
  const span = document.createElement("span");
  span.textContent = label;
  chip.append(strong, span);
  recordsSummary.append(chip);
});

// One card per continent with its high score and passport progress.
continentStats.forEach((stat) => {
  const card = document.createElement("article");
  card.className = "record-card";

  const heading = document.createElement("div");
  heading.className = "record-card-heading";
  const name = document.createElement("h2");
  name.textContent = stat.label;
  const score = document.createElement("span");
  score.className = "record-score";
  score.textContent = `${stat.highScore} pts`;
  heading.append(name, score);

  const bar = document.createElement("div");
  bar.className = "record-progress";
  const fill = document.createElement("span");
  fill.style.width = `${(stat.found / stat.total) * 100}%`;
  bar.append(fill);

  const footer = document.createElement("div");
  footer.className = "record-card-footer";
  const progress = document.createElement("span");
  progress.textContent = `${stat.found} / ${stat.total} stamps`;
  const link = document.createElement("a");
  link.href = "index.html#game";
  link.textContent = stat.complete ? "Replay expedition →" : "Continue expedition →";
  footer.append(progress, link);

  card.append(heading, bar, footer);
  recordsGrid.append(card);
});
