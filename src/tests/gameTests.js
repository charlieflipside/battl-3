import { GameTester } from '../api/testing.js';

// Example test cases
const testCases = [{
    name: "Basic Move and Attack Sequence",
    operations: [
        {
            type: 'move',
            characterId: 'fighter1',
            targetPosition: { x: 3, y: 3 }
        },
        {
            type: 'attack',
            characterId: 'fighter1',
            targetId: 'enemy1'
        },
        {
            type: 'endTurn',
            characterId: 'fighter1'
        }
    ],
    expectedResults: [
        {
            success: true,
            state: {
                characters: [
                    { id: 'fighter1', position: { x: 3, y: 3 }, hasMoved: true }
                ]
            }
        },
        {
            success: true,
            state: {
                characters: [
                    { id: 'fighter1', hasAttacked: true }
                ]
            }
        },
        {
            success: true,
            state: {
                currentPlayer: 2
            }
        }
    ]
}];

// Run tests
async function runTests() {
    const tester = new GameTester();
    for (const test of testCases) {
        const passed = await tester.runTest(test);
        console.log(`Test "${test.name}": ${passed ? 'PASSED' : 'FAILED'}`);
    }
}

runTests(); 