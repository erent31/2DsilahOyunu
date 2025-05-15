class Chest {
    constructor(id, x, y, type = 'weapon') {
        this.id = id;
        this.x = x;
        this.y = y;
        this.radius = 25;
        this.opened = false;
        this.type = type; // weapon, armor, health, special
        
        // Görseller
        this.chestImage = new Image();
        
        // Sandık tipine göre görsel belirle
        switch (this.type) {
            case 'weapon':
                this.chestImage.src = 'assets/chests/weapon_chest.png';
                this.color = '#FF5722'; // Turuncu
                break;
            case 'armor':
                this.chestImage.src = 'assets/chests/armor_chest.png';
                this.color = '#2196F3'; // Mavi
                break;
            case 'health':
                this.chestImage.src = 'assets/chests/health_chest.png';
                this.color = '#4CAF50'; // Yeşil
                break;
            case 'special':
                this.chestImage.src = 'assets/chests/special_chest.png';
                this.color = '#9C27B0'; // Mor
                break;
            default:
                this.chestImage.src = 'assets/chests/weapon_chest.png';
                this.color = '#FFC107'; // Sarı
        }
        
        // Görsel yüklenmese bile çizebilmek için
        this.loaded = false;
        this.chestImage.onload = () => {
            this.loaded = true;
        };
    }
    
    render(ctx, player) {
        // Kamera ofsetini hesapla
        const offsetX = ctx.canvas.width / 2 - player.x;
        const offsetY = ctx.canvas.height / 2 - player.y;
        
        // Ekran dışındaysa çizme
        if (this.x + offsetX < -100 || this.x + offsetX > ctx.canvas.width + 100 ||
            this.y + offsetY < -100 || this.y + offsetY > ctx.canvas.height + 100) {
            return;
        }
        
        // Parlama efekti
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        
        // Görseli çiz (eğer yüklendiyse)
        if (this.loaded) {
            ctx.drawImage(
                this.chestImage,
                this.x + offsetX - this.radius,
                this.y + offsetY - this.radius,
                this.radius * 2,
                this.radius * 2
            );
        } else {
            // Yüklenmediyse basit bir şekil çiz
            ctx.fillStyle = this.opened ? '#aaa' : this.color;
            ctx.beginPath();
            ctx.rect(
                this.x + offsetX - this.radius,
                this.y + offsetY - this.radius,
                this.radius * 2,
                this.radius * 2
            );
            ctx.fill();
            
            // Sandık tipini göster
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(
                this.type.toUpperCase(),
                this.x + offsetX,
                this.y + offsetY + 5
            );
        }
        
        // Sandık açıksa üzerine "AÇIK" yaz
        if (this.opened) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('AÇIK', this.x + offsetX, this.y + offsetY + 40);
        }
        
        ctx.restore();
    }
    
    open(player) {
        if (this.opened) return null;
        
        this.opened = true;
        
        // Sandık tipine göre farklı içerikler ver
        switch (this.type) {
            case 'weapon':
                // Rastgele silah ver
                const weapons = [new Pistol(), new Shotgun(), new Rifle()];
                const randomWeapon = weapons[Math.floor(Math.random() * weapons.length)];
                return { type: 'weapon', item: randomWeapon };
                
            case 'armor':
                // 25-50 arası zırh ver
                const armorAmount = 25 + Math.floor(Math.random() * 25);
                return { type: 'armor', amount: armorAmount };
                
            case 'health':
                // 25-50 arası can ver
                const healthAmount = 25 + Math.floor(Math.random() * 25);
                return { type: 'health', amount: healthAmount };
                
            case 'special':
                // Süper silah (yüksek hasar)
                const superWeapon = new Rifle();
                superWeapon.damage = 35;
                superWeapon.name = "Süper Tüfek";
                return { type: 'weapon', item: superWeapon };
                
            default:
                return { type: 'ammo', amount: 30 };
        }
    }
} 