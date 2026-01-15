window.addEventListener("DOMContentLoaded", () => {
  const MAX_DICE = 4;

  const DICE = [
    { key: "blue",   colorCode: "BLU", virtue: "Prudence",  cssClass: "c-blue",   sixImageUrl: "images/Prudence.png" },
    { key: "yellow", colorCode: "YEL", virtue: "Speed",     cssClass: "c-yellow", sixImageUrl: "images/Speed.png" },
   { key: "red", colorCode: "RED", virtue: "Audacity", cssClass: "c-red", sixImageUrl: "images/Audacity.png" },
    { key: "purple", colorCode: "PUR", virtue: "Fortitude", cssClass: "c-purple", sixImageUrl: "images/Fortitude.png" },
  ];

  const state = {
    counts: Object.fromEntries(DICE.map(d => [d.key, 0])),
    rolled: false,
    results: Object.fromEntries(DICE.map(d => [d.key, []])),

    // per-die reroll count (same shape as results arrays)
    rerollCounts: Object.fromEntries(DICE.map(d => [d.key, []])),

    // Tracks whether counts changed since last roll
    hasChangedSinceRoll: true
  };

  const controlsEl = document.getElementById("controls");
  const resultsEl = document.getElementById("results");
  const rollBtn = document.getElementById("rollBtn");
  const resetBtn = document.getElementById("resetBtn");
  const statusLine = document.getElementById("statusLine");
  const hintEl = document.getElementById("hint");

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const randD6 = () => Math.floor(Math.random() * 6) + 1;
  const totalDiceSelected = () =>
    Object.values(state.counts).reduce((a, b) => a + b, 0);

  function updateButtons() {
    const total = totalDiceSelected();

    // Button label logic
    rollBtn.textContent = (!state.rolled || state.hasChangedSinceRoll) ? "Roll" : "Re-roll";

    rollBtn.disabled = total === 0;
    resetBtn.disabled = !(state.rolled || total > 0);

    // Status line
    if (!state.rolled && total === 0) {
      statusLine.textContent = "Set dice counts, then roll.";
    } else if (!state.rolled) {
      statusLine.textContent = `Ready: ${total} dice selected.`;
    } else {
      statusLine.textContent = "Tap any die to re-roll it.";
    }

    // Hint line
    if (!state.rolled) {
      hintEl.textContent = "Tip: Set dice counts, then roll.";
    } else {
      hintEl.textContent = "Tip: Change counts to roll again, or Re-roll to repeat.";
    }
  }

  /* ---------- Controls ---------- */

  function renderControls() {
    controlsEl.innerHTML = "";

    DICE.forEach(die => {
      const row = document.createElement("div");
      row.className = `dieRow ${die.cssClass}`;

      const icon = document.createElement("div");
      icon.className = "dieIcon";
      icon.textContent = die.colorCode;

      const meta = document.createElement("div");
      meta.className = "dieMeta";

      const header = document.createElement("div");
      header.className = "dieHeader";
      header.innerHTML = `<div class="name">${die.virtue}</div>`;

      const stepper = document.createElement("div");
      stepper.className = "stepper";

      const minus = document.createElement("button");
      minus.className = "stepBtn";
      minus.type = "button";
      minus.textContent = "–";
      minus.onclick = () => {
        state.counts[die.key] = clamp(state.counts[die.key] - 1, 0, MAX_DICE);
        state.hasChangedSinceRoll = true;
        renderControls();
        updateButtons();
      };

      const count = document.createElement("div");
      count.className = "countPill";
      count.textContent = state.counts[die.key];

      const plus = document.createElement("button");
      plus.className = "stepBtn";
      plus.type = "button";
      plus.textContent = "+";
      plus.onclick = () => {
        state.counts[die.key] = clamp(state.counts[die.key] + 1, 0, MAX_DICE);
        state.hasChangedSinceRoll = true;
        renderControls();
        updateButtons();
      };

      minus.disabled = state.counts[die.key] === 0;
      plus.disabled = state.counts[die.key] === MAX_DICE;

      stepper.append(minus, count, plus);
      meta.append(header, stepper);
      row.append(icon, meta);
      controlsEl.appendChild(row);
    });
  }

  /* ---------- Results ---------- */

  function pipPattern(n) {
    return {
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8]
    }[n] || [];
  }

  function createPips(n) {
    const el = document.createElement("div");
    el.className = "pips";
    const on = new Set(pipPattern(n));
    for (let i = 0; i < 9; i++) {
      const d = document.createElement("div");
      d.className = "pip" + (on.has(i) ? "" : " hidden");
      el.appendChild(d);
    }
    return el;
  }

  function createFace(obj, die, idx) {
    const tile = document.createElement("div");
    tile.className = "face rerollable"; // always rerollable once results exist
    tile.dataset.color = die.key;
    tile.dataset.index = idx;

    const times = state.rerollCounts[die.key]?.[idx] || 0;
    if (times > 0) tile.classList.add("face-rerolled");

    // OPTIONAL: show reroll count badge
    if (times > 0) {
      const badge = document.createElement("div");
      badge.className = "rerollBadge";
      badge.textContent = times;
      tile.appendChild(badge);
    }

    if (obj.value === 1) {
      const x = document.createElement("div");
      x.className = "xMark";
      x.textContent = "X";
      tile.appendChild(x);
    } else if (obj.value <= 5) {
      tile.appendChild(createPips(obj.value));
    } else {
      const wrap = document.createElement("div");
      wrap.className = "sixImg";

      if (die.sixImageUrl) {
        const img = document.createElement("img");
        img.src = die.sixImageUrl;
        img.alt = `${die.virtue} six`;
        wrap.appendChild(img);
        tile.classList.add("isSix");
      } else {
        wrap.textContent = "SIX";
      }

      tile.appendChild(wrap);
    }

    return tile;
  }

  function renderResults() {
    resultsEl.innerHTML = "";

    DICE.forEach(die => {
      const group = document.createElement("div");
      group.className = `resultGroup ${die.cssClass}`;

      group.innerHTML = `
        <div class="groupHeader">
          <div class="left">
            <div class="chip"></div>
            <div class="label">${die.virtue}</div>
          </div>
        </div>
      `;

      const faces = document.createElement("div");
      faces.className = "faces";

      state.results[die.key].forEach((obj, i) => {
        faces.appendChild(createFace(obj, die, i));
      });

      group.appendChild(faces);
      resultsEl.appendChild(group);
    });
  }

  /* ---------- Actions ---------- */

  function rollDice() {
    DICE.forEach(die => {
      const n = state.counts[die.key];

      // Roll values
      state.results[die.key] = Array.from({ length: n }, () => ({ value: randD6() }));

      // Reset reroll counts for this new set
      state.rerollCounts[die.key] = Array(n).fill(0);
    });

    state.rolled = true;
    state.hasChangedSinceRoll = false;

    renderResults();
    updateButtons();
  }

  rollBtn.onclick = () => {
    if (totalDiceSelected() === 0) return;
    rollDice();
  };

  resetBtn.onclick = () => {
    DICE.forEach(die => {
      state.counts[die.key] = 0;
      state.results[die.key] = [];
      state.rerollCounts[die.key] = [];
    });

    state.rolled = false;
    state.hasChangedSinceRoll = true;

    renderControls();
    renderResults();
    updateButtons();
  };

  // Tap any die to reroll it (infinite), incrementing reroll count
  resultsEl.onclick = e => {
    const face = e.target.closest(".face");
    if (!face || !state.rolled) return;

    const colorKey = face.dataset.color;
    const index = Number(face.dataset.index);
    if (Number.isNaN(index)) return;

    // Reroll value
    state.results[colorKey][index] = { value: randD6() };

    // Increment reroll count
    state.rerollCounts[colorKey][index] = (state.rerollCounts[colorKey][index] || 0) + 1;

    renderResults();
    updateButtons();
  };

  // Init
  renderControls();
  renderResults();
  updateButtons();
});
