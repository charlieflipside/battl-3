/**
 * AI Strategy
 * 
 * This module provides AI strategies for generating game actions.
 * The AI uses a simple heuristic approach to evaluate possible moves.
 */

import { createAction } from './actions.js';

/**
 * Generate a valid action for the current player
 * @param {import('./gameState.js').GameState} state - Current game state
 * @param {Object} [options] - Strategy options
 * @param {number} [options.difficulty=1] - AI difficulty (1-3)
 * @returns {Object} An action object that can be applied to the state
 */
export function generateAction(state, options = {}) {
    const difficulty = options.difficulty || 1;
    const playerId = state.currentPlayer;
    
    // Get all living characters for the current player
    const characters = state.getLivingPlayerCharacters(playerId);
    if (characters.length === 0) {
        throw new Error('No living characters for current player');
    }
    
    // Collect all possible actions for all characters
    const possibleActions = [];
    
    // For each character, collect possible moves and attacks
    for (const character of characters) {
        // Check for attack opportunities first
        const attackTargets = state.getValidAttacks(character.id, 0);
        if (attackTargets.length > 0) {
            // For each possible attack target
            for (const target of attackTargets) {
                possibleActions.push({
                    type: 'attack',
                    characterId: character.id,
                    targetId: target.targetId,
                    abilityIndex: 0,
                    score: evaluateAttack(state, character.id, target.targetId, 0, difficulty)
                });
            }
            
            // Check special ability attacks if available
            const specialAttackTargets = state.getValidAttacks(character.id, 1);
            if (specialAttackTargets.length > 0) {
                for (const target of specialAttackTargets) {
                    possibleActions.push({
                        type: 'attack',
                        characterId: character.id,
                        targetId: target.targetId,
                        abilityIndex: 1,
                        score: evaluateAttack(state, character.id, target.targetId, 1, difficulty)
                    });
                }
            }
        }
        
        // Check for move opportunities
        const moveTargets = state.getValidMoves(character.id);
        if (moveTargets.length > 0) {
            // For each possible move target
            for (const target of moveTargets) {
                possibleActions.push({
                    type: 'move',
                    characterId: character.id,
                    targetPosition: target,
                    score: evaluateMove(state, character.id, target, difficulty)
                });
            }
        }
    }
    
    // If no actions are possible, end turn
    if (possibleActions.length === 0) {
        return createAction({
            type: 'endTurn',
            characterId: characters[0].id
        });
    }
    
    // Sort actions by score (higher is better)
    possibleActions.sort((a, b) => b.score - a.score);
    
    // Add some randomness based on difficulty
    // Lower difficulty = more randomness
    const randomFactor = 4 - difficulty; // 3 for easy, 2 for medium, 1 for hard
    const randomIndex = Math.floor(Math.random() * Math.min(randomFactor, possibleActions.length));
    
    // Select one of the top actions
    const selectedAction = possibleActions[randomIndex];
    
    // Remove the score property before returning
    const { score, ...actionParams } = selectedAction;
    
    return createAction(actionParams);
}

/**
 * Evaluate the value of an attack action
 * @private
 */
function evaluateAttack(state, characterId, targetId, abilityIndex, difficulty) {
    const character = state.getCharacter(characterId);
    const target = state.getCharacter(targetId);
    
    // Base score - attacking is generally good
    let score = 50;
    
    // Prefer targets with lower health
    score += (1 - (target.health / 30)) * 30;
    
    // Prefer special abilities at higher difficulties
    if (abilityIndex > 0) {
        score += difficulty * 10;
    }
    
    // Prefer attacking if character has already moved
    if (character.hasMoved) {
        score += 20;
    }
    
    return score;
}

/**
 * Evaluate the value of a move action
 * @private
 */
function evaluateMove(state, characterId, targetPosition, difficulty) {
    const character = state.getCharacter(characterId);
    
    // Base score - moving is okay
    let score = 30;
    
    // Find closest enemy
    const enemies = state.characters.filter(c => 
        c.playerId !== character.playerId && c.health > 0
    );
    
    if (enemies.length === 0) {
        return score; // No enemies, just move anywhere
    }
    
    // Calculate current distance to closest enemy
    let closestEnemyDistance = Number.MAX_SAFE_INTEGER;
    for (const enemy of enemies) {
        const distance = calculateDistance(character.position, enemy.position);
        if (distance < closestEnemyDistance) {
            closestEnemyDistance = distance;
        }
    }
    
    // Calculate new distance to closest enemy after move
    let newClosestEnemyDistance = Number.MAX_SAFE_INTEGER;
    for (const enemy of enemies) {
        const distance = calculateDistance(targetPosition, enemy.position);
        if (distance < newClosestEnemyDistance) {
            newClosestEnemyDistance = distance;
        }
    }
    
    // If we're getting closer to an enemy, that's good
    const distanceDifference = closestEnemyDistance - newClosestEnemyDistance;
    score += distanceDifference * 10;
    
    // At higher difficulties, prefer positions that would allow attacks next turn
    if (difficulty >= 2) {
        // Check if the move would put us in range to attack next turn
        // This is a simplified check - just see if we'd be adjacent to an enemy
        for (const enemy of enemies) {
            const distance = calculateDistance(targetPosition, enemy.position);
            if (distance <= 1) { // Adjacent
                score += 20;
                break;
            }
        }
    }
    
    return score;
}

/**
 * Calculate the distance between two positions
 * @private
 */
function calculateDistance(pos1, pos2) {
    return Math.sqrt(
        Math.pow(pos1.x - pos2.x, 2) + 
        Math.pow(pos1.y - pos2.y, 2)
    );
} 