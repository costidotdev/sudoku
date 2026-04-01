"use strict";

// ─── The puzzle from the main game (script.js) ────────────────────────────────
// prettier-ignore
const SOURCE_BOARD = [
  0, 0, 7,  4, 9, 1,  6, 0, 5,
  2, 0, 0,  0, 6, 0,  3, 0, 9,
  0, 0, 0,  0, 0, 7,  0, 1, 0,
  0, 5, 8,  6, 0, 0,  0, 0, 4,
  0, 0, 3,  0, 0, 0,  0, 9, 0,
  0, 0, 6,  2, 0, 0,  1, 8, 7,
  9, 0, 4,  0, 7, 0,  0, 0, 2,
  6, 7, 0,  8, 3, 0,  0, 0, 0,
  8, 1, 0,  0, 4, 5,  0, 0, 0,
];

// ─── State ────────────────────────────────────────────────────────────────────
let board = [];
let given = [];
let isPaused = false;
let isCancelled = false;
let resolveResume = null;
let isRunning = false;
let steps = 0;
let backtracks = 0;

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const boardEl = document.getElementById("board");
const solveBtn = document.getElementById("solve-btn");
const pauseBtn = document.getElementById("pause-btn");
const resetBtn = document.getElementById("reset-btn");
const speedSlider = document.getElementById("speed-slider");
const speedValueEl = document.getElementById("speed-value");
const stepCountEl = document.getElementById("step-count");
const backtracksEl = document.getElementById("backtrack-count");
const statusMsg = document.getElementById("status-msg");
const conflictMsg = document.getElementById("reason-msg");

// ─── Board rendering ──────────────────────────────────────────────────────────
function renderBoard() {
  boardEl.innerHTML = "";
  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9);
    const col = i % 9;

    const tile = document.createElement("div");
    tile.classList.add("tile");
    tile.id = `cell-${i}`;

    if (row === 2 || row === 5) tile.classList.add("horizontal-line");
    if (col === 2 || col === 5) tile.classList.add("vertical-line");

    if (given[i]) {
      tile.style.color = "var(--text-color)";
      tile.style.backgroundColor = "white";
      tile.style.fontWeight = "bold";
    }

    tile.textContent = board[i] !== 0 ? board[i] : "";
    boardEl.appendChild(tile);
  }
}

function setCellState(index, value, stateClass) {
  const tile = document.getElementById(`cell-${index}`);
  if (!tile) return;

  tile.textContent = value !== 0 ? value : "";

  if (given[index]) return; // never alter given cells

  tile.classList.remove("tile-trying", "tile-backtrack", "tile-confirmed");
  if (stateClass) tile.classList.add(stateClass);
}

// ─── Conflict highlighting ────────────────────────────────────────────────────
// When backtracking, highlight every filled neighbour in the same row/col/box
// that creates a constraint, and pinpoint the exact cell(s) that block `num`.
function showConstraints(grid, index, num) {
  const row = Math.floor(index / 9);
  const col = index % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  const neighbours = new Set();

  for (let c = 0; c < 9; c++) {
    const idx = row * 9 + c;
    if (idx !== index && grid[idx] !== 0) neighbours.add(idx);
  }
  for (let r = 0; r < 9; r++) {
    const idx = r * 9 + col;
    if (idx !== index && grid[idx] !== 0) neighbours.add(idx);
  }
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const idx = (boxRow + r) * 9 + (boxCol + c);
      if (idx !== index && grid[idx] !== 0) neighbours.add(idx);
    }
  }

  // Separate the cells that directly block `num` from general neighbours
  neighbours.forEach((idx) => {
    const tile = document.getElementById(`cell-${idx}`);
    if (!tile) return;
    if (grid[idx] === num) {
      tile.classList.add("tile-blocker"); // darker orange — direct conflict
    } else {
      tile.classList.add("tile-constraint"); // light orange — general constraint
    }
  });

  // Build a human-readable reason
  const rNum = row + 1;
  const cNum = col + 1;

  // Find direct blockers
  const blockerDescriptions = [];
  for (let c = 0; c < 9; c++) {
    if (grid[row * 9 + c] === num && row * 9 + c !== index) {
      blockerDescriptions.push(`linia ${rNum} (coloana ${c + 1})`);
    }
  }
  for (let r = 0; r < 9; r++) {
    if (grid[r * 9 + col] === num && r * 9 + col !== index) {
      blockerDescriptions.push(`coloana ${cNum} (rândul ${r + 1})`);
    }
  }
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const idx = (boxRow + r) * 9 + (boxCol + c);
      if (grid[idx] === num && idx !== index) {
        blockerDescriptions.push(
          `blocul 3×3 (rândul ${boxRow + r + 1}, coloana ${boxCol + c + 1})`,
        );
      }
    }
  }

  if (blockerDescriptions.length > 0) {
    conflictMsg.innerHTML =
      `<strong>Revenire la (${rNum},${cNum}):</strong> cifra <strong>${num}</strong> ` +
      `apare deja pe ${blockerDescriptions[0]} — imposibil de plasat.`;
  } else {
    // No direct blocker for `num` — placement was valid but led to a dead end downstream
    conflictMsg.innerHTML =
      `<strong>Revenire la (${rNum},${cNum}):</strong> cifra <strong>${num}</strong> ` +
      `nu a dus la o soluție — celulele portocalii blochează continuarea.`;
  }
}

function clearConstraints() {
  document.querySelectorAll(".tile-constraint, .tile-blocker").forEach((t) => {
    t.classList.remove("tile-constraint", "tile-blocker");
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function updateStats() {
  stepCountEl.textContent = steps;
  backtracksEl.textContent = backtracks;
}

// ─── Load puzzle ──────────────────────────────────────────────────────────────
function loadPuzzle() {
  board = [...SOURCE_BOARD];
  given = SOURCE_BOARD.map((v) => v !== 0);
  steps = 0;
  backtracks = 0;
  updateStats();
  statusMsg.textContent = "";
  conflictMsg.innerHTML = "";
  renderBoard();
}

// ─── Validity check ───────────────────────────────────────────────────────────
function isValid(grid, index, num) {
  const row = Math.floor(index / 9);
  const col = index % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let c = 0; c < 9; c++) if (grid[row * 9 + c] === num) return false;

  for (let r = 0; r < 9; r++) if (grid[r * 9 + col] === num) return false;

  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      if (grid[(boxRow + r) * 9 + (boxCol + c)] === num) return false;

  return true;
}

// ─── Async helpers ────────────────────────────────────────────────────────────
function getDelay() {
  return (11 - parseInt(speedSlider.value, 10)) * 50;
}

function getBacktrackDelay() {
  return (11 - parseInt(speedSlider.value, 10)) * 150;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitIfPaused() {
  if (isPaused) {
    await new Promise((resolve) => {
      resolveResume = resolve;
    });
    resolveResume = null;
  }
}

// ─── Async recursive backtracking solver ─────────────────────────────────────
async function solve(grid) {
  if (isCancelled) return false;

  // Find the next empty cell
  let index = -1;
  for (let i = 0; i < 81; i++) {
    if (grid[i] === 0) {
      index = i;
      break;
    }
  }
  if (index === -1) return true; // no empty cells → solved!

  for (let num = 1; num <= 9; num++) {
    if (isCancelled) return false;
    if (!isValid(grid, index, num)) continue;

    // ── Try placing num ──────────────────────────────────────────────────
    grid[index] = num;
    steps++;
    updateStats();
    setCellState(index, num, "tile-trying");
    conflictMsg.innerHTML = "";

    await waitIfPaused();
    if (isCancelled) return false;
    await sleep(getDelay());
    if (isCancelled) return false;

    const result = await solve(grid);

    if (result) {
      setCellState(index, num, "tile-confirmed");
      return true;
    }

    if (isCancelled) return false;

    // ── Backtrack ────────────────────────────────────────────────────────
    grid[index] = 0;
    backtracks++;
    steps++;
    updateStats();
    setCellState(index, 0, "tile-backtrack");

    // Show WHY we're backtracking
    showConstraints(grid, index, num);

    await waitIfPaused();
    if (isCancelled) {
      clearConstraints();
      return false;
    }
    await sleep(getBacktrackDelay());
    if (isCancelled) {
      clearConstraints();
      return false;
    }

    clearConstraints();
    setCellState(index, 0, null);
    conflictMsg.innerHTML = "";
  }

  return false;
}

// ─── Button handlers ──────────────────────────────────────────────────────────
solveBtn.addEventListener("click", async () => {
  if (isRunning) return;

  isRunning = true;
  isPaused = false;
  isCancelled = false;
  steps = 0;
  backtracks = 0;
  updateStats();
  statusMsg.textContent = "";
  conflictMsg.innerHTML = "";

  solveBtn.disabled = true;
  pauseBtn.disabled = false;
  pauseBtn.classList.remove("active");

  const grid = [...board];
  const success = await solve(grid);

  if (!isCancelled) {
    board = grid;
    if (success) {
      statusMsg.textContent = "✓ Rezolvat!";
      conflictMsg.innerHTML = "";
    }
  }

  isRunning = false;
  solveBtn.disabled = false;
  pauseBtn.disabled = true;
  pauseBtn.classList.remove("active");
});

pauseBtn.addEventListener("click", () => {
  if (!isRunning) return;
  isPaused = !isPaused;
  if (isPaused) {
    pauseBtn.classList.add("active");
  } else {
    pauseBtn.classList.remove("active");
    if (resolveResume) {
      resolveResume();
      resolveResume = null;
    }
  }
});

resetBtn.addEventListener("click", () => {
  if (isRunning) {
    isCancelled = true;
    isPaused = false;
    if (resolveResume) {
      resolveResume();
      resolveResume = null;
    }
  }
  clearConstraints();
  setTimeout(() => {
    isRunning = false;
    solveBtn.disabled = false;
    pauseBtn.disabled = true;
    pauseBtn.classList.remove("active");
    loadPuzzle();
  }, 60);
});

speedSlider.addEventListener("input", () => {
  speedValueEl.textContent = speedSlider.value;
});

// ─── Init ─────────────────────────────────────────────────────────────────────
loadPuzzle();
