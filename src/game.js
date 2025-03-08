import { Battlefield } from './engine/battlefield.js';
import { Character } from './engine/character.js';
import { CLASSES } from './data/classes.js';
import { DEFAULT_MAP } from './data/maps.js';
import { setupControls } from './ui/controls.js';
import { updateHUD } from './ui/hud.js';
import { GameState } from './api/gameState.js';
import { createAction } from './api/actions.js';
import { generateAction } from './api/aiStrategy.js';

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
    currentPlayer: 0,
    // AI settings
    useAIForPlayer2: true,
    aiDifficulty: 2,
    aiThinking: false
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
    
    // Setup AI controls
    setupAIControls();
    
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

// Setup AI controls
function setupAIControls() {
    const aiToggle = document.getElementById('ai-toggle');
    const aiDifficulty = document.getElementById('ai-difficulty');
    
    // Set initial values
    aiToggle.checked = state.useAIForPlayer2;
    aiDifficulty.value = state.aiDifficulty.toString();
    
    // Add event listeners
    aiToggle.addEventListener('change', (e) => {
        state.useAIForPlayer2 = e.target.checked;
        addLogEntry(`AI Player 2: ${state.useAIForPlayer2 ? 'Enabled' : 'Disabled'}`);
    });
    
    aiDifficulty.addEventListener('change', (e) => {
        state.aiDifficulty = parseInt(e.target.value);
        addLogEntry(`AI Difficulty: ${getDifficultyName(state.aiDifficulty)}`);
    });
}

// Get difficulty name from level
function getDifficultyName(level) {
    switch (level) {
        case 1: return 'Easy';
        case 2: return 'Medium';
        case 3: return 'Hard';
        default: return 'Unknown';
    }
}

// Add log entry to the game log
function addLogEntry(message, classes = []) {
    const logEntries = document.getElementById('log-entries');
    const entry = document.createElement('div');
    entry.className = 'log-entry ' + classes.join(' ');
    
    // Handle multiline messages
    if (message.includes('\n')) {
        message.split('\n').forEach((line, index) => {
            if (index > 0) {
                entry.appendChild(document.createElement('br'));
            }
            entry.appendChild(document.createTextNode(line));
        });
    } else {
        entry.textContent = message;
    }
    
    logEntries.appendChild(entry);
    logEntries.scrollTop = logEntries.scrollHeight;
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
    
    // Run AI turn if it's player 2's turn and AI is enabled
    if (state.currentPlayer === 1 && state.useAIForPlayer2 && !state.aiThinking) {
        runAITurn();
    }
}

// Run AI turn
async function runAITurn() {
    // Set flag to prevent multiple AI turns running simultaneously
    state.aiThinking = true;
    
    // Safety check - limit the number of AI actions per turn
    let actionCounter = 0;
    const MAX_ACTIONS_PER_TURN = 10; // Reasonable limit for a turn
    
    // Add log entry
    addLogEntry(`AI Player 2 (${getDifficultyName(state.aiDifficulty)}) is thinking...`, ['ai']);
    
    // Small delay to show the AI is "thinking"
    await delay(500);
    
    // Get all living AI characters
    const aiCharacters = state.characters.filter(c => 
        c.playerId === 1 && c.health > 0
    );
    
    // Get all living enemy characters
    const enemies = state.characters.filter(c => 
        c.playerId === 0 && c.health > 0
    );
    
    if (enemies.length === 0) {
        console.log('No enemies found, ending AI turn');
        nextTurn();
        state.aiThinking = false;
        return;
    }
    
    // Track if any actions were taken
    let actionsTaken = false;
    
    // Process each AI character - no special treatment for any class
    for (const character of aiCharacters) {
        console.log(`Processing character: ${character.name} (${character.class.name})`);
        
        // Skip characters that have completed their turn
        if (character.hasMoved && character.hasAttacked) {
            console.log(`Skipping ${character.name} - already acted`);
            continue;
        }
        
        // Helper function to filter attack targets to ensure they're enemies
        function filterEnemyTargets(attacks, character, allCharacters) {
            return attacks.filter(attack => {
                const targetCharacter = allCharacters.find(c => 
                    c.position.x === attack.x && 
                    c.position.y === attack.y
                );
                
                return targetCharacter && targetCharacter.playerId !== character.playerId;
            });
        }
        
        // STEP 1: Try to attack first if possible
        if (!character.hasAttacked) {
            // Check for special ability attacks first (ability index 1)
            let specialAttacks = character.getValidAttacks(state.battlefield, state.characters, 1);
            // Filter to ensure we only target enemies
            specialAttacks = filterEnemyTargets(specialAttacks, character, state.characters);
            console.log(`${character.name} valid special attacks:`, specialAttacks.length);
            
            // Check for regular attacks
            let regularAttacks = character.getValidAttacks(state.battlefield, state.characters, 0);
            // Filter to ensure we only target enemies
            regularAttacks = filterEnemyTargets(regularAttacks, character, state.characters);
            console.log(`${character.name} valid regular attacks:`, regularAttacks.length);
            
            // Prioritize special abilities if available and character hasn't moved
            // (since special abilities often cost movement)
            if (specialAttacks.length > 0 && !character.hasMoved) {
                // Choose a target (prefer lower health)
                specialAttacks.sort((a, b) => {
                    const targetA = state.characters.find(c => c.position.x === a.x && c.position.y === a.y);
                    const targetB = state.characters.find(c => c.position.x === b.x && c.position.y === b.y);
                    return (targetA ? targetA.health : 100) - (targetB ? targetB.health : 100);
                });
                
                const target = specialAttacks[0];
                const targetCharacter = state.characters.find(c => 
                    c.position.x === target.x && 
                    c.position.y === target.y && 
                    c.playerId !== character.playerId // Ensure we're only targeting enemies
                );
                
                if (targetCharacter) {
                    console.log(`${character.name} using special ability on ${targetCharacter.name}`);
                    
                    // Perform special attack (ability index 1)
                    const result = character.attack(targetCharacter, 1);
                    
                    if (result) {
                        // Mark character as having attacked
                        character.hasAttacked = true;
                        
                        // Special abilities often cost movement too
                        if (character.abilities[1] && character.abilities[1].costMove) {
                            character.hasMoved = true;
                        }
                        
                        // Log the attack
                        logStandardAction({
                            type: 'special',
                            actor: character,
                            target: targetCharacter,
                            ability: character.abilities[1],
                            result: result,
                            isAI: true
                        });
                        
                        actionsTaken = true;
                        actionCounter++; // Increment action counter
                        
                        // Check if we've reached the action limit
                        if (actionCounter >= MAX_ACTIONS_PER_TURN) {
                            console.log('AI reached maximum actions per turn, ending turn');
                            break;
                        }
                        
                        // Update UI
                        updateHUD(state);
                        await delay(500);
                        
                        // Skip to next character since this one has acted
                        continue;
                    }
                }
            }
            
            // If no special attack was performed, try regular attack
            if (regularAttacks.length > 0) {
                // Choose a target (prefer lower health)
                regularAttacks.sort((a, b) => {
                    const targetA = state.characters.find(c => c.position.x === a.x && c.position.y === a.y);
                    const targetB = state.characters.find(c => c.position.x === b.x && c.position.y === b.y);
                    return (targetA ? targetA.health : 100) - (targetB ? targetB.health : 100);
                });
                
                const target = regularAttacks[0];
                const targetCharacter = state.characters.find(c => 
                    c.position.x === target.x && 
                    c.position.y === target.y && 
                    c.playerId !== character.playerId // Ensure we're only targeting enemies
                );
                
                if (targetCharacter) {
                    console.log(`${character.name} attacking ${targetCharacter.name}`);
                    
                    // Perform regular attack
                    const result = character.attack(targetCharacter, 0);
                    
                    if (result) {
                        // Mark character as having attacked
                        character.hasAttacked = true;
                        
                        // Log the attack
                        logStandardAction({
                            type: 'attack',
                            actor: character,
                            target: targetCharacter,
                            ability: character.abilities[0],
                            result: result,
                            isAI: true
                        });
                        
                        actionsTaken = true;
                        actionCounter++; // Increment action counter
                        
                        // Check if we've reached the action limit
                        if (actionCounter >= MAX_ACTIONS_PER_TURN) {
                            console.log('AI reached maximum actions per turn, ending turn');
                            break;
                        }
                        
                        // Update UI
                        updateHUD(state);
                        await delay(500);
                    }
                }
            }
        }
        
        // STEP 2: Move if haven't moved yet
        if (!character.hasMoved) {
            const validMoves = character.getValidMoves(state.battlefield);
            console.log(`${character.name} valid moves:`, validMoves.length);
            
            if (validMoves.length > 0) {
                // Find closest enemy
                let closestEnemy = enemies[0];
                let closestDistance = calculateDistance(character.position, closestEnemy.position);
                
                for (let i = 1; i < enemies.length; i++) {
                    const distance = calculateDistance(character.position, enemies[i].position);
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestEnemy = enemies[i];
                    }
                }
                
                // Sort moves by distance to closest enemy (prefer moves that get closer)
                validMoves.sort((a, b) => {
                    const distA = calculateDistance(a, closestEnemy.position);
                    const distB = calculateDistance(b, closestEnemy.position);
                    return distA - distB;
                });
                
                // Choose the best move
                const bestMove = validMoves[0];
                
                console.log(`${character.name} moving to (${bestMove.x}, ${bestMove.y})`);
                
                // Store original position for logging
                const originalPosition = { ...character.position };
                
                // Perform move
                const moveResult = character.move(bestMove, state.characters);
                
                if (moveResult) {
                    // Mark character as having moved
                    character.hasMoved = true;
                    
                    // Log the move
                    logStandardAction({
                        type: 'move',
                        actor: character,
                        fromPosition: originalPosition,
                        position: bestMove,
                        isAI: true
                    });
                    
                    actionsTaken = true;
                    actionCounter++; // Increment action counter
                    
                    // Check if we've reached the action limit
                    if (actionCounter >= MAX_ACTIONS_PER_TURN) {
                        console.log('AI reached maximum actions per turn, ending turn');
                        break;
                    }
                    
                    // Update UI
                    updateHUD(state);
                    await delay(500);
                    
                    // After moving, check if we can now attack
                    if (!character.hasAttacked) {
                        // Check for special ability attacks first
                        let newSpecialAttacks = character.getValidAttacks(state.battlefield, state.characters, 1);
                        // Filter to ensure we only target enemies
                        newSpecialAttacks = filterEnemyTargets(newSpecialAttacks, character, state.characters);
                        
                        // Check for regular attacks
                        let newRegularAttacks = character.getValidAttacks(state.battlefield, state.characters, 0);
                        // Filter to ensure we only target enemies
                        newRegularAttacks = filterEnemyTargets(newRegularAttacks, character, state.characters);
                        
                        // Prioritize special abilities if available
                        if (newSpecialAttacks.length > 0) {
                            // Choose a target (prefer lower health)
                            newSpecialAttacks.sort((a, b) => {
                                const targetA = state.characters.find(c => c.position.x === a.x && c.position.y === a.y);
                                const targetB = state.characters.find(c => c.position.x === b.x && c.position.y === b.y);
                                return (targetA ? targetA.health : 100) - (targetB ? targetB.health : 100);
                            });
                            
                            const target = newSpecialAttacks[0];
                            const targetCharacter = state.characters.find(c => 
                                c.position.x === target.x && 
                                c.position.y === target.y && 
                                c.playerId !== character.playerId // Ensure we're only targeting enemies
                            );
                            
                            if (targetCharacter) {
                                console.log(`${character.name} using special ability on ${targetCharacter.name} after moving`);
                                
                                // Perform special attack
                                const result = character.attack(targetCharacter, 1);
                                
                                if (result) {
                                    // Mark character as having attacked
                                    character.hasAttacked = true;
                                    
                                    // Log the attack
                                    logStandardAction({
                                        type: 'special',
                                        actor: character,
                                        target: targetCharacter,
                                        ability: character.abilities[1],
                                        result: result,
                                        isAI: true
                                    });
                                    
                                    actionsTaken = true;
                                    actionCounter++; // Increment action counter
                                    
                                    // Check if we've reached the action limit
                                    if (actionCounter >= MAX_ACTIONS_PER_TURN) {
                                        console.log('AI reached maximum actions per turn, ending turn');
                                        break;
                                    }
                                    
                                    // Update UI
                                    updateHUD(state);
                                    await delay(500);
                                    
                                    // Skip to next iteration since we've attacked
                                    continue;
                                }
                            }
                        }
                        
                        // If no special attack was performed, try regular attack
                        if (newRegularAttacks.length > 0) {
                            // Choose a target (prefer lower health)
                            newRegularAttacks.sort((a, b) => {
                                const targetA = state.characters.find(c => c.position.x === a.x && c.position.y === a.y);
                                const targetB = state.characters.find(c => c.position.x === b.x && c.position.y === b.y);
                                return (targetA ? targetA.health : 100) - (targetB ? targetB.health : 100);
                            });
                            
                            const target = newRegularAttacks[0];
                            const targetCharacter = state.characters.find(c => 
                                c.position.x === target.x && 
                                c.position.y === target.y && 
                                c.playerId !== character.playerId // Ensure we're only targeting enemies
                            );
                            
                            if (targetCharacter) {
                                console.log(`${character.name} attacking ${targetCharacter.name} after moving`);
                                
                                // Perform attack
                                const result = character.attack(targetCharacter, 0);
                                
                                if (result) {
                                    // Mark character as having attacked
                                    character.hasAttacked = true;
                                    
                                    // Log the attack
                                    logStandardAction({
                                        type: 'attack',
                                        actor: character,
                                        target: targetCharacter,
                                        ability: character.abilities[0],
                                        result: result,
                                        isAI: true
                                    });
                                    
                                    actionsTaken = true;
                                    actionCounter++; // Increment action counter
                                    
                                    // Check if we've reached the action limit
                                    if (actionCounter >= MAX_ACTIONS_PER_TURN) {
                                        console.log('AI reached maximum actions per turn, ending turn');
                                        break;
                                    }
                                    
                                    // Update UI
                                    updateHUD(state);
                                    await delay(500);
                                }
                            }
                        }
                    }
                } else {
                    console.log(`Move failed for ${character.name} - position occupied`);
                }
            }
        }
    }
    
    // End turn if all characters have acted or no actions were taken
    if (!actionsTaken || allCharactersActed(aiCharacters) || actionCounter >= MAX_ACTIONS_PER_TURN) {
        console.log('AI ending turn');
        
        // Get any AI character for logging
        const aiCharacter = aiCharacters.length > 0 ? aiCharacters[0] : { playerId: 1, name: 'AI' };
        
        // Log the end turn action
        logStandardAction({
            type: 'endTurn',
            actor: aiCharacter,
            isAI: true
        });
        
        // End turn
        nextTurn();
    }
    
    // Reset AI thinking flag
    state.aiThinking = false;
    
    // Re-enable controls
    if (window.enableControlsAfterAITurn) {
        window.enableControlsAfterAITurn();
    }
}

// Check if all characters have acted
function allCharactersActed(characters) {
    return characters.every(c => (c.hasMoved && c.hasAttacked) || c.health <= 0);
}

// Calculate distance between two positions
function calculateDistance(pos1, pos2) {
    return Math.sqrt(
        Math.pow(pos1.x - pos2.x, 2) + 
        Math.pow(pos1.y - pos2.y, 2)
    );
}

// Log AI action
function logAIAction(action, message) {
    let logMessage = '';
    
    switch (action.type) {
        case 'move':
            const character = state.characters.find(c => c.name === action.characterId);
            if (character) {
                logMessage = `AI moves ${character.name} to (${action.targetPosition.x}, ${action.targetPosition.y})`;
            } else {
                logMessage = `AI moves character to (${action.targetPosition.x}, ${action.targetPosition.y})`;
                console.warn('Character not found:', action.characterId);
            }
            break;
            
        case 'attack':
            const attacker = state.characters.find(c => c.name === action.characterId);
            const target = state.characters.find(c => c.name === action.targetId);
            if (attacker && target) {
                logMessage = `AI attacks with ${attacker.name} against ${target.name}: ${message}`;
            } else {
                logMessage = `AI attack: ${message}`;
                console.warn('Character not found:', action.characterId, action.targetId);
            }
            break;
            
        case 'endTurn':
            logMessage = 'AI ends its turn';
            break;
            
        default:
            logMessage = `AI action: ${action.type} - ${message}`;
    }
    
    addLogEntry(logMessage, ['ai-action']);
}

// Convert current state to GameState format
function convertToGameState() {
    return new GameState({
        battlefield: {
            rows: state.battlefield.rows,
            cols: state.battlefield.cols,
            grid: state.battlefield.map.grid
        },
        characters: state.characters.map(c => ({
            id: c.name, // Use name as ID for consistency
            name: c.name,
            class: c.class.name,
            playerId: c.playerId,
            position: { ...c.position },
            health: c.health,
            hasMoved: c.hasMoved,
            hasAttacked: c.hasAttacked
        })),
        currentPlayer: state.currentPlayer,
        currentTurn: state.currentTurn
    });
}

// Update game state from GameState
function updateFromGameState(gameState) {
    // Update current player
    state.currentPlayer = gameState.currentPlayer;
    
    // Update current turn
    state.currentTurn = gameState.currentTurn;
    
    // Update characters
    gameState.characters.forEach(gsChar => {
        const character = state.characters.find(c => c.name === gsChar.id);
        if (character) {
            character.position = { ...gsChar.position };
            character.health = gsChar.health;
            character.hasMoved = gsChar.hasMoved;
            character.hasAttacked = gsChar.hasAttacked;
        }
    });
    
    // Reset phase and selected character
    state.phase = 'select';
    state.selectedCharacter = null;
    
    // Update UI
    updateHUD(state);
}

// Helper function for delays
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    
    // Show "AI thinking" indicator if applicable
    if (state.currentPlayer === 1 && state.useAIForPlayer2 && state.aiThinking) {
        showAIThinkingIndicator();
    }
}

// Show AI thinking indicator
function showAIThinkingIndicator() {
    const ctx = state.battlefield.ctx;
    ctx.save();
    
    ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
    ctx.fillRect(0, 0, state.battlefield.canvas.width, state.battlefield.canvas.height);
    
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
        'AI is thinking...', 
        state.battlefield.canvas.width / 2, 
        state.battlefield.canvas.height / 2
    );
    
    ctx.restore();
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
    
    // Log turn change
    addLogEntry(`Player ${state.currentPlayer + 1}'s turn`, ['turn-change']);
}

// Export state and functions for use in other modules
export const gameState = state;
export const selectCharacter = (character) => {
    state.selectedCharacter = character;
    state.phase = 'select';
    updateHUD(state);
};

// Make logStandardAction available globally
window.logStandardAction = logStandardAction;

// Initialize the game when the DOM is loaded
window.addEventListener('DOMContentLoaded', init);

// Convert numeric coordinates to chess-style notation
function toGridCoord(x, y) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return `${letters[x]}${y + 1}`;
}

/**
 * Log a standardized action message
 * @param {Object} params - Action parameters
 * @param {string} params.type - Action type: 'move', 'attack', 'special', 'endTurn'
 * @param {Object} params.actor - Character performing the action
 * @param {Object} [params.target] - Target character (for attacks)
 * @param {Object} [params.position] - Target position (for moves)
 * @param {Object} [params.fromPosition] - Starting position (for moves)
 * @param {Object} [params.ability] - Ability used (for attacks/special)
 * @param {Object} [params.result] - Attack result
 * @param {boolean} params.isAI - Whether the action is performed by AI
 */
function logStandardAction(params) {
    const { type, actor, target, position, fromPosition, ability, result, isAI } = params;
    
    // Base classes for all logs
    const classes = [isAI ? 'ai-action' : 'player-action'];
    
    // Actor identifier
    const actorName = actor.name;
    const actorPos = actor.position ? toGridCoord(actor.position.x, actor.position.y) : '';
    
    let message = '';
    
    switch (type) {
        case 'move':
            classes.push('move');
            const fromCoord = toGridCoord(fromPosition.x, fromPosition.y);
            const toCoord = toGridCoord(position.x, position.y);
            message = `${actorName} moves from ${fromCoord} to ${toCoord}`;
            break;
            
        case 'attack':
        case 'special':
            classes.push('attack');
            const abilityName = ability ? ability.displayName : 'Attack';
            const targetPos = target ? toGridCoord(target.position.x, target.position.y) : '';
            
            message = `${actorName} (${actorPos}) uses ${abilityName}`;
            
            if (target) {
                message += ` on ${target.name} (${targetPos})`;
            }
            
            if (result) {
                if (result.hit) {
                    classes.push('hit');
                    message += `: Hit! ${result.damage} damage`;
                    
                    if (target && target.health <= 0) {
                        message += ' - Target defeated!';
                    }
                } else {
                    classes.push('miss');
                    message += `: Miss!`;
                }
            }
            break;
            
        case 'endTurn':
            classes.push('turn-end');
            message = `${isAI ? 'AI' : `Player ${actor.playerId + 1}`} ends turn`;
            break;
            
        default:
            message = `Unknown action: ${type}`;
    }
    
    addLogEntry(message, classes);
    return message;
}