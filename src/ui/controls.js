import { nextTurn, selectCharacter, gameState } from '../game.js';
import { AbilitySystem } from '../engine/abilities.js';

// Convert numeric coordinates to chess-style notation
function toGridCoord(x, y) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return `${letters[x]}${y + 1}`;
}

// Add log entry to the game log
function addLogEntry(message, classes = []) {
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
    
    // Handle multiline messages
    if (message.includes('\n')) {
        message.split('\n').forEach((line, index) => {
            if (index > 0) {
                entry.appendChild(document.createElement('br'));
            }
            entry.appendChild(document.createTextNode(line));
        });
    } else {
        entry.textContent = message;
    }
    
    // Add the entry to the log
    logEntries.appendChild(entry);
    
    // Scroll to the bottom to show the newest entry
    logEntries.scrollTop = logEntries.scrollHeight;
    
    return entry;
}

// Set up all the UI controls and event handlers
export function setupControls(state) {
    const canvas = document.getElementById('battlefield');
    const moveBtn = document.getElementById('move-btn');
    const attackBtn = document.getElementById('attack-btn');
    const specialBtn = document.getElementById('special-btn');
    const doneBtn = document.getElementById('done-btn');
    const endTurnBtn = document.getElementById('end-turn-btn');
    
    const abilitySystem = new AbilitySystem(state);

    // Track original position for move reversion
    let originalPosition = null;
    let selectedAbilityIndex = 0; // Track which ability is selected (0 for standard, 1 for special)
    
    function updateButtonStates() {
        if (!state.selectedCharacter) {
            moveBtn.disabled = true;
            attackBtn.disabled = true;
            specialBtn.disabled = true;
            doneBtn.disabled = true;
            endTurnBtn.disabled = true;
            return;
        }

        const char = state.selectedCharacter;
        
        // Move button is disabled if:
        // - Character has moved and hit "Done"
        // - Character has used special ability
        // - Not current player's character
        moveBtn.disabled = char.hasMoved || 
                          (char.hasAttacked && char.abilities[selectedAbilityIndex]?.costMove) ||
                          char.playerId !== state.currentPlayer;

        // Attack button is disabled if:
        // - Character has attacked
        // - Not current player's character
        attackBtn.disabled = char.hasAttacked || 
                           char.playerId !== state.currentPlayer;

        // Special button is disabled if:
        // - Character has attacked
        // - Character has moved
        // - Not current player's character
        specialBtn.disabled = char.hasAttacked || 
                            char.hasMoved ||
                            char.playerId !== state.currentPlayer;

        doneBtn.disabled = !state.selectedCharacter;
        endTurnBtn.disabled = !state.selectedCharacter;

        // Highlight active mode
        moveBtn.classList.toggle('active', state.phase === 'move');
        attackBtn.classList.toggle('active', state.phase === 'attack' && selectedAbilityIndex === 0);
        specialBtn.classList.toggle('active', state.phase === 'attack' && selectedAbilityIndex === 1);

        // Update visual state
        if (state.selectedCharacter) {
            if (state.phase === 'move') {
                const validMoves = state.selectedCharacter.getValidMoves(state.battlefield);
                state.battlefield.highlightCells(validMoves, 'move-highlight');
            } else if (state.phase === 'attack') {
                const validAttacks = state.selectedCharacter.getValidAttacks(
                    state.battlefield, 
                    state.characters,
                    selectedAbilityIndex
                );
                state.battlefield.highlightCells(validAttacks, 'attack-highlight');
            }
        }
    }
    
    // Move button click handler
    moveBtn.addEventListener('click', () => {
        if (!state.selectedCharacter || state.selectedCharacter.hasMoved) return;
        
        if (state.selectedCharacter.playerId !== state.currentPlayer) {
            alert('Not your character');
            return;
        }

        if (!originalPosition) {
            originalPosition = {...state.selectedCharacter.position};
            state.selectedCharacter.isAtOriginalPosition = true;
        }
        
        state.phase = 'move';
        updateButtonStates();
    });
    
    // Attack button click handler
    attackBtn.addEventListener('click', () => {
        if (!state.selectedCharacter || state.selectedCharacter.hasAttacked) return;
        
        if (state.selectedCharacter.playerId !== state.currentPlayer) {
            alert('Not your character');
            return;
        }
        
        selectedAbilityIndex = 0; // Standard attack
        state.phase = 'attack';
        
        // Force a redraw to show attack highlights
        const validAttacks = state.selectedCharacter.getValidAttacks(
            state.battlefield, 
            state.characters,
            selectedAbilityIndex
        );
        state.battlefield.highlightCells(validAttacks, 'attack-highlight');
        
        updateButtonStates();
    });

    // Special button click handler
    specialBtn.addEventListener('click', () => {
        if (!state.selectedCharacter || state.selectedCharacter.hasAttacked || state.selectedCharacter.hasMoved) return;
        
        if (state.selectedCharacter.playerId !== state.currentPlayer) {
            alert('Not your character');
            return;
        }
        
        selectedAbilityIndex = 1; // Special attack
        state.phase = 'attack';
        
        // Force a redraw to show attack highlights
        const validAttacks = state.selectedCharacter.getValidAttacks(
            state.battlefield, 
            state.characters,
            selectedAbilityIndex
        );
        state.battlefield.highlightCells(validAttacks, 'attack-highlight');
        
        updateButtonStates();
    });

    // Done button click handler
    doneBtn.addEventListener('click', () => {
        if (!state.selectedCharacter) return;
        
        if (state.phase === 'move') {
            // Commit the move
            if (state.selectedCharacter.position.x !== originalPosition?.x || 
                state.selectedCharacter.position.y !== originalPosition?.y) {
                state.selectedCharacter.hasMoved = true;
                
                // Log the move using standardized format
                window.logStandardAction('move', state.selectedCharacter, state.selectedCharacter.position, null, false);
            }
        }
        
        state.phase = 'select';
        originalPosition = null;
        state.selectedCharacter.isAtOriginalPosition = false;
        updateButtonStates();
    });
    
    // End turn button click handler
    endTurnBtn.addEventListener('click', () => {
        // Log the end turn action
        window.logStandardAction('endTurn', { playerId: state.currentPlayer, name: `Player ${state.currentPlayer + 1}` }, null, null, false);
        
        originalPosition = null;
        nextTurn();
        
        // Disable controls during AI turn
        if (state.currentPlayer === 1 && state.useAIForPlayer2) {
            disableControlsDuringAITurn();
        }
        
        updateButtonStates();
    });

    // Disable controls during AI turn
    function disableControlsDuringAITurn() {
        moveBtn.disabled = true;
        attackBtn.disabled = true;
        specialBtn.disabled = true;
        doneBtn.disabled = true;
        endTurnBtn.disabled = true;
        
        // Add visual indicator
        document.body.classList.add('ai-turn');
    }

    // Re-enable controls after AI turn
    window.enableControlsAfterAITurn = function() {
        // Remove visual indicator
        document.body.classList.remove('ai-turn');
        updateButtonStates();
    };

    // Handle cell clicks
    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const cell = state.battlefield.getCellFromPosition(x, y);
        if (!cell) return;
        
        handleCellClick(cell, state, selectedAbilityIndex);
        updateButtonStates();
    });

    // Initial button state
    updateButtonStates();
}

// Handle clicks on battlefield cells
function handleCellClick(cell, state, selectedAbilityIndex) {
    // Phase 1: Select a character
    if (state.phase === 'select') {
        const character = state.characters.find(c => 
            c.position.x === cell.x && 
            c.position.y === cell.y &&
            c.health > 0
        );
        
        if (character) {
            selectCharacter(character);
            updateCharacterInfo(character);
        }
    }
    // Phase 2: Move the selected character
    else if (state.phase === 'move') {
        if (!state.selectedCharacter) return;
        
        const validMoves = state.selectedCharacter.getValidMoves(state.battlefield);
        const isValidMove = validMoves.some(move => move.x === cell.x && move.y === cell.y);
        
        if (isValidMove) {
            const oldPos = {...state.selectedCharacter.position};
            const moveResult = state.selectedCharacter.move(cell, state.characters);
            
            if (moveResult) {
                state.selectedCharacter.isAtOriginalPosition = 
                    cell.x === originalPosition?.x && cell.y === originalPosition?.y;
                updateCharacterInfo(state.selectedCharacter);
            } else {
                // If move failed, show a message
                addLogEntry('Cannot move to occupied position', ['move-error']);
            }
        }
    }
    // Phase 3: Attack with the selected character
    else if (state.phase === 'attack') {
        if (!state.selectedCharacter) return;
        
        const validAttacks = state.selectedCharacter.getValidAttacks(
            state.battlefield, 
            state.characters,
            selectedAbilityIndex
        );
        
        const isValidTarget = validAttacks.some(attack => attack.x === cell.x && attack.y === cell.y);
        
        if (isValidTarget) {
            const ability = state.selectedCharacter.abilities[selectedAbilityIndex];
            
            // For area effect abilities
            if (ability.radius > 0) {
                // Show the area effect animation
                showAttackEffect(cell, ability, state.battlefield);
                
                // Find all targets in radius
                const targets = state.characters.filter(c => {
                    if (c.health <= 0 || c.playerId === state.selectedCharacter.playerId) return false;
                    
                    const distance = Math.sqrt(
                        Math.pow(c.position.x - cell.x, 2) + 
                        Math.pow(c.position.y - cell.y, 2)
                    ) * 10;
                    
                    return distance <= ability.radius;
                });
                
                // Log the area attack header
                window.logStandardAction('special', state.selectedCharacter, cell, null, false, ability, null);
                
                // If no targets in area, still log it
                if (targets.length === 0) {
                    addLogEntry(`→ No targets in area`, ['attack', 'miss']);
                }
                
                // Apply damage to all targets
                let hitAny = false;
                
                for (const target of targets) {
                    const result = state.selectedCharacter.attack(target, selectedAbilityIndex);
                    displayCombatResult(result, target);
                    hitAny = hitAny || result.hit;
                    
                    // Log detailed result for each target using standardized format
                    window.logStandardAction('special', state.selectedCharacter, null, target, false, ability, result);
                }
                
                // Always mark ability as used, regardless of hits or targets
                state.selectedCharacter.hasAttacked = true;
                
                // If ability costs movement, mark that too
                if (ability.costMove) {
                    state.selectedCharacter.hasMoved = true;
                }
                
                // Return to select phase
                state.phase = 'select';
            } 
            // For single target abilities
            else {
                const target = state.characters.find(c => 
                    c.position.x === cell.x && 
                    c.position.y === cell.y &&
                    c.playerId !== state.selectedCharacter.playerId &&
                    c.health > 0
                );
                
                // Show the single target animation
                showAttackEffect(cell, ability, state.battlefield);
                
                if (target) {
                    const result = state.selectedCharacter.attack(target, selectedAbilityIndex);
                    displayCombatResult(result, target);
                    
                    // Log the attack using standardized format
                    window.logStandardAction('attack', state.selectedCharacter, null, target, false, ability, result);
                } else {
                    // Log missed attack when targeting an empty cell
                    window.logStandardAction('attack', state.selectedCharacter, null, null, false, ability, { hit: false });
                }
                
                // Always mark ability as used, regardless of hit or miss or target presence
                state.selectedCharacter.hasAttacked = true;
                
                // If ability costs movement, mark that too
                if (ability.costMove) {
                    state.selectedCharacter.hasMoved = true;
                }
                
                // Return to select phase
                state.phase = 'select';
            }
            
            updateCharacterInfo(state.selectedCharacter);
        }
    }
}

// Update the character info panel
function updateCharacterInfo(character) {
    const charStats = document.getElementById('character-stats');
    
    if (!character) {
        charStats.innerHTML = '<p>No character selected</p>';
        return;
    }
    
    const position = toGridCoord(character.position.x, character.position.y);
    
    let html = `
        <p><strong>Name:</strong> ${character.name}</p>
        <p><strong>Class:</strong> ${character.class.name}</p>
        <p><strong>Health:</strong> ${character.health}/${character.class.healthPoints}</p>
        <p><strong>Position:</strong> ${position}</p>
        <p><strong>Actions:</strong> `;
        
    if (character.hasMoved) {
        html += `<span class="status-used">Move (Used)</span> `;
    } else {
        html += `<span class="status-available">Move (Available)</span> `;
    }
    
    if (character.hasAttacked) {
        html += `<span class="status-used">Attack (Used)</span>`;
    } else {
        html += `<span class="status-available">Attack (Available)</span>`;
    }
    
    html += '</p><p><strong>Abilities:</strong></p><ul>';
    
    // Check if character has a special ability
    let hasSpecialAbility = false;
    
    character.abilities.forEach((ability, index) => {
        if (ability.costMove) {
            hasSpecialAbility = true;
            html += `<li class="ability-item"><span class="ability-name">${ability.displayName}</span> - Range: ${ability.range}, Damage: ${ability.damage} <span class="special-ability">(Special)</span></li>`;
        } else {
            html += `<li class="ability-item"><span class="ability-name">${ability.displayName}</span> - Range: ${ability.range}, Damage: ${ability.damage} (Standard)</li>`;
        }
    });
    
    html += '</ul>';
    
    // Add special note if character has a special ability
    if (hasSpecialAbility) {
        html += '<div class="special-note">Special Uses Move+Attack</div>';
    }
    
    charStats.innerHTML = html;
}

// Display combat result as a temporary message
function displayCombatResult(result, target) {
    if (!result) return;
    
    const message = document.createElement('div');
    message.className = 'combat-message';
    
    if (result.hit) {
        message.textContent = `Hit! ${result.damage} damage to ${target.name}`;
        message.style.color = '#ff0000';
        
        if (result.targetDied) {
            message.textContent += ' (Defeated)';
        }
    } else {
        message.textContent = 'Miss!';
        message.style.color = '#888888';
    }
    
    document.body.appendChild(message);
    
    // Position the message near the target
    const canvas = document.getElementById('battlefield');
    const rect = canvas.getBoundingClientRect();
    const cellSize = gameState.battlefield.cellSize;
    
    message.style.position = 'absolute';
    message.style.left = (rect.left + target.position.x * cellSize) + 'px';
    message.style.top = (rect.top + target.position.y * cellSize - 20) + 'px';
    
    // Remove after a short delay
    setTimeout(() => {
        message.remove();
    }, 2000);
}

// Display an attack animation effect
function showAttackEffect(cell, ability, battlefield) {
    const effect = document.createElement('div');
    effect.className = 'attack-effect';
    
    // Set the icon based on the ability
    effect.textContent = ability.icon;
    
    // Position the effect
    const canvas = document.getElementById('battlefield');
    const rect = canvas.getBoundingClientRect();
    const cellSize = battlefield.cellSize;
    
    effect.style.position = 'absolute';
    effect.style.transformOrigin = 'center center';
    
    // For area effects, make the effect larger
    if (ability.radius > 0) {
        const size = Math.ceil(ability.radius / 10) * 2 + 1; // Convert radius to grid squares
        const effectSize = cellSize * size;
        effect.style.width = effectSize + 'px';
        effect.style.height = effectSize + 'px';
        // Center on the target cell by offsetting by half the size difference
        effect.style.left = (rect.left + cell.x * cellSize - (effectSize - cellSize) / 2) + 'px';
        effect.style.top = (rect.top + cell.y * cellSize - (effectSize - cellSize) / 2) + 'px';
        effect.style.fontSize = '48px';
        effect.style.backgroundColor = 'rgba(255, 100, 0, 0.2)';
        effect.style.borderRadius = '50%';
    } else {
        // For single target, center in the cell
        effect.style.width = cellSize + 'px';
        effect.style.height = cellSize + 'px';
        effect.style.left = (rect.left + cell.x * cellSize) + 'px';
        effect.style.top = (rect.top + cell.y * cellSize) + 'px';
        effect.style.fontSize = '24px';
        effect.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    }
    
    effect.style.display = 'flex';
    effect.style.alignItems = 'center';
    effect.style.justifyContent = 'center';
    effect.style.animation = 'attack-flash 0.5s ease-out';
    
    document.body.appendChild(effect);
    
    // Remove after animation
    setTimeout(() => {
        effect.remove();
    }, 500);
}

// Add CSS animation to head
const style = document.createElement('style');
style.textContent = `
@keyframes attack-flash {
    0% {
        opacity: 1;
        transform: scale(0.8);
    }
    100% {
        opacity: 0;
        transform: scale(1.5);
    }
}

.attack-effect {
    pointer-events: none;
    z-index: 1000;
}
`;
document.head.appendChild(style);