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
        
        // Initialize image containers
        this.terrainImages = {};
        this.characterImages = {};
        this.imagesLoaded = false;
        
        // Fallback colors
        this.terrainColors = {
            0: '#8fbc8f', // grass (easy) - light green
            1: '#4682b4', // water (hard) - steel blue
            2: '#a0522d', // mountain (very hard) - brown
            3: '#228b22'  // forest (medium) - forest green
        };
        
        this.characterColors = {
            0: '#ff4444', // Red for player 1
            1: '#4444ff'  // Blue for player 2
        };

        // Pre-calculate padding offsets
        this.gridOffsetX = this.gridPadding;
        this.gridOffsetY = this.gridPadding;
        
        // Load images
        this.loadImages();
    }
    
    // Load all game images
    loadImages() {
        const terrainTypes = {
            0: 'grass',
            1: 'water',
            2: 'mountain',
            3: 'forest'
        };
        
        const characterTypes = ['mage', 'fighter', 'ranger'];
        let loadedImages = 0;
        const totalImages = Object.keys(terrainTypes).length + characterTypes.length;
        
        // Load terrain images
        Object.entries(terrainTypes).forEach(([key, name]) => {
            const img = new Image();
            img.onload = () => {
                loadedImages++;
                if (loadedImages === totalImages) this.imagesLoaded = true;
            };
            img.onerror = () => {
                console.warn(`Failed to load terrain image: ${name}`);
            };
            img.src = `/src/assets/images/terrain/${name}.png`;
            this.terrainImages[key] = img;
        });
        
        // Load character images
        characterTypes.forEach(type => {
            const img = new Image();
            img.onload = () => {
                loadedImages++;
                if (loadedImages === totalImages) this.imagesLoaded = true;
            };
            img.onerror = () => {
                console.warn(`Failed to load character image: ${type}`);
            };
            img.src = `/src/assets/images/characters/${type}.png`;
            this.characterImages[type] = img;
        });
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
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cellValue = this.map.grid[row][col];
                const x = this.gridOffsetX + col * this.cellSize;
                const y = this.gridOffsetY + row * this.cellSize;
                
                // Try to draw terrain image, fall back to color if image not loaded
                const terrainImg = this.terrainImages[cellValue];
                if (this.imagesLoaded && terrainImg && terrainImg.complete) {
                    this.ctx.drawImage(terrainImg, x, y, this.cellSize, this.cellSize);
                } else {
                    this.ctx.fillStyle = this.terrainColors[cellValue];
                    this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
                }
                
                // Draw cell borders
                this.ctx.strokeStyle = '#666';
                this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);
            }
        }
        
        this.drawCoordinates();
    }
    
    // Draw a character on the grid
    drawCharacter(character) {
        const x = this.gridOffsetX + character.position.x * this.cellSize;
        const y = this.gridOffsetY + character.position.y * this.cellSize;
        const padding = this.cellSize * 0.1;
        
        // Try to draw character image, fall back to colored square if image not loaded
        const charImg = this.characterImages[character.class.name.toLowerCase()];
        if (this.imagesLoaded && charImg && charImg.complete) {
            // If character has used both actions, draw semi-transparent
            if (character.hasMoved && character.hasAttacked) {
                this.ctx.globalAlpha = 0.5;
            }
            
            this.ctx.drawImage(
                charImg,
                x + padding,
                y + padding,
                this.cellSize - padding * 2,
                this.cellSize - padding * 2
            );
            
            this.ctx.globalAlpha = 1.0;
        } else {
            // Fallback to colored square
            this.ctx.fillStyle = this.characterColors[character.playerId];
            if (character.hasMoved && character.hasAttacked) {
                this.ctx.globalAlpha = 0.5;
            }
            
            this.ctx.fillRect(
                x + padding,
                y + padding,
                this.cellSize - padding * 2,
                this.cellSize - padding * 2
            );
            
            this.ctx.globalAlpha = 1.0;
            
            // Draw character class indicator
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                character.class.name[0],
                x + this.cellSize / 2,
                y + this.cellSize / 2
            );
        }
        
        // Draw health bar
        const healthPercent = character.health / character.class.healthPoints;
        const barWidth = this.cellSize - padding * 2;
        const barHeight = 6;
        const barY = y + this.cellSize - padding - barHeight;
        
        // Health bar background (darker version of player color)
        const baseColor = this.characterColors[character.playerId];
        this.ctx.fillStyle = this.adjustColorBrightness(baseColor, -0.7); // 70% darker
        this.ctx.fillRect(x + padding, barY, barWidth, barHeight);
        
        // Health bar fill (player color with opacity based on health)
        this.ctx.fillStyle = this.adjustColorBrightness(baseColor, healthPercent < 0.3 ? -0.3 : 0);
        this.ctx.fillRect(x + padding, barY, barWidth * healthPercent, barHeight);
    }
    
    // Helper method to adjust color brightness
    adjustColorBrightness(hex, factor) {
        // Convert hex to RGB
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);
        
        // Adjust brightness
        if (factor > 0) {
            // Brighten
            r = Math.min(255, r + (255 - r) * factor);
            g = Math.min(255, g + (255 - g) * factor);
            b = Math.min(255, b + (255 - b) * factor);
        } else {
            // Darken
            r = Math.max(0, r * (1 + factor));
            g = Math.max(0, g * (1 + factor));
            b = Math.max(0, b * (1 + factor));
        }
        
        // Convert back to hex
        return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
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