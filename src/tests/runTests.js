/**
 * Simple test runner for the game state and action system
 */

import { GameState } from '../api/gameState.js';
import { createAction } from '../api/actions.js';
import { generateAction } from '../api/aiStrategy.js';

// Mock the global Math.random for deterministic tests
const originalRandom = Math.random;
Math.random = () => 0.5;

// Mock the expect function
function expect(actual) {
    return {
        toBe: (expected) => {
            if (actual !== expected) {
                throw new Error(`Expected ${expected} but got ${actual}`);
            }
        },
        toBeLessThan: (expected) => {
            if (actual >= expected) {
                throw new Error(`Expected ${actual} to be less than ${expected}`);
            }
        }
    };
}

// Mock the describe and test functions
function describe(name, fn) {
    console.log(`\n--- ${name} ---`);
    fn();
}

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.error(`❌ ${name}`);
        console.error(`   ${error.message}`);
    }
}

// Helper function to create a simple test game state
function createTestGameState() {
    return new GameState({
        battlefield: {
            rows: 5,
            cols: 5,
            grid: [
                [0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0]
            ]
        },
        characters: [
            {
                id: 'fighter1',
                name: 'Fighter 1',
                class: 'Fighter',
                playerId: 0,
                position: { x: 1, y: 1 },
                health: 30,
                hasMoved: false,
                hasAttacked: false
            },
            {
                id: 'mage1',
                name: 'Mage 1',
                class: 'Mage',
                playerId: 0,
                position: { x: 0, y: 0 },
                health: 20,
                hasMoved: false,
                hasAttacked: false
            },
            {
                id: 'ranger2',
                name: 'Ranger 2',
                class: 'Ranger',
                playerId: 1,
                position: { x: 3, y: 3 },
                health: 25,
                hasMoved: false,
                hasAttacked: false
            }
        ],
        currentPlayer: 0,
        currentTurn: 1
    });
}

// Run the tests
console.log('Running tests...');

describe('Game State', () => {
    test('Can be serialized to JSON and back', () => {
        const state = createTestGameState();
        const json = JSON.stringify(state);
        const restored = new GameState(JSON.parse(json));
        
        expect(restored.currentPlayer).toBe(state.currentPlayer);
        expect(restored.characters.length).toBe(state.characters.length);
        expect(restored.characters[0].position.x).toBe(state.characters[0].position.x);
    });
    
    test('Can be cloned without reference issues', () => {
        const state = createTestGameState();
        const clone = state.clone();
        
        // Modify the clone
        clone.characters[0].position.x = 99;
        
        // Original should be unchanged
        expect(state.characters[0].position.x).toBe(1);
        expect(clone.characters[0].position.x).toBe(99);
    });
});

describe('Game Actions', () => {
    test('Move action changes character position', () => {
        const state = createTestGameState();
        const moveAction = createAction({
            type: 'move',
            characterId: 'fighter1',
            targetPosition: { x: 2, y: 2 }
        });
        
        const result = moveAction.apply(state);
        
        expect(result.success).toBe(true);
        expect(result.newState.characters[0].position.x).toBe(2);
        expect(result.newState.characters[0].position.y).toBe(2);
        expect(result.newState.characters[0].hasMoved).toBe(true);
    });
    
    test('Invalid move is rejected', () => {
        const state = createTestGameState();
        const invalidMoveAction = createAction({
            type: 'move',
            characterId: 'fighter1',
            targetPosition: { x: 10, y: 10 } // Out of bounds
        });
        
        const result = invalidMoveAction.apply(state);
        
        expect(result.success).toBe(false);
        expect(result.newState.characters[0].position.x).toBe(1); // Unchanged
    });
    
    test('End turn action switches players', () => {
        const state = createTestGameState();
        const endTurnAction = createAction({
            type: 'endTurn',
            characterId: 'fighter1'
        });
        
        const result = endTurnAction.apply(state);
        
        expect(result.success).toBe(true);
        expect(result.newState.currentPlayer).toBe(1);
    });
    
    test('Action chaining produces correct final state', () => {
        const initialState = createTestGameState();
        
        // Create a sequence of actions
        const moveAction = createAction({
            type: 'move',
            characterId: 'fighter1',
            targetPosition: { x: 2, y: 2 }
        });
        
        const endTurnAction = createAction({
            type: 'endTurn',
            characterId: 'fighter1'
        });
        
        // Apply actions in sequence
        const moveResult = moveAction.apply(initialState);
        const finalResult = endTurnAction.apply(moveResult.newState);
        
        // Verify final state
        expect(finalResult.newState.currentPlayer).toBe(1);
        expect(finalResult.newState.characters[0].position.x).toBe(2);
        expect(finalResult.newState.characters[0].position.y).toBe(2);
        expect(finalResult.newState.characters[0].hasMoved).toBe(false); // Reset after turn end
    });
});

describe('AI Strategy', () => {
    test('AI can generate valid actions for a given state', () => {
        const state = createTestGameState();
        state.currentPlayer = 1; // Set to AI player
        
        // Generate an action using the AI
        const action = generateAction(state);
        
        // Apply the action
        const result = action.apply(state);
        
        // The action should be valid
        expect(result.success).toBe(true);
    });
});

// Restore original Math.random
Math.random = originalRandom;

console.log('\nTests completed!'); 