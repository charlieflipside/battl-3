/**
 * Tests for the game state and action system
 * 
 * These tests verify that:
 * 1. Game state can be serialized to JSON
 * 2. Actions can be applied to produce new game states
 * 3. Actions are validated against game rules
 * 4. Game state transitions work correctly
 */

import { GameState } from '../api/gameState.js';
import { createAction } from '../api/actions.js';

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

// Test suite
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
    
    test('Attack action reduces target health', () => {
        const state = createTestGameState();
        // Move fighter next to ranger to enable attack
        state.characters[0].position = { x: 2, y: 3 };
        
        const attackAction = createAction({
            type: 'attack',
            characterId: 'fighter1',
            targetId: 'ranger2'
        });
        
        // Mock the dice roll for consistent testing
        const originalRoll = global.Math.random;
        global.Math.random = () => 0.7; // Will result in a hit
        
        const result = attackAction.apply(state);
        
        // Restore original random function
        global.Math.random = originalRoll;
        
        expect(result.success).toBe(true);
        expect(result.newState.characters[2].health).toBeLessThan(25);
        expect(result.newState.characters[0].hasAttacked).toBe(true);
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
        
        // Characters should have their actions reset
        const player0Characters = result.newState.characters.filter(c => c.playerId === 0);
        player0Characters.forEach(c => {
            expect(c.hasMoved).toBe(false);
            expect(c.hasAttacked).toBe(false);
        });
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
        
        // Import the AI strategy
        const { generateAction } = require('../api/aiStrategy.js');
        
        // Generate an action using the AI
        const action = generateAction(state);
        
        // Apply the action
        const result = action.apply(state);
        
        // The action should be valid
        expect(result.success).toBe(true);
        
        // The action should be for the current player's character
        const actingCharacter = state.characters.find(c => c.id === action.characterId);
        expect(actingCharacter.playerId).toBe(1);
    });
}); 