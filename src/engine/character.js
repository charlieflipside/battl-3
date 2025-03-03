import { rollD20 } from './dice.js';
import { ABILITIES } from '../data/abilities.js';

export class Character {
    constructor(name, characterClass, playerId, position) {
        this.name = name;
        this.class = characterClass;
        this.playerId = playerId;
        this.position = position;
        
        // Initialize health to max health from class
        this.health = characterClass.healthPoints;
        
        // Track actions for the current turn
        this.hasMoved = false;
        this.hasAttacked = false;
        
        // Load abilities based on character class
        this.abilities = Object.values(ABILITIES)
            .filter(ability => ability.classRestriction === characterClass.name);
    }
    
    // Get all valid moves based on movement range and terrain
    getValidMoves(battlefield) {
        // If character has already moved this turn, return empty array
        if (this.hasMoved) {
            return [];
        }
        
        const validMoves = [];
        const moveRange = this.class.move;
        const startX = this.position.x;
        const startY = this.position.y;
        
        // Simple implementation: check all cells within a square range
        // A more sophisticated approach would use pathfinding for accurate movement costs
        for (let y = Math.max(0, startY - Math.floor(moveRange / 10)); y <= Math.min(battlefield.rows - 1, startY + Math.floor(moveRange / 10)); y++) {
            for (let x = Math.max(0, startX - Math.floor(moveRange / 10)); x <= Math.min(battlefield.cols - 1, startX + Math.floor(moveRange / 10)); x++) {
                // Skip current position
                if (x === startX && y === startY) continue;
                
                // Calculate Manhattan distance as a simple approximation
                const distance = Math.abs(x - startX) + Math.abs(y - startY);
                
                // Get movement cost for this terrain
                const moveCost = battlefield.getMovementCost(x, y);
                
                // If within movement range and not occupied by another character
                if (distance * 10 <= moveRange && !battlefield.isOccupied(x, y, [this])) {
                    validMoves.push({ x, y });
                }
            }
        }
        
        return validMoves;
    }
    
    // Get valid attack targets based on selected ability
    getValidAttacks(battlefield, characters, abilityIndex = 0) {
        // If character has already attacked this turn, return empty array
        if (this.hasAttacked) {
            return [];
        }
        
        // Default to first ability if not specified
        const ability = this.abilities[abilityIndex];
        if (!ability) return [];
        
        const validTargets = [];
        const attackRange = ability.range;
        const startX = this.position.x;
        const startY = this.position.y;
        
        // Check all cells within ability range
        for (let y = Math.max(0, startY - Math.floor(attackRange / 10)); y <= Math.min(battlefield.rows - 1, startY + Math.floor(attackRange / 10)); y++) {
            for (let x = Math.max(0, startX - Math.floor(attackRange / 10)); x <= Math.min(battlefield.cols - 1, startX + Math.floor(attackRange / 10)); x++) {
                // Calculate distance
                const distance = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2)) * 10;
                
                // If within range
                if (distance <= attackRange) {
                    // For area effect abilities, add the cell even if not occupied
                    if (ability.radius > 0) {
                        validTargets.push({ x, y });
                    } 
                    // For single target abilities, only add if occupied by an enemy
                    else {
                        const targetCharacter = characters.find(c => 
                            c.position.x === x && 
                            c.position.y === y && 
                            c.playerId !== this.playerId &&
                            c.health > 0
                        );
                        
                        if (targetCharacter) {
                            validTargets.push({ x, y, targetId: targetCharacter.id });
                        }
                    }
                }
            }
        }
        
        return validTargets;
    }
    
    // Move to a new position
    move(newPosition) {
        if (this.hasMoved) return false;
        
        this.position = { ...newPosition };
        this.hasMoved = true;
        return true;
    }
    
    // Perform an attack against a target
    attack(target, abilityIndex = 0) {
        if (this.hasAttacked) return false;
        
        const ability = this.abilities[abilityIndex];
        if (!ability) return false;
        
        // Calculate attack roll
        let attackModifier = this.class.attack;
        
        // Apply bonus if target is of the vulnerable class
        if (target.class.name === this.class.bonusAgainst) {
            attackModifier += this.class.bonusAmount;
        }
        
        const attackRoll = rollD20() + attackModifier;
        const baseDamage = ability.damage;
        let bonusDamage = 0;
        let saveRoll = 0;
        
        // Check if attack hits (meets or exceeds target's armor class)
        if (attackRoll >= target.class.armorCheck) {
            // Calculate base damage plus any bonuses
            let damage = baseDamage;
            
            // Apply bonus damage if applicable
            if (target.class.name === ability.bonusAgainst) {
                bonusDamage = ability.bonusAmount;
                damage += bonusDamage;
            }
            
            // Apply save if ability has save difficulty
            if (ability.saveDifficulty > 0) {
                saveRoll = rollD20() + target.class.save;
                if (saveRoll >= ability.saveDifficulty) {
                    // Success - half damage
                    damage = Math.floor(damage / 2);
                }
            }
            
            // Apply damage to target
            const oldHealth = target.health;
            target.health = Math.max(0, target.health - damage);
            
            return {
                hit: true,
                attackRoll,
                baseDamage,
                bonusDamage,
                damage: oldHealth - target.health,
                saveRoll,
                targetDied: target.health <= 0
            };
        } else {
            return {
                hit: false,
                attackRoll,
                baseDamage,
                bonusDamage: 0,
                damage: 0,
                saveRoll: 0,
                targetDied: false
            };
        }
    }
    
    // Check if character has completed all actions for this turn
    hasCompletedTurn() {
        return this.hasMoved && this.hasAttacked;
    }
    
    // Reset actions for a new turn
    resetActions() {
        this.hasMoved = false;
        this.hasAttacked = false;
    }
}