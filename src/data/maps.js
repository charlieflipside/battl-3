// Map definitions for the game
// Terrain Types:
// 0 - Grass (normal)
// 1 - Water (difficult)
// 2 - Mountain (very difficult)
// 3 - Forest (moderately difficult)

export const DEFAULT_MAP = {
    name: 'Basic Arena',
    description: 'A simple battlefield with various terrain types',
    grid: [
        [0, 0, 0, 0, 3, 3, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 3, 3, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 2, 0, 0],
        [0, 0, 0, 0, 0, 0, 2, 2, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 3, 3, 0, 0, 0, 0, 0, 0],
        [0, 3, 3, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    // Movement cost multipliers for each terrain type
    movementCosts: {
        0: 1,  // Grass - normal movement
        1: 2,  // Water - costs 2x movement
        2: 3,  // Mountain - costs 3x movement
        3: 1.5 // Forest - costs 1.5x movement
    }
};

export const MAPS = {
    DEFAULT: DEFAULT_MAP,
    
    SMALL_ARENA: {
        name: 'Small Arena',
        description: 'A compact battlefield for quick matches',
        grid: [
            [0, 0, 0, 0, 0, 0],
            [0, 0, 3, 3, 0, 0],
            [0, 3, 0, 0, 3, 0],
            [0, 3, 0, 0, 3, 0],
            [0, 0, 3, 3, 0, 0],
            [0, 0, 0, 0, 0, 0]
        ],
        movementCosts: {
            0: 1,
            3: 1.5
        }
    },
    
    RIVER_CROSSING: {
        name: 'River Crossing',
        description: 'A battlefield divided by a river with a few crossing points',
        grid: [
            [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
            [0, 0, 3, 0, 0, 1, 0, 0, 3, 0],
            [0, 3, 3, 0, 0, 1, 0, 3, 3, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 2, 2, 0, 0, 1, 0, 2, 2, 0],
            [0, 0, 0, 0, 0, 1, 0, 0, 0, 0]
        ],
        movementCosts: {
            0: 1,   // Grass
            1: 2,   // Water
            2: 3,   // Mountain
            3: 1.5  // Forest
        }
    }
};