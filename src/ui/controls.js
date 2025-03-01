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
    const entry = document.createElement('div');
    entry.className = 'log-entry ' + classes.join(' ');
    entry.textContent = message;
    logEntries.appendChild(entry);
    logEntries.scrollTop = logEntries.scrollHeight; // Auto-scroll to bottom
}

// Set up all the UI controls and event handlers
export function setupControls(state) {
    const canvas = document.getElementById('battlefield');
    const moveBtn = document.getElementById('move-btn');
    const attackBtn = document.getElementById('attack-btn');
    const doneBtn = document.getElementById('done-btn');
    const endTurnBtn = document.getElementById('end-turn-btn');
    
    const abilitySystem = new AbilitySystem(state);

    // Track original position for move reversion
    let originalPosition = null;
    
    function updateButtonStates() {
        // Disable/enable buttons based on state
        moveBtn.disabled = !state.selectedCharacter || 
                          (state.selectedCharacter.hasAttacked && !state.selectedCharacter.isAtOriginalPosition);
        attackBtn.disabled = !state.selectedCharacter || state.selectedCharacter.hasAttacked;
        doneBtn.disabled = !state.selectedCharacter;
        endTurnBtn.disabled = !state.selectedCharacter;

        // Highlight active mode
        moveBtn.classList.toggle('active', state.phase === 'move');
        attackBtn.classList.toggle('active', state.phase === 'attack');

        // Update visual state
        if (state.selectedCharacter) {
            if (state.phase === 'move') {
                const validMoves = state.selectedCharacter.getValidMoves(state.battlefield);
                state.battlefield.highlightCells(validMoves, 'move-highlight');
            } else if (state.phase === 'attack') {
                const validAttacks = state.selectedCharacter.getValidAttacks(state.battlefield, state.characters);
                state.battlefield.highlightCells(validAttacks, 'attack-highlight');
            }
        }
    }
    
    // Canvas click handler
    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const cell = state.battlefield.getCellFromPosition(x, y);
        if (!cell) return;
        
        handleCellClick(cell, state);
        updateButtonStates();
    });
    
    // Move button click handler
    moveBtn.addEventListener('click', () => {
        if (!state.selectedCharacter || 
            (state.selectedCharacter.hasAttacked && !state.selectedCharacter.isAtOriginalPosition)) {
            return;
        }
        
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
        if (!state.selectedCharacter || state.selectedCharacter.hasAttacked) {
            return;
        }
        
        if (state.selectedCharacter.playerId !== state.currentPlayer) {
            alert('Not your character');
            return;
        }
        
        state.phase = 'attack';
        updateButtonStates();
    });

    // Done button click handler
    doneBtn.addEventListener('click', () => {
        if (!state.selectedCharacter) return;
        
        // Commit the current state
        if (state.selectedCharacter.position.x !== originalPosition?.x || 
            state.selectedCharacter.position.y !== originalPosition?.y) {
            state.selectedCharacter.hasMoved = true;
            const newPos = toGridCoord(state.selectedCharacter.position.x, state.selectedCharacter.position.y);
            addLogEntry(
                `Player ${state.currentPlayer} ${state.selectedCharacter.class.name} moves to ${newPos}`,
                ['move']
            );
        }
        
        state.phase = 'select';
        originalPosition = null;
        state.selectedCharacter.isAtOriginalPosition = false;
        updateButtonStates();
    });
    
    // End turn button click handler
    endTurnBtn.addEventListener('click', () => {
        addLogEntry(`Player ${state.currentPlayer} ends their turn`, ['turn-end']);
        originalPosition = null;
        nextTurn();
        updateButtonStates();
    });

    // Handle attack
    canvas.addEventListener('click', (event) => {
        if (state.phase !== 'attack' || !state.selectedCharacter) return;
        
        const cell = state.battlefield.getCellFromPosition(event.offsetX, event.offsetY);
        if (!cell) return;
        
        const validAttacks = state.selectedCharacter.getValidAttacks(state.battlefield, state.characters);
        if (!validAttacks.some(pos => pos.x === cell.x && pos.y === cell.y)) return;
        
        const targetCharacter = state.characters.find(c => 
            c.position.x === cell.x && 
            c.position.y === cell.y && 
            c.playerId !== state.currentPlayer
        );
        
        if (!targetCharacter) return;
        
        // Get the ability being used
        const ability = state.selectedCharacter.abilities[0];  // Currently using first ability
        const result = state.selectedCharacter.attack(targetCharacter);
        
        // Update log with ability name
        const hitMiss = result.hit ? 'Hit!' : 'Miss!';
        const damageText = result.hit ? ` (${result.damage} damage)` : '';
        addLogEntry(`Player ${state.currentPlayer} ${state.selectedCharacter.class.name} uses ${ability.displayName} on ${targetCharacter.class.name} - ${hitMiss}${damageText}`);
        
        state.phase = 'select';
        updateButtonStates();
        state.battlefield.render();
    });

    // Initial button state
    updateButtonStates();
}

// Handle clicks on battlefield cells
function handleCellClick(cell, state) {
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
            state.selectedCharacter.move(cell);
            state.selectedCharacter.isAtOriginalPosition = 
                cell.x === originalPosition?.x && cell.y === originalPosition?.y;
            updateCharacterInfo(state.selectedCharacter);
            
            // Only log final moves when Done is clicked
        }
    }
    // Phase 3: Attack with the selected character
    else if (state.phase === 'attack') {
        if (!state.selectedCharacter) return;
        
        const validAttacks = state.selectedCharacter.getValidAttacks(
            state.battlefield, 
            state.characters
        );
        
        const isValidTarget = validAttacks.some(attack => attack.x === cell.x && attack.y === cell.y);
        
        if (isValidTarget) {
            const targetCharacter = state.characters.find(c => 
                c.position.x === cell.x && 
                c.position.y === cell.y &&
                c.health > 0
            );
            
            if (targetCharacter) {
                const result = state.selectedCharacter.attack(targetCharacter);
                displayCombatResult(result, targetCharacter);
                state.selectedCharacter.hasAttacked = true;
                updateCharacterInfo(state.selectedCharacter);
                
                // Log the attack result
                const hitMiss = result.hit ? 'Hit' : 'Miss';
                const damageText = result.hit ? ` for ${result.damage} damage` : '';
                const ability = state.selectedCharacter.abilities[0]; // Default to first ability for now
                addLogEntry(
                    `Player ${state.currentPlayer} ${state.selectedCharacter.class.name} uses ${ability.displayName} on ${targetCharacter.class.name} - ${hitMiss}${damageText}`,
                    ['attack', result.hit ? 'hit' : 'miss']
                );
            }
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
        html += '<span class="action-used">Move (Used)</span> ';
    } else {
        html += '<span class="action-available">Move (Available)</span> ';
    }
    
    if (character.hasAttacked) {
        html += '<span class="action-used">Attack (Used)</span>';
    } else {
        html += '<span class="action-available">Attack (Available)</span>';
    }
    
    html += '</p><p><strong>Abilities:</strong></p><ul>';
    
    character.abilities.forEach(ability => {
        html += `<li>${ability.displayName} - Range: ${ability.range}, Damage: ${ability.damage}</li>`;
    });
    
    html += '</ul>';
    
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