// Character class definitions based on the Battl-3 document
export const CLASSES = {
    MAGE: {
        name: 'Mage',
        move: 30,
        attack: 8,
        bonusAgainst: 'Fighter',
        bonusAmount: 3,
        armorCheck: 15,
        healthPoints: 20,
        save: 6,
        description: 'Mages are spellcasters who excel at ranged magical attacks',
        iconColor: '#8a2be2' // Deep purple
    },
    
    FIGHTER: {
        name: 'Fighter',
        move: 60,
        attack: 5,
        bonusAgainst: 'Ranger',
        bonusAmount: 3,
        armorCheck: 18,
        healthPoints: 30,
        save: 3,
        description: 'Fighters are melee specialists with high health, armor, and mobility',
        iconColor: '#b22222' // Firebrick red
    },
    
    RANGER: {
        name: 'Ranger',
        move: 30,
        attack: 4,
        bonusAgainst: 'Mage',
        bonusAmount: 3,
        armorCheck: 18,
        healthPoints: 25,
        save: 5,
        description: 'Rangers are skilled with bows and excel at long-range physical attacks',
        iconColor: '#228b22' // Forest green
    }
};