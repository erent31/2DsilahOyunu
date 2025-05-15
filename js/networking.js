class Networking {
    constructor(game) {
        this.game = game;
        this.baseUrl = 'http://localhost:3000'; // Sunucu URL'inizi buraya yazın
        this.rooms = [];
        
        // Odaları localStorage'da takip etmek için
        this.initLocalRooms();
        
        // Gerçek oyuncuları takip etmek için
        this.connectedPlayers = {};
        
        // Gerçek bir sunucu yerine basit bir mock socket yapısı
        this.socket = {
            emit: (event, data, callback) => {
                console.log(`Socket emit: ${event}`, data);
                
                if (event === 'get_rooms') {
                    callback(this.getLocalRooms());
                } 
                else if (event === 'create_room') {
                    const newRoom = { 
                        id: Date.now().toString(), 
                        name: data.name, 
                        players: 0, 
                        maxPlayers: 8,
                        active: true,
                        connectedPlayers: [] // Bu odadaki oyuncuları takip et
                    };
                    this.addLocalRoom(newRoom);
                    callback(newRoom);
                } 
                else if (event === 'join_game') {
                    // Oyuncu ID'si oluştur
                    const username = localStorage.getItem('currentUser');
                    const playerId = `player_${username}_${Date.now()}`;
                    
                    // Rastgele bir skin seç
                    const characterTypes = ['blue', 'red', 'green', 'yellow', 'purple'];
                    const randomSkin = characterTypes[Math.floor(Math.random() * characterTypes.length)];
                    
                    // Oyuncuyu odaya ekle
                    const roomData = this.addPlayerToRoom(data.roomId, playerId, username);
                    
                    // Oyun verisi hazırla
                    const gameData = {
                        roomId: data.roomId,
                        playerId: playerId,
                        map: { width: 2000, height: 2000, obstacles: [] },
                        players: {},
                        chests: this.generateChests()
                    };
                    
                    // Mevcut oyuncuyu ekle
                    gameData.players[playerId] = { 
                        id: playerId, 
                        x: 100 + Math.random() * 100, 
                        y: 100 + Math.random() * 100, 
                        username: username,
                        health: 100,
                        skin: randomSkin // Skin'i ekle
                    };
                    
                    // Odadaki diğer oyuncuları da ekle
                    if (roomData && roomData.connectedPlayers) {
                        for (const player of roomData.connectedPlayers) {
                            if (player.id !== playerId) {
                                gameData.players[player.id] = {
                                    id: player.id,
                                    x: player.x || 100 + Math.random() * 200,  
                                    y: player.y || 100 + Math.random() * 200,
                                    username: player.username,
                                    health: 100,
                                    skin: 'player'
                                };
                            }
                        }
                    }
                    
                    console.log("Oyun verileri hazırlandı:", gameData);
                    callback(gameData);
                }
                else if (event === 'leave_game') {
                    this.removePlayerFromRoom(data.roomId, this.game.playerId);
                    callback();
                }
                else if (event === 'player_update') {
                    // Oyuncu güncellemesini kaydet
                    this.updatePlayerInRoom(data.roomId, this.game.playerId, data.player);
                    callback();
                }
            }
        };
        
        // Periyodik olarak odaları kontrol et ve oyuncu güncellemelerini al
        setInterval(() => {
            if (this.game.roomId && this.game.playerId) {
                this.checkForNewPlayers();
                this.syncPlayerPositions();
            }
        }, 1000);
    }
    
    // LocalStorage'dan odaları başlat
    initLocalRooms() {
        if (!localStorage.getItem('gameRooms')) {
            localStorage.setItem('gameRooms', JSON.stringify([]));
        }
    }
    
    // LocalStorage'dan odaları al
    getLocalRooms() {
        try {
            const data = localStorage.getItem('gameRooms');
            if (!data) return [];
            
            // Doğrudan array oluştur
            return JSON.parse(data) || [];
        } catch (e) {
            console.error("localStorage hatası:", e);
            // Tamamen temiz veri döndür
            return [];
        }
    }
    
    // LocalStorage'a oda ekle
    addLocalRoom(room) {
        try {
            const rooms = this.getLocalRooms();
            rooms.push(room);
            localStorage.setItem('gameRooms', JSON.stringify(rooms));
        } catch (e) {
            console.error("LocalStorage'a oda eklerken hata:", e);
        }
    }
    
    // Oyuncuyu odaya ekle
    addPlayerToRoom(roomId, playerId, username) {
        try {
            const rooms = this.getLocalRooms();
            let targetRoom = null;
            
            // Farklı karakter renkleri ve tipleri
            const characterTypes = ['red', 'blue', 'green', 'yellow', 'purple'];
            
            // Rastgele skin yerine kullanıcı adına göre belirle (senkronizasyon için)
            const nameHashSum = username.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
            const skinIndex = nameHashSum % characterTypes.length;
            const playerSkin = characterTypes[skinIndex];
            
            for (let i = 0; i < rooms.length; i++) {
                if (rooms[i].id === roomId) {
                    // Oyuncu zaten odada mı kontrol et
                    if (!rooms[i].connectedPlayers) {
                        rooms[i].connectedPlayers = [];
                    }
                    
                    // Aynı kullanıcı adı ve ID'ye sahip oyuncu varsa kaldır
                    rooms[i].connectedPlayers = rooms[i].connectedPlayers.filter(
                        p => p.username !== username && p.id !== playerId
                    );
                    
                    // Yeni oyuncuyu ekle (username'e bağlı skin ile)
                    rooms[i].connectedPlayers.push({
                        id: playerId,
                        username: username,
                        x: 200 + Math.floor(nameHashSum % 10) * 150, // Konum da username'e bağlı olsun
                        y: 200 + Math.floor(nameHashSum % 7) * 150,
                        skin: playerSkin,
                        health: 100,
                        armor: 0,
                        isDead: false
                    });
                    
                    rooms[i].players = rooms[i].connectedPlayers.length;
                    targetRoom = rooms[i];
                    break;
                }
            }
            
            localStorage.setItem('gameRooms', JSON.stringify(rooms));
            return targetRoom;
        } catch (e) {
            console.error("Oyuncu odaya eklenirken hata:", e);
            return null;
        }
    }
    
    // Oyuncuyu odadan çıkar
    removePlayerFromRoom(roomId, playerId) {
        const rooms = this.getLocalRooms();
        
        for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].id === roomId && rooms[i].connectedPlayers) {
                rooms[i].connectedPlayers = rooms[i].connectedPlayers.filter(p => p.id !== playerId);
                rooms[i].players = rooms[i].connectedPlayers.length;
                break;
            }
        }
        
        localStorage.setItem('gameRooms', JSON.stringify(rooms));
    }
    
    // Odadaki oyuncu pozisyonunu güncelle
    updatePlayerInRoom(roomId, playerId, playerData) {
        const rooms = this.getLocalRooms();
        
        for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].id === roomId && rooms[i].connectedPlayers) {
                for (let j = 0; j < rooms[i].connectedPlayers.length; j++) {
                    if (rooms[i].connectedPlayers[j].id === playerId) {
                        rooms[i].connectedPlayers[j].x = playerData.x || rooms[i].connectedPlayers[j].x;
                        rooms[i].connectedPlayers[j].y = playerData.y || rooms[i].connectedPlayers[j].y;
                        break;
                    }
                }
                break;
            }
        }
        
        localStorage.setItem('gameRooms', JSON.stringify(rooms));
    }
    
    // Rastgele sandıklar oluştur
    generateChests() {
        const chests = [];
        const numChests = 10 + Math.floor(Math.random() * 10);
        for (let i = 0; i < numChests; i++) {
            chests.push({
                id: 'chest_' + i,
                x: 100 + Math.random() * 1800,
                y: 100 + Math.random() * 1800,
                opened: false
            });
        }
        return chests;
    }
    
    // Yeni oyuncuları kontrol et ve oyuna ekle
    checkForNewPlayers() {
        try {
            const rooms = this.getLocalRooms();
            
            for (const room of rooms) {
                if (room.id === this.game.roomId && room.connectedPlayers) {
                    for (const player of room.connectedPlayers) {
                        if (!player || !player.id || !player.username) continue;
                        
                        // Kendimiz değilsek ve oyuncu henüz oyunda değilse ekle
                        if (!this.game.players[player.id] && player.id !== this.game.playerId) {
                            console.log(`Yeni oyuncu bulundu: ${player.username}`);
                            
                            try {
                                // Yeni oyuncuyu oyuna ekle
                                const newPlayer = new Player(
                                    player.id,
                                    player.username,
                                    player.x || 100 + Math.random() * 200,
                                    player.y || 100 + Math.random() * 200,
                                    'player'
                                );
                                
                                this.game.players[player.id] = newPlayer;
                            } catch (err) {
                                console.error("Oyuncu oluşturma hatası:", err);
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Yeni oyuncuları kontrol ederken hata:", err);
        }
    }
    
    // Oyuncu pozisyonlarını senkronize et
    syncPlayerPositions() {
        try {
            const rooms = this.getLocalRooms();
            
            for (const room of rooms) {
                if (room.id === this.game.roomId && room.connectedPlayers) {
                    for (const player of room.connectedPlayers) {
                        if (!player || !player.id) continue;
                        
                        if (player.id !== this.game.playerId && this.game.players[player.id]) {
                            // Tüm oyuncu bilgilerini güncelle
                            if (player.x !== undefined) this.game.players[player.id].x = player.x;
                            if (player.y !== undefined) this.game.players[player.id].y = player.y;
                            if (player.rotation !== undefined) this.game.players[player.id].rotation = player.rotation;
                            if (player.health !== undefined) this.game.players[player.id].health = player.health;
                            if (player.armor !== undefined) this.game.players[player.id].armor = player.armor;
                            if (player.isDead !== undefined) this.game.players[player.id].isDead = player.isDead;
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Oyuncu pozisyonlarını senkronize ederken hata:", err);
        }
    }
    
    getRooms() {
        this.socket.emit('get_rooms', {}, (rooms) => {
            this.rooms = rooms;
            this.updateRoomList();
            this.updatePlayerInfo();
        });
    }
    
    updateRoomList() {
        const roomListEl = document.getElementById('room-list');
        roomListEl.innerHTML = '';
        
        if (this.rooms.length === 0) {
            const emptyRoomMessage = document.createElement('div');
            emptyRoomMessage.className = 'empty-room-message';
            emptyRoomMessage.textContent = 'Hiç oda yok. Yeni bir oda oluşturun!';
            roomListEl.appendChild(emptyRoomMessage);
            return;
        }
        
        for (const room of this.rooms) {
            const roomEl = document.createElement('div');
            roomEl.className = 'room-item';
            roomEl.dataset.id = room.id;
            
            // Oda statü rengini belirle
            let statusColor = 'var(--success-color)';
            if (room.players >= room.maxPlayers) {
                statusColor = 'var(--error-color)';
            } else if (room.players > 0) {
                statusColor = 'var(--info-color)';
            }
            
            const roomInfo = document.createElement('div');
            roomInfo.className = 'room-info';
            roomInfo.innerHTML = `
                <h3>${room.name}</h3>
                <p>Oyuncular: <span style="color: ${statusColor};">${room.players}/${room.maxPlayers}</span></p>
                <p class="room-status ${room.active ? 'active' : 'inactive'}">${room.active ? 'Aktif' : 'Bekleniyor'}</p>
            `;
            
            const joinBtn = document.createElement('button');
            joinBtn.textContent = 'Katıl';
            joinBtn.disabled = room.players >= room.maxPlayers;
            if (joinBtn.disabled) {
                joinBtn.style.opacity = '0.5';
                joinBtn.style.cursor = 'not-allowed';
            }
            joinBtn.addEventListener('click', () => {
                if (!joinBtn.disabled) {
                    this.joinGame(room.id);
                }
            });
            
            roomEl.appendChild(roomInfo);
            roomEl.appendChild(joinBtn);
            roomListEl.appendChild(roomEl);
        }
    }
    
    createRoom() {
        const roomName = prompt('Oda adı:', 'Yeni Oda');
        if (!roomName) return;
        
        this.socket.emit('create_room', { name: roomName }, (room) => {
            this.rooms.push(room);
            this.updateRoomList();
            this.game.auth.showMessage(`"${roomName}" odası oluşturuldu!`, 'success');
        });
    }
    
    joinGame(roomId) {
        // Katılma animasyonu
        const roomEl = document.querySelector(`.room-item[data-id="${roomId}"]`);
        if (roomEl) roomEl.classList.add('joining');
        
        setTimeout(() => {
            this.socket.emit('join_game', { roomId }, (gameData) => {
                // Oyun sayısını artır
                const username = localStorage.getItem('currentUser');
                if (username) {
                    const playerStats = JSON.parse(localStorage.getItem(`stats_${username}`) || '{"gamesPlayed": 0, "kills": 0}');
                    playerStats.gamesPlayed++;
                    localStorage.setItem(`stats_${username}`, JSON.stringify(playerStats));
                }
                
                console.log("Oyuna katılma verisi alındı:", gameData);
                
                // Oyunu başlat - doğru oyuncu ID'sini gönderelim
                this.game.startGame(roomId, gameData.playerId);
            });
        }, 500); // Animasyon süresiyle eşleştir
    }
    
    leaveGame(roomId) {
        this.socket.emit('leave_game', { roomId }, () => {
            this.game.showScreen('lobby-screen');
            this.getRooms();
        });
    }
    
    sendPlayerUpdate() {
        try {
            if (!this.game.currentPlayer || !this.game.roomId) return;
            
            // Hız sınırlaması
            const now = Date.now();
            if (this.lastUpdateTime && now - this.lastUpdateTime < 100) return;
            this.lastUpdateTime = now;
            
            // Tüm oyuncu bilgilerini gönder
            const data = {
                roomId: this.game.roomId,
                player: {
                    x: this.game.currentPlayer.x,
                    y: this.game.currentPlayer.y,
                    rotation: this.game.currentPlayer.rotation,
                    health: this.game.currentPlayer.health,
                    armor: this.game.currentPlayer.armor,
                    isDead: this.game.currentPlayer.isDead
                }
            };
            
            // Göndermeyi dene
            setTimeout(() => {
                try {
                    this.socket.emit('player_update', data, () => {});
                } catch (e) {
                    console.error("Player update hatası:", e);
                }
            }, 0);
        } catch (e) {
            console.error("sendPlayerUpdate hatası:", e);
        }
    }
    
    hitPlayer(playerId, damage) {
        this.socket.emit('hit_player', {
            roomId: this.game.roomId,
            playerId,
            damage
        });
    }
    
    openChest(chestId) {
        this.socket.emit('open_chest', {
            roomId: this.game.roomId,
            chestId
        });
    }
    
    updatePlayerInfo() {
        const username = localStorage.getItem('currentUser');
        if (!username) return;
        
        // Local Storage'dan oyuncu istatistiklerini al (varsa)
        const playerStats = JSON.parse(localStorage.getItem(`stats_${username}`) || '{"gamesPlayed": 0, "kills": 0}');
        
        // UI elemanlarını güncelle
        const usernameEl = document.getElementById('player-username');
        const gamesPlayedEl = document.getElementById('games-played');
        const killsEl = document.getElementById('kills');
        
        if (usernameEl) usernameEl.textContent = username;
        if (gamesPlayedEl) gamesPlayedEl.textContent = playerStats.gamesPlayed;
        if (killsEl) killsEl.textContent = playerStats.kills;
    }
    
    // Diğer oyunculardan gelen mermi bilgisini işle
    onProjectileReceived(projectileData) {
        const projectile = new Projectile(
            projectileData.playerId,
            projectileData.x,
            projectileData.y,
            projectileData.angle,
            projectileData.speed,
            projectileData.damage
        );
        
        this.game.projectiles.push(projectile);
    }
    
    // Oyuncudan atış yapıldığında
    handlePlayerShoot(playerId, weaponType, x, y, angle) {
        // Bu bir simülasyon, gerçek uygulamada server tarafından gelecek
        const player = this.game.players[playerId];
        if (player) {
            const currentWeapon = player.weapons[player.currentWeaponIndex];
            const projectiles = currentWeapon.shoot(playerId, x, y, angle);
            
            // Her mermiyi oyun dünyasına ekle
            projectiles.forEach(projectile => {
                this.game.projectiles.push(projectile);
            });
        }
    }
    
    // Oyuna gerçek oyuncu ekleme (farklı hesapla giriş yapıldığında)
    addRealPlayer(playerData) {
        if (!this.game.players[playerData.id]) {
            const newPlayer = new Player(
                playerData.id,
                playerData.username,
                playerData.x,
                playerData.y,
                playerData.skin || 'player'
            );
            
            this.game.players[playerData.id] = newPlayer;
            console.log(`Yeni oyuncu eklendi: ${playerData.username}`);
            
            // Oda oyuncu sayısını güncelle
            if (this.game.roomId) {
                for (const room of this.rooms) {
                    if (room.id === this.game.roomId) {
                        room.players = Object.keys(this.game.players).length;
                        break;
                    }
                }
            }
        }
    }
} 