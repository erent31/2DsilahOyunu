class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.players = {};
        this.currentPlayer = null;
        this.map = null;
        this.chests = [];
        this.projectiles = [];
        this.items = [];
        this.lastTime = 0;
        this.networking = new Networking(this);
        this.auth = new Auth(this);
        
        this.setupEventListeners();
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // İlk olarak auth ekranı gösterilir
        this.showScreen('login-screen');
        
        // Giriş durumunu kontrol et
        if (this.auth.checkAuth()) {
            this.showScreen('lobby-screen');
        }
        
        // Ölüm ekranı
        this.deathScreen = document.createElement('div');
        this.deathScreen.id = 'death-screen';
        this.deathScreen.className = 'death-overlay hidden';
        this.deathScreen.innerHTML = `
            <div class="death-message">
                <h2>ÖLDÜNÜZ!</h2>
                <p>Yeniden doğmak için butona tıklayın</p>
                <button id="respawn-btn">YENİDEN DOĞ</button>
            </div>
        `;
        document.getElementById('game-screen').appendChild(this.deathScreen);
        
        // Yeniden doğma butonu
        document.getElementById('respawn-btn').addEventListener('click', () => this.respawnPlayer());
    }
    
    resizeCanvas() {
        const container = document.getElementById('game-container');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }
    
    setupEventListeners() {
        // Login ve Register butonları
        document.getElementById('login-btn').addEventListener('click', () => this.auth.login());
        document.getElementById('register-btn').addEventListener('click', () => this.auth.register());
        
        // Lobi ekranı butonları
        document.getElementById('create-room-btn').addEventListener('click', () => this.networking.createRoom());
        document.getElementById('refresh-rooms-btn').addEventListener('click', () => this.networking.getRooms());
        document.getElementById('logout-btn').addEventListener('click', () => this.auth.logout());
        
        // Oyun içi butonlar
        document.getElementById('leave-game-btn').addEventListener('click', () => this.leaveGame());
        
        // Oyun kontrolleri
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    }
    
    showScreen(screenId) {
        // Tüm ekranları gizle
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // İstenen ekranı göster
        document.getElementById(screenId).classList.remove('hidden');
        
        // Ekran değiştiğinde gerekli işlemleri yap
        if (screenId === 'game-screen') {
            console.log("Oyun ekranına geçildi");
            // Canvas yeniden boyutlandır
            this.resizeCanvas();
            // Eğer oyun döngüsü çalışmıyorsa başlat
            if (!this.gameLoopRunning) {
                this.gameLoopRunning = true;
                this.gameLoop();
            }
        } else if (screenId === 'lobby-screen') {
            console.log("Lobi ekranına geçildi");
            this.gameLoopRunning = false;
        }
    }
    
    startGame(roomId, playerId) {
        try {
            this.roomId = roomId;
            this.playerId = playerId;
            
            // Canvas yeniden boyutlandır
            this.resizeCanvas();
            
            // Oyun nesnelerini hazırla
            this.map = new Map(); // Sabit harita oluştur
            this.players = {};
            this.projectiles = [];
            
            // Networkteki oyuncuları alın
            const rooms = this.networking.getLocalRooms();
            let roomPlayers = [];
            let playerSkin = 'blue';
            
            for (const room of rooms) {
                if (room.id === roomId && room.connectedPlayers) {
                    roomPlayers = room.connectedPlayers;
                    
                    // Oda bilgilerini güncelle ve kaydı sağla
                    for (const player of roomPlayers) {
                        if (player.id === playerId) {
                            playerSkin = player.skin;
                            
                            // Tüm oyuncuları buradan oluştur
                            this.currentPlayer = new Player(
                                playerId,
                                player.username,
                                player.x,
                                player.y,
                                playerSkin
                            );
                            this.players[playerId] = this.currentPlayer;
                        } else {
                            // Diğer oyuncuları da ekle
                            this.players[player.id] = new Player(
                                player.id,
                                player.username,
                                player.x,
                                player.y,
                                player.skin
                            );
                        }
                    }
                    break;
                }
            }
            
            // Sandıkları oluştur (sabit, daha ayralı konumlarda)
            this.chests = [];
            const chestPositions = [
                // Köşelerde sandıklar
                {x: 200, y: 200, type: 'weapon'}, 
                {x: 1800, y: 200, type: 'armor'}, 
                {x: 200, y: 1800, type: 'health'}, 
                {x: 1800, y: 1800, type: 'weapon'},
                
                // Orta kısımda zırh sandıkları
                {x: 1000, y: 500, type: 'armor'},
                {x: 1000, y: 1500, type: 'armor'},
                
                // Haritanın farklı bölgelerinde silah sandıkları
                {x: 400, y: 1200, type: 'weapon'},
                {x: 1600, y: 800, type: 'weapon'},
                
                // Sağlık sandıkları
                {x: 500, y: 500, type: 'health'},
                {x: 1500, y: 1500, type: 'health'},
                
                // Nadiren bulunan özel sandık (süper silah)
                {x: 1000, y: 1000, type: 'special'}
            ];
            
            for (let i = 0; i < chestPositions.length; i++) {
                this.chests.push(new Chest(
                    'chest_' + i,
                    chestPositions[i].x,
                    chestPositions[i].y,
                    chestPositions[i].type
                ));
            }
            
            // Oyun ekranına geç
            this.showScreen('game-screen');
            
            // Oyun döngüsünü başlat
            this.gameLoopRunning = true;
            this.lastTime = null;
            requestAnimationFrame((time) => this.gameLoop(time));
            
            // Güncellemeleri daha sık gönder
            this.updateInterval = setInterval(() => {
                this.networking.sendPlayerUpdate();
            }, 50);
            
            console.log("Oyun başlatma tamamlandı");
        } catch (err) {
            console.error("Oyun başlatma hatası:", err);
            alert("Oyun başlatılırken bir hata oluştu! Lütfen sayfayı yenileyin.");
        }
    }
    
    leaveGame() {
        if (this.roomId) {
            this.networking.leaveGame(this.roomId);
            this.roomId = null;
            this.playerId = null;
            this.players = {};
            this.currentPlayer = null;
            this.chests = [];
            this.projectiles = [];
            this.showScreen('lobby-screen');
        }
    }
    
    handleKeyDown(e) {
        if (!this.currentPlayer || this.currentPlayer.isDead) return;
        
        switch(e.key) {
            case 'w':
            case 'ArrowUp':
                this.currentPlayer.movement.up = true;
                break;
            case 'a':
            case 'ArrowLeft':
                this.currentPlayer.movement.left = true;
                break;
            case 's':
            case 'ArrowDown':
                this.currentPlayer.movement.down = true;
                break;
            case 'd':
            case 'ArrowRight':
                this.currentPlayer.movement.right = true;
                break;
            case 'r':
                this.currentPlayer.reload();
                break;
            case 'e':
                this.checkChestInteraction();
                this.checkItemInteraction();
                break;
            case '1':
            case '2':
            case '3':
                this.currentPlayer.switchWeapon(parseInt(e.key) - 1);
                break;
            case 'q':
                this.dropCurrentWeapon();
                break;
        }
        
        this.networking.sendPlayerUpdate();
    }
    
    handleKeyUp(e) {
        if (!this.currentPlayer) return;
        
        switch(e.key) {
            case 'w':
            case 'ArrowUp':
                this.currentPlayer.movement.up = false;
                break;
            case 'a':
            case 'ArrowLeft':
                this.currentPlayer.movement.left = false;
                break;
            case 's':
            case 'ArrowDown':
                this.currentPlayer.movement.down = false;
                break;
            case 'd':
            case 'ArrowRight':
                this.currentPlayer.movement.right = false;
                break;
        }
        
        this.networking.sendPlayerUpdate();
    }
    
    handleMouseDown(e) {
        e.preventDefault(); // Tarayıcı davranışını engelle
        
        // Sadece durum değişkeni ayarla, başka işlem yapma
        if (this.currentPlayer) {
            this.currentPlayer.shooting = true;
        }
    }
    
    handleMouseUp(e) {
        e.preventDefault(); // Tarayıcı davranışını engelle
        
        // Sadece durum değişkeni ayarla, başka işlem yapma
        if (this.currentPlayer) {
            this.currentPlayer.shooting = false;
        }
    }
    
    handleMouseMove(e) {
        if (!this.currentPlayer) return;
        
        // Fare pozisyonunu canvas'a göre hesapla
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Canvas merkezi (oyuncu konumu)
        const canvasCenterX = this.canvas.width / 2;
        const canvasCenterY = this.canvas.height / 2;
        
        // Fare pozisyonu ile canvas merkezi arasındaki fark
        const dx = mouseX - canvasCenterX;
        const dy = mouseY - canvasCenterY;
        
        // Açıyı hesapla (canvas merkezine göre)
        this.currentPlayer.rotation = Math.atan2(dy, dx);
        
        this.networking.sendPlayerUpdate();
    }
    
    checkChestInteraction() {
        if (!this.currentPlayer || this.currentPlayer.isDead) return;
        
        // Oyuncunun yakındaki sandıkları kontrol et
        for (const chest of this.chests) {
            const dx = this.currentPlayer.x - chest.x;
            const dy = this.currentPlayer.y - chest.y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            if (distance < 70 && !chest.opened) { // Etkileşim mesafesini artır
                // Sandığı aç ve loot al
                const loot = chest.open(this.currentPlayer);
                
                if (loot && loot.type === 'item') {
                    // Sandıktan Item çıktı, yere bırak
                    const itemId = 'item_' + Date.now() + Math.random().toString(16).slice(2); // Basit eşsiz ID
                    const droppedItem = new Item(itemId, chest.x + (Math.random()-0.5)*40, chest.y + (Math.random()-0.5)*40, loot.item); // Sandık etrafına rastgele bırak
                    this.items.push(droppedItem); // Item'ı yere düşen eşyalar listesine ekle

                    // Network üzerinden Item oluştu bilgisini gönder (simülasyon)
                    this.networking.sendItemDrop(droppedItem);

                    // Sandık açıldı bilgisini sunucuya gönder (simülasyon)
                    this.networking.openChest(chest.id);
                } else if (loot) {
                     // Gelecekte farklı loot tipleri olabilir
                }
                
                break; // Bir sandıkla etkileşim yeterli
            }
        }
    }
    
    checkItemInteraction() {
        if (!this.currentPlayer || this.currentPlayer.isDead) return;

        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            const dx = this.currentPlayer.x - item.x;
            const dy = this.currentPlayer.y - item.y;
            const distance = Math.sqrt(dx*dx + dy*dy);

            // Oyuncuya yeterince yakınsa ve E tuşuna basılmışsa
            if (distance < this.currentPlayer.radius + item.radius + 30) { // Aynı etkileşim mesafesi
                // Eşyayı almaya çalış
                const pickedUp = item.pickup(this.currentPlayer);
                
                if (pickedUp) {
                    // Eşya başarıyla alındıysa listeden sil
                    this.items.splice(i, 1);
                    // Network üzerinden Item toplandı bilgisini gönder (simülasyon)
                    this.networking.sendItemPickup(item.id);
                    // UI güncellemesi otomatik update metodunda yapılacak
                }
                // Tek bir eşyayı almak yeterli olabilir, döngüden çık
                return; 
            }
        }
    }
    
    dropCurrentWeapon() {
        if (!this.currentPlayer || this.currentPlayer.isDead) return;

        const currentWeapon = this.currentPlayer.weapons[this.currentPlayer.currentWeaponIndex];
        // Başlangıç tabancası veya tek kalan silah atılamaz (isteğe bağlı kural)
        if (!currentWeapon || this.currentPlayer.weapons.length <= 1) { 
            this.showNotification("Bu silahı atamazsın!", 'error');
            return;
        }

        // Silahın bilgilerini alarak yere bırakılacak Item'ı oluştur
        const dropInfo = currentWeapon.getDropInfo();
        const itemId = 'item_' + Date.now() + Math.random().toString(16).slice(2); // Eşsiz ID
        
        // Oyuncunun biraz önüne Item bırak
        const dropDistance = this.currentPlayer.radius + 30;
        const dropX = this.currentPlayer.x + Math.cos(this.currentPlayer.rotation) * dropDistance + (Math.random()-0.5)*20; // Hafif rastgelelik
        const dropY = this.currentPlayer.y + Math.sin(this.currentPlayer.rotation) * dropDistance + (Math.random()-0.5)*20;

        const droppedItem = new Item(itemId, dropX, dropY, {
            name: dropInfo.name,
            type: 'weapon',
            item: currentWeapon, // Silah objesinin kendisini sakla
            sprite: dropInfo.sprite
        });

        this.items.push(droppedItem); // Item'ı yere düşen eşyalar listesine ekle
        
        // Oyuncunun envanterinden silahı sil
        this.currentPlayer.weapons.splice(this.currentPlayer.currentWeaponIndex, 1);
        // Silah indeksi kayabilir, 0. silaha geri dön (veya bir önceki silaha)
        this.currentPlayer.currentWeaponIndex = Math.max(0, this.currentPlayer.currentWeaponIndex - 1);

        this.showNotification(`${dropInfo.name} yere atıldı.`, 'info');
        // Network üzerinden Item düştü bilgisini gönder (simülasyon)
        this.networking.sendItemDrop(droppedItem);
        this.networking.sendPlayerUpdate(); // Envanter değiştiği için oyuncu bilgisini güncelle
    }
    
    update(deltaTime) {
        try {
            // Delta zamanı sınırla
            const cappedDelta = Math.min(deltaTime, 0.1); // Max 100ms

            // Oyuncuları güncelle
            for (const id in this.players) {
                // Oyuncunun kendi update metodunu çağır (hareket, silah update vb.)
                this.players[id].update(cappedDelta, this.map);
            }
            
            // Sadece mevcut oyuncunun ateş etme durumunu kontrol et ve mermi oluştur
            if (this.currentPlayer && this.currentPlayer.shooting && !this.currentPlayer.isDead) {
                 const currentWeapon = this.currentPlayer.weapons[this.currentPlayer.currentWeaponIndex];
                 if (currentWeapon && currentWeapon.canShoot()) {
                    // Ateş etme başarılı, mermiyi oluştur
                    currentWeapon.shoot(); // Silahın mermisini azalt

                    // Mermi oluşturma (silah tipine göre farklı olabilir)
                    // Şimdilik tüm mermiler aynı görünüyor, sonra sprite eklenecek
                    const angle = this.currentPlayer.rotation;
                    const playerSizeOffset = this.currentPlayer.radius + 10; // Merminin oyuncudan biraz önde başlaması için
                    const muzzleOffset = { // Namlu çıkış pozisyonu (basit bir tahmin)
                        x: Math.cos(angle) * playerSizeOffset,
                        y: Math.sin(angle) * playerSizeOffset
                    };
                    
                    // Mermi hızını silaha göre ayarla (örnek)
                    let projectileSpeed = 800; 
                    if (currentWeapon.type === 'shotgun') projectileSpeed = 600;
                    if (currentWeapon.type === 'pistol') projectileSpeed = 700;

                    const projectile = new Projectile(
                        this.playerId, // Mermiyi atan oyuncunun ID'si
                        this.currentPlayer.x + muzzleOffset.x,
                        this.currentPlayer.y + muzzleOffset.y,
                        angle,
                        projectileSpeed,  // silaha göre hız
                        currentWeapon.damage,
                        currentWeapon.type // Mermi tipi (hasar hesaplaması veya görsel için)
                    );
                    
                    // Yeni mermiyi listeye ekle
                    this.projectiles.push(projectile);
                    
                    // Ağ üzerinden mermi atma bilgisini gönder (simülasyon)
                    // Bu kısım gerçek networking server'da işlenmeli
                    this.networking.sendProjectile(projectile);
                 }
            }

            // Mermileri güncelle
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const projectile = this.projectiles[i];
                projectile.update(cappedDelta);
                
                // Haritadan çıkan veya eskiyen mermileri sil
                if (projectile.x < 0 || projectile.x > this.map.width || 
                    projectile.y < 0 || projectile.y > this.map.height ||
                    projectile.lifetime <= 0) {
                    this.projectiles.splice(i, 1);
                    continue;
                }
                
                // Engellere çarpma kontrolü
                if (this.map.checkCollision(projectile.x, projectile.y)) {
                    this.projectiles.splice(i, 1);
                    // Mermi çarpma efekti ekle (isteğe bağlı)
                    continue;
                }
                
                // Oyunculara çarpma kontrolü
                for (const id in this.players) {
                    // Kendimizin attığı mermi bize çarpmasın (veya takım arkadaşına)
                    if (id !== projectile.playerId) {
                        const player = this.players[id];
                        // Eğer oyuncu ölmüşse veya mermi görünmezse çarpma kontrolü yapma
                        if (player.isDead /* || projectile.isHidden */) continue; 

                        const dx = player.x - projectile.x;
                        const dy = player.y - projectile.y;
                        const distance = Math.sqrt(dx*dx + dy*dy);
                        
                        if (distance < player.radius) {
                            // Çarpma gerçekleşti - zırh hasarı absorbe eder
                            let damage = projectile.damage;
                            
                            // Zırh varsa hasarı azalt
                            if (player.armor > 0) {
                                const absorbedDamage = Math.min(player.armor, damage * 0.5); // Zırh %50 hasar emer
                                damage -= absorbedDamage;
                                player.armor -= absorbedDamage;
                            }
                            
                            // Kalan hasarı cana uygula
                            if (damage > 0) {
                                player.takeDamage(damage);
                            }
                            
                            // Mermiyi sil
                            this.projectiles.splice(i, 1);
                            
                            // Vuruş bilgisini gönder (Networking üzerinden)
                            // Bu kısım gerçek networkte hasar hesaplaması ve senkronizasyonu için kullanılacak
                            this.networking.sendPlayerUpdate(); 
                            
                            // Hasar verdiğimizi bildir (UI veya console)
                            console.log(`${id} oyuncusuna ${damage.toFixed(1)} hasar verildi! Kalan can: ${Math.ceil(player.health)}. Zırh: ${Math.ceil(player.armor)}`); // Debug için

                            // Eğer ölürse
                            if (player.health <= 0) {
                                console.log(`${id} oyuncusu öldü!`);
                                
                                // Öldürme istatistiğini artır (eğer vuran bizsek)
                                if (projectile.playerId === this.playerId) {
                                    const username = localStorage.getItem('currentUser');
                                    if (username) {
                                        const playerStats = JSON.parse(localStorage.getItem(`stats_${username}`) || '{"gamesPlayed": 0, "kills": 0, "deaths": 0}');
                                        playerStats.kills++;
                                        localStorage.setItem(`stats_${username}`, JSON.stringify(playerStats));
                                        console.log(`${username} ${player.username}'i öldürdü! Kill: ${playerStats.kills}`);
                                    }
                                }
                                
                                // Eğer ölen bizim oyuncumuzsa ölüm ekranını göster
                                if (id === this.playerId) {
                                    const username = localStorage.getItem('currentUser');
                                     if (username) {
                                        const playerStats = JSON.parse(localStorage.getItem(`stats_${username}`) || '{"gamesPlayed": 0, "kills": 0, "deaths": 0}');
                                        playerStats.deaths++;
                                        localStorage.setItem(`stats_${username}`, JSON.stringify(playerStats));
                                        console.log(`${username} öldü! Ölüm: ${playerStats.deaths}`);
                                    }
                                    this.playerDied();
                                } else {
                                     // Ölen başka bir oyuncuysa onu listeden veya haritadan kaldır (Network senkronizasyonu gerektirir)
                                     // Şimdilik sadece isDead bayrağını set ediyoruz, render metodu gizleyecek
                                }
                            }
                            
                            break; // Oyuncu vurulduysa mermi durur
                        }
                    }
                }
            }
            
            // UI güncellemesi
            this.updateUI();

            // Debug bilgisini güncelle
            this.updateDebugInfo();

        } catch (err) {
            console.error("Update hatası:", err);
            // Hata durumunda oyunu durdur veya lobiye dön (Opsiyonel)
            // this.leaveGame(); 
            // alert("Oyun sırasında bir hata oluştu! Lütfen tekrar deneyin.");
        }
    }
    
    updateUI() {
        if (!this.currentPlayer) {
            // console.log("updateUI: currentPlayer yok"); // Debug çıktısını kaldır
            return;
        }
        
        // UI elemanlarını al
        const healthEl = document.getElementById('player-health');
        const armorEl = document.getElementById('player-armor');
        const weaponEl = document.getElementById('current-weapon');
        const ammoEl = document.getElementById('ammo-display'); // Yeni mermi göstergesi
        const playersListEl = document.getElementById('players-list');
        
        // UI öğelerini güncelle
        healthEl.textContent = `Sağlık: ${Math.ceil(this.currentPlayer.health)}`;
        armorEl.textContent = `Zırh: ${Math.ceil(this.currentPlayer.armor)}`;
        
        // Silah göstergesi ve mermi bilgisi
        if (this.currentPlayer.weapons && this.currentPlayer.weapons[this.currentPlayer.currentWeaponIndex]) {
            const currentWeapon = this.currentPlayer.weapons[this.currentPlayer.currentWeaponIndex];
            weaponEl.textContent = `Silah: ${currentWeapon.name}`;
            ammoEl.textContent = `Mermi: ${currentWeapon.currentAmmo}/${currentWeapon.totalAmmo}`; // Mermi bilgisini göster
            
            // Reload durumunu da burada gösterebiliriz (isteğe bağlı)
            if (currentWeapon.reloading) {
                 ammoEl.textContent += ' (Yeniden Dolduruluyor...)';
            }
            
        } else {
             weaponEl.textContent = `Silah: Yok`;
             ammoEl.textContent = `Mermi: -/-`;
        }
        
        // Oyuncu listesi
        playersListEl.innerHTML = '';
        for (const id in this.players) {
            const player = this.players[id];
            const playerEl = document.createElement('div');
            playerEl.textContent = `${player.username}: ${Math.ceil(player.health)} HP`; // Canı yuvarla
            
            if (id === this.playerId) {
                playerEl.style.color = '#4CAF50'; // Kendimizi yeşil göster
            } else {
                 playerEl.style.color = '#FFA726'; // Diğer oyuncuları turuncu göster
            }
            
            playersListEl.appendChild(playerEl);
        }
    }
    
    render() {
        try {
            if (!this.ctx || !this.map || !this.currentPlayer) {
                console.error("Render: Gerekli nesneler eksik");
                return;
            }

            // Canvas'ı temizle
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Arkaplan
            this.ctx.fillStyle = '#2E7D32';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Haritayı çiz
            this.map.render(this.ctx, this.currentPlayer);
            
            // Sandıkları çiz
            for (const chest of this.chests) {
                try {
                    chest.render(this.ctx, this.currentPlayer);
                } catch (e) {console.error("Sandık çizim hatası:", e);}
            }

             // Yerdeki eşyaları çiz (oyunculardan önce çizilmeli)
            for (const item of this.items) {
                try {
                    item.render(this.ctx, this.currentPlayer);
                } catch (e) {console.error("Item çizim hatası:", e);}
            }
            
            // Mermileri çiz
            for (const projectile of this.projectiles) {
                try {
                    projectile.render(this.ctx, this.currentPlayer);
                } catch (e) {console.error("Mermi çizim hatası:", e);}
            }
            
            // Oyuncuları çiz
            for (const id in this.players) {
                try {
                    this.players[id].render(this.ctx, this.currentPlayer);
                } catch (e) {console.error("Oyuncu çizim hatası:", e);}
            }

             // UI elemanları canvas üzerine çizilmez, HTML olarak varlar
             // Debug bilgisi de HTML olarak var

        } catch (e) {
            console.error("Render genel hatası:", e);
        }
    }
    
    updateDebugInfo() {
        const debugEl = document.getElementById('debug-info');
        if (!debugEl) return;
        
        const info = {
            FPS: Math.round(1 / (this.lastDelta || 0.016)),
            PlayerPos: this.currentPlayer ? `${Math.floor(this.currentPlayer.x)}, ${Math.floor(this.currentPlayer.y)}` : 'N/A',
            Objects: {
                Players: Object.keys(this.players).length,
                Chests: this.chests.length,
                Projectiles: this.projectiles.length
            },
            Canvas: `${this.canvas.width}x${this.canvas.height}`
        };
        
        debugEl.innerHTML = Object.entries(info)
            .map(([key, value]) => {
                if (typeof value === 'object') {
                    return `${key}: ${Object.entries(value).map(([k, v]) => `${k}=${v}`).join(', ')}`;
                }
                return `${key}: ${value}`;
            })
            .join('<br>');
    }
    
    gameLoop(currentTime = 0) {
        // Oyun döngüsü bayrağını ayarla
        if (!this.gameLoopRunning) return;
        
        // Delta time hesapla (saniye cinsinden)
        if (!this.lastTime) this.lastTime = currentTime;
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // FPS sınırlama ve istikrar sağlama
        if (deltaTime < 0.001 || deltaTime > 1) {
            // Çok küçük veya çok büyük değerlerde güncelleme yapmadan atla
            requestAnimationFrame((time) => this.gameLoop(time));
            return;
        }
        
        this.update(deltaTime);
        this.render();
        
        this.lastDelta = deltaTime;
        this.updateDebugInfo(); // Debug bilgisini güncelle
        
        // Sonraki kareyi planla
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    // Oyuncu öldüğünde
    playerDied() {
        console.log("Oyuncu öldü!");
        
        // Ölüm ekranını göster
        document.getElementById('death-screen').classList.remove('hidden');
        
        // Oyuncuyu devre dışı bırak
        this.currentPlayer.isDead = true;
    }
    
    // Yeniden doğma
    respawnPlayer() {
        console.log("Oyuncu yeniden doğuyor...");
        
        // Ölüm ekranını gizle
        document.getElementById('death-screen').classList.add('hidden');
        
        // Oyuncuyu rastgele bir konumda yeniden oluştur
        // Harita içinde güvenli bir nokta bulma eklenebilir
        this.currentPlayer.x = 100 + Math.random() * (this.map.width - 200);
        this.currentPlayer.y = 100 + Math.random() * (this.map.height - 200);
        this.currentPlayer.health = 100;
        this.currentPlayer.armor = 0;
        this.currentPlayer.isDead = false; // Canlı hale getir
        
        // Silahları sıfırla (veya başlangıç silahlarını ver)
        this.currentPlayer.weapons = [
            new Pistol(),
            new Shotgun(),
            new Rifle()
        ];
        this.currentPlayer.currentWeaponIndex = 0;

        // Mermileri temizle (simülasyon için)
        this.projectiles = [];
        
        // Güncellemeyi gönder (Network üzerinden)
        this.networking.sendPlayerUpdate();
    }
    
    // Bildirim göstermek için yeni metot
    showNotification(message, type = 'info') {
        const notifContainer = document.getElementById('notification-container');
        
        if (!notifContainer) {
            // Konteyner yoksa oluştur
            const container = document.createElement('div');
            container.id = 'notification-container';
            container.style.position = 'absolute';
            container.style.top = '70px';
            container.style.right = '20px';
            container.style.zIndex = '1000';
            document.getElementById('game-screen').appendChild(container);
        }
        
        // Bildirimi oluştur
        const notification = document.createElement('div');
        notification.className = `game-notification ${type}`;
        notification.textContent = message;
        
        // Stil ekle
        notification.style.padding = '10px 15px';
        notification.style.marginBottom = '10px';
        notification.style.borderRadius = '5px';
        notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        notification.style.animation = 'fadeInOut 3s forwards';
        
        // Tip'e göre renk belirle
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#4CAF50';
                notification.style.color = 'white';
                break;
            case 'error':
                notification.style.backgroundColor = '#F44336';
                notification.style.color = 'white';
                break;
            case 'info':
                notification.style.backgroundColor = '#2196F3';
                notification.style.color = 'white';
                break;
            default:
                notification.style.backgroundColor = '#333';
                notification.style.color = 'white';
        }
        
        // Animasyon stilini ekle
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateX(50px); }
                10% { opacity: 1; transform: translateX(0); }
                80% { opacity: 1; transform: translateX(0); }
                100% { opacity: 0; transform: translateX(50px); }
            }
        `;
        document.head.appendChild(style);
        
        // Konteynere ekle
        document.getElementById('notification-container').appendChild(notification);
        
        // Belirli süre sonra kaldır
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Networking sınıfından gelen güncellemeleri işleme
    handleNetworkUpdate(update) {
        // console.log("Network güncellemesi alındı:", update); // Debug için

        // Oyuncu pozisyonları ve durumları
        if (update.players) {
            for (const playerId in update.players) {
                const playerData = update.players[playerId];
                if (this.players[playerId]) {
                    // Var olan oyuncunun durumunu güncelle
                    const player = this.players[playerId];
                    
                    // Sadece kendi oyuncumuz değilse pozisyonu güncelle
                    if (playerId !== this.playerId) {
                         // Yumuşak geçiş veya interpolasyon burada yapılabilir
                        player.x = playerData.x;
                        player.y = playerData.y;
                        player.rotation = playerData.rotation;
                        player.movement = playerData.movement; // Hareket durumu (animasyon için)
                         player.shooting = playerData.shooting; // Ateş durumu (animasyon/görsel için)
                         player.currentWeaponIndex = playerData.currentWeaponIndex; // Silah değişimi
                    }

                    // Can, zırh, isDead durumu gibi bilgileri her zaman güncelle
                    player.health = playerData.health;
                    player.armor = playerData.armor;
                     player.isDead = playerData.isDead; // Ölüm durumu

                    // Silah mermilerini ve reload durumunu güncelle (Networkten gelen data ile)
                    if (playerData.weapons) {
                         for(const updatedWeapon of playerData.weapons) {
                             const existingWeapon = player.weapons.find(w => w.type === updatedWeapon.type);
                             if (existingWeapon) {
                                 existingWeapon.currentAmmo = updatedWeapon.currentAmmo;
                                 existingWeapon.totalAmmo = updatedWeapon.totalAmmo;
                                 existingWeapon.reloading = updatedWeapon.reloading; // Reload durumunu senkronize et
                                 existingWeapon.reloadStartTime = updatedWeapon.reloadStartTime; // Reload zamanını da senkronize et
                                 existingWeapon.lastShootTime = updatedWeapon.lastShootTime; // Son ateş zamanını senkronize et
                             } else {
                                  // Eğer oyuncuda o silah yoksa envanterine ekle (Network senkronizasyonu)
                                   const weaponClass = { 'pistol': Pistol, 'shotgun': Shotgun, 'rifle': Rifle }[updatedWeapon.type];
                                    if (weaponClass) {
                                        const newWeapon = new weaponClass();
                                        newWeapon.currentAmmo = updatedWeapon.currentAmmo;
                                        newWeapon.totalAmmo = updatedWeapon.totalAmmo;
                                        newWeapon.reloading = updatedWeapon.reloading;
                                        newWeapon.reloadStartTime = updatedWeapon.reloadStartTime;
                                        newWeapon.lastShootTime = updatedWeapon.lastShootTime;
                                        player.addWeapon(newWeapon); // Oyuncuya silahı ekle
                                    }
                             }
                         }
                    }


                } else {
                    // Yeni oyuncu ekle (Sadece kendi oyuncumuz değilse)
                     if (playerId !== this.playerId) {
                        const newPlayer = new Player(
                            playerId,
                            playerData.username,
                            playerData.x,
                            playerData.y,
                            playerData.skin
                        );
                         // Yeni oyuncunun silahlarını ve diğer durumlarını set et (Network mesajında gelmeli)
                         if (playerData.weapons) {
                             newPlayer.weapons = playerData.weapons.map(wData => {
                                // weaponData'dan tam Weapon objesi oluştur
                                 const weaponClass = { 'pistol': Pistol, 'shotgun': Shotgun, 'rifle': Rifle }[wData.type];
                                 if (weaponClass) {
                                     const weapon = new weaponClass();
                                     weapon.currentAmmo = wData.currentAmmo;
                                     weapon.totalAmmo = wData.totalAmmo;
                                     weapon.reloading = wData.reloading;
                                     weapon.reloadStartTime = wData.reloadStartTime; // Reload zamanını da senkronize et
                                     weapon.lastShootTime = wData.lastShootTime; // Son ateş zamanını senkronize et
                                     return weapon;
                                 }
                                 return null; // Bilinmeyen silah tipi
                             }).filter(w => w !== null);
                             newPlayer.currentWeaponIndex = playerData.currentWeaponIndex;
                         }
                         newPlayer.health = playerData.health;
                         newPlayer.armor = playerData.armor;
                         newPlayer.isDead = playerData.isDead;

                         this.players[playerId] = newPlayer; // Oyuncuyu ekle
                         console.log(`Yeni oyuncu bağlandı: ${playerData.username} (${playerId})`);
                     }
                }
            }
            
            // Ayrılan oyuncuları listeden kaldır
            for (const playerId in this.players) {
                if (!update.players[playerId] && playerId !== this.playerId) {
                    console.log(`Oyuncu ayrıldı: ${this.players[playerId].username} (${playerId})`);
                    delete this.players[playerId];
                }
            }
        }

        // Item güncellemeleri (Yere düşen ve toplanan eşyalar) - Networkten gelen bilgi ile state'i senkronize et
        if (update.items) {
             // Yere yeni düşen eşyaları ekle
             for(const itemData of update.items.dropped || []) {
                 // Eğer bu item zaten bizde yoksa ekle (aynı itemın tekrar eklenmesini önle)
                 if (!this.items.find(item => item.id === itemData.id)) {
                     // Item data'dan tam Item objesi oluştur
                      let itemContent = itemData.itemData;
                     // Eğer item bir silahsa, tam Weapon objesi oluştur
                     if (itemContent.type === 'weapon' && itemContent.weaponData) {
                          const weaponClass = { 'pistol': Pistol, 'shotgun': Shotgun, 'rifle': Rifle }[itemContent.weaponData.type];
                         if (weaponClass) {
                              const weapon = new weaponClass();
                             // Silahın güncel mermisi ve toplam mermisi (atıldığında kalan)
                             weapon.currentAmmo = itemContent.weaponData.currentAmmo;
                             weapon.totalAmmo = itemContent.weaponData.totalAmmo;
                             itemContent.item = weapon; // Item data'ya tam silah objesini ekle
                         }
                     }
                     
                      const item = new Item(itemData.id, itemData.x, itemData.y, itemContent);
                     this.items.push(item);
                     console.log(`Network: Yeni eşya düştü: ${itemContent.name} (${itemData.id})`);
                 }
             }

             // Toplanan eşyaları listeden sil
             for(const itemId of update.items.pickedUp || []) {
                 const index = this.items.findIndex(item => item.id === itemId);
                 if (index !== -1) {
                     console.log(`Network: Eşya toplandı: ${this.items[index].itemData.name} (${itemId})`);
                     this.items.splice(index, 1);
                 }
             }
        }

         // Sandık güncellemeleri (Açılan sandıklar) - Networkten gelen bilgi ile state'i senkronize et
        if (update.chests) {
             for(const chestId of update.chests.opened || []) {
                 const chest = this.chests.find(c => c.id === chestId);
                 if (chest && !chest.opened) {
                     chest.opened = true;
                     chest.sprite.src = 'assets/chests/chest_opened.png';
                      console.log(`Network: Sandık açıldı: ${chest.id}`);
                 }
             }
        }

        // Mermi güncellemeleri (Network üzerinden gelen mermileri ekle ve senkronize et)
        if (update.projectiles) {
             // Ağdan gelen mermileri ekle
             for(const projData of update.projectiles) {
                 // Eğer bu mermi zaten bizde yoksa ekle (aynı merminin tekrar eklenmesini önle)
                 if (!this.projectiles.find(p => p.id === projData.id)) {
                      const projectile = new Projectile(
                         projData.playerId,
                         projData.x,
                         projData.y,
                         projData.angle,
                         projData.speed,
                         projData.damage,
                         projData.type, // Mermi tipi
                         projData.id // Merminin ağ üzerindeki kimliği
                     );
                     this.projectiles.push(projectile);
                     console.log(`Network: Yeni mermi görüldü (${projData.id})`);
                 }
             }

             // Ağda olmayan mermileri yerel listeden sil (senkronizasyon)
             // Bu daha gelişmiş bir network senkronizasyonu gerektirir.
             // Şimdilik sadece gelenleri ekliyoruz. Temizlik daha sonra eklenebilir.
        }


        // Diğer network güncellemeleri buraya eklenecek (oda listesi vb.)
    }
}

// Oyunu başlat
const game = new Game(); 