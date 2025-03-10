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
    
    // Increase base movement score for Fighters to make them more likely to move
    if (character.class === 'Fighter') {
        score = 45; // Almost as valuable as attacking
    }
    
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

/**
 * Generate a move action
 * @param {import('./gameState.js').GameState} state - Current game state
 * @param {Object} character - Character to generate action for
 * @param {Array} enemies - List of enemy characters
 * @param {Object} classData - Character class data
 * @param {number} difficulty - AI difficulty level
 * @returns {Object|null} Move action or null if no move is possible
 */
function generateMoveAction(state, character, enemies, classData, difficulty) {
    // Get valid moves
    const validMoves = getValidMoves(state, character);
    if (validMoves.length === 0) {
        return null;
    }
    
    // For Fighter class, prioritize getting close to Rangers, then Mages, then others
    if (character.class === 'Fighter') {
        return generateFighterMoveAction(state, character, enemies, validMoves, difficulty);
    }
    
    // For other classes, move towards closest enemy
    // Sort enemies by distance
    const sortedEnemies = [...enemies].sort((a, b) => {
        const distA = calculateDistance(character.position, a.position);
        const distB = calculateDistance(character.position, b.position);
        return distA - distB;
    });
    
    if (sortedEnemies.length === 0) {
        return null;
    }
    
    // Get closest enemy
    const closestEnemy = sortedEnemies[0];
    
    // Sort moves by distance to closest enemy (prefer moves that get closer)
    const sortedMoves = [...validMoves].sort((a, b) => {
        const distA = calculateDistance(a, closestEnemy.position);
        const distB = calculateDistance(b, closestEnemy.position);
        return distA - distB;
    });
    
    // Choose the best move
    return {
        type: 'move',
        position: sortedMoves[0]
    };
}

/**
 * Generate a move action specifically for Fighter class
 * @param {import('./gameState.js').GameState} state - Current game state
 * @param {Object} character - Fighter character
 * @param {Array} enemies - List of enemy characters
 * @param {Array} validMoves - List of valid move positions
 * @param {number} difficulty - AI difficulty level
 * @returns {Object|null} Move action or null if no move is possible
 */
function generateFighterMoveAction(state, character, enemies, validMoves, difficulty) {
    console.log("Generating Fighter move action");
    
    if (validMoves.length === 0) {
        return null;
    }
    
    // Separate enemies by class
    const rangerEnemies = enemies.filter(e => e.class === 'Ranger');
    const mageEnemies = enemies.filter(e => e.class === 'Mage');
    const otherEnemies = enemies.filter(e => e.class !== 'Ranger' && e.class !== 'Mage');
    
    console.log(`Fighter targeting priorities: Rangers(${rangerEnemies.length}), Mages(${mageEnemies.length}), Others(${otherEnemies.length})`);
    
    // Prioritize Rangers, then Mages, then others
    let targetEnemies = rangerEnemies.length > 0 ? rangerEnemies : 
                        mageEnemies.length > 0 ? mageEnemies : 
                        otherEnemies;
    
    if (targetEnemies.length === 0) {
        return null;
    }
    
    // Sort target enemies by distance
    const sortedTargets = [...targetEnemies].sort((a, b) => {
        const distA = calculateDistance(character.position, a.position);
        const distB = calculateDistance(character.position, b.position);
        return distA - distB;
    });
    
    // Get closest target
    const closestTarget = sortedTargets[0];
    console.log(`Fighter targeting: ${closestTarget.class} at position (${closestTarget.position.x}, ${closestTarget.position.y})`);
    
    // Get fighter's attack range
    const fighterAbility = Object.values(ABILITIES).find(
        ability => ability.classRestriction === 'Fighter' && !ability.costMove
    );
    const attackRange = fighterAbility ? fighterAbility.range : 10;
    const gridAttackRange = attackRange / 10; // Convert from feet to grid units
    
    console.log(`Fighter attack range: ${attackRange} feet (${gridAttackRange} grid units)`);
    
    // Sort moves by how close they get to being within attack range of the target
    const sortedMoves = [...validMoves].sort((a, b) => {
        const distA = calculateDistance(a, closestTarget.position);
        const distB = calculateDistance(b, closestTarget.position);
        
        // If either move puts us in attack range, prioritize it
        const aInRange = distA <= gridAttackRange;
        const bInRange = distB <= gridAttackRange;
        
        if (aInRange && !bInRange) return -1;
        if (!aInRange && bInRange) return 1;
        
        // Otherwise, get as close as possible
        return distA - distB;
    });
    
    const bestMove = sortedMoves[0];
    const distanceToTarget = calculateDistance(bestMove, closestTarget.position);
    console.log(`Fighter best move: (${bestMove.x}, ${bestMove.y}), distance to target: ${distanceToTarget}, in range: ${distanceToTarget <= gridAttackRange}`);
    
    // Choose the best move
    return {
        type: 'move',
        position: bestMove
    };
} 