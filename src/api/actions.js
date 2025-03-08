/**
 * Game Actions
 * 
 * This module implements the Command pattern for game actions.
 * Each action:
 * 1. Validates if it can be applied to a game state
 * 2. Creates a new game state with the action applied
 * 3. Returns success/failure and the new state
 */

import { CLASSES } from '../data/classes.js';
import { ABILITIES } from '../data/abilities.js';
import { rollD20 } from '../engine/dice.js';

/**
 * @typedef {Object} ActionResult
 * @property {boolean} success - Whether the action was successful
 * @property {string} message - Result message
 * @property {import('./gameState.js').GameState} newState - New game state after action
 */

/**
 * Base class for all game actions
 */
class GameAction {
    /**
     * @param {Object} params - Action parameters
     * @param {string} params.type - Action type
     * @param {string} params.characterId - ID of character performing action
     */
    constructor(params) {
        this.type = params.type;
        this.characterId = params.characterId;
    }

    /**
     * Check if the action is valid for the given game state
     * @param {import('./gameState.js').GameState} state - Current game state
     * @returns {boolean} Whether the action is valid
     */
    isValid(state) {
        const character = state.getCharacter(this.characterId);
        return (
            character && 
            character.health > 0 && 
            character.playerId === state.currentPlayer
        );
    }

    /**
     * Apply the action to the game state
     * @param {import('./gameState.js').GameState} state - Current game state
     * @returns {ActionResult} Result of the action
     */
    apply(state) {
        if (!this.isValid(state)) {
            return {
                success: false,
                message: 'Invalid action',
                newState: state
            };
        }

        // This should be overridden by subclasses
        return {
            success: true,
            message: 'Action applied',
            newState: state.clone()
        };
    }
}

/**
 * Move a character to a new position
 */
class MoveAction extends GameAction {
    /**
     * @param {Object} params - Action parameters
     * @param {string} params.characterId - ID of character to move
     * @param {import('./gameState.js').Position} params.targetPosition - Target position
     */
    constructor(params) {
        super({ type: 'move', characterId: params.characterId });
        this.targetPosition = params.targetPosition;
    }

    /**
     * @override
     */
    isValid(state) {
        if (!super.isValid(state)) return false;

        const character = state.getCharacter(this.characterId);
        if (character.hasMoved) return false;

        const validMoves = state.getValidMoves(this.characterId);
        return validMoves.some(pos => 
            pos.x === this.targetPosition.x && 
            pos.y === this.targetPosition.y
        );
    }

    /**
     * @override
     */
    apply(state) {
        if (!this.isValid(state)) {
            return {
                success: false,
                message: 'Invalid move',
                newState: state
            };
        }

        const newState = state.clone();
        const character = newState.getCharacter(this.characterId);
        
        character.position = { ...this.targetPosition };
        character.hasMoved = true;

        return {
            success: true,
            message: 'Move successful',
            newState
        };
    }
}

/**
 * Attack another character
 */
class AttackAction extends GameAction {
    /**
     * @param {Object} params - Action parameters
     * @param {string} params.characterId - ID of attacking character
     * @param {string} params.targetId - ID of target character
     * @param {number} [params.abilityIndex=0] - Index of ability to use
     */
    constructor(params) {
        super({ type: 'attack', characterId: params.characterId });
        this.targetId = params.targetId;
        this.abilityIndex = params.abilityIndex || 0;
    }

    /**
     * @override
     */
    isValid(state) {
        if (!super.isValid(state)) return false;

        const character = state.getCharacter(this.characterId);
        if (character.hasAttacked) return false;

        const target = state.getCharacter(this.targetId);
        if (!target || target.health <= 0) return false;

        const validAttacks = state.getValidAttacks(this.characterId, this.abilityIndex);
        return validAttacks.some(attack => attack.targetId === this.targetId);
    }

    /**
     * @override
     */
    apply(state) {
        if (!this.isValid(state)) {
            return {
                success: false,
                message: 'Invalid attack',
                newState: state
            };
        }

        const newState = state.clone();
        const character = newState.getCharacter(this.characterId);
        const target = newState.getCharacter(this.targetId);
        
        // Get class and ability data
        const classKey = Object.keys(CLASSES).find(
            key => CLASSES[key].name === character.class
        );
        const classData = CLASSES[classKey];
        
        const classAbilities = Object.values(ABILITIES).filter(
            ability => ability.classRestriction === character.class
        );
        const ability = classAbilities[this.abilityIndex];
        
        // Calculate attack roll
        let attackModifier = classData.attack;
        
        // Apply bonus if target is of the vulnerable class
        if (target.class === classData.bonusAgainst) {
            attackModifier += classData.bonusAmount;
        }
        
        const attackRoll = rollD20() + attackModifier;
        
        // Get target's armor class
        const targetClassKey = Object.keys(CLASSES).find(
            key => CLASSES[key].name === target.class
        );
        const targetClassData = CLASSES[targetClassKey];
        const armorClass = targetClassData.armorCheck;
        
        // Check if attack hits
        let message;
        if (attackRoll >= armorClass) {
            // Calculate damage
            let damage = ability.damage;
            
            // Apply bonus damage if applicable
            if (target.class === ability.bonusAgainst) {
                damage += ability.bonusAmount;
            }
            
            // Apply save if ability has save difficulty
            let saveMessage = '';
            if (ability.saveDifficulty > 0) {
                const saveRoll = rollD20() + targetClassData.save;
                if (saveRoll >= ability.saveDifficulty) {
                    // Success - half damage
                    damage = Math.floor(damage / 2);
                    saveMessage = ' (save for half damage)';
                }
            }
            
            // Apply damage to target
            target.health = Math.max(0, target.health - damage);
            
            message = `Hit! ${damage} damage dealt${saveMessage}`;
            if (target.health <= 0) {
                message += ` - ${target.name} defeated!`;
            }
        } else {
            message = 'Miss!';
        }
        
        // Mark character as having attacked
        character.hasAttacked = true;
        
        // If ability costs movement, mark as moved too
        if (ability.costMove) {
            character.hasMoved = true;
        }

        return {
            success: true,
            message,
            newState
        };
    }
}

/**
 * End the current player's turn
 */
class EndTurnAction extends GameAction {
    /**
     * @param {Object} params - Action parameters
     * @param {string} params.characterId - ID of any character owned by current player
     */
    constructor(params) {
        super({ type: 'endTurn', characterId: params.characterId });
    }

    /**
     * @override
     */
    isValid(state) {
        const character = state.getCharacter(this.characterId);
        return character && character.playerId === state.currentPlayer;
    }

    /**
     * @override
     */
    apply(state) {
        if (!this.isValid(state)) {
            return {
                success: false,
                message: 'Not your turn',
                newState: state
            };
        }

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
}

/**
 * Factory function to create the appropriate action
 * @param {Object} params - Action parameters
 * @returns {GameAction} The created action
 */
export function createAction(params) {
    switch (params.type) {
        case 'move':
            return new MoveAction(params);
        case 'attack':
            return new AttackAction(params);
        case 'endTurn':
            return new EndTurnAction(params);
        default:
            throw new Error(`Unknown action type: ${params.type}`);
    }
} 