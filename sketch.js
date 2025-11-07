let cols = 28;
let rows = 41;
let canvasWidth = 1200;
let bombChance = 0;
let bombCount;
let revealed = true;
let bombBrush = false;
let grayBrush = false;
let gray = '#ddd';
let white = '#fff';

let cellSize;
let padding;
let topBarHeight;
let gridWidth;
let gridHeight;
let canvasHeight;

let grid = [];
let toggledDuringDrag = new Set();

let font;

function preload() {
  font = loadFont('assets/fonts/NationalPark-Bold.ttf');
  bombFont = loadFont('assets/fonts/Bomb.otf');
}

function setup() {
  calculateLayout(cols, rows);
  createCanvas(canvasWidth, canvasHeight);
  pixelDensity(3);
  noLoop();
  draw();

  // Drag and drop JSON loading
  let dropZone = select('canvas').elt;
  dropZone.ondragover = (e) => e.preventDefault();
  dropZone.ondrop = (e) => {
    e.preventDefault();
    let file = e.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      let reader = new FileReader();
      reader.onload = (event) => {
        let json = JSON.parse(event.target.result);
        loadDrawing(json);
      };
      reader.readAsText(file);
    }
  };
}

function initGrid() {
  grid = [];
  for (let y = 0; y < rows; y++) {
    let row = [];
    for (let x = 0; x < cols; x++) {
      row.push({ state: 'empty', number: null });
    }
    grid.push(row);
  }
}

function calculateLayout(newCols, newRows) {
  cols = newCols;
  rows = newRows;
  cellSize = canvasWidth / (cols + 2);
  padding = cellSize;
  topBarHeight = cellSize * 2;
  gridWidth = cellSize * rows;
  gridHeight = cellSize * rows;
  canvasHeight = topBarHeight + gridHeight + padding * 3;

  bombCount = 0;
  initGrid();
}

function draw() {
  drawGrid(this);
}

function drawGrid(pg) {
  pg.background(white);

  // Calculate numbers based on bombs (hidden cells)
  let numbers = computeNumbers();

  // Top bar
  pg.noFill();
  pg.stroke(0);
  pg.rect(padding, padding, gridWidth, topBarHeight);
  pg.fill(0);
  pg.textAlign(CENTER, CENTER);
  pg.textSize(40);
  pg.textFont(font); // Use custom font
  // pg.text(':)', padding + gridWidth / 2, padding / 2 + topBarHeight / 2);

  // Left box for bomb count
  let boxSize = topBarHeight * 0.75;
  pg.noFill();
  pg.rect(padding * 1.25, padding * 1.25, boxSize, boxSize);
  pg.fill(0);
  pg.noStroke();
  pg.textAlign(CENTER, CENTER);
  // pg.textSize(cellSize * .8);
  pg.text(bombCount, padding + boxSize / 2, padding / 2 + topBarHeight / 2);

  // Draw cells
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let px = padding + x * cellSize;
      let py = topBarHeight + 2 * padding + y * cellSize;
      let cell = grid[y][x];

      if (cell.state === 'hidden') {
        if (revealed) {
          if (cell.isBomb) {
            drawBomb(pg, px, py, cellSize);
          } else {
            drawHiddenCell(pg, px, py, cellSize, 'dark');
          }
        } else {
          drawHiddenCell(pg, px, py, cellSize, 'dark');
        }
      } else {
        // Empty cell: just outline
        pg.noFill();
        pg.stroke(0);
        pg.rect(px, py, cellSize, cellSize);

        if (cell.isGray) {
          pg.fill(gray);
          pg.rect(px, py, cellSize, cellSize);
        }

        // If adjacent to bombs, show number
        let n = numbers[y][x];
        if (n > 0) {
          pg.fill(white);
          pg.rect(px, py, cellSize, cellSize);

          pg.fill(0);
          pg.noStroke();
          pg.textAlign(CENTER, CENTER);
          pg.textSize(cellSize * 0.9);
          pg.textFont(font); // Use custom font
          pg.text(n, px + cellSize / 2, py + cellSize / 2 - cellSize * 0.16);
        }
      }
    }
  }
}

function drawHiddenCell(pg, x, y, size, mode) {
  const inset = size * 0.2;
  const small = size - 2 * inset;
  const lineColor = 0;

  // Slight shading for sides to give a tile-like look (relative to bgColor)
  let shadeTop = 255;
  let shadeLeft = 255;
  let shadeRight = 0;
  let shadeBottom = 0;

  // Draw center square
  pg.noStroke();
  pg.fill(gray);
  pg.rect(x + inset, y + inset, small, small);

  // Draw four trapezoids (top, right, bottom, left)
  pg.fill(shadeTop);
  pg.quad(x, y, x + size, y, x + size - inset, y + inset, x + inset, y + inset);

  pg.fill(shadeRight);
  pg.quad(
    x + size,
    y,
    x + size - inset,
    y + inset,
    x + size - inset,
    y + size - inset,
    x + size,
    y + size
  );

  pg.fill(shadeBottom);
  pg.quad(
    x,
    y + size,
    x + size,
    y + size,
    x + size - inset,
    y + size - inset,
    x + inset,
    y + size - inset
  );

  pg.fill(shadeLeft);
  pg.quad(x, y, x + inset, y + inset, x + inset, y + size - inset, x, y + size);

  // Outlines
  pg.stroke(lineColor);
  pg.noFill();
  pg.rect(x, y, size, size); // outer border
}

function drawBomb(pg, x, y, size) {
  // outline
  pg.fill(white);
  pg.stroke(0);
  pg.rect(x, y, size, size);
  // Show bomb with custom font
  pg.noStroke();
  pg.fill(0);
  pg.textFont(bombFont);
  pg.textAlign(CENTER, CENTER);
  pg.textSize(cellSize * 1.2);
  pg.text('9', x + cellSize / 2.05, y + cellSize / 3.05);
}

// Count bombs around each cell (bomb = hidden cell)
function computeNumbers() {
  let numbers = [];
  for (let y = 0; y < rows; y++) {
    numbers[y] = [];
    for (let x = 0; x < cols; x++) {
      numbers[y][x] = 0;
      if (grid[y][x].state === 'hidden') continue; // bomb cell itself
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          let nx = x + dx;
          let ny = y + dy;
          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
            if (grid[ny][nx].isBomb) {
              numbers[y][x]++;
            }
          }
        }
      }
    }
  }
  return numbers;
}

function mouseDragged() {
  handleDraw(mouseX, mouseY);
}

function mousePressed() {
  toggledDuringDrag.clear();
  handleDraw(mouseX, mouseY);
}

function mouseReleased() {
  toggledDuringDrag.clear();
}

function handleDraw(mx, my) {
  let x = floor((mx - padding) / cellSize);
  let y = floor((my - topBarHeight - padding * 2) / cellSize);
  if (x >= 0 && x < cols && y >= 0 && y < rows) {
    let key = `${x},${y}`;
    if (!toggledDuringDrag.has(key)) {
      toggledDuringDrag.add(key);
      let cell = grid[y][x];

      if (bombBrush) {
        // Bomb brush: toggle isBomb only
        if (cell.isBomb) {
          cell.isBomb = false;
          cell.state = 'empty';
          bombCount--;
        } else {
          cell.state = 'hidden';
          cell.isBomb = true;
          bombCount++;
        }
      } else if (grayBrush) {
        if (cell.isGray) {
          cell.isGray = false;
        } else {
          cell.isGray = true;
        }
      } else {
        // Normal toggle
        if (cell.state === 'hidden') {
          cell.state = 'empty';
          if (cell.isBomb) {
            cell.isBomb = false;
            bombCount--;
          }
        } else {
          cell.state = 'hidden';
          // cell.isBomb = false;
          if (!cell.isBomb && random() < bombChance) {
            cell.isBomb = true;
            bombCount++;
          }
        }
      }

      redraw();
    }
  }
}

function rerollBombs() {
  bombCount = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let cell = grid[y][x];
      if (cell.state === 'hidden') {
        cell.isBomb = random() < bombChance;
        if (cell.isBomb) bombCount++;
      } else {
        cell.isBomb = false;
      }
    }
  }
  redraw();
}

function hideAllSquares() {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let cell = grid[y][x];
      cell.state = 'hidden';
    }
  }
  redraw();
}

function saveDrawing() {
  const data = {
    cols,
    rows,
    bombs: [],
    hidden: [],
    gray: [],
  };

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let cell = grid[y][x];
      if (cell.isBomb) data.bombs.push({ x, y });
      if (cell.state === 'hidden' && !cell.isBomb) data.hidden.push({ x, y });
      if (cell.isGray) data.gray.push({ x, y });
    }
  }

  saveJSON(data, 'grid.json');
}

function loadDrawing(data) {
  calculateLayout(data.cols, data.rows);

  // Apply bombs
  bombCount = 0;
  for (let { x, y } of data.bombs) {
    let cell = grid[y][x];
    cell.isBomb = true;
    cell.state = 'hidden';
    bombCount++;
  }

  if (data.gray && Array.isArray(data.gray)) {
    for (let { x, y } of data.gray) {
      if (x >= 0 && x < cols && y >= 0 && y < rows) {
        let cell = grid[y][x];
        cell.isGray = true;
        // ensure gray squares are visible (not left as hidden non-bombs)
        if (cell.state === 'hidden' && !cell.isBomb) {
          cell.state = 'empty';
        }
      }
    }
  }

  // Apply hidden state to non-bombs
  for (let { x, y } of data.hidden) {
    let cell = grid[y][x];
    if (!cell.isBomb) {
      cell.state = 'hidden';
    }
  }

  resizeCanvas(canvasWidth, canvasHeight);
  redraw();
}

function keyPressed() {
  if (key === 's') {
    // save svg
    let svg = createGraphics(canvasWidth, canvasHeight, SVG);
    drawGrid(svg);
    save(svg, 'minesweeper-grid', 'svg');
    // save pixel image
    saveCanvas('minesweeper-grid', 'png');
    // save wip drawing
    saveDrawing();
  } else if (key === '+' || key === '=') {
    // randomly put more bombs
    bombChance = min(1, bombChance + 0.1);
    rerollBombs();
  } else if (key === '-') {
    // randomly put less bombs
    bombChance = max(0, bombChance - 0.1);
    rerollBombs();
  } else if (key === 'r') {
    // reveal or hide bombs
    revealed = !revealed;
    redraw();
  } else if (key === 'b') {
    // toggle bomb brush
    bombBrush = !bombBrush;
  } else if (key === 'h') {
    // hide everything
    hideAllSquares();
  } else if (key === 'g') {
    grayBrush = !grayBrush;
  } else if (key === 'c') {
    //clear drawing
    grid = [];
    initGrid();
    bombCount = 0;
    redraw();
  }
}
