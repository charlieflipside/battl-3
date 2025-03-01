export class Battlefield {
    constructor(canvas, map) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.map = map;
        this.cellSize = 60; // Size of each grid cell in pixels
        this.gridPadding = 30; // Padding for coordinate labels
        
        // Calculate grid dimensions
        this.cols = map.grid[0].length;
        this.rows = map.grid.length;
        
        // Resize canvas to fit grid and labels
        this.canvas.width = this.cols * this.cellSize + this.gridPadding;
        this.canvas.height = this.rows * this.cellSize + this.gridPadding;
        
        // Load tile images
        this.tileImages = {};
        this.loadTileImages();

        // Cache for character colors
        this.characterColors = {
            0: '#ff4444', // Red for player 1
            1: '#4444ff'  // Blue for player 2
        };

        // Pre-calculate padding offsets
        this.gridOffsetX = this.gridPadding;
        this.gridOffsetY = this.gridPadding;
    }
    
    // Load tile images for different terrain types
    loadTileImages() {
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
    
    // Draw coordinate labels
    drawCoordinates() {
        this.ctx.fillStyle = '#000';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        
        // Draw column labels (letters) - only once
        for (let col = 0; col < this.cols; col++) {
            const x = this.gridOffsetX + col * this.cellSize + this.cellSize / 2;
            this.ctx.fillText(letters[col], x, this.gridPadding / 2);
        }
        
        // Draw row labels (numbers) - only once
        for (let row = 0; row < this.rows; row++) {
            const y = this.gridOffsetY + row * this.cellSize + this.cellSize / 2;
            this.ctx.fillText((row + 1).toString(), this.gridPadding / 2, y);
        }
    }
    
    // Draw the grid with terrain
    drawGrid() {
        // Draw the cells
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cellValue = this.map.grid[row][col];
                const x = this.gridOffsetX + col * this.cellSize;
                const y = this.gridOffsetY + row * this.cellSize;
                
                // Draw the cell background based on terrain type
                this.ctx.fillStyle = this.tileImages[cellValue];
                this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
                
                // Draw cell borders
                this.ctx.strokeStyle = '#666';
                this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);
            }
        }
        
        // Draw coordinate labels
        this.drawCoordinates();
    }
    
    // Draw a character on the grid
    drawCharacter(character) {
        const x = this.gridOffsetX + character.position.x * this.cellSize;
        const y = this.gridOffsetY + character.position.y * this.cellSize;
        const padding = this.cellSize * 0.1; // 10% padding inside the cell
        
        // Draw character square
        this.ctx.fillStyle = this.characterColors[character.playerId];
        this.ctx.fillRect(
            x + padding, 
            y + padding, 
            this.cellSize - padding * 2, 
            this.cellSize - padding * 2
        );
        
        // Draw character class indicator
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const classIndicator = character.class.name[0]; // First letter of class name
        this.ctx.fillText(
            classIndicator,
            x + this.cellSize / 2,
            y + this.cellSize / 2
        );
        
        // Draw health bar
        const healthPercent = character.health / character.class.healthPoints;
        const barWidth = this.cellSize - padding * 2;
        const barHeight = 6;
        const barY = y + this.cellSize - padding - barHeight;
        
        // Health bar background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(x + padding, barY, barWidth, barHeight);
        
        // Health bar fill
        this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : 
                            healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        this.ctx.fillRect(x + padding, barY, barWidth * healthPercent, barHeight);
    }
    
    // Highlight cells for valid moves or attacks
    highlightCells(cells, className) {
        const highlightColors = {
            'move-highlight': 'rgba(135, 206, 235, 0.3)',  // Light blue for moves
            'attack-highlight': 'rgba(244, 67, 54, 0.3)'  // Red for attacks
        };

        for (const cell of cells) {
            const x = this.gridOffsetX + cell.x * this.cellSize;
            const y = this.gridOffsetY + cell.y * this.cellSize;
            
            // Fill the cell
            this.ctx.fillStyle = highlightColors[className];
            this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
            
            // Draw thick border for move highlights
            if (className === 'move-highlight') {
                this.ctx.strokeStyle = 'rgba(135, 206, 235, 0.8)';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);
                this.ctx.lineWidth = 1;  // Reset line width
            }
        }
    }
    
    // Convert screen coordinates to grid cell
    getCellFromPosition(screenX, screenY) {
        const col = Math.floor((screenX - this.gridOffsetX) / this.cellSize);
        const row = Math.floor((screenY - this.gridOffsetY) / this.cellSize);
        
        if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
            return { x: col, y: row };
        }
        return null;
    }
    
    // Get movement cost for a specific cell
    getMovementCost(x, y) {
        if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) {
            return Infinity;
        }
        return this.map.movementCosts[this.map.grid[y][x]];
    }
    
    // Check if a cell is occupied by a character
    isOccupied(x, y, characters) {
        return characters.some(c => 
            c.position.x === x && 
            c.position.y === y && 
            c.health > 0
        );
    }
}