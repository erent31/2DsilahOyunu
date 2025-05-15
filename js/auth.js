class Auth {
    constructor(game) {
        this.game = game;
        this.currentUser = null;
        
        // Kullanıcı bilgilerini merkezi bir konumda sakla - tarayıcılar arası erişim için
        this.userDatabase = "OnlineSilah2DUsers";
    }
    
    login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            this.showMessage('Kullanıcı adı ve şifre gerekli!', 'error');
            return;
        }
        
        // Tüm kullanıcıları al (herhangi bir tarayıcıdan erişilebilir)
        const users = this.getAllUsers();
        
        // Kullanıcıyı bul
        const user = users.find(u => u.username === username);
        
        if (!user || user.password !== password) {
            this.showMessage('Geçersiz kullanıcı adı veya şifre!', 'error');
            return;
        }
        
        // Giriş başarılı - local storage'a kaydet
        localStorage.setItem('currentUser', username);
        localStorage.setItem('authToken', this.generateToken(username));
        
        // Kullanıcı istatistiklerini başlat (yeni ise)
        if (!localStorage.getItem(`stats_${username}`)) {
            localStorage.setItem(`stats_${username}`, JSON.stringify({
                gamesPlayed: 0,
                kills: 0
            }));
        }
        
        // Kullanıcı bilgilerini güncelle
        this.currentUser = username;
        this.showMessage(`Hoş geldin, ${username}!`, 'success');
        
        // Geçiş animasyonu ekle
        document.getElementById('login-screen').classList.add('fade-out');
        
        setTimeout(() => {
            this.game.showScreen('lobby-screen');
            this.game.networking.getRooms();
        }, 500);
    }
    
    register() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            this.showMessage('Kullanıcı adı ve şifre gerekli!', 'error');
            return;
        }
        
        if (username.length < 3) {
            this.showMessage('Kullanıcı adı en az 3 karakter olmalı!', 'error');
            return;
        }
        
        if (password.length < 4) {
            this.showMessage('Şifre en az 4 karakter olmalı!', 'error');
            return;
        }
        
        // Tüm kullanıcıları al
        const users = this.getAllUsers();
        
        // Kullanıcı zaten var mı kontrol et
        if (users.find(u => u.username === username)) {
            this.showMessage('Bu kullanıcı adı zaten alınmış!', 'error');
            return;
        }
        
        // Yeni kullanıcı ekle
        users.push({
            username: username,
            password: password,
            createdAt: new Date().toISOString()
        });
        
        // Kullanıcıları kaydet
        this.saveAllUsers(users);
        
        // Otomatik giriş yap
        localStorage.setItem('currentUser', username);
        localStorage.setItem('authToken', this.generateToken(username));
        
        // Kullanıcı istatistiklerini başlat
        localStorage.setItem(`stats_${username}`, JSON.stringify({
            gamesPlayed: 0,
            kills: 0
        }));
        
        this.currentUser = username;
        this.showMessage(`Kayıt başarılı! Hoş geldin, ${username}!`, 'success');
        
        // Geçiş animasyonu ekle
        document.getElementById('login-screen').classList.add('fade-out');
        
        setTimeout(() => {
            this.game.showScreen('lobby-screen');
            this.game.networking.getRooms();
        }, 500);
    }
    
    logout() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        this.currentUser = null;
        this.game.showScreen('login-screen');
    }
    
    checkAuth() {
        const username = localStorage.getItem('currentUser');
        const token = localStorage.getItem('authToken');
        
        if (username && token) {
            // Kullanıcıyı doğrula
            const users = this.getAllUsers();
            const user = users.find(u => u.username === username);
            
            if (user) {
                // Tokeni yenile
                localStorage.setItem('authToken', this.generateToken(username));
                this.currentUser = username;
                return true;
            }
        }
        
        return false;
    }
    
    showMessage(message, type = 'info') {
        const messageElement = document.getElementById('login-message');
        messageElement.textContent = message;
        messageElement.className = `message ${type}`;
        
        // Mesajı göster
        messageElement.style.opacity = 1;
        
        // 3 saniye sonra gizle
        setTimeout(() => {
            messageElement.style.opacity = 0;
        }, 3000);
    }
    
    generateToken(username) {
        // Sabit, tutarlı bir token üret (Date.now() kullanma)
        return btoa(`${username}-OnlineSilah2D-secure-token`);
    }
    
    // KULLANICI VERİTABANI YÖNETİMİ - TÜM TARAYICILAR İÇİN
    getAllUsers() {
        // Önce localStorage'dan okumayı dene
        let usersData = localStorage.getItem(this.userDatabase);
        
        try {
            if (usersData) {
                return JSON.parse(usersData) || [];
            }
        } catch (e) {
            console.error("Kullanıcı verileri çözümlenemedi", e);
        }
        
        return [];
    }
    
    // İnsan-dostu veri kopyalama
    saveAllUsers(users) {
        try {
            localStorage.setItem(this.userDatabase, JSON.stringify(users));
            
            // Kullanıcıya veri kopyalama bilgisi göster
            const userData = JSON.stringify(users);
            const copyText = `localStorage.setItem('${this.userDatabase}', '${userData}');`;
            
            // Daha görünür bir bildirim göster
            alert("Kullanıcı verileri kaydedildi! Diğer tarayıcıda giriş yapmak istiyorsanız, çıkan konsol mesajını kopyalayın.");
            
            console.log("%c ÖNEMLİ: BU KODU KOPYALAYIN VE YENİ TARAYICIDA KONSOLA YAPIŞTIRIN", 
                       "background: red; color: white; font-size: 16px");
            console.log(copyText);
        } catch (e) {
            console.error("Kullanıcı verileri kaydedilemedi", e);
            alert("Kullanıcı verileri kaydedilemedi: " + e.message);
        }
    }
} 