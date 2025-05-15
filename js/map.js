class Map {
    constructor() {
        this.width = 2000;
        this.height = 2000;
        this.obstacles = [];
        
        // Rastgele harita yerine sabit harita kullanma
        this.createFixedMap();
        
        // Harita arka planı
        this.backgroundImage = new Image();
        this.backgroundImage.src = 'assets/map/grass.png';
    }
    
    createFixedMap() {
        // Harita ortasında bloklar
        for (let x = 800; x < 1200; x += 50) {
            for (let y = 800; y < 1200; y += 50) {
                this.obstacles.push({ x, y, width: 50, height: 50 });
            }
        }
        
        // Kenarlar boyunca engeller
        for (let x = 200; x < 1800; x += 200) {
            this.obstacles.push({ x, y: 300, width: 100, height: 30 });
            this.obstacles.push({ x, y: 1700, width: 100, height: 30 });
        }
        
        for (let y = 200; y < 1800; y += 200) {
            this.obstacles.push({ x: 300, y, width: 30, height: 100 });
            this.obstacles.push({ x: 1700, y, width: 30, height: 100 });
        }
    }
    
    checkCollision(x, y) {
        for (const obstacle of this.obstacles) {
            if (x > obstacle.x && x < obstacle.x + obstacle.width &&
                y > obstacle.y && y < obstacle.y + obstacle.height) {
                return true;
            }
        }
        return false;
    }
    
    render(ctx, player) {
        // Kamera ofsetini hesapla
        const offsetX = ctx.canvas.width / 2 - player.x;
        const offsetY = ctx.canvas.height / 2 - player.y;
        
        // Harita sınırı
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 5;
        ctx.strokeRect(offsetX, offsetY, this.width, this.height);
        
        // Engelleri çiz
        ctx.fillStyle = '#555';
        for (const obstacle of this.obstacles) {
            ctx.fillRect(
                obstacle.x + offsetX,
                obstacle.y + offsetY,
                obstacle.width,
                obstacle.height
            );
        }
    }
} 