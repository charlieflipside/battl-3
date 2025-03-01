import { ABILITIES } from '../data/abilities.js';

// This class handles the execution of abilities in the game
export class AbilitySystem {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    // Execute an ability from a character to a target position
    executeAbility(character, abilityName, targetPos) {
        const ability = ABILITIES[abilityName];
        
        if (!ability) {
            console.error(`Ability ${abilityName} not found`);
            return false;
        }
        
        // Check if character can use this ability (class restriction)
        if (ability.classRestriction !== character.class.name) {
            console.error(`Character class ${character.class.name} cannot use ${abilityName}`);
            return false;
        }
        
        // Check if character has already used their action
        if (ability.costStandard && character.hasAttacked) {
            console.error('Character has already used their standard action');
            return false;
        }
        
        // Check if character has already moved (for abilities that cost move)
        if (ability.costMove && character.hasMoved) {
            console.error('Character has already moved this turn');
            return false;
        }
        
        // Check range
        const distance = this.calculateDistance(character.position, targetPos);
        if (distance > ability.range) {
            console.error(`Target is out of range (${distance} > ${ability.range})`);
            return false;
        }
        
        // For area effect abilities
        if (ability.radius > 0) {
            return this.executeAreaAbility(character, ability, targetPos);
        } 
        // For single target abilities
        else {
            const target = this.findCharacterAtPosition(targetPos);
            if (!target) {
                console.error('No target found at position');
                return false;
            }
            
            return this.executeSingleTargetAbility(character, ability, target);
        }
    }
    
    // Execute an area effect ability
    executeAreaAbility(character, ability, centerPos) {
        const targets = this.findTargetsInArea(centerPos, ability.radius);
        let hitAny = false;
        
        for (const target of targets) {
            // Skip allies for offensive abilities (simple logic, could be more complex)
            if (target.playerId === character.playerId) {
                continue;
            }
            
            const result = this.resolveDamage(character, ability, target);
            if (result.hit) {
                hitAny = true;
            }
        }
        
        // Mark appropriate actions as used
        if (ability.costStandard) {
            character.hasAttacked = true;
        }
        
        if (ability.costMove) {
            character.hasMoved = true;
        }
        
        return hitAny;
    }
    
    // Execute a single target ability
    executeSingleTargetAbility(character, ability, target) {
        const result = this.resolveDamage(character, ability, target);
        
        // Mark appropriate actions as used
        if (ability.costStandard) {
            character.hasAttacked = true;
        }
        
        if (ability.costMove) {
            character.hasMoved = true;
        }
        
        return result;
    }
    
    // Calculate damage and apply it to the target
    resolveDamage(attacker, ability, target) {
        // This would call into the character's attack method
        return attacker.attack(target, attacker.abilities.indexOf(ability));
    }
    
    // Helper function to calculate distance between two positions
    calculateDistance(pos1, pos2) {
        return Math.sqrt(
            Math.pow(pos2.x - pos1.x, 2) + 
            Math.pow(pos2.y - pos1.y, 2)
        ) * 10; // Scale to match the game's distance units
    }
    
    // Find a character at a specific position
    findCharacterAtPosition(pos) {
        return this.gameState.characters.find(c => 
            c.position.x === pos.x && 
            c.position.y === pos.y &&
            c.health > 0
        );
    }
    
    // Find all characters within a radius of a position
    findTargetsInArea(centerPos, radius) {
        return this.gameState.characters.filter(c => {
            const distance = this.calculateDistance(centerPos, c.position);
            return distance <= radius && c.health > 0;
        });
    }
}