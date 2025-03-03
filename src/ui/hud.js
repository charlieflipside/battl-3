// Update all HUD elements based on the current game state
export function updateHUD(state) {
    updateTurnInfo(state);
    updateCharacterStats(state);
    updateActionButtons(state);
}

// Update the turn information display
function updateTurnInfo(state) {
    const turnInfo = document.getElementById('current-turn');
    const currentPlayer = state.players[state.currentPlayer];
    
    turnInfo.textContent = `Turn ${state.currentTurn + 1} - ${currentPlayer.name}'s Turn`;
    
    // Visual indicator for current player
    if (state.currentPlayer === 0) {
        turnInfo.style.color = '#ff0000'; // Red for player 1
    } else {
        turnInfo.style.color = '#0000ff'; // Blue for player 2
    }
}

// Update the character stats display
function updateCharacterStats(state) {
    const statsContainer = document.getElementById('character-stats');
    
    if (!state.selectedCharacter) {
        statsContainer.innerHTML = '<p>No character selected</p>';
        return;
    }
    
    const character = state.selectedCharacter;
    
    let html = `
        <p><strong>Name:</strong> ${character.name}</p>
        <p><strong>Class:</strong> ${character.class.name}</p>
        <p><strong>Health:</strong> ${character.health}/${character.class.healthPoints}</p>
        <p><strong>Position:</strong> (${character.position.x}, ${character.position.y})</p>
        <p><strong>Actions:</strong> `;
    
    if (character.hasMoved) {
        html += '<span style="color: #888;">Move (Used)</span> ';
    } else {
        html += '<span style="color:rgb(79, 126, 255);">Move (Available)</span> ';
    }
    
    if (character.hasAttacked) {
        html += '<span style="color: #888;">Attack (Used)</span>';
    } else {
        html += '<span style="color:rgb(65, 132, 255);">Attack (Available)</span>';
    }
    
    html += '</p><p><strong>Abilities:</strong></p><ul>';
    
    character.abilities.forEach(ability => {
        html += `<li>${ability.displayName} - Range: ${ability.range}, Damage: ${ability.damage}</li>`;
    });
    
    html += '</ul>';
    
    statsContainer.innerHTML = html;
}

// Update the action buttons based on the selected character and current phase
function updateActionButtons(state) {
    const moveBtn = document.getElementById('move-btn');
    const attackBtn = document.getElementById('attack-btn');
    const endTurnBtn = document.getElementById('end-turn-btn');
    
    // Disable all buttons if no character is selected
    if (!state.selectedCharacter) {
        moveBtn.disabled = true;
        attackBtn.disabled = true;
        return;
    }
    
    // Enable/disable move button
    moveBtn.disabled = state.selectedCharacter.hasMoved || 
                      state.selectedCharacter.playerId !== state.currentPlayer;
    
    // Enable/disable attack button
    attackBtn.disabled = state.selectedCharacter.hasAttacked || 
                        state.selectedCharacter.playerId !== state.currentPlayer;
    
    // Highlight the current action mode
    moveBtn.classList.remove('active');
    attackBtn.classList.remove('active');
    
    if (state.phase === 'move') {
        moveBtn.classList.add('active');
    } else if (state.phase === 'attack') {
        attackBtn.classList.add('active');
    }
}