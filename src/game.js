import { Battlefield } from './engine/battlefield.js';
import { Character } from './engine/character.js';
import { CLASSES } from './data/classes.js';
import { MAPS } from './data/maps.js';
import { setupControls } from './ui/controls.js';
import { updateHUD } from './ui/hud.js';
import { GameState } from './api/gameState.js';
import { createAction } from './api/actions.js';
import { generateAction } from './api/aiStrategy.js';

// Game state
const state = {
    battlefield: null,
    characters: [],
    selectedCharacter: null,
    currentTurn: 0,
    phase: 'select', // 'select', 'move', or 'attack'
    players: [
        { id: 0, name: 'Player 1' },
        { id: 1, name: 'Player 2' }
    ],
    currentPlayer: 0,
    // AI settings
    useAIForPlayer2: true,
    aiDifficulty: 2,
    aiThinking: false,
    // Game setup
    selectedMap: 'DEFAULT',
    player1Team: {
        MAGE: 1,
        FIGHTER: 1,
        RANGER: 1
    },
    player2Team: {
        MAGE: 1,
        FIGHTER: 1,
        RANGER: 1
    },
    // Game over flag
    gameOver: false
};

// Name pools for each class - ensure 6 names per class
// Different name sets for each player to ensure uniqueness
const PLAYER_1_NAMES = {
    MAGE: ['Arcana', 'Merlin', 'Sage', 'Spellweaver', 'Mystic', 'Eldritch'],
    FIGHTER: ['Valor', 'Ironclad', 'Bastion', 'Sentinel', 'Vanguard', 'Shield'],
    RANGER: ['Hawk', 'Shadow', 'Scout', 'Hunter', 'Tracker', 'Strider']
};

const PLAYER_2_NAMES = {
    MAGE: ['Phoenix', 'Frost', 'Tempest', 'Rune', 'Eclipse', 'Void'],
    FIGHTER: ['Titan', 'Warden', 'Juggernaut', 'Paladin', 'Berserker', 'Knight'],
    RANGER: ['Falcon', 'Phantom', 'Stalker', 'Archer', 'Sniper', 'Ranger']
};

// Color codes for each player (Player 1 is red, Player 2 is blue)
const PLAYER_COLORS = ['🔴', '🔵'];

// Class-specific icons
const CLASS_ICONS = {
    MAGE: '✨',
    FIGHTER: '⚔️',
    RANGER: '🏹'
};

// Initialize the game
function init() {
    // Setup game setup modal
    setupGameSetup();
    
    // Log initialization
    console.log("Game initialized");
}

// Setup game setup modal
function setupGameSetup() {
    const modal = document.getElementById('game-setup-modal');
    const startGameBtn = document.getElementById('start-game-btn');
    
    // Setup map selection
    setupMapSelection();
    
    // Setup team selection
    setupTeamSelection();
    
    // Start game button
    startGameBtn.addEventListener('click', () => {
        console.log("Start game button clicked");
        modal.style.display = 'none';
        startGame();
    });
    
    // Log setup completion
    console.log("Game setup modal initialized");
}

// Setup map selection
function setupMapSelection() {
    const mapRadios = document.querySelectorAll('input[name="map-select"]');
    const mapPreviewCanvas = document.getElementById('map-preview-canvas');
    const mapDescription = document.getElementById('map-description');
    
    console.log("Map selection setup started");
    
    // Update preview when map selection changes
    mapRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            console.log("Map selected:", e.target.value);
            state.selectedMap = e.target.value;
            updateMapPreview();
        });
    });
    
    // Initial preview
    updateMapPreview();
    
    // Update map preview
    function updateMapPreview() {
        console.log("Updating map preview for:", state.selectedMap);
        const selectedMap = MAPS[state.selectedMap];
        
        if (!selectedMap) {
            console.error("Selected map not found:", state.selectedMap);
            return;
        }
        
        // Get canvas context
        const ctx = mapPreviewCanvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, mapPreviewCanvas.width, mapPreviewCanvas.height);
        
        // Calculate cell size to fit the canvas
        const rows = selectedMap.grid.length;
        const cols = selectedMap.grid[0].length;
        const cellSize = Math.min(
            mapPreviewCanvas.width / cols,
            mapPreviewCanvas.height / rows
        );
        
        console.log("Drawing map grid:", rows, "x", cols, "cellSize:", cellSize);
        
        // Define terrain colors as fallbacks
        const terrainColors = {
            0: '#7ec850', // Grass - green
            1: '#4a90e2', // Water - blue
            2: '#8b572a', // Mountain - brown
            3: '#2d9d5c'  // Forest - dark green
        };
        
        // Define terrain image paths
        const terrainImages = {
            0: './src/assets/images/terrain/grass.png',
            1: './src/assets/images/terrain/water.png',
            2: './src/assets/images/terrain/mountain.png',
            3: './src/assets/images/terrain/forest.png'
        };
        
        // Preload terrain images
        const images = {};
        let loadedImages = 0;
        const totalImages = Object.keys(terrainImages).length;
        
        // Function to draw the map once all images are loaded
        function drawMap() {
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const terrainType = selectedMap.grid[y][x];
                    
                    if (images[terrainType]) {
                        // Draw terrain image
                        ctx.drawImage(
                            images[terrainType],
                            x * cellSize,
                            y * cellSize,
                            cellSize,
                            cellSize
                        );
                    } else {
                        // Fallback to color if image not available
                        ctx.fillStyle = terrainColors[terrainType] || '#cccccc';
                        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                    }
                    
                    // Draw cell border
                    ctx.strokeStyle = '#333333';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        }
        
        // Load all terrain images
        Object.entries(terrainImages).forEach(([type, src]) => {
            const img = new Image();
            img.onload = () => {
                images[type] = img;
                loadedImages++;
                
                // Draw the map once all images are loaded
                if (loadedImages === totalImages) {
                    drawMap();
                }
            };
            img.onerror = () => {
                console.error(`Failed to load terrain image: ${src}`);
                loadedImages++;
                
                // Draw the map once all images are loaded (even if some failed)
                if (loadedImages === totalImages) {
                    drawMap();
                }
            };
            img.src = src;
        });
        
        // Draw with fallback colors immediately (will be overwritten by images when loaded)
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const terrainType = selectedMap.grid[y][x];
                
                // Draw with fallback color
                ctx.fillStyle = terrainColors[terrainType] || '#cccccc';
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                
                // Draw cell border
                ctx.strokeStyle = '#333333';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
        
        // Update description
        if (mapDescription) {
            mapDescription.textContent = selectedMap.description;
        }
    }
}

// Setup team selection
function setupTeamSelection() {
    const counterBtns = document.querySelectorAll('.counter-btn');
    const totalSelected = document.getElementById('total-selected');
    const startGameBtn = document.getElementById('start-game-btn');
    
    console.log("Team selection setup started", counterBtns.length);
    
    // Update counters when buttons are clicked
    counterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default button behavior
            
            const action = btn.classList.contains('plus') ? 1 : -1;
            const characterClass = btn.dataset.class;
            const counterId = characterClass.toLowerCase() + '-counter';
            const counter = document.getElementById(counterId);
            
            console.log("Counter button clicked:", characterClass, action, counter);
            
            if (!counter) {
                console.error("Counter element not found:", counterId);
                return;
            }
            
            // Update count
            let currentCount = parseInt(counter.textContent);
            let newCount = currentCount + action;
            
            // Enforce limits (0-3)
            newCount = Math.max(0, Math.min(3, newCount));
            
            // Update counter display
            counter.textContent = newCount;
            
            // Update state
            state.player1Team[characterClass] = newCount;
            
            console.log("Updated team composition:", state.player1Team);
            
            // Update total and validate
            updateTeamTotal();
        });
    });
    
    // Update team total and validate
    function updateTeamTotal() {
        const total = Object.values(state.player1Team).reduce((sum, count) => sum + count, 0);
        
        if (totalSelected) {
            totalSelected.textContent = total;
        }
        
        console.log("Total selected:", total);
        
        // Enable/disable start button based on valid team (exactly 3 characters)
        if (startGameBtn) {
            startGameBtn.disabled = total !== 3;
        }
        
        // Update button styling based on count
        Object.entries(state.player1Team).forEach(([classKey, count]) => {
            const counterId = classKey.toLowerCase() + '-counter';
            const counter = document.getElementById(counterId);
            
            if (!counter) {
                console.error("Counter element not found for update:", counterId);
                return;
            }
            
            const minusBtn = counter.previousElementSibling;
            const plusBtn = counter.nextElementSibling;
            
            if (minusBtn) {
                // Disable minus button if count is 0
                minusBtn.disabled = count === 0;
            }
            
            if (plusBtn) {
                // Disable plus button if count is 3 or total is 3 and this isn't being decreased
                plusBtn.disabled = count === 3 || (total === 3 && count < 3);
            }
        });
    }
    
    // Initial update
    updateTeamTotal();
}

// Start the game with selected options
function startGame() {
    console.log("Starting game with map:", state.selectedMap, "and team:", state.player1Team);
    
    try {
        // Reset game state
        state.gameOver = false;
        
        // Create battlefield with selected map
        const canvas = document.getElementById('battlefield');
        state.battlefield = new Battlefield(canvas, MAPS[state.selectedMap]);
        
        // Create characters for both players
        initializeCharacters();
        
        // Setup controls
        setupControls(state);
        
        // Setup AI controls
        setupAIControls();
        
        // Setup terrain hover info
        setupTerrainHover();
        
        // Start the game loop
        gameLoop();
        
        // Initial render
        updateHUD(state);
        render();
        
        console.log("Game started successfully");
    } catch (error) {
        console.error("Error starting game:", error);
    }
}

// Initialize characters for both players with random positions
function initializeCharacters() {
    // Clear existing characters
    state.characters = [];
    
    // Create characters for player 1
    const player1Characters = createTeamCharacters(0, state.player1Team);
    
    // Create characters for player 2
    const player2Characters = createTeamCharacters(1, state.player2Team);
    
    // Add all characters to the state
    state.characters = [...player1Characters, ...player2Characters];
    
    console.log(`Initialized ${state.characters.length} characters`);
}

// Create team characters with random positions
function createTeamCharacters(playerId, teamComposition) {
    console.log(`Creating team for player ${playerId}:`, teamComposition);
    
    // Get spawn area for this player
    const spawnArea = getSpawnArea(playerId);
    
    // Track used positions to avoid overlaps
    const usedPositions = new Set();
    
    // Track used names to avoid duplicates
    const usedNames = new Set();
    
    // Create characters for each class in the team composition
    const characters = [];
    
    // Create a timestamp-based seed for better randomization
    const seed = Date.now() + Math.random() * 10000 + playerId;
    
    // Process each class type
    Object.entries(teamComposition).forEach(([classType, count]) => {
        // Skip if count is 0
        if (count <= 0) return;
        
        // Get class data
        const classData = CLASSES[classType];
        
        // Get name lists for this class
        const nameList = playerId === 0 ? 
            PLAYER_1_NAMES[classType] : 
            PLAYER_2_NAMES[classType];
        
        // Shuffle the name list using Fisher-Yates algorithm with our seed
        const shuffledNames = [...nameList];
        for (let i = shuffledNames.length - 1; i > 0; i--) {
            const j = Math.floor((Math.random() * seed) % (i + 1));
            [shuffledNames[i], shuffledNames[j]] = [shuffledNames[j], shuffledNames[i]];
        }
        
        // Create the specified number of characters for this class
        for (let i = 0; i < count; i++) {
            // Get a random valid position
            const position = getRandomValidPosition(spawnArea, usedPositions);
            
            if (!position) {
                console.error(`Could not find valid position for ${classType} ${i+1}`);
                continue;
            }
            
            // Get a unique name for this character
            let name;
            let nameIndex = 0;
            
            do {
                name = shuffledNames[nameIndex % shuffledNames.length];
                nameIndex++;
                
                // If we've tried all names, add a number suffix
                if (nameIndex > shuffledNames.length) {
                    name = `${name} ${Math.floor(Math.random() * 100)}`;
                }
            } while (usedNames.has(name));
            
            usedNames.add(name);
            
            // Create the character
            const character = new Character({
                id: `${classType.toLowerCase()}_${playerId}_${i}`,
                name: name,
                class: classData,
                playerId: playerId,
                position: position,
                health: classData.healthPoints
            });
            
            characters.push(character);
            console.log(`Created ${classData.name} "${name}" at position (${position.x}, ${position.y})`);
        }
    });
    
    return characters;
}

// Get spawn area for a player
function getSpawnArea(playerId) {
    const map = MAPS[state.selectedMap];
    const rows = map.grid.length;
    const cols = map.grid[0].length;
    
    // Player 1 spawns in the top third, Player 2 in the bottom third
    if (playerId === 0) {
        return {
            minRow: 0,
            maxRow: Math.floor(rows / 3),
            minCol: 0,
            maxCol: cols - 1
        };
    } else {
        return {
            minRow: Math.floor(rows * 2 / 3),
            maxRow: rows - 1,
            minCol: 0,
            maxCol: cols - 1
        };
    }
}

// Get a random valid position within a spawn area
function getRandomValidPosition(spawnArea, usedPositions) {
    const map = MAPS[state.selectedMap];
    const { minRow, maxRow, minCol, maxCol } = spawnArea;
    
    // Create a timestamp-based seed for better randomization
    const seed = Date.now() + Math.random() * 10000;
    
    // Get all valid positions in the spawn area
    const validPositions = [];
    
    for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
            // Check if position is valid (not water or mountain)
            const terrainType = map.grid[row][col];
            const isValidTerrain = terrainType !== 1 && terrainType !== 2; // Not water or mountain
            
            const position = { x: col, y: row };
            const positionKey = `${position.x},${position.y}`;
            
            // If position is valid and not used, add it to valid positions
            if (isValidTerrain && !usedPositions.has(positionKey)) {
                validPositions.push(position);
            }
        }
    }
    
    // If no valid positions, return null
    if (validPositions.length === 0) {
        console.error("No valid positions found in spawn area");
        return null;
    }
    
    // Shuffle the valid positions array using Fisher-Yates algorithm with our seed
    for (let i = validPositions.length - 1; i > 0; i--) {
        const j = Math.floor((Math.random() * seed) % (i + 1));
        [validPositions[i], validPositions[j]] = [validPositions[j], validPositions[i]];
    }
    
    // Take the first position from the shuffled array
    const chosenPosition = validPositions[0];
    const chosenPositionKey = `${chosenPosition.x},${chosenPosition.y}`;
    usedPositions.add(chosenPositionKey);
    
    console.log(`Spawning at position: (${chosenPosition.x}, ${chosenPosition.y})`);
    return chosenPosition;
}

// Setup terrain hover info
function setupTerrainHover() {
    const canvas = document.getElementById('battlefield');
    const terrainInfo = document.getElementById('terrain-info');
    let hoverTimeout;
    
    canvas.addEventListener('mousemove', (e) => {
        // Clear any existing timeout
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
        }
        
        // Get mouse position relative to canvas
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convert to grid coordinates
        const gridPos = state.battlefield.screenToGrid(x, y);
        
        // Set timeout for hover (300ms)
        hoverTimeout = setTimeout(() => {
            // Get terrain info
            const terrainType = state.battlefield.getTerrainAt(gridPos.x, gridPos.y);
            const terrainName = getTerrainName(terrainType);
            const movementCost = state.battlefield.map.movementCosts[terrainType] || 'N/A';
            
            // Check if there's a character at this position
            const character = state.characters.find(c => 
                c.position.x === gridPos.x && 
                c.position.y === gridPos.y &&
                c.health > 0
            );
            
            // Update tooltip content
            let tooltipContent = `
                <strong>${terrainName}</strong><br>
                Movement Cost: ${movementCost}x
            `;
            
            // Add character info if a character is present
            if (character) {
                const playerColor = character.playerId === 0 ? '#e74c3c' : '#3498db';
                tooltipContent += `
                    <hr style="margin: 5px 0; border-color: #ddd;">
                    <div style="color: ${playerColor}; font-weight: bold;">${character.name}</div>
                    <div>Health: ${character.health}/${character.class.healthPoints}</div>
                `;
            }
            
            // Position and show tooltip
            terrainInfo.innerHTML = tooltipContent;
            terrainInfo.style.left = `${e.clientX + 10}px`;
            terrainInfo.style.top = `${e.clientY + 10}px`;
            terrainInfo.style.display = 'block';
        }, 300);
    });
    
    // Hide tooltip when mouse leaves canvas
    canvas.addEventListener('mouseleave', () => {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
        }
        terrainInfo.style.display = 'none';
    });
    
    // Hide tooltip when mouse moves quickly
    canvas.addEventListener('mouseout', () => {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
        }
        terrainInfo.style.display = 'none';
    });
}

// Get terrain name from type
function getTerrainName(type) {
    switch (type) {
        case 0: return 'Grass';
        case 1: return 'Water';
        case 2: return 'Mountain';
        case 3: return 'Forest';
        default: return 'Unknown';
    }
}

// Setup AI controls
function setupAIControls() {
    const aiToggle = document.getElementById('ai-toggle');
    const aiDifficulty = document.getElementById('ai-difficulty');
    
    // Set initial values
    aiToggle.checked = state.useAIForPlayer2;
    aiDifficulty.value = state.aiDifficulty.toString();
    
    // Add event listeners
    aiToggle.addEventListener('change', (e) => {
        state.useAIForPlayer2 = e.target.checked;
        addLogEntry(`AI Player 2: ${state.useAIForPlayer2 ? 'Enabled' : 'Disabled'}`);
    });
    
    aiDifficulty.addEventListener('change', (e) => {
        state.aiDifficulty = parseInt(e.target.value);
        addLogEntry(`AI Difficulty: ${getDifficultyName(state.aiDifficulty)}`);
    });
}

// Get difficulty name from level
function getDifficultyName(level) {
    switch (level) {
        case 1: return 'Easy';
        case 2: return 'Medium';
        case 3: return 'Hard';
        default: return 'Unknown';
    }
}

// Add log entry to the game log
function addLogEntry(message, classes = []) {
    // Get the log entries container
    const logEntries = document.getElementById('log-entries');
    
    // Check if the container exists
    if (!logEntries) {
        console.error("Log entries container not found");
        return;
    }
    
    // Create a new log entry element
    const entry = document.createElement('div');
    
    // Add the base log-entry class
    entry.className = 'log-entry';
    
    // Add additional classes if provided
    if (Array.isArray(classes) && classes.length > 0) {
        classes.forEach(cls => {
            if (cls && typeof cls === 'string') {
                entry.classList.add(cls);
            }
        });
    }
    
    // Set the message content
    entry.textContent = message;
    
    // Add the entry to the log
    logEntries.appendChild(entry);
    
    // Scroll to the bottom to show the newest entry
    // Use requestAnimationFrame to ensure the DOM has updated
    requestAnimationFrame(() => {
        const battleLog = document.querySelector('.battle-log');
        if (battleLog) {
            battleLog.scrollTop = battleLog.scrollHeight;
        }
        logEntries.scrollTop = logEntries.scrollHeight;
    });
    
    console.log("Log entry added:", message);
    
    return entry;
}

// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Update game state
function update() {
    // Check for game over conditions
    if (checkGameOver()) {
        return;
    }
    
    // Run AI turn if it's player 2's turn and AI is enabled
    if (state.currentPlayer === 1 && state.useAIForPlayer2 && !state.aiThinking) {
        runAITurn();
    }
}

// Run AI turn
async function runAITurn() {
    // Set flag to prevent multiple AI turns running simultaneously
    state.aiThinking = true;
    
    try {
        // Safety check - limit the number of AI actions per turn
        let actionCounter = 0;
        const MAX_ACTIONS_PER_TURN = 10; // Reasonable limit for a turn
        
        // Add log entry
        addLogEntry(`AI Player 2 (${getDifficultyName(state.aiDifficulty)}) is thinking...`, ['ai']);
        
        // Small delay to show the AI is "thinking"
        await delay(500);
        
        // Get all living AI characters
        const aiCharacters = state.characters.filter(c => 
            c.playerId === 1 && c.health > 0
        );
        
        // Get all living enemy characters
        const enemies = state.characters.filter(c => 
            c.playerId === 0 && c.health > 0
        );
        
        if (enemies.length === 0) {
            console.log('No enemies found, ending AI turn');
            nextTurn();
            return;
        }
        
        // Track if any actions were taken
        let actionsTaken = false;
        
        // Process each AI character
        for (const character of aiCharacters) {
            console.log(`Processing character: ${character.name} (${character.class.name})`);
            
            // Skip characters that have completed their turn
            if (character.hasMoved && character.hasAttacked) {
                console.log(`Skipping ${character.name} - already acted`);
                continue;
            }
            
            // Special handling for Fighter class
            const isFighter = character.class && character.class.name === 'Fighter';
            
            // STEP 1 for Fighters: Always move first
            if (isFighter && !character.hasMoved) {
                const validMoves = character.getValidMoves(state.battlefield);
                
                if (validMoves.length > 0) {
                    console.log(`Fighter ${character.name} has ${validMoves.length} possible moves`);
                    
                    // Prioritize targets: Rangers > Mages > Others
                    const rangerEnemies = enemies.filter(e => e.class && e.class.name === 'Ranger');
                    const mageEnemies = enemies.filter(e => e.class && e.class.name === 'Mage');
                    const otherEnemies = enemies.filter(e => e.health > 0);
                    
                    // Choose target priority
                    let targetEnemy = null;
                    
                    if (rangerEnemies.length > 0) {
                        // Find closest ranger
                        targetEnemy = rangerEnemies.reduce((closest, current) => {
                            const distToCurrent = calculateDistance(character.position, current.position);
                            const distToClosest = calculateDistance(character.position, closest.position);
                            return distToCurrent < distToClosest ? current : closest;
                        }, rangerEnemies[0]);
                        
                        console.log(`Fighter targeting Ranger: ${targetEnemy.name}`);
                    } 
                    else if (mageEnemies.length > 0) {
                        // Find closest mage
                        targetEnemy = mageEnemies.reduce((closest, current) => {
                            const distToCurrent = calculateDistance(character.position, current.position);
                            const distToClosest = calculateDistance(character.position, closest.position);
                            return distToCurrent < distToClosest ? current : closest;
                        }, mageEnemies[0]);
                        
                        console.log(`Fighter targeting Mage: ${targetEnemy.name}`);
                    }
                    else if (otherEnemies.length > 0) {
                        // Find closest enemy
                        targetEnemy = otherEnemies.reduce((closest, current) => {
                            const distToCurrent = calculateDistance(character.position, current.position);
                            const distToClosest = calculateDistance(character.position, closest.position);
                            return distToCurrent < distToClosest ? current : closest;
                        }, otherEnemies[0]);
                        
                        console.log(`Fighter targeting other enemy: ${targetEnemy.name}`);
                    }
                    
                    if (targetEnemy) {
                        // Sort moves by which gets closest to target
                        validMoves.sort((a, b) => {
                            const distA = calculateDistance(a, targetEnemy.position);
                            const distB = calculateDistance(b, targetEnemy.position);
                            return distA - distB;
                        });
                        
                        // Choose best move (closest to target)
                        const bestMove = validMoves[0];
                        console.log(`Fighter moving to ${bestMove.x}, ${bestMove.y} to get closer to target`);
                        
                        // Execute move
                        const moveResult = character.move(bestMove, state.characters);
                        
                        if (moveResult) {
                            character.hasMoved = true;
                            logStandardAction('move', character, bestMove, null, true);
                            actionsTaken = true;
                            
                            // Update UI
                            updateHUD(state);
                            await delay(500);
                        }
                    }
                }
            }
            
            // Helper function to filter attack targets to ensure they're enemies
            function filterEnemyTargets(attacks, character, allCharacters) {
                return attacks.filter(attack => {
                    const targetCharacter = allCharacters.find(c => 
                        c.position.x === attack.x && 
                        c.position.y === attack.y
                    );
                    
                    return targetCharacter && targetCharacter.playerId !== character.playerId;
                });
            }
            
            // STEP 2: Try to attack if possible
            if (!character.hasAttacked) {
                // Check for special ability attacks first (ability index 1)
                let specialAttacks = character.getValidAttacks(state.battlefield, state.characters, 1);
                // Filter to ensure we only target enemies
                specialAttacks = filterEnemyTargets(specialAttacks, character, state.characters);
                console.log(`${character.name} valid special attacks:`, specialAttacks.length);
                
                // Check for regular attacks
                let regularAttacks = character.getValidAttacks(state.battlefield, state.characters, 0);
                // Filter to ensure we only target enemies
                regularAttacks = filterEnemyTargets(regularAttacks, character, state.characters);
                console.log(`${character.name} valid regular attacks:`, regularAttacks.length);
                
                // Prioritize special abilities if available and character hasn't moved
                // (since special abilities often cost movement)
                if (specialAttacks.length > 0 && !character.hasMoved) {
                    // Choose a target (prefer lower health)
                    specialAttacks.sort((a, b) => {
                        const targetA = state.characters.find(c => c.position.x === a.x && c.position.y === a.y);
                        const targetB = state.characters.find(c => c.position.x === b.x && c.position.y === b.y);
                        return (targetA ? targetA.health : 100) - (targetB ? targetB.health : 100);
                    });
                    
                    const target = specialAttacks[0];
                    const targetCharacter = state.characters.find(c => 
                        c.position.x === target.x && 
                        c.position.y === target.y && 
                        c.playerId !== character.playerId // Ensure we're only targeting enemies
                    );
                    
                    if (targetCharacter) {
                        console.log(`${character.name} using special ability on ${targetCharacter.name}`);
                        
                        // Perform special attack (ability index 1)
                        const result = character.attack(targetCharacter, 1);
                        
                        if (result) {
                            // Mark character as having attacked
                            character.hasAttacked = true;
                            
                            // Special abilities often cost movement too
                            if (character.abilities[1] && character.abilities[1].costMove) {
                                character.hasMoved = true;
                            }
                            
                            // Log the attack
                            logStandardAction('special', character, target, targetCharacter, true, character.abilities[1], result);
                            
                            actionsTaken = true;
                            actionCounter++; // Increment action counter
                            
                            // Check if we've reached the action limit
                            if (actionCounter >= MAX_ACTIONS_PER_TURN) {
                                console.log('AI reached maximum actions per turn, ending turn');
                                break;
                            }
                            
                            // Update UI
                            updateHUD(state);
                            await delay(500);
                            
                            // Skip to next character since this one has acted
                            continue;
                        }
                    }
                }
                
                // If no special attack was performed, try regular attack
                if (regularAttacks.length > 0) {
                    // Choose a target (prefer lower health)
                    regularAttacks.sort((a, b) => {
                        const targetA = state.characters.find(c => c.position.x === a.x && c.position.y === a.y);
                        const targetB = state.characters.find(c => c.position.x === b.x && c.position.y === b.y);
                        return (targetA ? targetA.health : 100) - (targetB ? targetB.health : 100);
                    });
                    
                    const target = regularAttacks[0];
                    const targetCharacter = state.characters.find(c => 
                        c.position.x === target.x && 
                        c.position.y === target.y && 
                        c.playerId !== character.playerId // Ensure we're only targeting enemies
                    );
                    
                    if (targetCharacter) {
                        console.log(`${character.name} attacking ${targetCharacter.name}`);
                        
                        // Perform regular attack
                        const result = character.attack(targetCharacter, 0);
                        
                        if (result) {
                            // Mark character as having attacked
                            character.hasAttacked = true;
                            
                            // Log the attack
                            logStandardAction('attack', character, target, targetCharacter, true, character.abilities[0], result);
                            
                            actionsTaken = true;
                            actionCounter++; // Increment action counter
                            
                            // Check if we've reached the action limit
                            if (actionCounter >= MAX_ACTIONS_PER_TURN) {
                                console.log('AI reached maximum actions per turn, ending turn');
                                break;
                            }
                            
                            // Update UI
                            updateHUD(state);
                            await delay(500);
                        }
                    }
                }
            }
            
            // STEP 3: Move non-fighters if they haven't moved yet
            if (!isFighter && !character.hasMoved) {
                const validMoves = character.getValidMoves(state.battlefield);
                console.log(`${character.name} valid moves:`, validMoves.length);
                
                if (validMoves.length > 0) {
                    // Special handling for Fighter class - always prioritize movement
                    const isFighter = character.class && character.class.name === 'Fighter';
                    
                    // Find closest enemy
                    let closestEnemy = enemies[0];
                    let closestDistance = calculateDistance(character.position, closestEnemy.position);
                    
                    for (let i = 1; i < enemies.length; i++) {
                        const distance = calculateDistance(character.position, enemies[i].position);
                        if (distance < closestDistance) {
                            closestDistance = distance;
                            closestEnemy = enemies[i];
                        }
                    }
                    
                    // For Fighters, prioritize Rangers, then Mages, then others
                    if (isFighter) {
                        const rangerEnemies = enemies.filter(e => e.class && e.class.name === 'Ranger');
                        const mageEnemies = enemies.filter(e => e.class && e.class.name === 'Mage');
                        
                        if (rangerEnemies.length > 0) {
                            // Prioritize Rangers for Fighters
                            closestEnemy = rangerEnemies.reduce((closest, current) => {
                                const closestDist = calculateDistance(character.position, closest.position);
                                const currentDist = calculateDistance(character.position, current.position);
                                return currentDist < closestDist ? current : closest;
                            }, rangerEnemies[0]);
                        } else if (mageEnemies.length > 0) {
                            // Then prioritize Mages
                            closestEnemy = mageEnemies.reduce((closest, current) => {
                                const closestDist = calculateDistance(character.position, closest.position);
                                const currentDist = calculateDistance(character.position, current.position);
                                return currentDist < closestDist ? current : closest;
                            }, mageEnemies[0]);
                        }
                        
                        console.log(`Fighter ${character.name} targeting ${closestEnemy.class ? closestEnemy.class.name : 'enemy'}`);
                    }
                    
                    // Sort moves by distance to closest enemy (prefer moves that get closer)
                    validMoves.sort((a, b) => {
                        const distA = calculateDistance(a, closestEnemy.position);
                        const distB = calculateDistance(b, closestEnemy.position);
                        return distA - distB;
                    });
                    
                    // Choose the best move
                    const bestMove = validMoves[0];
                    
                    console.log(`${character.name} moving to (${bestMove.x}, ${bestMove.y})`);
                    
                    // Store original position for logging
                    const originalPosition = { ...character.position };
                    
                    // Perform move
                    const moveResult = character.move(bestMove, state.characters);
                    
                    if (moveResult) {
                        // Mark character as having moved
                        character.hasMoved = true;
                        
                        // Log the move
                        logStandardAction('move', character, bestMove, null, true, null, null);
                        
                        actionsTaken = true;
                        actionCounter++; // Increment action counter
                        
                        // Check if we've reached the action limit
                        if (actionCounter >= MAX_ACTIONS_PER_TURN) {
                            console.log('AI reached maximum actions per turn, ending turn');
                            break;
                        }
                        
                        // Update UI
                        updateHUD(state);
                        await delay(500);
                        
                        // After moving, check if we can now attack
                        if (!character.hasAttacked) {
                            // Check for special ability attacks first
                            let newSpecialAttacks = character.getValidAttacks(state.battlefield, state.characters, 1);
                            // Filter to ensure we only target enemies
                            newSpecialAttacks = filterEnemyTargets(newSpecialAttacks, character, state.characters);
                            
                            // Check for regular attacks
                            let newRegularAttacks = character.getValidAttacks(state.battlefield, state.characters, 0);
                            // Filter to ensure we only target enemies
                            newRegularAttacks = filterEnemyTargets(newRegularAttacks, character, state.characters);
                            
                            // Prioritize special abilities if available
                            if (newSpecialAttacks.length > 0) {
                                // Choose a target (prefer lower health)
                                newSpecialAttacks.sort((a, b) => {
                                    const targetA = state.characters.find(c => c.position.x === a.x && c.position.y === a.y);
                                    const targetB = state.characters.find(c => c.position.x === b.x && c.position.y === b.y);
                                    return (targetA ? targetA.health : 100) - (targetB ? targetB.health : 100);
                                });
                                
                                const target = newSpecialAttacks[0];
                                const targetCharacter = state.characters.find(c => 
                                    c.position.x === target.x && 
                                    c.position.y === target.y && 
                                    c.playerId !== character.playerId // Ensure we're only targeting enemies
                                );
                                
                                if (targetCharacter) {
                                    console.log(`${character.name} using special ability on ${targetCharacter.name} after moving`);
                                    
                                    // Perform special attack
                                    const result = character.attack(targetCharacter, 1);
                                    
                                    if (result) {
                                        // Mark character as having attacked
                                        character.hasAttacked = true;
                                        
                                        // Log the attack
                                        logStandardAction('special', character, target, targetCharacter, true, character.abilities[1], result);
                                        
                                        actionsTaken = true;
                                        actionCounter++; // Increment action counter
                                        
                                        // Check if we've reached the action limit
                                        if (actionCounter >= MAX_ACTIONS_PER_TURN) {
                                            console.log('AI reached maximum actions per turn, ending turn');
                                            break;
                                        }
                                        
                                        // Update UI
                                        updateHUD(state);
                                        await delay(500);
                                        
                                        // Skip to next iteration since we've attacked
                                        continue;
                                    }
                                }
                            }
                            
                            // If no special attack was performed, try regular attack
                            if (newRegularAttacks.length > 0) {
                                // Choose a target (prefer lower health)
                                newRegularAttacks.sort((a, b) => {
                                    const targetA = state.characters.find(c => c.position.x === a.x && c.position.y === a.y);
                                    const targetB = state.characters.find(c => c.position.x === b.x && c.position.y === b.y);
                                    return (targetA ? targetA.health : 100) - (targetB ? targetB.health : 100);
                                });
                                
                                const target = newRegularAttacks[0];
                                const targetCharacter = state.characters.find(c => 
                                    c.position.x === target.x && 
                                    c.position.y === target.y && 
                                    c.playerId !== character.playerId // Ensure we're only targeting enemies
                                );
                                
                                if (targetCharacter) {
                                    console.log(`${character.name} attacking ${targetCharacter.name} after moving`);
                                    
                                    // Perform attack
                                    const result = character.attack(targetCharacter, 0);
                                    
                                    if (result) {
                                        // Mark character as having attacked
                                        character.hasAttacked = true;
                                        
                                        // Log the attack
                                        logStandardAction('attack', character, target, targetCharacter, true, character.abilities[0], result);
                                        
                                        actionsTaken = true;
                                        actionCounter++; // Increment action counter
                                        
                                        // Check if we've reached the action limit
                                        if (actionCounter >= MAX_ACTIONS_PER_TURN) {
                                            console.log('AI reached maximum actions per turn, ending turn');
                                            break;
                                        }
                                        
                                        // Update UI
                                        updateHUD(state);
                                        await delay(500);
                                    }
                                }
                            }
                        }
                    } else {
                        console.log(`Move failed for ${character.name} - position occupied`);
                    }
                }
            }
        }
        
        // End turn if all characters have acted or no actions were taken
        if (!actionsTaken || allCharactersActed(aiCharacters) || actionCounter >= MAX_ACTIONS_PER_TURN) {
            console.log('AI ending turn');
            
            // Get any AI character for logging
            const aiCharacter = aiCharacters.length > 0 ? aiCharacters[0] : { playerId: 1, name: 'AI' };
            
            // Log the end turn action
            logStandardAction('endTurn', aiCharacter, null, null, true);
            
            // End turn
            nextTurn();
        }
    } finally {
        // Always reset AI thinking flag, even if there's an error
        state.aiThinking = false;
    }
}

// Check if all characters have acted
function allCharactersActed(characters) {
    return characters.every(c => (c.hasMoved && c.hasAttacked) || c.health <= 0);
}

// Calculate distance between two positions
function calculateDistance(pos1, pos2) {
    return Math.sqrt(
        Math.pow(pos1.x - pos2.x, 2) + 
        Math.pow(pos1.y - pos2.y, 2)
    );
}

// Log AI action
function logAIAction(action, message) {
    let logMessage = '';
    
    switch (action.type) {
        case 'move':
            const character = state.characters.find(c => c.name === action.characterId);
            if (character) {
                logMessage = `AI moves ${character.name} to (${action.targetPosition.x}, ${action.targetPosition.y})`;
            } else {
                logMessage = `AI moves character to (${action.targetPosition.x}, ${action.targetPosition.y})`;
                console.warn('Character not found:', action.characterId);
            }
            break;
            
        case 'attack':
            const attacker = state.characters.find(c => c.name === action.characterId);
            const target = state.characters.find(c => c.name === action.targetId);
            if (attacker && target) {
                logMessage = `AI attacks with ${attacker.name} against ${target.name}: ${message}`;
            } else {
                logMessage = `AI attack: ${message}`;
                console.warn('Character not found:', action.characterId, action.targetId);
            }
            break;
            
        case 'endTurn':
            logMessage = 'AI ends its turn';
            break;
            
        default:
            logMessage = `AI action: ${action.type} - ${message}`;
    }
    
    addLogEntry(logMessage, ['ai-action']);
}

// Convert current state to GameState format
function convertToGameState() {
    return new GameState({
        battlefield: {
            rows: state.battlefield.rows,
            cols: state.battlefield.cols,
            grid: state.battlefield.map.grid
        },
        characters: state.characters.map(c => ({
            id: c.name, // Use name as ID for consistency
            name: c.name,
            class: c.class.name,
            playerId: c.playerId,
            position: { ...c.position },
            health: c.health,
            hasMoved: c.hasMoved,
            hasAttacked: c.hasAttacked
        })),
        currentPlayer: state.currentPlayer,
        currentTurn: state.currentTurn
    });
}

// Update game state from GameState
function updateFromGameState(gameState) {
    // Update current player
    state.currentPlayer = gameState.currentPlayer;
    
    // Update current turn
    state.currentTurn = gameState.currentTurn;
    
    // Update characters
    gameState.characters.forEach(gsChar => {
        const character = state.characters.find(c => c.name === gsChar.id);
        if (character) {
            character.position = { ...gsChar.position };
            character.health = gsChar.health;
            character.hasMoved = gsChar.hasMoved;
            character.hasAttacked = gsChar.hasAttacked;
        }
    });
    
    // Reset phase and selected character
    state.phase = 'select';
    state.selectedCharacter = null;
    
    // Update UI
    updateHUD(state);
}

// Helper function for delays
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Render the game
function render() {
    // Clear the canvas
    state.battlefield.clear();
    
    // Draw the grid
    state.battlefield.drawGrid();
    
    // Draw characters
    state.characters.forEach(character => {
        state.battlefield.drawCharacter(character);
    });
    
    // Highlight valid moves if a character is selected
    if (state.selectedCharacter && state.phase === 'move') {
        const validMoves = state.selectedCharacter.getValidMoves(state.battlefield);
        state.battlefield.highlightCells(validMoves, 'move-highlight');
    }
    
    // Highlight valid attacks if in attack phase
    if (state.selectedCharacter && state.phase === 'attack') {
        // Get the current ability index from the UI
        const abilityIndex = document.getElementById('special-btn').classList.contains('active') ? 1 : 0;
        
        const validAttacks = state.selectedCharacter.getValidAttacks(
            state.battlefield, 
            state.characters,
            abilityIndex
        );
        state.battlefield.highlightCells(validAttacks, 'attack-highlight');
    }
    
    // Show "AI thinking" indicator if applicable
    if (state.currentPlayer === 1 && state.useAIForPlayer2 && state.aiThinking) {
        showAIThinkingIndicator();
    }
}

// Show AI thinking indicator
function showAIThinkingIndicator() {
    const ctx = state.battlefield.ctx;
    ctx.save();
    
    ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
    ctx.fillRect(0, 0, state.battlefield.canvas.width, state.battlefield.canvas.height);
    
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
        'AI is thinking...', 
        state.battlefield.canvas.width / 2, 
        state.battlefield.canvas.height / 2
    );
    
    ctx.restore();
}

// Check if the game is over
function checkGameOver() {
    // If game is already over, don't check again or add more logs
    if (state.gameOver) {
        return true;
    }
    
    // Check if all characters of a player are defeated
    const player1Characters = state.characters.filter(c => c.playerId === 0 && c.health > 0);
    const player2Characters = state.characters.filter(c => c.playerId === 1 && c.health > 0);
    
    let gameIsOver = false;
    
    if (player1Characters.length === 0) {
        // Player 2 wins - only log once
        addLogEntry('🏆 Game Over: Player 2 Wins! 🏆', ['turn-change']);
        gameIsOver = true;
        
        // Disable game loop updates
        state.gameOver = true;
        
        // Stop AI thinking if it was in progress
        state.aiThinking = false;
        
        // Disable all controls
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.disabled = true;
        });
        
        console.log("GAME OVER: Player 2 wins");
    }
    
    if (player2Characters.length === 0) {
        // Player 1 wins - only log once
        addLogEntry('🏆 Game Over: Player 1 Wins! 🏆', ['turn-change']);
        gameIsOver = true;
        
        // Disable game loop updates
        state.gameOver = true;
        
        // Disable all controls
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.disabled = true;
        });
        
        console.log("GAME OVER: Player 1 wins");
    }
    
    return gameIsOver;
}

// Change turns
export function nextTurn() {
    // Reset all characters for the current player
    state.characters
        .filter(c => c.playerId === state.currentPlayer)
        .forEach(c => c.resetActions());
    
    // Switch to the next player
    state.currentPlayer = (state.currentPlayer + 1) % 2;
    
    // Update the turn display
    document.getElementById('current-turn').textContent = `Current Turn: Player ${state.currentPlayer + 1}`;
    
    // Log the turn change
    const playerEmoji = state.currentPlayer === 0 ? '🔴' : '🔵';
    addLogEntry(`${playerEmoji} Player ${state.currentPlayer + 1}'s turn`, ['turn-change']);
    
    // Reset the phase
    state.phase = 'select';
    state.selectedCharacter = null;
    
    // Update the UI
    updateHUD();
    
    // Always reset AI thinking state when changing turns
    state.aiThinking = false;
    
    // If it's player 2's turn and AI is enabled, run the AI turn
    if (state.currentPlayer === 1 && state.useAIForPlayer2) {
        document.body.classList.add('ai-turn');
        // Simple delay before running AI turn
        setTimeout(() => runAITurn(), 500);
    } else {
        document.body.classList.remove('ai-turn');
    }
}

// Export state and functions for use in other modules
export const gameState = state;
export const selectCharacter = (character) => {
    state.selectedCharacter = character;
    state.phase = 'select';
    updateHUD(state);
};

// Make logStandardAction available globally
window.logStandardAction = logStandardAction;

// Initialize the game when the DOM is loaded
window.addEventListener('DOMContentLoaded', init);

// Convert numeric coordinates to chess-style notation
function toGridCoord(x, y) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return `${letters[x]}${y + 1}`;
}

/**
 * Log a standard action with consistent formatting
 * @param {string} type - Action type ('move', 'attack', 'special', 'endTurn')
 * @param {Object} actor - Character performing the action
 * @param {Object} position - Target position for movement
 * @param {Object} target - Target character for attacks
 * @param {boolean} isAI - Whether this is an AI action
 * @param {Object} [ability] - Ability used (for attacks/special)
 * @param {Object} [result] - Attack result
 */
function logStandardAction(type, actor, position, target, isAI = false, ability = null, result = null) {
    // Default classes
    const classes = [];
    
    // Add the type as a class
    if (type) {
        classes.push(type);
    }
    
    // Add AI-specific classes if applicable
    if (isAI) {
        classes.push('ai');
    }
    
    // Get actor name (with fallback)
    let actorName = "Unknown";
    if (actor) {
        if (actor.name) {
            actorName = actor.name;
        } else if (typeof actor.playerId !== 'undefined') {
            actorName = `Player ${actor.playerId + 1}`;
        }
    }
    
    // Build the message based on action type
    let message = "";
    
    switch (type) {
        case 'move':
            // Format: "🚶 Character → A1"
            const moveCoord = position ? toGridCoord(position.x, position.y) : "?";
            message = `🚶 ${actorName} → ${moveCoord}`;
            break;
            
        case 'attack':
        case 'special':
            // Get the appropriate ability icon
            const abilityIcon = ability && ability.icon ? ability.icon : (type === 'attack' ? '⚔️' : '✨');
            
            // Determine if this is a mage targeting a space (for area effects)
            const isMageAreaAttack = actor && actor.class && actor.class.name === 'Mage' && type === 'special';
            const isFireBlast = ability && ability.displayName === 'Fire Blast';
            
            // Get target name or coordinate
            let targetText;
            if (target) {
                targetText = target.name;
            } else if (position && (isMageAreaAttack || isFireBlast)) {
                // For mage area attacks or fire blast without a specific target, show the coordinates
                const coordText = toGridCoord(position.x, position.y);
                targetText = isFireBlast ? `square ${coordText}` : `area ${coordText}`;
            } else {
                targetText = "target";
            }
            
            // Format: "⚔️ Character → Target (5💥)" or "⚔️ Character → Target (❌)"
            message = `${abilityIcon} ${actorName} → ${targetText}`;
            
            // Add hit/miss and damage information if available
            if (result) {
                if (result.hit) {
                    classes.push('hit');
                    
                    // More detailed damage information
                    let damageText = `${result.damage}💥`;
                    
                    // Add bonus damage info if applicable
                    if (result.bonusDamage > 0) {
                        damageText += ` (+${result.bonusDamage} bonus)`;
                    }
                    
                    // Add save info if applicable
                    if (ability && ability.saveDifficulty > 0) {
                        const saveSuccess = result.saveRoll >= ability.saveDifficulty;
                        if (saveSuccess) {
                            damageText += ` (Save ✓)`;
                        }
                    }
                    
                    message += ` (${damageText})`;
                    
                    // Add defeat indicator if target was defeated
                    if (target && target.health <= 0) {
                        message += ' ☠️ Defeated!';
                    } else if (target) {
                        // Show remaining health
                        message += ` [${target.health}/${target.class.healthPoints} HP]`;
                    }
                } else {
                    classes.push('miss');
                    message += ' (❌ Miss)';
                }
            }
            break;
            
        case 'endTurn':
            // Format: "🔄 Player 1 ends turn" or "🔄 AI ends turn"
            const turnIcon = isAI ? '🤖' : '👤';
            message = `🔄 ${turnIcon} ${isAI ? 'AI' : actorName} ends turn`;
            break;
            
        default:
            // Generic message for unknown action types
            message = `${actorName} performed ${type}`;
    }
    
    // Add the log entry
    addLogEntry(message, classes);
}

// Handle attack action
function handleAttackAction(isSpecial = false) {
    if (!state.selectedCharacter) {
        addLogEntry(`No character selected`, ['move-error']);
        return false;
    }
    
    if (state.selectedCharacter.hasAttacked) {
        addLogEntry(`Character has already attacked`, ['move-error']);
        return false;
    }
    
    // Enter attack phase
    state.phase = 'attack';
    
    // Set ability index based on isSpecial flag
    const abilityIndex = isSpecial ? 1 : 0;
    
    // Check if there are valid targets
    const validTargets = state.characters.filter(target => 
        target.playerId !== state.currentPlayer && 
        target.health > 0 &&
        state.selectedCharacter.canAttackTarget(target, abilityIndex)
    );
    
    if (validTargets.length === 0) {
        addLogEntry(`No valid targets in range`, ['move-error']);
        state.phase = 'select';
        return false;
    }
    
    // Update UI
    updateHUD(state);
    
    return true;
}

// Handle end turn action
function handleEndTurnAction() {
    // Log the action
    logStandardAction('endTurn', { playerId: state.currentPlayer, name: `Player ${state.currentPlayer + 1}` }, null, null, false);
    
    // End the turn
    endTurn();
    
    return true;
}

// Handle battlefield click
function handleBattlefieldClick(x, y) {
    // Convert screen coordinates to grid coordinates
    const gridPos = state.battlefield.screenToGrid(x, y);
    
    // Check if there's a character at the clicked position
    const clickedCharacter = state.characters.find(
        char => char.position.x === gridPos.x && char.position.y === gridPos.y && char.health > 0
    );
    
    // Handle based on current phase
    switch (state.phase) {
        case 'select':
            // If clicked on a character, select it
            if (clickedCharacter) {
                return selectCharacter(clickedCharacter);
            }
            break;
            
        case 'move':
            // If clicked on a valid move position, move there
            if (state.selectedCharacter) {
                const validMoves = state.selectedCharacter.getValidMoves(state.battlefield);
                const isValidMove = validMoves.some(move => move.x === gridPos.x && move.y === gridPos.y);
                
                if (isValidMove) {
                    // Log the action
                    logStandardAction('move', state.selectedCharacter, gridPos, null, false);
                    
                    // Move the character
                    state.selectedCharacter.move(gridPos.x, gridPos.y);
                    state.selectedCharacter.hasMoved = true;
                    
                    // Return to select phase
                    state.phase = 'select';
                    
                    // Update UI
                    updateHUD(state);
                    
                    return true;
                } else if (clickedCharacter && clickedCharacter.playerId === state.currentPlayer) {
                    // If clicked on another friendly character, select it instead
                    return selectCharacter(clickedCharacter);
                } else {
                    addLogEntry(`Invalid move position`, ['move-error']);
                }
            }
            break;
            
        case 'attack':
            // If clicked on a valid target, attack it
            if (state.selectedCharacter && clickedCharacter && clickedCharacter.playerId !== state.currentPlayer) {
                // Get the current ability index from the UI
                const abilityIndex = document.getElementById('special-btn').classList.contains('active') ? 1 : 0;
                
                // Check if the target is valid
                if (state.selectedCharacter.canAttackTarget(clickedCharacter, abilityIndex)) {
                    // Perform attack
                    const result = state.selectedCharacter.attack(clickedCharacter, abilityIndex);
                    
                    // Log the action
                    const ability = state.selectedCharacter.abilities[abilityIndex];
                    logStandardAction(abilityIndex === 0 ? 'attack' : 'special', state.selectedCharacter, null, clickedCharacter, false, ability, result);
                    
                    // Mark character as having attacked
                    state.selectedCharacter.hasAttacked = true;
                    
                    // Return to select phase
                    state.phase = 'select';
                    
                    // Update UI
                    updateHUD(state);
                    
                    return true;
                } else {
                    addLogEntry(`Target out of range`, ['move-error']);
                }
            } else if (clickedCharacter && clickedCharacter.playerId === state.currentPlayer) {
                // If clicked on another friendly character, select it instead
                return selectCharacter(clickedCharacter);
            } else {
                addLogEntry(`Invalid target`, ['move-error']);
            }
            break;
    }
    
    return false;
}