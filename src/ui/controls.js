import { nextTurn, selectCharacter, gameState } from '../game.js';
import { AbilitySystem } from '../engine/abilities.js';

// Set up all the UI controls and event handlers
export function setupControls(state) {
    const canvas = document.getElementById('battlefield');
    const moveBtn = document.getElementById('move-btn');
    const attackBtn = document.getElementById('attack-btn');
    const endTurnBtn = document.getElementById('end-turn-btn');
    
    const abilitySystem = new AbilitySystem(state);
    
    // Canvas click handler
    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Convert click coordinates to grid cell
        const cell = state.battlefield.getCellFromPosition(x, y);
        if (!cell) return;
        
        handleCellClick(cell, state);
    });
    
    // Add right-click handler to exit modes
    canvas.addEventListener('contextmenu', (event) => {
        event.preventDefault(); // Prevent default context menu
        if (state.phase === 'attack' || state.phase === 'move') {
            state.phase = 'select';
            // Clear any highlights or previews
            state.battlefield.clearHighlights();
            state.battlefield.render();
        }
    });

    // Add keyboard handler for ESC key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (state.phase === 'attack' || state.phase === 'move') {
                state.phase = 'select';
                // Clear any highlights or previews
                state.battlefield.clearHighlights();
                state.battlefield.render();
            }
        }
    });
    
    // Move button click handler
    moveBtn.addEventListener('click', () => {
        if (!state.selectedCharacter) {
            alert('Select a character first');
            return;
        }
        
        if (state.selectedCharacter.hasMoved) {
            alert('Character has already moved this turn');
            return;
        }
        
        if (state.selectedCharacter.playerId !== state.currentPlayer) {
            alert('Not your character');
            return;
        }
        
        state.phase = 'move';
    });
    
    // Attack button click handler
    attackBtn.addEventListener('click', () => {
        if (!state.selectedCharacter) {
            alert('Select a character first');
            return;
        }
        
        if (state.selectedCharacter.hasAttacked) {
            alert('Character has already attacked this turn');
            return;
        }
        
        if (state.selectedCharacter.playerId !== state.currentPlayer) {
            alert('Not your character');
            return;
        }
        
        state.phase = 'attack';
    });
    
    // End turn button click handler
    endTurnBtn.addEventListener('click', () => {
        nextTurn();
    });
}

// Handle clicks on battlefield cells
function handleCellClick(cell, state) {
    // Phase 1: Select a character
    if (state.phase === 'select') {
        // Find a character at the clicked cell
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
        
        // Check if the move is valid
        const validMoves = state.selectedCharacter.getValidMoves(state.battlefield);
        const isValidMove = validMoves.some(move => move.x === cell.x && move.y === cell.y);
        
        if (isValidMove) {
            state.selectedCharacter.move(cell);
            state.phase = 'select';
            updateCharacterInfo(state.selectedCharacter);
        }
    }
    // Phase 3: Attack with the selected character
    else if (state.phase === 'attack') {
        if (!state.selectedCharacter) return;
        
        // Get valid attack targets
        const validAttacks = state.selectedCharacter.getValidAttacks(
            state.battlefield, 
            state.characters
        );
        
        const isValidTarget = validAttacks.some(attack => attack.x === cell.x && attack.y === cell.y);
        
        if (isValidTarget) {
            // Find the target character
            const targetCharacter = state.characters.find(c => 
                c.position.x === cell.x && 
                c.position.y === cell.y &&
                c.health > 0
            );
            
            if (targetCharacter) {
                const result = state.selectedCharacter.attack(targetCharacter);
                displayCombatResult(result, targetCharacter);
                
                state.phase = 'select';
                updateCharacterInfo(state.selectedCharacter);
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
    
    let html = `
        <p><strong>Name:</strong> ${character.name}</p>
        <p><strong>Class:</strong> ${character.class.name}</p>
        <p><strong>Health:</strong> ${character.health}/${character.class.healthPoints}</p>
        <p><strong>Position:</strong> (${character.position.x}, ${character.position.y})</p>
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