// Ability definitions based on the Battl-3 document
export const ABILITIES = {
    // Mage abilities
    MISSILE: {
        name: 'Missile',
        displayName: 'Magic Missile',
        classRestriction: 'Mage',
        costMove: false,
        costStandard: true,
        range: 30,
        radius: 0,
        damage: 3,
        bonusAgainst: 'Fighter',
        bonusAmount: 1,
        saveDifficulty: 0,
        description: 'A simple magical projectile that strikes with unerring accuracy',
        icon: '✨'
    },
    
    FIREBLAST: {
        name: 'Fireblast',
        displayName: 'Fire Blast',
        classRestriction: 'Mage',
        costMove: true,
        costStandard: true,
        range: 60,
        radius: 15,
        damage: 6,
        bonusAgainst: 'Fighter',
        bonusAmount: 2,
        saveDifficulty: 15,
        description: 'A powerful explosion of fire that damages all enemies in an area',
        icon: '🔥'
    },
    
    // Fighter abilities - melee range (5 foot squares)
    SLASH: {
        name: 'Slash',
        displayName: 'Slash',
        classRestriction: 'Fighter',
        costMove: false,
        costStandard: true,
        range: 5,  // 5 foot squares
        radius: 0,
        damage: 5,
        bonusAgainst: 'Ranger',
        bonusAmount: 0,
        saveDifficulty: 0,
        description: 'A quick strike with a melee weapon (5 foot reach)',
        icon: '⚔️'
    },
    
    BASH: {
        name: 'Bash',
        displayName: 'Shield Bash',
        classRestriction: 'Fighter',
        costMove: true,
        costStandard: true,
        range: 5,  // 5 foot squares
        radius: 0,
        damage: 10,
        bonusAgainst: 'Ranger',
        bonusAmount: 0,
        saveDifficulty: 0,
        description: 'A powerful blow with a shield that deals heavy damage (5 foot reach)',
        icon: '🛡️'
    },
    
    // Ranger abilities
    SHOOT: {
        name: 'Shoot',
        displayName: 'Quick Shot',
        classRestriction: 'Ranger',
        costMove: false,
        costStandard: true,
        range: 60,
        radius: 0,
        damage: 4,
        bonusAgainst: 'Mage',
        bonusAmount: 2,
        saveDifficulty: 0,
        description: 'A fast arrow shot that deals moderate damage',
        icon: '🏹'
    },
    
    SNIPE: {
        name: 'Snipe',
        displayName: 'Aimed Shot',
        classRestriction: 'Ranger',
        costMove: true,
        costStandard: true,
        range: 60,
        radius: 0,
        damage: 8,
        bonusAgainst: 'Mage',
        bonusAmount: 2,
        saveDifficulty: 15,
        description: 'A carefully aimed shot that deals heavy damage but allows a saving throw',
        icon: '🎯'
    }
};