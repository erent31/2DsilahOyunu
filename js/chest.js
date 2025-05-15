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
        // Görsel olarak sandığı açıldı gibi göster
        this.sprite.src = 'assets/chests/chest_opened.png'; // Açılmış sandık görseli (varsa)

        let loot = null;

        // Sandık tipine göre loot belirle
        switch (this.type) {
            case 'weapon':
                // Rastgele bir silah seç (Pistol, Shotgun, Rifle)
                const weaponTypes = ['pistol', 'shotgun', 'rifle'];
                const randomWeaponType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
                
                let weaponInstance;
                // Silah türüne göre instance oluştur
                switch (randomWeaponType) {
                    case 'pistol':
                        weaponInstance = new Pistol();
                        break;
                    case 'shotgun':
                        weaponInstance = new Shotgun();
                        break;
                    case 'rifle':
                         weaponInstance = new Rifle();
                        break;
                }
                
                // Silahı doğrudan envantere eklemek yerine yere Item olarak düşüreceğiz
                // loot = { type: 'weapon', item: weaponInstance }; // Bu kısmı kaldırıyoruz
                
                // Yerine yere Item düşürme bilgisini döndür
                return { type: 'item', item: weaponInstance }; // Item olarak düşecek silah

            case 'armor':
                const armorAmount = Math.floor(Math.random() * 30) + 20; // 20-50 arası zırh
                // loot = { type: 'armor', amount: armorAmount }; // Bu kısmı kaldırıyoruz
                 return { type: 'item', item: { name: `${armorAmount} Zırh`, type: 'armor', amount: armorAmount, sprite: 'assets/items/armor.png' } };

            case 'health':
                const healthAmount = Math.floor(Math.random() * 20) + 10; // 10-30 arası can
                // loot = { type: 'health', amount: healthAmount }; // Bu kısmı kaldırıyoruz
                 return { type: 'item', item: { name: `${healthAmount} Can`, type: 'health', amount: healthAmount, sprite: 'assets/items/health.png' } };

            case 'special':
                 // Özel bir eşya düşür (örneğin, daha fazla mermi veya özel bir silah)
                 // Şimdilik sadece çok mermi düşsün
                 const bigAmmoAmount = Math.floor(Math.random() * 100) + 50; // 50-150 arası mermi
                 const randomAmmoType = ['pistol', 'shotgun', 'rifle'][Math.floor(Math.random() * 3)];
                 return { type: 'item', item: { name: `${bigAmmoAmount} ${randomAmmoType.toUpperCase()} Mermisi`, type: 'ammo', ammoType: randomAmmoType, amount: bigAmmoAmount, sprite: `assets/items/${randomAmmoType}_ammo.png` } };

            default: // Normal sandık (rastgele mermi veya küçük can/zırh)
                 const randomLootType = ['ammo', 'health', 'armor'][Math.floor(Math.random() * 3)];
                 
                 if(randomLootType === 'ammo') {
                    const ammoAmount = Math.floor(Math.random() * 30) + 10; // 10-40 arası mermi
                    const randomAmmoType = ['pistol', 'shotgun', 'rifle'][Math.floor(Math.random() * 3)];
                    return { type: 'item', item: { name: `${ammoAmount} ${randomAmmoType.toUpperCase()} Mermisi`, type: 'ammo', ammoType: randomAmmoType, amount: ammoAmount, sprite: `assets/items/${randomAmmoType}_ammo.png` } };
                 } else if (randomLootType === 'health') {
                    const healthAmount = Math.floor(Math.random() * 15) + 5; // 5-20 arası can
                     return { type: 'item', item: { name: `${healthAmount} Can`, type: 'health', amount: healthAmount, sprite: 'assets/items/health.png' } };
                 } else { // armor
                    const armorAmount = Math.floor(Math.random() * 15) + 5; // 5-20 arası zırh
                     return { type: 'item', item: { name: `${armorAmount} Zırh`, type: 'armor', amount: armorAmount, sprite: 'assets/items/armor.png' } };
                 }
        }
        
        return null; // Bir şey çıkmazsa null dön
    }
} 