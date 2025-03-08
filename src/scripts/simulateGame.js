/**
 * Game Simulation Script
 * 
 * This script runs a simulated game between two AI players.
 * It demonstrates how to use the game state and action system
 * to run a game without the UI.
 */

import { GameState } from '../api/gameState.js';
import { generateAction } from '../api/aiStrategy.js';
import { CLASSES } from '../data/classes.js';
import { DEFAULT_MAP } from '../data/maps.js';

// Create initial game state
function createInitialState() {
    return new GameState({
        battlefield: {
            rows: DEFAULT_MAP.grid.length,
            cols: DEFAULT_MAP.grid[0].length,
            grid: DEFAULT_MAP.grid
        },
        characters: [
            // Player 0 characters
            {
                id: 'mage1',
                name: 'Mage 1',
                class: 'Mage',
                playerId: 0,
                position: { x: 2, y: 2 },
                health: CLASSES.MAGE.healthPoints,
                hasMoved: false,
                hasAttacked: false
            },
            {
                id: 'fighter1',
                name: 'Fighter 1',
                class: 'Fighter',
                playerId: 0,
                position: { x: 1, y: 3 },
                health: CLASSES.FIGHTER.healthPoints,
                hasMoved: false,
                hasAttacked: false
            },
            {
                id: 'ranger1',
                name: 'Ranger 1',
                class: 'Ranger',
                playerId: 0,
                position: { x: 3, y: 3 },
                health: CLASSES.RANGER.healthPoints,
                hasMoved: false,
                hasAttacked: false
            },
            
            // Player 1 characters
            {
                id: 'mage2',
                name: 'Mage 2',
                class: 'Mage',
                playerId: 1,
                position: { x: 7, y: 7 },
                health: CLASSES.MAGE.healthPoints,
                hasMoved: false,
                hasAttacked: false
            },
            {
                id: 'fighter2',
                name: 'Fighter 2',
                class: 'Fighter',
                playerId: 1,
                position: { x: 8, y: 6 },
                health: CLASSES.FIGHTER.healthPoints,
                hasMoved: false,
                hasAttacked: false
            },
            {
                id: 'ranger2',
                name: 'Ranger 2',
                class: 'Ranger',
                playerId: 1,
                position: { x: 6, y: 6 },
                health: CLASSES.RANGER.healthPoints,
                hasMoved: false,
                hasAttacked: false
            }
        ],
        currentPlayer: 0,
        currentTurn: 1
    });
}

// Run a simulated game
async function runSimulation() {
    console.log('Starting game simulation...');
    
    let state = createInitialState();
    let turnCount = 0;
    const maxTurns = 100; // Prevent infinite loops
    const actionLog = [];
    
    // Set AI difficulty for each player
    const player0Difficulty = 2;
    const player1Difficulty = 2;
    
    // Print initial state
    printGameState(state);
    
    // Main game loop
    while (turnCount < maxTurns) {
        const currentPlayer = state.currentPlayer;
        console.log(`\n--- Turn ${state.currentTurn}, Player ${currentPlayer + 1}'s turn ---`);
        
        // Get all living characters for current player
        const characters = state.getLivingPlayerCharacters(currentPlayer);
        
        // Check for game over
        const winner = state.checkGameOver();
        if (winner !== null) {
            console.log(`\nGame over! Player ${winner + 1} wins!`);
            break;
        }
        
        // Track if any actions were taken this turn
        let actionsTaken = false;
        
        // Try to take actions with each character
        for (const character of characters) {
            // Skip characters that have completed their turn
            if (character.hasMoved && character.hasAttacked) continue;
            
            console.log(`\nCharacter: ${character.name} (${character.class})`);
            
            // Generate an action for this character
            try {
                const difficulty = currentPlayer === 0 ? player0Difficulty : player1Difficulty;
                const action = generateAction(state, { difficulty });
                
                // Apply the action
                const result = action.apply(state);
                
                if (result.success) {
                    // Log the action
                    actionLog.push({
                        turn: state.currentTurn,
                        player: currentPlayer,
                        action: action.type,
                        character: character.name,
                        result: result.message
                    });
                    
                    console.log(`Action: ${action.type} - ${result.message}`);
                    
                    // Update state
                    state = result.newState;
                    actionsTaken = true;
                    
                    // If turn ended, break out of character loop
                    if (action.type === 'endTurn') {
                        break;
                    }
                } else {
                    console.log(`Failed action: ${action.type} - ${result.message}`);
                }
            } catch (error) {
                console.error(`Error generating action: ${error.message}`);
            }
        }
        
        // If no actions were taken, end the turn
        if (!actionsTaken) {
            console.log('No actions taken, ending turn');
            
            // Find any character to use for ending turn
            const character = characters[0];
            if (character) {
                const endTurnAction = createAction({
                    type: 'endTurn',
                    characterId: character.id
                });
                
                const result = endTurnAction.apply(state);
                if (result.success) {
                    state = result.newState;
                    actionLog.push({
                        turn: state.currentTurn,
                        player: currentPlayer,
                        action: 'endTurn',
                        character: character.name,
                        result: result.message
                    });
                }
            }
        }
        
        // Print current state
        printGameState(state);
        
        // Increment turn counter
        turnCount++;
    }
    
    if (turnCount >= maxTurns) {
        console.log('\nMax turns reached, ending simulation');
    }
    
    // Print action log
    console.log('\n--- Action Log ---');
    actionLog.forEach((entry, i) => {
        console.log(`${i+1}. Turn ${entry.turn}, Player ${entry.player + 1}: ${entry.character} - ${entry.action} (${entry.result})`);
    });
}

// Helper function to print the game state
function printGameState(state) {
    console.log('\nCurrent Game State:');
    console.log(`Turn: ${state.currentTurn}, Current Player: ${state.currentPlayer + 1}`);
    
    console.log('\nCharacters:');
    state.characters.forEach(c => {
        const status = c.health <= 0 ? 'DEFEATED' : `HP: ${c.health}`;
        const actions = [];
        if (c.hasMoved) actions.push('Moved');
        if (c.hasAttacked) actions.push('Attacked');
        const actionStatus = actions.length > 0 ? actions.join(', ') : 'Ready';
        
        console.log(`${c.name} (${c.class}, Player ${c.playerId + 1}) - Position: (${c.position.x},${c.position.y}) - ${status} - ${actionStatus}`);
    });
}

// Helper function to create an action (for end turn)
function createAction(params) {
    // Simple implementation just for endTurn
    if (params.type === 'endTurn') {
        return {
            type: 'endTurn',
            characterId: params.characterId,
            apply: (state) => {
                const newState = state.clone();
                
                // Switch to next player
                newState.currentPlayer = newState.currentPlayer === 0 ? 1 : 0;
                
                // Reset action flags for all characters of the new current player
                newState.characters.forEach(c => {
                    if (c.playerId === newState.currentPlayer) {
                        c.hasMoved = false;
                        c.hasAttacked = false;
                    }
                });
                
                // Increment turn counter if player 0 is now active
                if (newState.currentPlayer === 0) {
                    newState.currentTurn++;
                }
        
                return {
                    success: true,
                    message: `Player ${newState.currentPlayer + 1}'s turn`,
                    newState
                };
            }
        };
    }
    
    throw new Error(`Unsupported action type: ${params.type}`);
}

// Run the simulation
runSimulation().catch(error => {
    console.error('Simulation error:', error);
}); 