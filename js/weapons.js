class Weapon {
    constructor(name, damage, fireRate, maxAmmo, totalAmmo, reloadTime, type, sprite = 'assets/items/default_weapon.png') {
        this.name = name;
        this.damage = damage; 
        this.fireRate = fireRate; 
        this.maxAmmo = maxAmmo; 
        this.totalAmmo = totalAmmo; 
        this.currentAmmo = maxAmmo;
        this.reloadTime = reloadTime; 
        this.type = type; // Silah tipi (mermi türü, envanterde ayırt etmek için)
        
        this.reloading = false;
        this.reloadStartTime = 0;
        this.lastShootTime = 0; // Son ateş etme zamanı
        
        this.sprite = new Image();
        this.sprite.src = sprite; // Silah görseli
    }
    
    // Ateş etme kontrolü
    canShoot() {
        const currentTime = Date.now();
        return !this.reloading && this.currentAmmo > 0 && (currentTime - this.lastShootTime > this.fireRate);
    }

    // Ateş et
    shoot() {
        if (this.canShoot()) {
            this.currentAmmo--;
            this.lastShootTime = Date.now();
            // Mermi oluşturma mantığı game.js'de olacak
            return true; // Ateş edildi
        }
        return false; // Ateş edilemedi
    }

    // Yeniden doldurmayı başlat
    startReload() {
        if (!this.reloading && this.currentAmmo < this.maxAmmo && this.totalAmmo > 0) {
            this.reloading = true;
            this.reloadStartTime = Date.now();
            console.log(`${this.name} yeniden dolduruluyor...`);
        }
    }

    // Yeniden doldurmayı güncelle (game loop'ta çağrılacak)
    update(deltaTime) {
        if (this.reloading) {
            const currentTime = Date.now();
            if (currentTime - this.reloadStartTime >= this.reloadTime) {
                // Yeniden doldurma tamamlandı
                this.reloading = false;
                
                const ammoNeeded = this.maxAmmo - this.currentAmmo;
                const ammoToReload = Math.min(ammoNeeded, this.totalAmmo);
                
                this.currentAmmo += ammoToReload;
                this.totalAmmo -= ammoToReload;
                
                console.log(`${this.name} yeniden dolduruldu. Mermi: ${this.currentAmmo}/${this.totalAmmo}`);
            }
        }
    }

    // Silahı atmak için bilgi döndür
    getDropInfo() {
        return {
            name: this.name,
            type: 'weapon',
            weaponType: this.type, // Silah tipi bilgisi
            currentAmmo: this.currentAmmo,
            totalAmmo: this.totalAmmo,
            sprite: this.sprite.src
        };
    }
}

class Pistol extends Weapon {
    constructor() {
        super('Tabanca', 20, 200, 12, 60, 1500, 'pistol', 'assets/items/pistol.png'); 
    }
}

class Shotgun extends Weapon {
    constructor() {
        super('Pompalı', 15 * 8, 800, 8, 32, 2500, 'shotgun', 'assets/items/shotgun.png'); // Pompalı saçma mantığı, 8 mermi gibi düşünülebilir
    }
    // Pompalı için özel ateş etme metodu (birden fazla mermi atabilir)
     shoot() {
        if (this.canShoot()) {
            this.currentAmmo--;
            this.lastShootTime = Date.now();
            return 8; // Pompalı 8 mermi (saçma) atar
        }
        return 0; // Ateş edilemedi
    }
}

class Rifle extends Weapon {
    constructor() {
        super('Tüfek', 30, 150, 30, 90, 2000, 'rifle', 'assets/items/rifle.png');
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