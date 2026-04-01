let tileSelected = null;
let time = 0;
let timerInterval = 0;
let annotationMode = false;
let mistakes = 0;

const boardLength = 9;

const initialBoard = [
  [0, 0, 7, 4, 9, 1, 6, 0, 5],
  [2, 0, 0, 0, 6, 0, 3, 0, 9],
  [0, 0, 0, 0, 0, 7, 0, 1, 0],
  [0, 5, 8, 6, 0, 0, 0, 0, 4],
  [0, 0, 3, 0, 0, 0, 0, 9, 0],
  [0, 0, 6, 2, 0, 0, 1, 8, 7],
  [9, 0, 4, 0, 7, 0, 0, 0, 2],
  [6, 7, 0, 8, 3, 0, 0, 0, 0],
  [8, 1, 0, 0, 4, 5, 0, 0, 0],
];
const board = [
  [0, 0, 7, 4, 9, 1, 6, 0, 5],
  [2, 0, 0, 0, 6, 0, 3, 0, 9],
  [0, 0, 0, 0, 0, 7, 0, 1, 0],
  [0, 5, 8, 6, 0, 0, 0, 0, 4],
  [0, 0, 3, 0, 0, 0, 0, 9, 0],
  [0, 0, 6, 2, 0, 0, 1, 8, 7],
  [9, 0, 4, 0, 7, 0, 0, 0, 2],
  [6, 7, 0, 8, 3, 0, 0, 0, 0],
  [8, 1, 0, 0, 4, 5, 0, 0, 0],
];

const solution = [
  [3, 8, 7, 4, 9, 1, 6, 2, 5],
  [2, 4, 1, 5, 6, 8, 3, 7, 9],
  [5, 6, 9, 3, 2, 7, 4, 1, 8],
  [7, 5, 8, 6, 1, 9, 2, 3, 4],
  [1, 2, 3, 7, 8, 4, 5, 9, 6],
  [4, 9, 6, 2, 5, 3, 1, 8, 7],
  [9, 3, 4, 1, 7, 6, 8, 5, 2],
  [6, 7, 5, 8, 3, 2, 9, 4, 1],
  [8, 1, 2, 9, 4, 5, 7, 6, 3],
];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function startTimer() {
  time = 0;
  clearInterval(timerInterval);
  document.getElementById("time").innerText = "Timp: 00:00";
  timerInterval = setInterval(() => {
    time++;
    document.getElementById("time").innerText = "Timp: " + formatTime(time);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function isBoardSolved() {
  return board.every((row) => !row.includes(0));
}

window.onload = function () {
  setGame();
};

function setGame() {
  const mistakesDiv = document.getElementById("mistakes");
  mistakesDiv.innerText = "Greșeli: 0";

  startTimer();

  // Digits 1-9
  for (let i = 1; i <= boardLength; i++) {
    const digitDiv = document.createElement("div");
    digitDiv.id = "digit-" + i;
    digitDiv.innerText = i;
    digitDiv.classList.add("tile");
    document.getElementById("digits").appendChild(digitDiv);
    digitDiv.addEventListener("click", () => placeNumber(digitDiv));
  }

  // Board 9x9
  for (let i = 0; i < boardLength; i++) {
    for (let j = 0; j < boardLength; j++) {
      const tileDiv = document.createElement("div");
      tileDiv.id = i + "-" + j;

      if (board[i][j] !== 0) {
        tileDiv.innerText = board[i][j];
        tileDiv.classList.add("tile");
      } else {
        tileDiv.classList.add("tile");
      }

      tileDiv.addEventListener("click", () => selectTile(tileDiv, i, j));

      if (i == 2 || i == 5) {
        tileDiv.classList.add("horizontal-line");
      }
      if (j == 2 || j == 5) {
        tileDiv.classList.add("vertical-line");
      }

      document.getElementById("board").appendChild(tileDiv);
    }
  }

  // Keyboard input
  document.addEventListener("keydown", (e) => {
    if (e.key >= "1" && e.key <= "9") {
      const digitDiv = document.getElementById("digit-" + e.key);
      placeNumber(digitDiv);
    }
  });
}

function selectTile(tile, row, col) {
  if (tileSelected) {
    tileSelected.tile.classList.remove("selected");
  }
  tileSelected = { tile, row, col };
  tileSelected.tile.classList.add("selected");

  removeHighlightAdjacent();
  highlightAdjacent(row, col);

  removeHighlightSameNumber();

  if (board[row][col] !== 0) {
    highlightSameNumber(board[row][col]);
  }
}

function placeNumber(digitDiv) {
  if (!tileSelected) return;

  if (annotationMode) {
    annotate(digitDiv);
  } else {
    const row = tileSelected.row;
    const col = tileSelected.col;
    tileSelected.tile.classList.remove("annotated");

    const number = parseInt(digitDiv.innerText);

    if (solution[row][col] === number) {
      board[row][col] = number;

      tileSelected.tile.innerText = number;
      tileSelected.tile.classList.remove("wrong");
      tileSelected.tile.classList.add("correct");

      removeHighlightSameNumber();
      highlightSameNumber(number);

      if (isBoardSolved()) {
        stopTimer();
        const container = document.querySelector(".fireworks");
        const fireworks = new Fireworks.default(container);
        fireworks.start();

        setTimeout(() => {
          fireworks.stop();
        }, 5000);
      }
    } else {
      mistakes++;
      document.getElementById("mistakes").innerText = `Greșeli: ${mistakes}`;

      tileSelected.tile.innerText = number;
      tileSelected.tile.classList.remove("correct");
      tileSelected.tile.classList.add("wrong");
    }
  }
}

function removeHighlightAdjacent() {
  for (let i = 0; i < 9; i++)
    for (let j = 0; j < 9; j++) {
      const tile = document.getElementById(`${i}-${j}`);
      tile.classList.remove("adjacent");
    }
}

function highlightAdjacent(row, col) {
  for (let i = 0; i < 9; i++) {
    const tile = document.getElementById(`${row}-${i}`);
    tile.classList.add("adjacent");
  }
  for (let i = 0; i < 9; i++) {
    const tile = document.getElementById(`${i}-${col}`);
    tile.classList.add("adjacent");
  }
  for (let i = row - (row % 3); i < row - (row % 3) + 3; i++) {
    for (let j = col - (col % 3); j < col - (col % 3) + 3; j++) {
      const tile = document.getElementById(`${i}-${j}`);
      tile.classList.add("adjacent");
    }
  }
  const tile = document.getElementById(`${row}-${col}`);
  tile.classList.remove("adjacent");
}

function removeHighlightSameNumber() {
  for (let i = 0; i < 9; i++)
    for (let j = 0; j < 9; j++) {
      const tile = document.getElementById(`${i}-${j}`);
      tile.classList.remove("sameNumber");
    }
}

function highlightSameNumber(number) {
  for (let i = 0; i < 9; i++)
    for (let j = 0; j < 9; j++) {
      const tile = document.getElementById(`${i}-${j}`);
      if (board[i][j] == number) tile.classList.add("sameNumber");
    }
}

function eraseTile() {
  if (!tileSelected) return;
  const row = tileSelected.row;
  const col = tileSelected.col;
  if (initialBoard[row][col] !== 0) return;
  const tile = document.getElementById(`${row}-${col}`);
  tile.innerText = "";
  tile.classList.remove("correct", "wrong");
}

function hint() {
  const emptyCells = [];
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] === 0) emptyCells.push([i, j]);
    }
  }
  if (emptyCells.length === 0) return;

  const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const tile = document.getElementById(`${row}-${col}`);
  tile.innerText = solution[row][col];
  board[row][col] = solution[row][col];
  tile.classList.add("correct");
}

function toggleAnnotation() {
  annotationMode = !annotationMode;
  if (annotationMode) {
    document.getElementById("btn-annotate").style.backgroundColor =
      "var(--selected-color)";
  } else {
    document
      .getElementById("btn-annotate")
      .style.removeProperty("background-color");
  }
}

function annotate(digitDiv) {
  const row = tileSelected.row;
  const col = tileSelected.col;

  const number = digitDiv.innerText;
  const tile = document.getElementById(`${row}-${col}`);
  if (tile.innerText.includes(number)) return;

  tile.innerText = `${tile.innerText} ${number}`;
  tile.classList.add("annotated");
}
