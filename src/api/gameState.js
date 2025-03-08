/**
 * GameState class
 * 
 * Represents the complete state of a game in a serializable format.
 * This allows for:
 * - Saving/loading games
 * - Implementing undo/redo
 * - AI decision making
 * - Deterministic replay
 */

import { CLASSES } from '../data/classes.js';
import { ABILITIES } from '../data/abilities.js';

/**
 * @typedef {Object} Position
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

/**
 * @typedef {Object} Character
 * @property {string} id - Unique identifier
 * @property {string} name - Character name
 * @property {string} class - Character class name
 * @property {number} playerId - Player ID (0 or 1)
 * @property {Position} position - Character position
 * @property {number} health - Current health points
 * @property {boolean} hasMoved - Whether character has moved this turn
 * @property {boolean} hasAttacked - Whether character has attacked this turn
 */

/**
 * @typedef {Object} Battlefield
 * @property {number} rows - Number of rows
 * @property {number} cols - Number of columns
 * @property {number[][]} grid - Grid of terrain types
 */

/**
 * @typedef {Object} GameStateData
 * @property {Battlefield} battlefield - Battlefield data
 * @property {Character[]} characters - Character data
 * @property {number} currentPlayer - Current player (0 or 1)
 * @property {number} currentTurn - Current turn number
 */

export class GameState {
    /**
     * Create a new game state
     * @param {GameStateData} data - Initial game state data
     */
    constructor(data) {
        this.battlefield = data.battlefield;
        this.characters = data.characters;
        this.currentPlayer = data.currentPlayer;
        this.currentTurn = data.currentTurn || 1;
    }

    /**
     * Create a deep clone of the game state
     * @returns {GameState} A new game state with the same data
     */
    clone() {
        return new GameState({
            battlefield: JSON.parse(JSON.stringify(this.battlefield)),
            characters: JSON.parse(JSON.stringify(this.characters)),
            currentPlayer: this.currentPlayer,
            currentTurn: this.currentTurn
        });
    }

    /**
     * Get a character by ID
     * @param {string} id - Character ID
     * @returns {Character|undefined} The character or undefined if not found
     */
    getCharacter(id) {
        return this.characters.find(c => c.id === id);
    }

    /**
     * Get all characters for a player
     * @param {number} playerId - Player ID
     * @returns {Character[]} Array of characters
     */
    getPlayerCharacters(playerId) {
        return this.characters.filter(c => c.playerId === playerId);
    }

    /**
     * Get all living characters for a player
     * @param {number} playerId - Player ID
     * @returns {Character[]} Array of living characters
     */
    getLivingPlayerCharacters(playerId) {
        return this.characters.filter(c => c.playerId === playerId && c.health > 0);
    }

    /**
     * Check if a position is within the battlefield bounds
     * @param {Position} position - Position to check
     * @returns {boolean} True if position is valid
     */
    isValidPosition(position) {
        return position.x >= 0 && 
               position.x < this.battlefield.cols && 
               position.y >= 0 && 
               position.y < this.battlefield.rows;
    }

    /**
     * Check if a position is occupied by a character
     * @param {Position} position - Position to check
     * @param {string[]} [excludeIds=[]] - Character IDs to exclude
     * @returns {Character|null} The character at the position or null
     */
    getCharacterAt(position, excludeIds = []) {
        return this.characters.find(c => 
            c.position.x === position.x && 
            c.position.y === position.y &&
            c.health > 0 &&
            !excludeIds.includes(c.id)
        ) || null;
    }

    /**
     * Get the terrain type at a position
     * @param {Position} position - Position to check
     * @returns {number} Terrain type (0-3)
     */
    getTerrainAt(position) {
        if (!this.isValidPosition(position)) return -1;
        return this.battlefield.grid[position.y][position.x];
    }

    /**
     * Get the movement cost for a terrain type
     * @param {Position} position - Position to check
     * @returns {number} Movement cost (10-30)
     */
    getMovementCost(position) {
        const terrain = this.getTerrainAt(position);
        switch (terrain) {
            case 0: return 10; // Grass
            case 1: return 30; // Water
            case 2: return 30; // Mountain
            case 3: return 20; // Forest
            default: return 999; // Impassable
        }
    }

    /**
     * Get valid moves for a character
     * @param {string} characterId - Character ID
     * @returns {Position[]} Array of valid positions
     */
    getValidMoves(characterId) {
        const character = this.getCharacter(characterId);
        if (!character || character.health <= 0 || character.hasMoved) {
            return [];
        }

        // Get class definition
        const classData = CLASSES[Object.keys(CLASSES).find(
            key => CLASSES[key].name === character.class
        )];
        
        if (!classData) return [];
        
        const moveRange = classData.move;
        const validMoves = [];
        const startX = character.position.x;
        const startY = character.position.y;
        
        // Simple implementation: check all cells within a square range
        for (let y = Math.max(0, startY - Math.floor(moveRange / 10)); 
             y <= Math.min(this.battlefield.rows - 1, startY + Math.floor(moveRange / 10)); 
             y++) {
            for (let x = Math.max(0, startX - Math.floor(moveRange / 10)); 
                 x <= Math.min(this.battlefield.cols - 1, startX + Math.floor(moveRange / 10)); 
                 x++) {
                // Skip current position
                if (x === startX && y === startY) continue;
                
                // Calculate Manhattan distance as a simple approximation
                const distance = Math.abs(x - startX) + Math.abs(y - startY);
                
                // Get movement cost for this terrain
                const position = { x, y };
                const moveCost = this.getMovementCost(position);
                
                // If within movement range and not occupied by another character
                if (distance * 10 <= moveRange && !this.getCharacterAt(position)) {
                    validMoves.push(position);
                }
            }
        }
        
        return validMoves;
    }

    /**
     * Get valid attack targets for a character
     * @param {string} characterId - Character ID
     * @param {number} [abilityIndex=0] - Ability index
     * @returns {Object[]} Array of valid targets with position and targetId
     */
    getValidAttacks(characterId, abilityIndex = 0) {
        const character = this.getCharacter(characterId);
        if (!character || character.health <= 0 || character.hasAttacked) {
            return [];
        }

        // Get class definition
        const classData = CLASSES[Object.keys(CLASSES).find(
            key => CLASSES[key].name === character.class
        )];
        
        if (!classData) return [];
        
        // Get ability
        const classAbilities = Object.values(ABILITIES).filter(
            ability => ability.classRestriction === character.class
        );
        
        const ability = classAbilities[abilityIndex];
        if (!ability) return [];
        
        const validTargets = [];
        const attackRange = ability.range;
        const startX = character.position.x;
        const startY = character.position.y;
        
        // Check all cells within ability range
        for (let y = Math.max(0, startY - Math.floor(attackRange / 10)); 
             y <= Math.min(this.battlefield.rows - 1, startY + Math.floor(attackRange / 10)); 
             y++) {
            for (let x = Math.max(0, startX - Math.floor(attackRange / 10)); 
                 x <= Math.min(this.battlefield.cols - 1, startX + Math.floor(attackRange / 10)); 
                 x++) {
                // Calculate distance
                const distance = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2)) * 10;
                
                // If within range
                if (distance <= attackRange) {
                    const position = { x, y };
                    
                    // For area effect abilities, add the cell even if not occupied
                    if (ability.radius > 0) {
                        validTargets.push({ position });
                    } 
                    // For single target abilities, only add if occupied by an enemy
                    else {
                        const targetCharacter = this.getCharacterAt(position);
                        
                        if (targetCharacter && targetCharacter.playerId !== character.playerId) {
                            validTargets.push({ 
                                position, 
                                targetId: targetCharacter.id 
                            });
                        }
                    }
                }
            }
        }
        
        return validTargets;
    }

    /**
     * Check if the game is over
     * @returns {number|null} Winning player ID or null if game is not over
     */
    checkGameOver() {
        const player0Living = this.getLivingPlayerCharacters(0);
        const player1Living = this.getLivingPlayerCharacters(1);
        
        if (player0Living.length === 0) return 1;
        if (player1Living.length === 0) return 0;
        
        return null;
    }
} 