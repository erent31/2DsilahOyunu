class Networking {
    constructor(game) {
        this.game = game;
        this.socket = null; // Gerçek WebSocket nesnesi
        this.roomId = null;
        this.playerId = null;
        this.username = null; // Giriş yapan kullanıcı adı
        this.isAuthenticated = false;

        this.localRooms = []; // Simülasyon: Oda listesi
        this.playersInRoom = {}; // Simülasyon: Odadaki oyuncular

        this.setupSocket();
    }

    setupSocket() {
        // WebSocket bağlantısı kurulacak (Sunucu adresini güncelleyin)
        // if (!this.socket) {
        //     this.socket = new WebSocket('ws://localhost:8080'); // Sunucu adresiniz
        //     this.socket.onopen = () => console.log('WebSocket bağlantısı kuruldu.');
        //     this.socket.onmessage = (event) => this.handleMessage(event);
        //     this.socket.onerror = (event) => console.error('WebSocket hatası:', event);
        //     this.socket.onclose = (event) => {
        //         console.log('WebSocket bağlantısı kapatıldı:', event.code, event.reason);
        //         // Bağlantı kapanınca lobiye dön
        //         this.game.leaveGame();
        //         this.game.showNotification('Sunucu bağlantısı kesildi!', 'error');
        //     };
        // }

        // Şimdilik gerçek network yerine simülasyon kullanıyoruz
        console.log("Networking simülasyon modunda çalışıyor.");
        // Simülasyon için periyodik güncelleme
         this.simInterval = setInterval(() => this.simulateNetworkUpdate(), 100);
    }

     // Simülasyon: Periyodik network güncellemesi gönder
    simulateNetworkUpdate() {
         if (!this.roomId || !this.game.currentPlayer) return;

         // Simülasyon amaçlı diğer oyuncuların pozisyonlarını ve durumlarını senkronize et
         const playersUpdate = {};
         for (const playerId in this.playersInRoom[this.roomId]) {
              const playerSimData = this.playersInRoom[this.roomId][playerId];
             // Networkteymiş gibi player objesinin sadece gerekli verilerini gönder
             playersUpdate[playerId] = {
                 id: playerId,
                 username: playerSimData.username,
                 x: playerSimData.x,
                 y: playerSimData.y,
                 rotation: playerSimData.rotation,
                 skin: playerSimData.skin,
                 health: playerSimData.health,
                 armor: playerSimData.armor,
                 isDead: playerSimData.isDead,
                 movement: playerSimData.movement,
                 shooting: playerSimData.shooting,
                 currentWeaponIndex: playerSimData.currentWeaponIndex,
                 // Silah bilgileri (mermi ve reload durumu için)
                 weapons: playerSimData.weapons ? playerSimData.weapons.map(w => ({
                     type: w.type,
                     currentAmmo: w.currentAmmo,
                     totalAmmo: w.totalAmmo,
                     reloading: w.reloading,
                     reloadStartTime: w.reloadStartTime,
                     lastShootTime: w.lastShootTime
                 })) : []
             };
         }

         // Simülasyon: Mermi, Item ve Sandık güncellemelerini topla
         const itemsUpdate = {
             dropped: [], // Yeni düşen itemlar
             pickedUp: [] // Toplanan item ID'leri
         };
          const chestsUpdate = {
              opened: [] // Açılan sandık ID'leri
          };
          const projectilesUpdate = []; // Yeni atılan mermiler

          // Game objesinden item, chest ve projectile state'ini al (Simülasyon için)
          // Normalde bu bilgiler sunucudan gelmeli
          // Bu kısım simülasyon olduğu için game state'ini doğrudan kullanıyoruz
          // Gerçek networkte bu mantık değişir.

         // Network güncelleme objesini oluştur
         const update = {
             type: 'gameStateUpdate',
             players: playersUpdate,
             items: itemsUpdate, // Simülasyon olduğu için boş gönderiliyor, game state'inden alınıyor
             chests: chestsUpdate, // Simülasyon olduğu için boş gönderiliyor
             projectiles: projectilesUpdate // Simülasyon olduğu için boş gönderiliyor
         };

         // Network mesajını işle (Kendimizden kendimize mesaj gönderme gibi)
         this.handleMessage({ data: JSON.stringify(update) });

    }


    // Mesaj geldiğinde
    handleMessage(event) {
        const message = JSON.parse(event.data);

        switch (message.type) {
            case 'roomsList':
                this.localRooms = message.rooms; // Oda listesini güncelle
                this.game.showRooms(this.localRooms); // UI'da odaları göster
                break;
            case 'roomCreated':
                this.game.showNotification(`Oda oluşturuldu: ${message.roomId}`, 'success');
                this.getRooms(); // Oda listesini yenile
                break;
            case 'joinedRoom':
                console.log(`Odaya katıldı: ${message.roomId}`);
                this.roomId = message.roomId;
                this.playerId = message.playerId;
                 this.game.showNotification(`Odaya katıldınız: ${message.roomId}`, 'success');
                 // Odaya katıldıktan sonra oyun başlatılır
                this.game.startGame(this.roomId, this.playerId);
                break;
            case 'joinError':
                console.error(`Odaya katılma hatası: ${message.message}`);
                this.game.showNotification(`Odaya katılma hatası: ${message.message}`, 'error');
                break;
            case 'playerJoined':
                console.log(`Oyuncu odaya katıldı: ${message.playerId}`);
                 // Game sınıfı bu bilgiyi işleyecek (handleNetworkUpdate içinde)
                this.getRooms(); // Oyuncu sayısı güncellendiği için oda listesini yenile
                break;
             case 'playerLeft':
                console.log(`Oyuncu odadan ayrıldı: ${message.playerId}`);
                 // Game sınıfı bu bilgiyi işleyecek (handleNetworkUpdate içinde)
                this.getRooms(); // Oyuncu sayısı güncellendiği için oda listesini yenile
                 break;
            case 'gameStateUpdate':
                 // Oyun durumu güncellemelerini Game sınıfına gönder
                 // Simülasyon modunda bu mesaj simulateNetworkUpdate'ten gelir
                 // Gerçek networkte sunucudan gelir
                 this.game.handleNetworkUpdate(message);
                 break;
             case 'itemDropped':
                 // Sunucudan gelen Item düştü bilgisi (Gerçek networkte kullanılacak)
                 console.log("Network: Item düştü", message.itemData);
                 // Game sınıfı handleNetworkUpdate içinde işleyecek
                 break;
             case 'itemPickedUp':
                 // Sunucudan gelen Item toplandı bilgisi (Gerçek networkte kullanılacak)
                 console.log("Network: Item toplandı", message.itemId);
                 // Game sınıfı handleNetworkUpdate içinde işleyecek
                 break;
            case 'chestOpened':
                // Sunucudan gelen sandık açıldı bilgisi (Gerçek networkte kullanılacak)
                console.log("Network: Sandık açıldı", message.chestId);
                // Game sınıfı handleNetworkUpdate içinde işleyecek
                break;
            case 'projectileFired':
                 // Sunucudan gelen mermi atıldı bilgisi (Gerçek networkte kullanılacak)
                console.log("Network: Mermi atıldı", message.projectileData);
                 // Game sınıfı handleNetworkUpdate içinde işleyecek
                break;

            default:
                console.warn('Bilinmeyen mesaj tipi:', message.type, message);
        }
    }

    // Auth bilgilerini set et
    setAuth(token, username) {
        this.isAuthenticated = true;
        this.username = username;
        // Gerçek networkte token sunucuya gönderilerek doğrulanır
        console.log(`Auth bilgileri set edildi: ${username}`);
    }

    // Oda listesini al (Simülasyon)
    getRooms() {
        if (!this.isAuthenticated) {
            this.game.showNotification("Oda listesi için giriş yapın!", 'error');
            return;
        }
        console.log("Oda listesi alınıyor...");
         // Simülasyon: Mevcut odaları döndür
         const rooms = Object.keys(this.playersInRoom).map(roomId => ({
             id: roomId,
             playerCount: Object.keys(this.playersInRoom[roomId]).length
         }));
         this.handleMessage({ type: 'roomsList', rooms: rooms });
    }

    // Oda oluştur (Simülasyon)
    createRoom() {
        if (!this.isAuthenticated) {
            this.game.showNotification("Oda oluşturmak için giriş yapın!", 'error');
            return;
        }
        // Basit bir oda ID'si oluştur (Simülasyon)
        const roomId = 'room_' + Math.random().toString(36).substring(2, 7);
        this.playersInRoom[roomId] = {}; // Yeni odayı ekle
        console.log(`Oda oluşturuldu (Simülasyon): ${roomId}`);
        this.handleMessage({ type: 'roomCreated', roomId: roomId });
    }

    // Odaya katıl (Simülasyon)
    joinRoom(roomId) {
         if (!this.isAuthenticated) {
            this.game.showNotification("Odaya katılmak için giriş yapın!", 'error');
            return;
        }
        if (this.roomId) {
            this.game.showNotification("Zaten bir odadasınız!", 'error');
            return;
        }

        if (this.playersInRoom[roomId]) {
             const playerId = this.username; // Oyuncu ID'si olarak kullanıcı adını kullan (Simülasyon)
             if (!this.playersInRoom[roomId][playerId]) {
                 // Oyuncuyu odaya ekle (Simülasyon)
                  this.playersInRoom[roomId][playerId] = {
                      id: playerId,
                      username: this.username,
                      x: 100 + Math.random() * 1800, // Başlangıç pozisyonu
                      y: 100 + Math.random() * 1800,
                      skin: ['blue', 'red', 'green', 'yellow', 'purple'][Math.floor(Math.random() * 5)], // Rastgele skin
                      health: 100,
                      armor: 0,
                      isDead: false,
                      movement: { up: false, down: false, left: false, right: false },
                      shooting: false,
                      rotation: 0,
                       // Silahları başlangıç olarak ekle (Simülasyon)
                      weapons: [new Pistol(), new Shotgun(), new Rifle()].map(w => ({
                             type: w.type,
                             currentAmmo: w.currentAmmo,
                             totalAmmo: w.totalAmmo,
                             reloading: w.reloading,
                             reloadStartTime: w.reloadStartTime,
                             lastShootTime: w.lastShootTime
                      })),
                       currentWeaponIndex: 0
                  };
                 console.log(`${this.username} odaya katıldı (Simülasyon): ${roomId}`);
                 this.handleMessage({ type: 'joinedRoom', roomId: roomId, playerId: playerId });
                 // Diğer oyunculara yeni oyuncunun katıldığını bildir (Simülasyon)
                 this.handleMessage({ type: 'playerJoined', roomId: roomId, playerId: playerId });

             } else {
                  this.handleMessage({ type: 'joinError', message: 'Zaten bu odadasınız veya kullanıcı adı kullanımda.' });
             }
        } else {
            this.handleMessage({ type: 'joinError', message: 'Oda bulunamadı.' });
        }
    }

    // Odadan ayrıl (Simülasyon)
    leaveGame(roomId = this.roomId) {
        if (roomId && this.playersInRoom[roomId] && this.playerId) {
             console.log(`${this.username} odadan ayrılıyor (Simülasyon): ${roomId}`);
            delete this.playersInRoom[roomId][this.playerId];
            // Eğer oda boşalırsa odayı sil (isteğe bağlı)
            if (Object.keys(this.playersInRoom[roomId]).length === 0) {
                delete this.playersInRoom[roomId];
                 console.log(`Oda boşaldı, silindi (Simülasyon): ${roomId}`);
            }
            // Diğer oyunculara ayrıldığımızı bildir (Simülasyon)
             this.handleMessage({ type: 'playerLeft', roomId: roomId, playerId: this.playerId });

            this.roomId = null;
            this.playerId = null;
            this.game.showNotification('Odadan ayrıldınız.', 'info');
        }
    }

    // Oyuncu güncellemesi gönder (Simülasyon)
    sendPlayerUpdate() {
        if (!this.roomId || !this.playerId || !this.game.currentPlayer) return;

        // Mevcut oyuncunun durumunu simülasyon odasında güncelle
        const player = this.game.currentPlayer;
        if (this.playersInRoom[this.roomId] && this.playersInRoom[this.roomId][this.playerId]) {
             const simPlayer = this.playersInRoom[this.roomId][this.playerId];
             simPlayer.x = player.x;
             simPlayer.y = player.y;
             simPlayer.rotation = player.rotation;
             simPlayer.movement = player.movement;
             simPlayer.shooting = player.shooting;
             simPlayer.health = player.health;
             simPlayer.armor = player.armor;
             simPlayer.isDead = player.isDead;
             simPlayer.currentWeaponIndex = player.currentWeaponIndex;
             // Silah mermilerini ve reload durumunu da senkronize et
             if (player.weapons) {
                 simPlayer.weapons = player.weapons.map(w => ({
                     type: w.type,
                     currentAmmo: w.currentAmmo,
                     totalAmmo: w.totalAmmo,
                     reloading: w.reloading,
                     reloadStartTime: w.reloadStartTime,
                     lastShootTime: w.lastShootTime
                 }));
             }
        }

        // Gerçek networkte bu data sunucuya gönderilir
        // console.log("Oyuncu güncellemesi gönderildi (Simülasyon)");
        // this.socket.send(JSON.stringify({
        //     type: 'playerUpdate',
        //     roomId: this.roomId,
        //     playerId: this.playerId,
        //     x: player.x,
        //     y: player.y,
        //     rotation: player.rotation,
        //     movement: player.movement,
        //     shooting: player.shooting,
        //     health: player.health,
        //     armor: player.armor,
        //     isDead: player.isDead,
        //     currentWeaponIndex: player.currentWeaponIndex,
        //      weapons: player.weapons.map(w => ({ // Silah bilgileri de gönderilir
        //          type: w.type,
        //          currentAmmo: w.currentAmmo,
        //          totalAmmo: w.totalAmmo,
        //          reloading: w.reloading,
        //          reloadStartTime: w.reloadStartTime,
        //          lastShootTime: w.lastShootTime
        //      }))
        // }));
    }

     // Mermi atma bilgisi gönder (Simülasyon)
     sendProjectile(projectile) {
         if (!this.roomId || !this.playerId) return;
         // Gerçek networkte mermi bilgisi sunucuya gönderilir
         // console.log("Mermi atıldı bilgisi gönderildi (Simülasyon)");
         // this.socket.send(JSON.stringify({
         //     type: 'fireProjectile',
         //     roomId: this.roomId,
         //     playerId: this.playerId,
         //      // Merminin kimliği, pozisyonu, hızı, açısı, hasarı, tipi vb. bilgiler gönderilir
         //     projectileData: {
         //          // id: projectile.id, // Sunucu ID atayabilir
         //          x: projectile.x,
         //          y: projectile.y,
         //          angle: projectile.angle,
         //          speed: projectile.speed,
         //          damage: projectile.damage,
         //          type: projectile.type
         //      }
         // }));
     }

     // Item düştü bilgisi gönder (Simülasyon)
     sendItemDrop(item) {
         if (!this.roomId) return;
          // Gerçek networkte item bilgisi sunucuya gönderilir
         // console.log("Item düştü bilgisi gönderildi (Simülasyon)", item.itemData.name);
         // this.socket.send(JSON.stringify({
         //     type: 'itemDrop',
         //     roomId: this.roomId,
         //     // Item'ın kimliği, pozisyonu ve içeriği (silahsa tüm bilgileri) gönderilir
         //     itemData: {
         //          id: item.id,
         //          x: item.x,
         //          y: item.y,
         //          // Item içeriği (silahsa silah bilgileri, mermiyse miktarı ve tipi vb.)
         //          itemData: {
         //              name: item.itemData.name,
         //              type: item.itemData.type,
         //              amount: item.itemData.amount, // Health/Armor/Ammo için
         //              ammoType: item.itemData.ammoType, // Ammo için
         //               // Silah bilgileri (eğer item bir silahsa)
         //              weaponData: item.itemData.type === 'weapon' ? {
         //                   type: item.itemData.item.type,
         //                   currentAmmo: item.itemData.item.currentAmmo,
         //                   totalAmmo: item.itemData.item.totalAmmo
         //              } : undefined,
         //              sprite: item.itemData.sprite
         //          }
         //      }
         // }));
     }

      // Item toplandı bilgisi gönder (Simülasyon)
     sendItemPickup(itemId) {
         if (!this.roomId || !this.playerId) return;
          // Gerçek networkte item kimliği sunucuya gönderilir
         // console.log("Item toplandı bilgisi gönderildi (Simülasyon)", itemId);
         // this.socket.send(JSON.stringify({
         //     type: 'itemPickup',
         //     roomId: this.roomId,
         //     playerId: this.playerId, // Kimin topladığı bilgisi
         //     itemId: itemId
         // }));
     }

      // Sandık açıldı bilgisi gönder (Simülasyon)
     openChest(chestId) {
          if (!this.roomId || !this.playerId) return;
          // Gerçek networkte sandık kimliği sunucuya gönderilir
         // console.log("Sandık açıldı bilgisi gönderildi (Simülasyon)", chestId);
          // this.socket.send(JSON.stringify({
         //      type: 'openChest',
         //      roomId: this.roomId,
         //      playerId: this.playerId,
         //      chestId: chestId
         //  }));
     }


     // Networking durumunu sıfırla (logout veya bağlantı kesildiğinde)
     reset() {
         this.roomId = null;
         this.playerId = null;
         this.isAuthenticated = false;
         this.username = null;
         this.localRooms = [];
         this.playersInRoom = {}; // Simülasyon state'ini de sıfırla
         // Eğer gerçek socket varsa kapat
         // if (this.socket) {
         //     this.socket.close();
         //     this.socket = null;
         // }
         // Simülasyon intervalini temizle
         clearInterval(this.simInterval);
     }
} 