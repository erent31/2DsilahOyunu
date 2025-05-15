class Item {
    constructor(id, x, y, itemData) {
        this.id = id; // Eşsiz kimlik
        this.x = x;
        this.y = y;
        this.radius = 20; // Etkileşim mesafesi ve çizim boyutu
        this.itemData = itemData; // Sandıktan gelen item bilgisi (name, type, amount/weaponData vb.)
        
        this.sprite = new Image();
        // ItemData'da sprite varsa onu kullan, yoksa varsayılan
        this.sprite.src = itemData.sprite || 'assets/items/default_item.png'; 
    }

    render(ctx, cameraPlayer) {
        // Kamera ofsetini hesapla
        const offsetX = ctx.canvas.width / 2 - cameraPlayer.x;
        const offsetY = ctx.canvas.height / 2 - cameraPlayer.y;
        
        const screenX = this.x + offsetX;
        const screenY = this.y + offsetY;

        // Ekran dışındaysa çizme
        if (screenX < -50 || screenX > ctx.canvas.width + 50 ||
            screenY < -50 || screenY > ctx.canvas.height + 50) {
            return;
        }
        
        // Eşya görselini çiz
        try {
             // Sprite yüklendiyse çiz
            if (this.sprite.complete && this.sprite.naturalWidth > 0) {
                 const size = this.radius * 2;
                 ctx.drawImage(this.sprite, screenX - this.radius, screenY - this.radius, size, size);
            } else {
                 // Sprite yüklenmediyse veya yoksa placeholder çiz
                 ctx.fillStyle = 'grey';
                 ctx.beginPath();
                 ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
                 ctx.fill();
            }
        } catch (e) {
            console.error("Item.render: Sprite çizim hatası", e);
             // Hata durumunda placeholder çiz
             ctx.fillStyle = 'grey';
             ctx.beginPath();
             ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
             ctx.fill();
        }

        // Eğer oyuncu yakınsa isim ve etkileşim metnini çiz
        const dx = cameraPlayer.x - this.x;
        const dy = cameraPlayer.y - this.y;
        const distance = Math.sqrt(dx*dx + dy*dy);

        if (distance < cameraPlayer.radius + this.radius + 30) { // Oyuncuya yeterince yakınsa
            ctx.fillStyle = 'white';
            ctx.shadowBlur = 5;
            ctx.shadowColor = 'black';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            
            // Eşya adını çiz
            ctx.fillText(this.itemData.name, screenX, screenY - this.radius - 10);
            
            // Etkileşim promptunu çiz
            ctx.font = '10px Arial';
            ctx.fillText('[E] Al', screenX, screenY - this.radius - 2);

            ctx.shadowBlur = 0; // Shadow'u kapat
        }
    }
    
    // Eşyayı almayı simüle et
    pickup(player) {
        // Item tipine göre oyuncuya ekle
        switch (this.itemData.type) {
            case 'weapon':
                // Silahı oyuncunun envanterine ekle
                const weaponIndex = player.addWeapon(this.itemData.item);
                 // Eğer yeni bir silaha geçildiyse veya mevcut silaha mermi eklendiyse bildirim göster
                if (weaponIndex !== -1) { // addWeapon artık index dönüyor
                    // Otomatik olarak yeni silaha geç (isteğe bağlı, şimdilik geçmeyelim)
                    // player.currentWeaponIndex = weaponIndex;
                     game.showNotification(`${this.itemData.name} alındı!`, 'success');
                     return true; // Alındı
                } else {
                     // Silah zaten var ve mermi eklendi
                      game.showNotification(`${this.itemData.name} için mermi alındı!`, 'success');
                      return true; // Alındı
                }
                
            case 'armor':
                player.addArmor(this.itemData.amount);
                game.showNotification(`${this.itemData.amount} zırh alındı!`, 'info');
                return true; // Alındı

            case 'health':
                player.health = Math.min(100, player.health + this.itemData.amount);
                 game.showNotification(`${this.itemData.amount} can alındı!`, 'success');
                return true; // Alındı

            case 'ammo':
                 const ammoAdded = player.addAmmo(this.itemData.ammoType, this.itemData.amount);
                 if(ammoAdded) {
                     game.showNotification(`${this.itemData.amount} ${this.itemData.ammoType.toUpperCase()} mermisi alındı!`, 'success');
                     return true; // Alındı
                 } else {
                     // Silah yoksa alınamaz
                      game.showNotification(`Envanterde ${this.itemData.ammoType.toUpperCase()} silahı yok!`, 'error');
                     return false; // Alınamadı
                 }
        }
        return false; // Bilinmeyen item tipi
    }
} 