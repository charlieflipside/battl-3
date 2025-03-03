import { gameState } from '../game.js';

/**
 * @typedef {Object} GameOperation
 * @property {'move'|'attack'|'special'|'endTurn'} type - Type of operation
 * @property {string} characterId - ID of character performing action
 * @property {{x: number, y: number}} [targetPosition] - Target position for moves
 * @property {string} [targetId] - Target character ID for attacks
 * @property {number} [abilityIndex] - Index of ability to use
 */

/**
 * @typedef {Object} GameResult
 * @property {boolean} success - Whether operation succeeded
 * @property {string} message - Result message
 * @property {Object} [state] - Current game state
 * @property {number} state.currentPlayer - Current player's turn
 * @property {Array<{
 *   id: string,
 *   position: {x: number, y: number},
 *   health: number,
 *   hasMoved: boolean,
 *   hasAttacked: boolean
 * }>} state.characters - Character states
 */

export class GameAPI {
    /**
     * @param {typeof gameState} state - Game state to operate on
     */
    constructor(state = gameState) {
        this.state = state;
    }

    /**
     * Execute a single game operation
     * @param {GameOperation} operation
     * @returns {Promise<GameResult>}
     */
    async executeOperation(operation) {
        try {
            const character = this.state.characters.find(c => c.id === operation.characterId);
            if (!character) {
                return { 
                    success: false, 
                    message: `Character ${operation.characterId} not found` 
                };
            }

            switch (operation.type) {
                case 'move':
                    return this.handleMove(character, operation);
                case 'attack':
                    return this.handleAttack(character, operation);
                case 'special':
                    return this.handleSpecial(character, operation);
                case 'endTurn':
                    return this.handleEndTurn(character);
                default:
                    return { 
                        success: false, 
                        message: 'Invalid operation type' 
                    };
            }
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Simulate a sequence of game operations
     * @param {GameOperation[]} operations
     * @returns {Promise<GameResult[]>}
     */
    async simulateGame(operations) {
        const results = [];
        for (const operation of operations) {
            const result = await this.executeOperation(operation);
            results.push(result);
            if (!result.success) break;
        }
        return results;
    }

    /**
     * Get current game state snapshot
     * @returns {GameResult['state']}
     */
    getCurrentState() {
        return {
            currentPlayer: this.state.currentPlayer,
            characters: this.state.characters.map(c => ({
                id: c.id,
                position: { ...c.position },
                health: c.health,
                hasMoved: c.hasMoved,
                hasAttacked: c.hasAttacked
            }))
        };
    }

    /**
     * Handle move operations
     * @private
     */
    handleMove(character, operation) {
        if (!operation.targetPosition) {
            return { success: false, message: 'No target position provided' };
        }

        const validMoves = character.getValidMoves(this.state.battlefield);
        const isValidMove = validMoves.some(move => 
            move.x === operation.targetPosition.x && 
            move.y === operation.targetPosition.y
        );

        if (!isValidMove) {
            return { success: false, message: 'Invalid move position' };
        }

        character.move(operation.targetPosition);
        character.hasMoved = true;

        return {
            success: true,
            message: 'Move successful',
            state: this.getCurrentState()
        };
    }

    /**
     * Handle attack operations
     * @private
     */
    handleAttack(character, operation) {
        if (!operation.targetId) {
            return { success: false, message: 'No target ID provided' };
        }

        const target = this.state.characters.find(c => c.id === operation.targetId);
        if (!target) {
            return { success: false, message: 'Target not found' };
        }

        const result = character.attack(target, operation.abilityIndex || 0);
        if (!result) {
            return { success: false, message: 'Attack failed' };
        }

        character.hasAttacked = true;
        if (character.abilities[operation.abilityIndex || 0].costMove) {
            character.hasMoved = true;
        }

        return {
            success: true,
            message: `Attack successful: ${result.hit ? 'Hit' : 'Miss'}`,
            state: this.getCurrentState()
        };
    }

    /**
     * Handle special ability operations
     * @private
     */
    handleSpecial(character, operation) {
        return this.handleAttack(character, { ...operation, abilityIndex: 1 });
    }

    /**
     * Handle end turn operations
     * @private
     */
    handleEndTurn(character) {
        if (character.playerId !== this.state.currentPlayer) {
            return { success: false, message: 'Not your turn' };
        }

        this.state.currentPlayer = this.state.currentPlayer === 1 ? 2 : 1;
        this.state.characters.forEach(c => {
            c.hasMoved = false;
            c.hasAttacked = false;
        });

        return {
            success: true,
            message: 'Turn ended',
            state: this.getCurrentState()
        };
    }
} 