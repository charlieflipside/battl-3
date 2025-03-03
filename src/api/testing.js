import { GameAPI } from './gameOperations.js';

/**
 * @typedef {import('./gameOperations.js').GameOperation} GameOperation
 * @typedef {import('./gameOperations.js').GameResult} GameResult
 */

/**
 * @typedef {Object} TestCase
 * @property {string} name - Test case name
 * @property {GameOperation[]} operations - Sequence of operations to perform
 * @property {Partial<GameResult>[]} expectedResults - Expected results for each operation
 */

export class GameTester {
    /**
     * @param {GameAPI} api - Game API instance
     */
    constructor(api = new GameAPI()) {
        this.api = api;
    }

    /**
     * Run a single test case
     * @param {TestCase} test - Test case to run
     * @returns {Promise<boolean>} - Whether test passed
     */
    async runTest(test) {
        console.group(`Running test: ${test.name}`);
        
        const results = await this.api.simulateGame(test.operations);
        
        let passed = true;
        results.forEach((result, i) => {
            const expected = test.expectedResults[i];
            const matches = this.compareResults(result, expected);
            
            console.log(`Operation ${i + 1}:`, 
                matches ? '✅ PASS' : '❌ FAIL',
                '\nExpected:', expected,
                '\nReceived:', result
            );
            
            if (!matches) passed = false;
        });
        
        console.groupEnd();
        return passed;
    }

    /**
     * Compare actual results with expected results
     * @private
     */
    compareResults(actual, expected) {
        return Object.entries(expected).every(([key, value]) => {
            if (typeof value === 'object') {
                return JSON.stringify(value) === JSON.stringify(actual[key]);
            }
            return value === actual[key];
        });
    }
} 