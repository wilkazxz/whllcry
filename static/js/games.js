// Games JavaScript for SocialHub
// Snake Game, Quiz Game, and Number Guessing Game

// Snake Game Implementation
class SnakeGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20;
        this.tileCount = this.canvas.width / this.gridSize;
        
        this.snake = [
            {x: 10, y: 10}
        ];
        
        this.food = {
            x: 15,
            y: 15
        };
        
        this.dx = 0;
        this.dy = 0;
        this.score = 0;
        this.gameRunning = false;
        this.gameOver = false;
        
        this.setupControls();
        this.updateScore();
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (!this.gameRunning) return;
            
            switch(e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    if (this.dy !== 1) {
                        this.dx = 0;
                        this.dy = -1;
                    }
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    if (this.dy !== -1) {
                        this.dx = 0;
                        this.dy = 1;
                    }
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    if (this.dx !== 1) {
                        this.dx = -1;
                        this.dy = 0;
                    }
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    if (this.dx !== -1) {
                        this.dx = 1;
                        this.dy = 0;
                    }
                    e.preventDefault();
                    break;
            }
        });
    }
    
    start() {
        this.gameRunning = true;
        this.gameOver = false;
        this.updateStatus('Playing');
        this.gameLoop();
    }
    
    pause() {
        this.gameRunning = false;
        this.updateStatus('Paused');
    }
    
    reset() {
        this.snake = [{x: 10, y: 10}];
        this.dx = 0;
        this.dy = 0;
        this.score = 0;
        this.gameRunning = false;
        this.gameOver = false;
        this.generateFood();
        this.updateScore();
        this.updateStatus('Ready');
        this.draw();
    }
    
    gameLoop() {
        if (!this.gameRunning) return;
        
        setTimeout(() => {
            this.clearCanvas();
            this.moveSnake();
            this.checkCollisions();
            this.draw();
            
            if (!this.gameOver) {
                this.gameLoop();
            }
        }, 100);
    }
    
    clearCanvas() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    moveSnake() {
        const head = {
            x: this.snake[0].x + this.dx,
            y: this.snake[0].y + this.dy
        };
        
        this.snake.unshift(head);
        
        // Check if food eaten
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.updateScore();
            this.generateFood();
        } else {
            this.snake.pop();
        }
    }
    
    checkCollisions() {
        const head = this.snake[0];
        
        // Wall collision
        if (head.x < 0 || head.x >= this.tileCount || 
            head.y < 0 || head.y >= this.tileCount) {
            this.endGame();
            return;
        }
        
        // Self collision
        for (let i = 1; i < this.snake.length; i++) {
            if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
                this.endGame();
                return;
            }
        }
    }
    
    draw() {
        // Draw snake
        this.ctx.fillStyle = 'green';
        for (let segment of this.snake) {
            this.ctx.fillRect(
                segment.x * this.gridSize,
                segment.y * this.gridSize,
                this.gridSize - 2,
                this.gridSize - 2
            );
        }
        
        // Draw food
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(
            this.food.x * this.gridSize,
            this.food.y * this.gridSize,
            this.gridSize - 2,
            this.gridSize - 2
        );
    }
    
    generateFood() {
        this.food = {
            x: Math.floor(Math.random() * this.tileCount),
            y: Math.floor(Math.random() * this.tileCount)
        };
        
        // Make sure food doesn't spawn on snake
        for (let segment of this.snake) {
            if (segment.x === this.food.x && segment.y === this.food.y) {
                this.generateFood();
                return;
            }
        }
    }
    
    endGame() {
        this.gameRunning = false;
        this.gameOver = true;
        this.updateStatus('Game Over');
        
        // Save score to server
        this.saveScore();
    }
    
    updateScore() {
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = this.score;
        }
    }
    
    updateStatus(status) {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `badge fs-4 ${this.getStatusClass(status)}`;
        }
    }
    
    getStatusClass(status) {
        switch(status) {
            case 'Playing': return 'bg-success';
            case 'Paused': return 'bg-warning';
            case 'Game Over': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }
    
    saveScore() {
        if (this.score > 0) {
            fetch('/save_snake_score', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({score: this.score})
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    if (window.SocialHub && window.SocialHub.Utils) {
                        window.SocialHub.Utils.showToast(`Score saved: ${this.score} points!`, 'success');
                    }
                }
            })
            .catch(error => {
                console.error('Error saving score:', error);
            });
        }
    }
}

// Quiz Game Helper Functions
class QuizGame {
    constructor() {
        this.currentScore = 0;
        this.questionsAnswered = 0;
    }
    
    static generateQuestion() {
        const operations = ['+', '-', '*', '/'];
        const operation = operations[Math.floor(Math.random() * operations.length)];
        
        let num1, num2, answer, question;
        
        switch(operation) {
            case '+':
                num1 = Math.floor(Math.random() * 100) + 1;
                num2 = Math.floor(Math.random() * 100) + 1;
                answer = num1 + num2;
                question = `${num1} + ${num2}`;
                break;
            case '-':
                num1 = Math.floor(Math.random() * 100) + 50;
                num2 = Math.floor(Math.random() * 50) + 1;
                answer = num1 - num2;
                question = `${num1} - ${num2}`;
                break;
            case '*':
                num1 = Math.floor(Math.random() * 12) + 1;
                num2 = Math.floor(Math.random() * 12) + 1;
                answer = num1 * num2;
                question = `${num1} × ${num2}`;
                break;
            case '/':
                answer = Math.floor(Math.random() * 12) + 1;
                num2 = Math.floor(Math.random() * 12) + 1;
                num1 = answer * num2;
                question = `${num1} ÷ ${num2}`;
                break;
        }
        
        return {question, answer};
    }
    
    checkAnswer(userAnswer, correctAnswer) {
        return parseInt(userAnswer) === correctAnswer;
    }
}

// Number Guessing Game
class NumberGuessingGame {
    constructor() {
        this.targetNumber = this.generateNumber();
        this.attempts = 0;
        this.maxAttempts = 10;
        this.gameOver = false;
    }
    
    generateNumber() {
        return Math.floor(Math.random() * 100) + 1;
    }
    
    makeGuess(guess) {
        this.attempts++;
        
        if (guess === this.targetNumber) {
            return {
                correct: true,
                message: `Congratulations! You guessed it in ${this.attempts} attempts!`,
                score: Math.max(100 - (this.attempts - 1) * 5, 10)
            };
        } else if (this.attempts >= this.maxAttempts) {
            this.gameOver = true;
            return {
                correct: false,
                gameOver: true,
                message: `Game over! The number was ${this.targetNumber}`,
                score: 0
            };
        } else {
            const hint = guess < this.targetNumber ? 'Too low!' : 'Too high!';
            return {
                correct: false,
                message: `${hint} Try again. (${this.maxAttempts - this.attempts} attempts left)`,
                score: 0
            };
        }
    }
    
    reset() {
        this.targetNumber = this.generateNumber();
        this.attempts = 0;
        this.gameOver = false;
    }
}

// Game initialization functions
function initSnakeGame() {
    const game = new SnakeGame('gameCanvas');
    
    // Setup button event listeners
    document.getElementById('startBtn').addEventListener('click', () => {
        game.start();
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
    });
    
    document.getElementById('pauseBtn').addEventListener('click', () => {
        game.pause();
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
    });
    
    document.getElementById('resetBtn').addEventListener('click', () => {
        game.reset();
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
    });
    
    // Initial draw
    game.generateFood();
    game.draw();
    
    return game;
}

function initQuizGame() {
    const quiz = new QuizGame();
    
    // Setup form submission
    const form = document.querySelector('#quiz-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            const answerInput = document.getElementById('answer');
            if (answerInput && answerInput.value.trim() === '') {
                e.preventDefault();
                answerInput.focus();
                if (window.SocialHub && window.SocialHub.Utils) {
                    window.SocialHub.Utils.showToast('Please enter an answer', 'warning');
                }
            }
        });
    }
    
    return quiz;
}

function initNumberGuessingGame() {
    const game = new NumberGuessingGame();
    
    // Setup form submission
    const form = document.querySelector('#guess-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            const guessInput = document.getElementById('guess');
            const guess = parseInt(guessInput.value);
            
            if (isNaN(guess) || guess < 1 || guess > 100) {
                e.preventDefault();
                guessInput.focus();
                if (window.SocialHub && window.SocialHub.Utils) {
                    window.SocialHub.Utils.showToast('Please enter a number between 1 and 100', 'warning');
                }
            }
        });
    }
    
    return game;
}

// Game utilities
const GameUtils = {
    // Format game score
    formatScore(score) {
        return score.toLocaleString();
    },
    
    // Get difficulty level based on score
    getDifficultyLevel(score) {
        if (score < 100) return 'Beginner';
        if (score < 500) return 'Intermediate';
        if (score < 1000) return 'Advanced';
        return 'Expert';
    },
    
    // Save high score to localStorage
    saveHighScore(gameType, score) {
        const key = `highscore_${gameType}`;
        const currentHigh = localStorage.getItem(key) || 0;
        
        if (score > parseInt(currentHigh)) {
            localStorage.setItem(key, score);
            return true; // New high score
        }
        return false;
    },
    
    // Get high score from localStorage
    getHighScore(gameType) {
        const key = `highscore_${gameType}`;
        return parseInt(localStorage.getItem(key)) || 0;
    },
    
    // Show game instructions
    showInstructions(gameType) {
        const instructions = {
            snake: `
                <h5>How to Play Snake:</h5>
                <ul>
                    <li>Use arrow keys or WASD to control the snake</li>
                    <li>Eat the red food to grow and score points</li>
                    <li>Don't hit the walls or your own tail</li>
                    <li>Each food item gives you 10 points</li>
                </ul>
            `,
            quiz: `
                <h5>How to Play Math Quiz:</h5>
                <ul>
                    <li>Solve math problems as quickly as possible</li>
                    <li>Each correct answer gives you 10 points</li>
                    <li>One wrong answer ends the game</li>
                    <li>Try to get the highest score possible</li>
                </ul>
            `,
            guess: `
                <h5>How to Play Number Guessing:</h5>
                <ul>
                    <li>Guess a number between 1 and 100</li>
                    <li>You have 10 attempts maximum</li>
                    <li>Fewer attempts = higher score</li>
                    <li>Score starts at 100 and decreases by 5 per attempt</li>
                </ul>
            `
        };
        
        if (instructions[gameType]) {
            // Create modal or alert with instructions
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Game Instructions</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${instructions[gameType]}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Got it!</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
            
            // Remove modal after it's hidden
            modal.addEventListener('hidden.bs.modal', () => {
                modal.remove();
            });
        }
    }
};

// Export for global use
window.SnakeGame = SnakeGame;
window.QuizGame = QuizGame;
window.NumberGuessingGame = NumberGuessingGame;
window.GameUtils = GameUtils;
window.initSnakeGame = initSnakeGame;
window.initQuizGame = initQuizGame;
window.initNumberGuessingGame = initNumberGuessingGame;

// Auto-initialize games based on page
document.addEventListener('DOMContentLoaded', function() {
    // Initialize based on which game page we're on
    if (document.getElementById('gameCanvas')) {
        window.currentGame = initSnakeGame();
    }
    
    if (document.querySelector('#quiz-form')) {
        window.currentQuiz = initQuizGame();
    }
    
    if (document.querySelector('#guess-form')) {
        window.currentGuessGame = initNumberGuessingGame();
    }
});
