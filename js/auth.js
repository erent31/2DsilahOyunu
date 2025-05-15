class Auth {
    constructor(game) {
        this.game = game;
        this.currentUser = null;
        
        // Kullanıcı bilgilerini merkezi bir konumda sakla - tarayıcılar arası erişim için
        this.userDatabase = "OnlineSilah2DUsers";
        
        // Oturum süresi (1 gün)
        this.sessionDuration = 24 * 60 * 60 * 1000; 
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Event listeners'ları sadece bir kere ekle
        document.getElementById('login-btn').removeEventListener('click', this.login.bind(this)); // Önceki dinleyiciyi kaldır
        document.getElementById('register-btn').removeEventListener('click', this.register.bind(this)); // Önceki dinleyiciyi kaldır
        document.getElementById('show-register').removeEventListener('click', () => this.game.showScreen('register-screen')); // Önceki dinleyiciyi kaldır
        document.getElementById('show-login').removeEventListener('click', () => this.game.showScreen('login-screen')); // Önceki dinleyiciyi kaldır

        document.getElementById('login-btn').addEventListener('click', this.login.bind(this));
        document.getElementById('register-btn').addEventListener('click', this.register.bind(this));
        document.getElementById('show-register').addEventListener('click', () => this.game.showScreen('register-screen'));
        document.getElementById('show-login').addEventListener('click', () => this.game.showScreen('login-screen'));
        document.getElementById('logout-btn').addEventListener('click', this.logout.bind(this));
    }
    
    login() {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        if (!username || !password) {
            this.game.showNotification('Kullanıcı adı ve şifre girin!', 'error');
            return;
        }
        
        // Kullanıcıları localStorage'dan al
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        
        if (users[username] && users[username].password === password) {
            // Giriş başarılı
            this.createSession(username);
            this.game.showNotification(`Hoş geldiniz, ${username}!`, 'success');
            this.game.showScreen('lobby-screen');
            this.game.networking.getRooms(); // Odayı yenile
        } else {
            this.game.showNotification('Hatalı kullanıcı adı veya şifre!', 'error');
        }
    }
    
    register() {
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        
        if (!username || !password) {
            this.game.showNotification('Kullanıcı adı ve şifre girin!', 'error');
            return;
        }
        
        // Kullanıcıları localStorage'dan al
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        
        if (users[username]) {
            // Kullanıcı adı zaten var
            this.game.showNotification('Bu kullanıcı adı zaten alınmış!', 'error');
        } else {
            // Yeni kullanıcı ekle
            users[username] = { password: password };
            localStorage.setItem('users', JSON.stringify(users));

            this.game.showNotification('Kayıt başarılı! Giriş yapabilirsiniz.', 'success');
            this.game.showScreen('login-screen'); // Kayıt sonrası giriş ekranına dön
        }
    }
    
    logout() {
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('sessionExpiresAt');
        localStorage.removeItem('currentUser');
        this.game.showNotification('Çıkış yapıldı.', 'info');
        this.game.showScreen('login-screen');
        
        // Oyun içi durumu temizle ve networking'i sıfırla
        this.game.leaveGame();
        this.game.networking.reset(); // Networking durumunu sıfırla
    }
    
    checkAuth() {
        const token = localStorage.getItem('sessionToken');
        const expiresAt = localStorage.getItem('sessionExpiresAt');
        const username = localStorage.getItem('currentUser');
        
        if (token && expiresAt && username && Date.now() < parseInt(expiresAt)) {
            // Oturum geçerli, networking'e bildir
            this.game.networking.setAuth(token, username);
            return true; // Oturum geçerli
        } else {
            // Oturum yok veya süresi dolmuş, temizle
            this.logout();
            return false;
        }
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
    
    // Oturum oluştur
    createSession(username) {
        const sessionToken = Math.random().toString(36).substring(2); // Basit token
        const expiresAt = Date.now() + this.sessionDuration;

        localStorage.setItem('sessionToken', sessionToken);
        localStorage.setItem('sessionExpiresAt', expiresAt);
        localStorage.setItem('currentUser', username); // Mevcut kullanıcıyı kaydet

        // Token ve kullanıcı adını networking'e bildir (simülasyon için)
        this.game.networking.setAuth(sessionToken, username);
    }
} 