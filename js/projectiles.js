class Projectile {
    // id, x, y, angle, speed, damage, type, networkId ekle
    constructor(playerId, x, y, angle, speed, damage, type = 'default', id = null) {
        this.playerId = playerId; // Mermiyi kimin attığı
        this.x = x;
        this.y = y;
        this.angle = angle; // Hareket yönü
        this.speed = speed; // Hız
        this.damage = damage; // Verdiği hasar
        this.radius = 5; // Çarpma ve çizim yarıçapı
        this.lifetime = 5; // Saniye cinsinden yaşam süresi
        this.spawnTime = Date.now(); // Oluşturulma zamanı
        this.type = type; // Mermi tipi (görsel veya efekt için)
        this.id = id; // Ağ üzerinden gelen benzersiz kimlik (varsa)

        // Mermi görseli (isteğe bağlı)
        this.sprite = new Image();
        this.sprite.src = `assets/projectiles/${this.type || 'default'}.png`; // Tipine göre görsel yükle
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

        const screenX = this.x + offsetX;
        const screenY = this.y + offsetY;

        // Ekran dışındaysa çizme
        if (screenX < -10 || screenX > ctx.canvas.width + 10 ||
            screenY < -10 || screenY > ctx.canvas.height + 10) {
            return;
        }

        // Mermi görselini çiz veya daire çiz
        try {
            if (this.sprite.complete && this.sprite.naturalWidth > 0) {
                 const size = this.radius * 2;
                 // Açısına göre mermiyi döndürerek çiz (isteğe bağlı)
                 ctx.save();
                 ctx.translate(screenX, screenY);
                 ctx.rotate(this.angle); // Hareket yönüne göre döndür
                 ctx.drawImage(this.sprite, -this.radius, -this.radius, size, size);
                 ctx.restore();
            } else {
                // Sprite yoksa veya yüklenmediyse basit bir daire çiz
                ctx.fillStyle = this.type === 'pistol' ? 'yellow' :
                                this.type === 'shotgun' ? 'orange' :
                                this.type === 'rifle' ? 'red' : 'white'; // Tipine göre renk
                ctx.beginPath();
                ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        } catch (e) {
            console.error("Projectile.render: Çizim hatası", e);
             // Hata durumunda daire çiz
             ctx.fillStyle = 'white';
             ctx.beginPath();
             ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
             ctx.fill();
        }
    }
} 