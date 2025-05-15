class Weapon {
    constructor(name, type, damage, fireRate, maxAmmo, reloadTime) {
        this.name = name;
        this.type = type;
        this.damage = damage;
        this.fireRate = fireRate; // ms cinsinden
        this.maxAmmo = maxAmmo;
        this.currentAmmo = maxAmmo;
        this.totalAmmo = maxAmmo * 3;
        this.reloadTime = reloadTime;
        this.reloading = false;
        this.projectileSpeed = 500; // Mermi hızını artır
        
        // Silah sprite'ı
        this.sprite = new Image();
        
        // Local storage'dan sprite'ı yükle (varsa)
        const storedSprite = localStorage.getItem(`sprite_weapon_${type.toLowerCase()}`);
        if (storedSprite) {
            this.sprite.src = storedSprite;
            console.log(`${type} sprite'ı local storage'dan yüklendi`);
        } else {
            // Yoksa varsayılan sprite'ı yükle
            this.sprite.src = `assets/weapons/${type.toLowerCase()}.png`;
            console.log(`${type} sprite'ı varsayılan dosyadan yükleniyor`);
        }
    }
    
    shoot(playerId, x, y, rotation) {
        if (this.currentAmmo <= 0 || this.reloading) return [];
        
        // Mermi sayısını düşür
        this.currentAmmo--;
        
        // Basit mermi oluştur
        const offsetX = Math.cos(rotation) * 30; 
        const offsetY = Math.sin(rotation) * 30;
        
        // Tek bir mermi döndür (shotgun dahil)
        return [new Projectile(
            playerId, 
            x + offsetX, 
            y + offsetY, 
            rotation, 
            600,  // sabit hız
            this.damage
        )];
    }
    
    reload() {
        if (this.reloading || this.currentAmmo === this.maxAmmo || this.totalAmmo <= 0) return;
        
        this.reloading = true;
        
        setTimeout(() => {
            const ammoToAdd = Math.min(this.maxAmmo - this.currentAmmo, this.totalAmmo);
            this.currentAmmo += ammoToAdd;
            this.totalAmmo -= ammoToAdd;
            this.reloading = false;
        }, this.reloadTime);
    }
}

class Pistol extends Weapon {
    constructor() {
        super('Tabanca', 'Pistol', 20, 250, 7, 1000); // Ateş hızını artır (500->250ms)
        this.projectileSpeed = 600;
    }
}

class Shotgun extends Weapon {
    constructor() {
        super('Pompalı', 'Shotgun', 15, 500, 5, 1500); // Ateş hızını artır (800->500ms)
        this.projectileSpeed = 500;
    }
    
    shoot(playerId, x, y, rotation) {
        // Simplify, just use parent method
        return super.shoot(playerId, x, y, rotation);
    }
}

class Rifle extends Weapon {
    constructor() {
        super('Tüfek', 'Rifle', 30, 100, 25, 2000); // Ateş hızını artır (150->100ms)
        this.projectileSpeed = 800;
    }
}

class Sniper extends Weapon {
    constructor() {
        super('Keskin Nişancı', 'Sniper', 80, 1000, 5, 2500);
    }
}

class SMG extends Weapon {
    constructor() {
        super('Hafif Makineli', 'SMG', 15, 100, 30, 1800);
    }
}

class Projectile {
    constructor(playerId, x, y, angle, speed, damage) {
        this.playerId = playerId;
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.damage = damage;
        this.radius = 3;
        this.lifetime = 2; // Yaşam süresini azalt (3->2 saniye)
    }
    
    update(deltaTime) {
        // Pozisyonu güncelle
        this.x += Math.cos(this.angle) * this.speed * deltaTime;
        this.y += Math.sin(this.angle) * this.speed * deltaTime;
        
        // Yaşam süresini azalt
        this.lifetime -= deltaTime;
    }
    
    render(ctx, cameraPlayer) {
        // Kamera ofsetini hesapla
        const offsetX = ctx.canvas.width / 2 - cameraPlayer.x;
        const offsetY = ctx.canvas.height / 2 - cameraPlayer.y;
        
        // Mermiyi çiz
        ctx.fillStyle = '#FFEB3B'; // Sarı mermi
        ctx.beginPath();
        ctx.arc(this.x + offsetX, this.y + offsetY, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
} 