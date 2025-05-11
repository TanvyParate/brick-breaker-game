// Get the canvas element and its drawing context
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Load sound effects for different game events
const sounds = {
  brick: new Audio("sounds/brick.mp3"),
  paddle: new Audio("sounds/paddle.mp3"),
  powerup: new Audio("sounds/powerup.mp3"),
  lifeLost: new Audio("sounds/life-lost.mp3"),
  gameOver: new Audio("sounds/game-over.mp3"),
  levelUp: new Audio("sounds/level-up.mp3")
};

// Adjust volume of brick hit sound
sounds.brick.volume = 0.3;

// ----------------------------
// Paddle Properties
// ----------------------------
const paddle = {
  x: canvas.width / 2 - 50,  // Initial X position (centered)
  y: canvas.height - 20,     // Y position (near bottom)
  width: 100,
  height: 10,
  speed: 6,                  // Movement speed
  dx: 0,                     // Change in x (used for movement)
  isWide: false              // Power-up: Wide paddle flag
};

// ----------------------------
// Ball Properties
// ----------------------------
const ball = {
  x: canvas.width / 2,       // Start at center horizontally
  y: canvas.height - 30,     // Just above the paddle
  radius: 8,
  baseSpeed: 3,              // Base speed of the ball
  maxSpeed: 4,               // Maximum allowed speed
  speedIncrement: 0.1,       // Speed increase per level or hit
  dx: 3,                     // Initial movement in x
  dy: -3,                    // Initial movement in y (upward)
  isFireball: false          // Power-up: Fireball mode
};

// ----------------------------
// Brick Configuration
// ----------------------------
const brick = {
  rowCount: 5,               // Number of brick rows
  columnCount: 8,            // Number of columns
  width: 75,
  height: 20,
  padding: 10,               // Space between bricks
  offsetTop: 40,             // Top margin from canvas
  offsetLeft: 35             // Left margin from canvas
};

// ----------------------------
// Create Bricks Array
// ----------------------------
let bricks = [];

function createBricks() {
  bricks = [];
  for (let c = 0; c < brick.columnCount; c++) {
    bricks[c] = [];
    for (let r = 0; r < brick.rowCount; r++) {
      let type = "normal";   // Default brick type
      const rand = Math.random();
      if (rand < 0.1) type = "unbreakable";   // 10% chance
      else if (rand < 0.25) type = "multi";   // 15% chance

      bricks[c][r] = {
        x: 0,                // Will be set later
        y: 0,
        status: type === "multi" ? 2 : type === "normal" ? 1 : -1,
        type                 // 'normal', 'multi (multiple hit required to break)', or 'unbreakable'
      };
    }
  }
}

createBricks(); // Call function to initialize brick layout

// ----------------------------
// Game State Variables
// ----------------------------
let powerUps = [];           // Array to hold active power-ups
let lives = 3;               // Player's lives
let score = 0;               // Current score
let level = 1;               // Current level
let gameRunning = false;     // Game state flag
let animationId = null;      // Reference to requestAnimationFrame


// ------------------------------------
// Draw Bricks on the Canvas
// ------------------------------------
function drawBricks() {
  for (let c = 0; c < brick.columnCount; c++) {
    for (let r = 0; r < brick.rowCount; r++) {
      const b = bricks[c][r];

      // Only draw if brick is active or is unbreakable
      if (b.status > 0 || b.type === "unbreakable") {
        // Calculate brick position based on its row and column
        const brickX = c * (brick.width + brick.padding) + brick.offsetLeft;
        const brickY = r * (brick.height + brick.padding) + brick.offsetTop;
        b.x = brickX;
        b.y = brickY;

        // Set color based on brick type
        if (b.type === "unbreakable") ctx.fillStyle = "#444"; // Dark gray
        else if (b.type === "multi") ctx.fillStyle = "#f39c12"; // Orange
        else ctx.fillStyle = `hsl(${(r + c) * 20}, 100%, 60%)`; // Colorful for normal bricks

        // Draw filled rectangle (brick)
        ctx.fillRect(brickX, brickY, brick.width, brick.height);
        // Draw brick border
        ctx.strokeStyle = "#fff";
        ctx.strokeRect(brickX, brickY, brick.width, brick.height);
      }
    }
  }
}

// ------------------------------------
// Draw the Paddle
// ------------------------------------
function drawPaddle() {
  ctx.fillStyle = "#00ffff"; // Cyan color for paddle
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

// ------------------------------------
// Draw the Ball
// ------------------------------------
function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  // Use different color if fireball is active
  ctx.fillStyle = ball.isFireball ? "#ff4500" : "#ff6ec7"; // Fireball = orange, Normal = pink
  ctx.fill();
  ctx.closePath();
}

// ------------------------------------
// Draw Score and Level on Top
// ------------------------------------
function drawScore() {
  ctx.font = "16px Arial";
  ctx.fillStyle = "#fff"; // White text
  ctx.fillText(`Score: ${score}`, 20, 25); // Score at top-left
  ctx.fillText(`Level: ${level}`, canvas.width - 100, 25); // Level at top-right
}

// ------------------------------------
// Draw Lives as Red Circles
// ------------------------------------
function drawLives() {
  for (let i = 0; i < lives; i++) {
    ctx.fillStyle = "#f00"; // Red color
    ctx.beginPath();
    ctx.arc(canvas.width - 20 - i * 20, 50, 8, 0, Math.PI * 2); // Spaced from right
    ctx.fill();
  }
}

// ------------------------------------
// Draw Active Power-Ups Falling
// ------------------------------------
function drawPowerUps() {
  powerUps.forEach(p => {
    if (p.active) {
      // Set color based on power-up type
      ctx.fillStyle =
        p.type === "life" ? "#ff0000" :     // Red for extra life
        p.type === "wide" ? "#00ff00" :     // Green for wide paddle
        p.type === "fireball" ? "#ffa500" : // Orange for fireball
        "#00f";                             // Blue for any other

      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); // Small falling circle
      ctx.fill();
      ctx.closePath();
    }
  });
}

// ------------------------------------
// Move Paddle Based on dx
// ------------------------------------
function movePaddle() {
  paddle.x += paddle.dx; // Update position

  // Prevent paddle from going out of canvas bounds
  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.width > canvas.width)
    paddle.x = canvas.width - paddle.width;
}

function moveBall() {
  // Update ball position
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Bounce off left or right wall
  if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
    ball.dx *= -1;
  }

  // Bounce off top wall
  if (ball.y - ball.radius < 0) {
    ball.dy *= -1;
  }

  // Check collision with paddle
  if (
    ball.x > paddle.x &&
    ball.x < paddle.x + paddle.width &&
    ball.y + ball.radius > paddle.y
  ) {
    sounds.paddle.currentTime = 0;
    sounds.paddle.play();

    // Bounce off paddle
    ball.dy *= -1;
  }

  // Check collision with each brick
  for (let c = 0; c < brick.columnCount; c++) {
    for (let r = 0; r < brick.rowCount; r++) {
      const b = bricks[c][r];

      // Only consider active bricks or unbreakable ones
      if (b.status > 0 || b.type === "unbreakable") {
        // Check if ball hits the brick
        if (
          ball.x > b.x &&
          ball.x < b.x + brick.width &&
          ball.y > b.y &&
          ball.y < b.y + brick.height
        ) {
          sounds.brick.currentTime = 0;
          sounds.brick.play();

          // If unbreakable and not in fireball mode, just bounce
          if (b.type === "unbreakable" && !ball.isFireball) {
            ball.dy *= -1;
            return;
          }

          // If multi-brick, decrease its status (2 → 1 → 0)
          if (b.type === "multi") {
            b.status -= 1;
          } else {
            // Otherwise, destroy the brick
            b.status = 0;
          }

          // Bounce off the brick and slightly randomize direction
          ball.dy *= -1;
          ball.dx += (Math.random() - 0.5) * 0.2;

          // Increase score
          score += 10;

          // Chance to drop a power-up (40% chance)
          if (Math.random() < 0.4) {
            const types = ["life", "wide", "fireball"];
            const randomType = types[Math.floor(Math.random() * types.length)];
            powerUps.push({
              x: b.x + brick.width / 2,
              y: b.y,
              width: 12,
              height: 12,
              active: true,
              type: randomType
            });
          }

          // Increase ball speed slightly after each hit (up to a max)
          if (Math.abs(ball.dy) < ball.maxSpeed) {
            ball.dy *= 1 + ball.speedIncrement;
          }

          // Check if all breakable bricks are cleared
          checkLevelComplete();
        }
      }
    }
  }

  // Ball missed the paddle (bottom collision)
  if (ball.y + ball.radius > canvas.height) {
    lives--;

    sounds.lifeLost.currentTime = 0;
    sounds.lifeLost.play();

    // Game over if no lives left
    if (lives <= 0) {
      gameRunning = false;
      cancelAnimationFrame(animationId);
      document.getElementById("gameMessage").textContent = "Game Over";
      
      sounds.gameOver.currentTime = 0;
      sounds.gameOver.play();

      document.getElementById("gameOverScreen").style.display = "flex";
    } else {
      // Reset ball if player still has lives
      resetBall();
    }
  }
}

// Moves all active power-ups downward
function movePowerUps() {
  powerUps.forEach(p => {
    if (p.active) p.y += 2; // Move power-up down by 2 pixels
  });
}

// Checks for power-up collisions with the paddle and applies effects
function checkPowerUpCollision() {
  powerUps.forEach(p => {
    if (
      p.active &&
      p.y + p.height >= paddle.y &&           // Power-up has reached paddle vertically
      p.x >= paddle.x &&                      // Within paddle's left edge
      p.x <= paddle.x + paddle.width          // Within paddle's right edge
    ) {
      sounds.powerup.currentTime = 0;
      sounds.powerup.play();

      p.active = false; // Deactivate power-up after collection

      // Apply specific effects based on power-up type

      // WIDE: Increases paddle width temporarily
      if (p.type === "wide" && !paddle.isWide) {
        paddle.width += 40;
        paddle.isWide = true;
        setTimeout(() => {
          paddle.width -= 40;
          paddle.isWide = false;
        }, 10000); // Reset after 10 seconds
      }

      // LIFE: Adds one extra life
      else if (p.type === "life") {
        lives++;
      }

      // FIREBALL: Allows breaking unbreakable bricks temporarily
      else if (p.type === "fireball") {
        ball.isFireball = true;
        setTimeout(() => (ball.isFireball = false), 10000); // Reset after 10 seconds
      }
    }
  });

  // Remove power-ups that fall below the canvas or are no longer active
  powerUps = powerUps.filter(p => p.y < canvas.height && p.active);
}

// Checks if all breakable bricks are cleared to move to next level
function checkLevelComplete() {
  const allCleared = bricks.every(col =>
    col.every(b => b.type === "unbreakable" || b.status === 0)
  );

  if (allCleared) {
    level++;                  // Advance to next level
    score = 0;                // Reset score
    ball.maxSpeed += 0.5;     // Increase difficulty
    paddle.speed += 0.5;

    createBricks();           // Generate new bricks
    resetBall();              // Reset ball position

    // Display level-up message
    document.getElementById("gameMessage").textContent = `Level ${level} Start!`;
    document.getElementById("gameOverScreen").style.display = "flex";
    document.getElementById("continueBtn").style.display = "block";
    document.getElementById("restartBtn").style.display = "none";
    gameRunning = false;

    cancelAnimationFrame(animationId); // Pause the game loop

    sounds.levelUp.currentTime = 0;
    sounds.levelUp.play();

    draw(); // Show updated state (next level)
  }
}

// Continues the game after a level is completed
function continueToNextLevel() {
  document.getElementById("gameOverScreen").style.display = "none";
  document.getElementById("continueBtn").style.display = "none";

  gameRunning = true;
  update(); // Resume game loop
}  

// Resets ball to starting position and direction, and centers the paddle
function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height - 30;
  ball.dx = ball.baseSpeed;
  ball.dy = -ball.baseSpeed;
  paddle.x = canvas.width / 2 - paddle.width / 2;
}

// Resets the entire game state to initial values
function resetGame() {
  createBricks();         // Recreate brick layout
  resetBall();            // Reset ball and paddle position
  powerUps = [];          // Clear all active power-ups
  lives = 3;              // Reset lives
  score = 0;              // Reset score
  level = 1;              // Reset level
  paddle.width = 100;     // Reset paddle width
  paddle.isWide = false;  // Remove wide paddle effect
  ball.isFireball = false;// Remove fireball effect
}

// Clears the canvas and draws all game elements
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous frame
  drawBricks();
  drawPaddle();
  drawBall();
  drawScore();
  drawLives();
  drawPowerUps();
}

// Main game loop: updates positions, handles collisions, and redraws everything
function update() {
  if (!gameRunning) return;

  movePaddle();             // Move paddle based on input
  moveBall();               // Move ball and handle collisions
  movePowerUps();           // Move active power-ups downward
  checkPowerUpCollision();  // Check if power-ups are collected
  draw();                   // Redraw updated game state

  animationId = requestAnimationFrame(update); // Keep the loop running
}

// KEYBOARD CONTROLS
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") paddle.dx = paddle.speed;
  if (e.key === "ArrowLeft") paddle.dx = -paddle.speed;

  // If game is over and Enter is pressed, restart the game
  if (
    !gameRunning &&
    document.getElementById("gameOverScreen").style.display === "flex" &&
    e.key === "Enter"
  ) {
    restartGame();
  }
});

// Stop paddle when arrow keys are released
document.addEventListener("keyup", () => (paddle.dx = 0));

// UI: Starts the game from the welcome/start screen
function startGame() {
  document.getElementById("startScreen").style.display = "none";
  gameRunning = true;
  update();
}

// UI: Restarts the game from the Game Over screen
function restartGame() {
  document.getElementById("gameOverScreen").style.display = "none";
  resetGame();       // Reset all game variables
  gameRunning = true;
  update();          // Start the game loop
}