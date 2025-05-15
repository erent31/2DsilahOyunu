class Player {
    constructor(id, username, x, y, skin = 'player') {
        this.id = id;
        this.username = username;
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.health = 100;
        this.rotation = 0;
        this.speed = 200;
        this.skin = skin;
        this.weapons = [
            new Pistol(),
            new Shotgun(),
            new Rifle()
        ];
        this.currentWeaponIndex = 0;
        this.shooting = false;
        this.lastShootTime = 0;
        this.movement = {
            up: false,
            down: false,
            left: false,
            right: false
        };
        
        // Oyuncu sprite'ı
        this.sprite = new Image();
        
        // Local storage'dan sprite'ı yükle (varsa)
        const storedSprite = localStorage.getItem(`sprite_${this.skin}`);
        if (storedSprite) {
            this.sprite.src = storedSprite;
            console.log(`${this.skin} sprite'ı local storage'dan yüklendi`);
        } else {
            // Yoksa varsayılan sprite'ı yükle
            this.sprite.src = `assets/players/${this.skin}.png`;
            console.log(`${this.skin} sprite'ı varsayılan dosyadan yükleniyor`);
        }
        
        // Animasyon değişkenleri
        this.isMoving = false;
        this.animationFrame = 0;
        this.animationTime = 0;
        this.frameDuration = 0.2; // saniye
        
        this.armor = 0; // Zırh değeri ekle
        this.maxArmor = 100; // Maksimum zırh
        this.isDead = false; // Ölüm durumu
    }
    
    update(deltaTime, map) {
        // Eğer ölmüşse hareket etme
        if (this.isDead) return;
        
        // Delta zamanı sınırla
        const cappedDelta = Math.min(deltaTime, 0.05); // Max 50ms

        // Silahı güncelle (reload süresini takip et)
        if (this.weapons[this.currentWeaponIndex]) {
            this.weapons[this.currentWeaponIndex].update(Date.now() - (this.lastUpdateTime || Date.now())); // Delta time ms cinsinden ver
        }
        this.lastUpdateTime = Date.now();

        // Hareket vektörünü hesapla
        let moveX = 0;
        let moveY = 0;
        
        if (this.movement.up) moveY -= 1;
        if (this.movement.down) moveY += 1;
        if (this.movement.left) moveX -= 1;
        if (this.movement.right) moveX += 1;
        
        // Hareket durumunu güncelle
        this.isMoving = (moveX !== 0 || moveY !== 0);
        
        // Hareket yoksa işlem yapma (animasyon hariç)
        if (!this.isMoving) {
            // Animasyon güncelleme
            if (this.isMoving) { // isMoving zaten false, bu blok çalışmayacak
                this.animationTime += cappedDelta;
                if (this.animationTime >= this.frameDuration) {
                    this.animationFrame = (this.animationFrame + 1) % 4;
                    this.animationTime = 0;
                }
            } else {
                // Hareket etmiyorsa animasyonu sıfırla
                this.animationFrame = 0;
                this.animationTime = 0;
            }
            
            // Ateş etme (Hareket etmiyor olsa da ateş edebilir)
            if (this.shooting && this.weapons[this.currentWeaponIndex]) {
                const currentWeapon = this.weapons[this.currentWeaponIndex];
                if (currentWeapon.canShoot()) {
                    // Mermi oluşturma game.js'de yapılacak
                    // currentWeapon.shoot() burada çağrılmayacak, game.js'de ateş etme mantığına dahil edilecek
                    // this.lastShootTime = Date.now(); // Bu da game.js'ye taşınacak
                }
            }
            return; // Hareket yoksa buradan çık
        }

        // Vektörü normalize et
        const length = Math.sqrt(moveX * moveX + moveY * moveY);
        if (length > 0) {
            moveX = moveX / length;
            moveY = moveY / length;
        }
        
        // Hızlı hareket
        const stepX = moveX * this.speed * cappedDelta;
        const stepY = moveY * this.speed * cappedDelta;
        
        // X yönünde hareket
        if (Math.abs(stepX) > 0.01) {
            const newX = this.x + stepX;
            if (!map.checkCollision(newX, this.y)) {
                this.x = newX;
            }
        }
        
        // Y yönünde hareket
        if (Math.abs(stepY) > 0.01) {
            const newY = this.y + stepY;
            if (!map.checkCollision(this.x, newY)) {
                this.y = newY;
            }
        }
        
        // Harita sınırları içinde kal
        this.x = Math.max(0, Math.min(map.width, this.x));
        this.y = Math.max(0, Math.min(map.height, this.y));
        
        // Animasyon güncelleme
        this.animationTime += cappedDelta;
        if (this.animationTime >= this.frameDuration) {
            this.animationFrame = (this.animationFrame + 1) % 4;
            this.animationTime = 0;
        }
        
        // Ateş etme (Hareket ederken de ateş edebilir)
        if (this.shooting && this.weapons[this.currentWeaponIndex]) {
            const currentWeapon = this.weapons[this.currentWeaponIndex];
             if (currentWeapon.canShoot()) {
                // Mermi oluşturma game.js'de yapılacak
                // currentWeapon.shoot() burada çağrılmayacak
                // this.lastShootTime = Date.now(); // Bu da game.js'ye taşınacak
            }
        }
    }
    
    render(ctx, cameraPlayer) {
        try {
            // Kamera ofsetini hesapla
            const offsetX = ctx.canvas.width / 2 - cameraPlayer.x;
            const offsetY = ctx.canvas.height / 2 - cameraPlayer.y;
            
            // Ekran dışındaysa çizme
            if (this.x + offsetX < -100 || this.x + offsetX > ctx.canvas.width + 100 ||
                this.y + offsetY < -100 || this.y + offsetY > ctx.canvas.height + 100) {
                return;
            }
            
            // Ölmüş oyuncuları yarı saydam çiz
            const alpha = this.isDead ? 0.4 : 1.0;
            ctx.globalAlpha = alpha;
            
            // Oyuncu konumuna kaydır
            ctx.save();
            ctx.translate(this.x + offsetX, this.y + offsetY);
            
            // Parlak neon kenar efekti (haritada olmayan renk)
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.skin === 'red' ? '#FF0000' : 
                              this.skin === 'blue' ? '#0000FF' :
                              this.skin === 'green' ? '#00FF00' :
                              this.skin === 'yellow' ? '#FFFF00' : 
                              this.skin === 'purple' ? '#FF00FF' : '#FFFFFF';
            
            // Oyuncu gövdesi - parlak, dikkat çeken renk
            const glow = this.id === cameraPlayer.id ? 80 : 40;
            ctx.fillStyle = this.skin === 'red' ? `rgb(255, ${glow}, ${glow})` : 
                            this.skin === 'blue' ? `rgb(${glow}, ${glow}, 255)` :
                            this.skin === 'green' ? `rgb(${glow}, 255, ${glow})` :
                            this.skin === 'yellow' ? `rgb(255, 255, ${glow})` :
                            this.skin === 'purple' ? `rgb(255, ${glow}, 255)` : '#FFFFFF';
            
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Silah çizimi
            ctx.shadowBlur = 0;
            ctx.save();
            ctx.rotate(this.rotation);
            
            // Aktif silahı çiz
            ctx.fillStyle = "#333";
            ctx.fillRect(this.radius - 5, -5, 40, 10);
            
            ctx.restore();
            
            // Kullanıcı adı ve sağlık çubuğu
            ctx.fillStyle = 'white';
            ctx.shadowBlur = 3;
            ctx.shadowColor = 'black';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.username, 0, -this.radius - 10);
            
            // Shadow'u kapat
            ctx.shadowBlur = 0;
            
            // Can çubuğu (kalın ve parlak)
            const healthBarWidth = 40;
            const healthBarHeight = 6;
            
            // Siyah arka plan
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(-healthBarWidth / 2 - 1, -this.radius - 5 - 1, healthBarWidth + 2, healthBarHeight + 2);
            
            // Kırmızı baz
            ctx.fillStyle = '#F44336';
            ctx.fillRect(-healthBarWidth / 2, -this.radius - 5, healthBarWidth, healthBarHeight);
            
            // Yeşil sağlık
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(-healthBarWidth / 2, -this.radius - 5, healthBarWidth * (this.health / 100), healthBarHeight);
            
            // Zırh çemberi
            if (this.armor > 0) {
                ctx.strokeStyle = '#2196F3';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, this.radius + 3, 0, Math.PI * 2 * (this.armor / this.maxArmor));
                ctx.stroke();
            }
            
            ctx.restore();
            ctx.globalAlpha = 1.0;
        }
        catch (e) {
            console.error("Player.render: Çizim hatası", e);
        }
    }
    
    switchWeapon(index) {
        if (index >= 0 && index < this.weapons.length) {
            this.currentWeaponIndex = index;
        }
    }
    
    reload() {
         if (this.weapons[this.currentWeaponIndex]) {
             this.weapons[this.currentWeaponIndex].startReload();
         }
    }
    
    takeDamage(damage) {
        this.health -= damage;
        if (this.health < 0) this.health = 0;
        return this.health <= 0;
    }
    
    addWeapon(weapon) {
        // Silahın zaten envanterde olup olmadığını kontrol et
        for (let i = 0; i < this.weapons.length; i++) {
            if (this.weapons[i].type === weapon.type) {
                // Silah zaten var, mermi ekle
                this.weapons[i].totalAmmo += weapon.totalAmmo;
                return i; // Silahın indexini döndür
            }
        }
        
        // Silah yok, ekle
        this.weapons.push(weapon);
        return this.weapons.length - 1; // Yeni eklenen silahın indexini döndür
    }
    
    // Zırh ekleme metodu
    addArmor(amount) {
        this.armor = Math.min(this.maxArmor, this.armor + amount);
    }

    // Mermi ekleme metodu (silaha özel mermi türüne göre)
    addAmmo(ammoType, amount) {
        for (const weapon of this.weapons) {
            if (weapon.type === ammoType) {
                weapon.totalAmmo += amount;
                // Eğer o an o silahı tutuyorsa ve reload yapmıyorsa otomatik reload başlatabiliriz (isteğe bağlı)
                // if (weapon === this.weapons[this.currentWeaponIndex] && !weapon.reloading) {
                //     weapon.startReload();
                // }
                return true; // Mermi eklendi
            }
        }
        // Eğer elde o tipte silah yoksa mermiyi ekleme (şimdilik)
        console.warn(`Silah tipine (${ammoType}) uygun envanterde silah yok.`);
        return false; // Mermi eklenemedi
    }
} 