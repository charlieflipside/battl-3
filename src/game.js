import { Battlefield } from './engine/battlefield.js';
import { Character } from './engine/character.js';
import { CLASSES } from './data/classes.js';
import { DEFAULT_MAP } from './data/maps.js';
import { setupControls } from './ui/controls.js';
import { updateHUD } from './ui/hud.js';

// Game state
const state = {
    battlefield: null,
    characters: [],
    selectedCharacter: null,
    currentTurn: 0,
    phase: 'select', // 'select', 'move', or 'attack'
    players: [
        { id: 0, name: 'Player 1' },
        { id: 1, name: 'Player 2' }
    ],
    currentPlayer: 0
};

// Initialize the game
function init() {
    // Create battlefield
    const canvas = document.getElementById('battlefield');
    state.battlefield = new Battlefield(canvas, DEFAULT_MAP);
    
    // Create characters for both players
    initializeCharacters();
    
    // Setup controls
    setupControls(state);
    
    // Start the game loop
    gameLoop();
    
    // Initial render
    updateHUD(state);
    render();
}

// Initialize characters for both players
function initializeCharacters() {
    // Player 1 characters
    state.characters.push(
        new Character('Mage 1', CLASSES.MAGE, 0, { x: 2, y: 2 }),
        new Character('Fighter 1', CLASSES.FIGHTER, 0, { x: 1, y: 3 }),
        new Character('Ranger 1', CLASSES.RANGER, 0, { x: 3, y: 3 })
    );
    
    // Player 2 characters
    state.characters.push(
        new Character('Mage 2', CLASSES.MAGE, 1, { x: 7, y: 7 }),
        new Character('Fighter 2', CLASSES.FIGHTER, 1, { x: 8, y: 6 }),
        new Character('Ranger 2', CLASSES.RANGER, 1, { x: 6, y: 6 })
    );
}

// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Update game state
function update() {
    // Check for game over conditions
    if (checkGameOver()) {
        return;
    }
    
    // AI logic would go here for computer-controlled players
}

// Render the game
function render() {
    // Clear the canvas
    state.battlefield.clear();
    
    // Draw the grid
    state.battlefield.drawGrid();
    
    // Draw characters
    state.characters.forEach(character => {
        state.battlefield.drawCharacter(character);
    });
    
    // Highlight valid moves if a character is selected
    if (state.selectedCharacter && state.phase === 'move') {
        const validMoves = state.selectedCharacter.getValidMoves(state.battlefield);
        state.battlefield.highlightCells(validMoves, 'move-highlight');
    }
    
    // Highlight valid attacks if in attack phase
    if (state.selectedCharacter && state.phase === 'attack') {
        // Get the current ability index from the UI
        const abilityIndex = document.getElementById('special-btn').classList.contains('active') ? 1 : 0;
        
        const validAttacks = state.selectedCharacter.getValidAttacks(
            state.battlefield, 
            state.characters,
            abilityIndex
        );
        state.battlefield.highlightCells(validAttacks, 'attack-highlight');
    }
}

// Check if the game is over
function checkGameOver() {
    const player1Characters = state.characters.filter(c => c.playerId === 0 && c.health > 0);
    const player2Characters = state.characters.filter(c => c.playerId === 1 && c.health > 0);
    
    if (player1Characters.length === 0) {
        alert('Player 2 wins!');
        return true;
    }
    
    if (player2Characters.length === 0) {
        alert('Player 1 wins!');
        return true;
    }
    
    return false;
}

// Change turns
export function nextTurn() {
    // Reset action states for all characters of the current player
    state.characters
        .filter(c => c.playerId === state.currentPlayer)
        .forEach(c => {
            c.hasMoved = false;
            c.hasAttacked = false;
        });
    
    // Switch to next player
    state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
    
    // Reset phase
    state.phase = 'select';
    state.selectedCharacter = null;
    
    // Update turn counter
    state.currentTurn++;
    
    // Update UI
    updateHUD(state);
}

// Export state and functions for use in other modules
export const gameState = state;
export const selectCharacter = (character) => {
    state.selectedCharacter = character;
    state.phase = 'select';
    updateHUD(state);
};

// Initialize the game when the DOM is loaded
window.addEventListener('DOMContentLoaded', init);