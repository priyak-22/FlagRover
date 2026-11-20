// Renders the World Atlas: an interactive map of expedition markers plus
// per-continent checklists. Undiscovered flags stay hidden until stamped.
const atlasStampsKey = "flagrover-continent-passport";
const atlasTotals = document.querySelector("#atlas-totals");
const atlasDots = document.querySelector("#atlas-dots");
const atlasContinents = document.querySelector("#atlas-continents");

function loadAtlasStamps() {
  try {
    const saved = JSON.parse(localStorage.getItem(atlasStampsKey) || "[]");
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

const atlasStamps = loadAtlasStamps();
const allCountries = Object.values(continentCountries).flat();
const discoveredCount = allCountries.filter(([, code]) =>
  atlasStamps.includes(code),
).length;

// Summary chips under the intro.
const totals = [
  [`${discoveredCount} / ${allCountries.length}`, "flags discovered"],
  [
    `${continentOrder.filter((continent) =>
      continentCountries[continent].every(([, code]) => atlasStamps.includes(code)),
    ).length} / ${continentOrder.length}`,
    "continents complete",
  ],
];
totals.forEach(([value, label]) => {
  const chip = document.createElement("div");
  chip.className = "atlas-total";
  const strong = document.createElement("strong");
  strong.textContent = value;
  const span = document.createElement("span");
  span.textContent = label;
  chip.append(strong, span);
  atlasTotals.append(chip);
});

// Map markers: equirectangular projection matches the generated world-map.svg
// (lon -180..180 -> x 0..100%, lat 90..-90 -> y 0..100%).
function project(lon, lat) {
  return { x: ((lon + 180) / 360) * 100, y: ((90 - lat) / 180) * 100 };
}

continentOrder.forEach((continent) => {
  continentCountries[continent].forEach(([countryName, code]) => {
    const coords = countryCoords[code];
    if (!coords) return;
    const discovered = atlasStamps.includes(code);
    const { x, y } = project(coords[0], coords[1]);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = `atlas-dot${discovered ? " is-discovered" : ""}`;
    dot.style.left = `${x}%`;
    dot.style.top = `${y}%`;
    dot.title = discovered
      ? `${countryName} — discovered`
      : `Undiscovered territory — ${continentLabels[continent] || continent}`;
    dot.setAttribute(
      "aria-label",
      discovered ? `${countryName}, discovered` : `Undiscovered location in ${continent}`,
    );
    dot.addEventListener("click", () => {
      document
        .getElementById(`atlas-country-${code}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    // Tooltip card: revealed flag + name only once discovered.
    const tip = document.createElement("span");
    tip.className = "atlas-dot-tip";
    if (discovered) {
      const img = document.createElement("img");
      img.src = `https://flagcdn.com/w80/${code}.png`;
      img.alt = "";
      const label = document.createElement("span");
      label.textContent = countryName;
      tip.append(img, label);
    } else {
      tip.textContent = "Undiscovered";
    }
    dot.append(tip);
    atlasDots.append(dot);
  });
});

// One section per continent, in expedition order.
continentOrder.forEach((continent) => {
  const entries = continentCountries[continent];
  const found = entries.filter(([, code]) => atlasStamps.includes(code)).length;
  const complete = found === entries.length;

  const section = document.createElement("section");
  section.className = "atlas-continent";
  section.id = `atlas-continent-${continent}`;

  const heading = document.createElement("div");
  heading.className = "atlas-continent-heading";

  const title = document.createElement("h2");
  title.textContent = continentLabels[continent] || continent;
  if (complete) {
    const badge = document.createElement("span");
    badge.className = "atlas-complete";
    badge.textContent = "Complete";
    title.append(" ", badge);
  }

  const count = document.createElement("span");
  count.className = "atlas-count";
  count.textContent = `${found} / ${entries.length}`;

  const bar = document.createElement("div");
  bar.className = "atlas-progress";
  const fill = document.createElement("span");
  fill.style.width = `${(found / entries.length) * 100}%`;
  bar.append(fill);

  heading.append(title, count, bar);
  section.append(heading);

  const grid = document.createElement("div");
  grid.className = "atlas-grid";

  entries.forEach(([countryName, code]) => {
    const discovered = atlasStamps.includes(code);
    const tile = document.createElement("article");
    tile.className = `atlas-tile${discovered ? "" : " is-undiscovered"}`;
    tile.id = `atlas-country-${code}`;

    if (discovered) {
      const image = document.createElement("img");
      image.src = `https://flagcdn.com/w160/${code}.png`;
      image.alt = `${countryName} flag`;
      image.loading = "lazy";
      tile.append(image);
    } else {
      const mystery = document.createElement("span");
      mystery.className = "atlas-tile-mystery";
      mystery.textContent = "?";
      mystery.setAttribute("aria-hidden", "true");
      tile.append(mystery);
    }

    const name = document.createElement("span");
    name.className = "atlas-tile-name";
    name.textContent = countryName;

    tile.append(name);
    if (!discovered) {
      const status = document.createElement("span");
      status.className = "atlas-tile-status";
      status.textContent = "undiscovered";
      tile.append(status);
    }
    grid.append(tile);
  });

  section.append(grid);
  atlasContinents.append(section);
});
