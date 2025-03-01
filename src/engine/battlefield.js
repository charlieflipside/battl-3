export class Battlefield {
    constructor(canvas, map) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.map = map;
        this.cellSize = 60; // Size of each grid cell in pixels
        
        // Calculate grid dimensions
        this.cols = map.grid[0].length;
        this.rows = map.grid.length;
        
        // Resize canvas to fit grid
        this.canvas.width = this.cols * this.cellSize;
        this.canvas.height = this.rows * this.cellSize;
        
        // Load tile images
        this.tileImages = {};
        this.loadTileImages();
    }
    
    // Load tile images for different terrain types
    loadTileImages() {
        const tileTypes = ['grass', 'water', 'mountain', 'forest'];
        
        // For now, we'll use colored rectangles instead of actual images
        // In a real implementation, you would load actual image files
        this.tileImages = {
            0: '#8fbc8f', // grass (easy) - light green
            1: '#4682b4', // water (hard) - steel blue
            2: '#a0522d', // mountain (very hard) - brown
            3: '#228b22'  // forest (medium) - forest green
        };
    }
    
    // Clear the canvas
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    // Draw the grid with terrain
    drawGrid() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cellValue = this.map.grid[row][col];
                const x = col * this.cellSize;
                const y = row * this.cellSize;
                
                // Draw the cell background based on terrain type
                this.ctx.fillStyle = this.tileImages[cellValue] || '#ffffff';
                this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
                
                // Draw grid lines
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);
                
                // Optionally add coordinates for debugging
                this.ctx.fillStyle = '#000000';
                this.ctx.font = '10px Arial';
                this.ctx.fillText(`${col},${row}`, x + 5, y + 15);
            }
        }
    }
    
    // Draw a character on the grid
    drawCharacter(character) {
        const x = character.position.x * this.cellSize;
        const y = character.position.y * this.cellSize;
        
        // Draw character circle (placeholder for character image)
        this.ctx.beginPath();
        this.ctx.arc(
            x + this.cellSize / 2,
            y + this.cellSize / 2,
            this.cellSize / 3,
            0,
            Math.PI * 2
        );
        
        // Different colors for different players
        if (character.playerId === 0) {
            this.ctx.fillStyle = '#ff0000'; // Red for player 1
        } else {
            this.ctx.fillStyle = '#0000ff'; // Blue for player 2
        }
        
        this.ctx.fill();
        this.ctx.stroke();
        
        // Draw character class indicator
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        let classIndicator = 'X';
        switch (character.class.name) {
            case 'Mage':
                classIndicator = 'M';
                break;
            case 'Fighter':
                classIndicator = 'F';
                break;
            case 'Ranger':
                classIndicator = 'R';
                break;
        }
        
        this.ctx.fillText(
            classIndicator,
            x + this.cellSize / 2,
            y + this.cellSize / 2
        );
        
        // Draw health bar
        const healthPercent = character.health / character.class.healthPoints;
        const barWidth = this.cellSize * 0.8;
        const barHeight = 6;
        
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(
            x + this.cellSize * 0.1,
            y + this.cellSize * 0.8,
            barWidth,
            barHeight
        );
        
        this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        this.ctx.fillRect(
            x + this.cellSize * 0.1,
            y + this.cellSize * 0.8,
            barWidth * healthPercent,
            barHeight
        );
    }
    
    // Highlight cells for valid moves or attacks
    highlightCells(cells, className) {
        for (const cell of cells) {
            const x = cell.x * this.cellSize;
            const y = cell.y * this.cellSize;
            
            // Create a semi-transparent overlay
            this.ctx.fillStyle = className === 'valid-move' 
                ? 'rgba(0, 255, 0, 0.3)'  // Green for moves
                : 'rgba(255, 0, 0, 0.3)'; // Red for attacks
            
            this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
        }
    }
    
    // Get the cell coordinates from screen position (for mouse clicks)
    getCellFromPosition(x, y) {
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        
        // Check if within grid bounds
        if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
            return { x: col, y: row };
        }
        
        return null;
    }
    
    // Get movement cost for a specific cell
    getMovementCost(x, y) {
        // Ensure coordinates are valid
        if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) {
            return Infinity; // Out of bounds
        }
        
        // Get terrain cost from map
        const terrainType = this.map.grid[y][x];
        return this.map.movementCosts[terrainType];
    }
    
    // Check if a cell is occupied by a character
    isOccupied(x, y, characters) {
        return characters.some(c => c.position.x === x && c.position.y === y && c.health > 0);
    }
}