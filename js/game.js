class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.players = {};
        this.currentPlayer = null;
        this.map = null;
        this.chests = [];
        this.projectiles = [];
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
        if (!this.currentPlayer) return;
        
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
                break;
            case '1':
            case '2':
            case '3':
                this.currentPlayer.switchWeapon(parseInt(e.key) - 1);
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
        if (!this.currentPlayer) return;
        
        // Oyuncunun yakındaki sandıkları kontrol et
        for (const chest of this.chests) {
            const dx = this.currentPlayer.x - chest.x;
            const dy = this.currentPlayer.y - chest.y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            if (distance < 70 && !chest.opened) { // Etkileşim mesafesini artır
                // Sandığı aç
                const loot = chest.open(this.currentPlayer);
                
                if (loot) {
                    // Sandık içeriğine göre işlem yap
                    switch (loot.type) {
                        case 'weapon':
                            // Silahı envantere ekle
                            const weaponIndex = this.currentPlayer.addWeapon(loot.item);
                            
                            // Otomatik olarak yeni silaha geç
                            if (weaponIndex !== -1) {
                                this.currentPlayer.currentWeaponIndex = weaponIndex;
                                this.showNotification(`${loot.item.name} alındı ve seçildi!`, 'success');
                            } else {
                                this.showNotification(`${loot.item.name} buldun!`, 'success');
                            }
                            break;
                        case 'armor':
                            this.currentPlayer.addArmor(loot.amount);
                            this.showNotification(`${loot.amount} zırh buldun!`, 'info');
                            break;
                        case 'health':
                            this.currentPlayer.health = Math.min(100, this.currentPlayer.health + loot.amount);
                            this.showNotification(`${loot.amount} can yenilendi!`, 'success');
                            break;
                        case 'ammo':
                            const currentWeapon = this.currentPlayer.weapons[this.currentPlayer.currentWeaponIndex];
                            currentWeapon.totalAmmo += loot.amount;
                            this.showNotification(`${loot.amount} mermi buldun!`, 'info');
                            break;
                    }
                    
                    // Sandık açıldı bilgisini sunucuya gönder
                    this.networking.sendPlayerUpdate();
                    this.networking.openChest(chest.id);
                }
                
                break;
            }
        }
    }
    
    update(deltaTime) {
        try {
            // Delta zamanı sınırla
            const cappedDelta = Math.min(deltaTime, 0.1);
            
            // Oyuncuları güncelle
            for (const id in this.players) {
                this.players[id].update(cappedDelta, this.map);
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
                    continue;
                }
                
                // Oyunculara çarpma kontrolü
                for (const id in this.players) {
                    // Kendimizin attığı mermi bize çarpmasın
                    if (id !== projectile.playerId) {
                        const player = this.players[id];
                        const dx = player.x - projectile.x;
                        const dy = player.y - projectile.y;
                        const distance = Math.sqrt(dx*dx + dy*dy);
                        
                        if (distance < player.radius) {
                            // Çarpma gerçekleşti - zırh hasarı absorbe eder
                            let damage = projectile.damage;
                            
                            // Zırh varsa hasarı azalt
                            if (player.armor > 0) {
                                const absorbedDamage = Math.min(player.armor, damage * 0.5);
                                damage -= absorbedDamage;
                                player.armor -= absorbedDamage;
                            }
                            
                            player.takeDamage(damage);
                            
                            // Mermiyi sil
                            this.projectiles.splice(i, 1);
                            
                            // Vuruş bilgisini gönder
                            this.networking.sendPlayerUpdate();
                            
                            // Hasar verdiğimizi bildir
                            console.log(`${id} oyuncusuna ${damage} hasar verildi! Kalan can: ${player.health}`);
                            
                            // Eğer ölürse
                            if (player.health <= 0) {
                                console.log(`${id} oyuncusu öldü!`);
                                
                                // Öldürme istatistiğini artır
                                if (projectile.playerId === this.playerId) {
                                    const username = localStorage.getItem('currentUser');
                                    if (username) {
                                        const playerStats = JSON.parse(localStorage.getItem(`stats_${username}`) || '{"gamesPlayed": 0, "kills": 0}');
                                        playerStats.kills++;
                                        localStorage.setItem(`stats_${username}`, JSON.stringify(playerStats));
                                    }
                                }
                                
                                // Eğer ölen bizim oyuncumuzsa ölüm ekranını göster
                                if (id === this.playerId) {
                                    this.playerDied();
                                }
                            }
                            
                            break;
                        }
                    }
                }
            }
            
            // Sadece basit mermi oluşturma kullan (network olmadan)
            if (this.currentPlayer && this.currentPlayer.shooting && !this.currentPlayer.isDead) {
                const currentTime = Date.now();
                const currentWeapon = this.currentPlayer.weapons[this.currentPlayer.currentWeaponIndex];
                
                if (currentWeapon && currentTime - this.currentPlayer.lastShootTime > currentWeapon.fireRate && currentWeapon.currentAmmo > 0) {
                    // Basit mermi oluştur
                    currentWeapon.currentAmmo--;
                    
                    // Tek bir mermi oluştur (pompalı silah için bir tane bile)
                    const angle = this.currentPlayer.rotation;
                    const offsetX = Math.cos(angle) * 30;
                    const offsetY = Math.sin(angle) * 30;
                    
                    const projectile = new Projectile(
                        this.playerId,
                        this.currentPlayer.x + offsetX,
                        this.currentPlayer.y + offsetY,
                        angle,
                        500,  // sabit hız
                        currentWeapon.damage
                    );
                    
                    // Sadece yerel olarak ekle
                    this.projectiles.push(projectile);
                    this.currentPlayer.lastShootTime = currentTime;
                }
            }
            
            // UI güncellemesi
            this.updateUI();
        } catch (err) {
            console.error("Update hatası:", err);
        }
    }
    
    updateUI() {
        if (!this.currentPlayer) {
            console.log("updateUI: currentPlayer yok");
            return;
        }
        
        // UI elemanlarını al
        const healthEl = document.getElementById('player-health');
        const armorEl = document.getElementById('player-armor');
        const weaponEl = document.getElementById('current-weapon');
        const ammoEl = document.getElementById('ammo-display');
        const playersListEl = document.getElementById('players-list');
        
        // UI öğelerini güncelle
        healthEl.textContent = `Sağlık: ${Math.ceil(this.currentPlayer.health)}`;
        armorEl.textContent = `Zırh: ${Math.ceil(this.currentPlayer.armor)}`;
        
        // Silah göstergesi
        if (this.currentPlayer.weapons && this.currentPlayer.weapons[this.currentPlayer.currentWeaponIndex]) {
            const currentWeapon = this.currentPlayer.weapons[this.currentPlayer.currentWeaponIndex];
            weaponEl.textContent = `Silah: ${currentWeapon.name}`;
            ammoEl.textContent = `Mermi: ${currentWeapon.currentAmmo}/${currentWeapon.maxAmmo}`;
        }
        
        // Oyuncu listesi
        playersListEl.innerHTML = '';
        for (const id in this.players) {
            const player = this.players[id];
            const playerEl = document.createElement('div');
            playerEl.textContent = `${player.username}: ${player.health} HP`;
            
            if (id === this.playerId) {
                playerEl.style.color = '#4CAF50';
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
                } catch (e) {}
            }
            
            // Mermileri çiz
            for (const projectile of this.projectiles) {
                try {
                    projectile.render(this.ctx, this.currentPlayer);
                } catch (e) {}
            }
            
            // Oyuncuları çiz
            for (const id in this.players) {
                try {
                    this.players[id].render(this.ctx, this.currentPlayer);
                } catch (e) {}
            }
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
        this.currentPlayer.x = 100 + Math.random() * 1800;
        this.currentPlayer.y = 100 + Math.random() * 1800;
        this.currentPlayer.health = 100;
        this.currentPlayer.armor = 0;
        this.currentPlayer.isDead = false;
        
        // Silahları sıfırla
        this.currentPlayer.weapons = [
            new Pistol(),
            new Shotgun(),
            new Rifle()
        ];
        this.currentPlayer.currentWeaponIndex = 0;
        
        // Güncellemeyi gönder
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
}

// Oyunu başlat
const game = new Game(); 