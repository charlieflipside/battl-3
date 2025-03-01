// Basic dice rolling function
export function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

// D20 roll function
export function rollD20() {
    return rollDie(20);
}

// Roll with advantage (roll twice, take higher)
export function rollWithAdvantage() {
    const roll1 = rollD20();
    const roll2 = rollD20();
    return Math.max(roll1, roll2);
}

// Roll with disadvantage (roll twice, take lower)
export function rollWithDisadvantage() {
    const roll1 = rollD20();
    const roll2 = rollD20();
    return Math.min(roll1, roll2);
}

// Roll multiple dice and sum them
export function rollMultiple(count, sides) {
    let sum = 0;
    for (let i = 0; i < count; i++) {
        sum += rollDie(sides);
    }
    return sum;
}