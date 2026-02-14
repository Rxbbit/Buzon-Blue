import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

// ==========================================
// FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBunpuwWjk1T63YTj9bZAeiISmRdGyGfh4",
    authDomain: "buzonblue-573a5.firebaseapp.com",
    projectId: "buzonblue-573a5",
    storageBucket: "buzonblue-573a5.firebasestorage.app",
    messagingSenderId: "642713028077",
    appId: "1:642713028077:web:3e595b404bca80ff1513e4"
};

// Initialize Firebase
let app, db;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (e) {
    console.error("Error inicializando Firebase. Asegúrate de configurar las credenciales.", e);
}

// ==========================================
// DATA MANAGEMENT
// ==========================================

const ADMIN_PASSWORD = 'ChaterinaAzuleja17';

class LetterManager {
    constructor(onLettersUpdated) {
        this.letters = [];
        this.onLettersUpdated = onLettersUpdated;
        this.unsubscribe = null;

        if (db) {
            this.initRealtimeListener();
        }
    }

    initRealtimeListener() {
        // Escuchar cambios en tiempo real en la colección 'letters'
        // Ordenadas por fecha descendente (más nuevas primero)
        const q = query(collection(db, "letters"), orderBy("date", "desc"), limit(100));

        this.unsubscribe = onSnapshot(q, (snapshot) => {
            this.letters = snapshot.docs.map(doc => ({
                id: doc.id, // Firestore ID (string)
                ...doc.data()
            }));

            // Notificar a la app que hay nuevos datos
            if (this.onLettersUpdated) {
                this.onLettersUpdated(this.letters);
            }
        }, (error) => {
            console.error("Error escuchando cartas:", error);
            // Si falla (ej. permisos o config incorrecta), avisar
            if (error.code === 'permission-denied') {
                alert("Error de permisos: Asegúrate de que Firestore esté en 'Test Mode' o configura las reglas de seguridad.");
            } else if (error.code === 'failed-precondition') {
                // A veces pasa si falta un índice, pero para esto no debería
                console.warn(error);
            }
        });
    }

    async addLetter(sender, message) {
        if (!db) throw new Error("Firebase no está configurado");

        const letter = {
            sender: sender || 'Anónimo',
            message: message,
            date: new Date().toISOString(),
            read: false,
            reviewed: false
        };

        // Guardar en Firestore
        const docRef = await addDoc(collection(db, "letters"), letter);
        return { id: docRef.id, ...letter };
    }

    getLetter(id) {
        return this.letters.find(letter => letter.id === id);
    }

    async markAsRead(id) {
        if (!db) return;
        const letterRef = doc(db, "letters", id);
        await updateDoc(letterRef, { read: true });
        // No necesitamos actualizar this.letters manualmente, onSnapshot lo hará
    }

    async markAsReviewed(id) {
        if (!db) return;
        const letterRef = doc(db, "letters", id);
        await updateDoc(letterRef, { reviewed: true });
    }

    async deleteLetter(id) {
        if (!db) return;
        const letterRef = doc(db, "letters", id);
        await deleteDoc(letterRef);
    }

    getStats() {
        const total = this.letters.length;
        const read = this.letters.filter(l => l.read).length;
        const unread = total - read;
        return { total, read, unread };
    }
}

// ==========================================
// APP CONTROLLER
// ==========================================

class BuzonApp {
    constructor() {
        // Pasar callback para actualizar la UI cuando cambien los datos
        this.letterManager = new LetterManager(() => {
            this.updateStats();
            if (this.currentView === 'admin') {
                this.renderLetters();
            }
        });

        this.currentView = 'user';
        this.currentLetterId = null;
        this.isLoggedIn = false;

        this.initElements();
        this.initEventListeners();
        this.initTheme();
        // updateStats se llamará automáticamente cuando carguen los datos
    }

    initElements() {
        // Views
        this.loginView = document.getElementById('loginView');
        this.userView = document.getElementById('userView');
        this.adminView = document.getElementById('adminView');

        // Login elements
        this.adminPassword = document.getElementById('adminPassword');
        this.loginBtn = document.getElementById('loginBtn');
        this.backToUserBtn = document.getElementById('backToUserBtn');

        // User view elements
        this.senderName = document.getElementById('senderName');
        this.letterMessage = document.getElementById('letterMessage');
        this.sendLetterBtn = document.getElementById('sendLetterBtn');
        this.letterCount = document.getElementById('letterCount');
        this.adminAccessBtn = document.getElementById('adminAccessBtn');

        // Admin view elements
        this.totalLetters = document.getElementById('totalLetters');
        this.unreadLetters = document.getElementById('unreadLetters');
        this.readLetters = document.getElementById('readLetters');
        this.lettersGrid = document.getElementById('lettersGrid');
        this.logoutBtn = document.getElementById('logoutBtn');

        // Modal elements
        this.letterModal = document.getElementById('letterModal');
        this.closeModal = document.getElementById('closeModal');
        this.modalSender = document.getElementById('modalSender');
        this.modalDate = document.getElementById('modalDate');
        this.modalMessage = document.getElementById('modalMessage');
        this.reviewedBadge = document.getElementById('reviewedBadge');
        this.markReadBtn = document.getElementById('markReadBtn');
        this.markReviewedBtn = document.getElementById('markReviewedBtn');
        this.deleteLetterBtn = document.getElementById('deleteLetterBtn');

        // Controls
        this.themeToggle = document.getElementById('themeToggle');
    }

    initEventListeners() {
        // Login
        this.loginBtn.addEventListener('click', () => this.handleLogin());
        this.adminPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        this.backToUserBtn.addEventListener('click', () => this.switchView('user'));

        // User view
        this.sendLetterBtn.addEventListener('click', () => this.handleSendLetter());
        this.adminAccessBtn.addEventListener('click', () => this.switchView('login'));

        // Admin view
        this.logoutBtn.addEventListener('click', () => this.handleLogout());

        // Modal
        this.closeModal.addEventListener('click', () => this.closeLetterModal());
        this.letterModal.querySelector('.modal-overlay').addEventListener('click', () => this.closeLetterModal());
        this.markReadBtn.addEventListener('click', () => this.handleMarkAsRead());
        this.markReviewedBtn.addEventListener('click', () => this.handleMarkAsReviewed());
        this.deleteLetterBtn.addEventListener('click', () => this.handleDeleteLetter());

        // Controls
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    initTheme() {
        const savedTheme = localStorage.getItem('buzonBlueTheme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
        }
    }


    // ==========================================
    // VIEW MANAGEMENT
    // ==========================================

    switchView(view) {
        // Remove active class from all views
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

        // Activate the selected view
        switch (view) {
            case 'user':
                this.userView.classList.add('active');
                this.currentView = 'user';
                this.updateStats();
                break;
            case 'login':
                this.loginView.classList.add('active');
                this.currentView = 'login';
                this.adminPassword.value = '';
                this.adminPassword.focus();
                break;
            case 'admin':
                if (this.isLoggedIn) {
                    this.adminView.classList.add('active');
                    this.currentView = 'admin';
                    this.renderLetters();
                    this.updateStats();
                } else {
                    this.switchView('login');
                }
                break;
        }
    }

    handleLogin() {
        const password = this.adminPassword.value;

        if (password === ADMIN_PASSWORD) {
            this.isLoggedIn = true;
            this.switchView('admin');
        } else {
            this.adminPassword.value = '';
            this.adminPassword.placeholder = 'Contraseña incorrecta, intenta de nuevo';
            this.adminPassword.classList.add('error');
            setTimeout(() => {
                this.adminPassword.placeholder = 'Contraseña de administrador';
                this.adminPassword.classList.remove('error');
            }, 2000);
        }
    }

    handleLogout() {
        this.isLoggedIn = false;
        this.switchView('user');
    }

    // ==========================================
    // LETTER MANAGEMENT
    // ==========================================

    async handleSendLetter() {
        const sender = this.senderName.value.trim();
        const message = this.letterMessage.value.trim();

        if (!message) {
            this.letterMessage.focus();
            return;
        }

        // Mostrar estado de carga
        const originalBtnText = this.sendLetterBtn.innerHTML;
        this.sendLetterBtn.disabled = true;
        this.sendLetterBtn.innerHTML = '<span>Enviando...</span>';

        try {
            await this.letterManager.addLetter(sender, message);

            // Clear form
            this.senderName.value = '';
            this.letterMessage.value = '';

            // Update stats (handled by listener, but good to ensure)
            this.updateStats();

            // Show success animation
            this.showSuccessMessage();
        } catch (error) {
            console.error(error);
            if (error.message.includes("Firebase")) {
                alert('Error de configuración: Faltan las claves de Firebase en el código.');
            } else {
                alert('Error al enviar la carta: ' + error.message);
            }
        } finally {
            this.sendLetterBtn.disabled = false;
            this.sendLetterBtn.innerHTML = originalBtnText;
        }
    }

    showSuccessMessage() {
        const message = document.createElement('div');
        message.className = 'success-message';
        message.textContent = '✉️ ¡Carta enviada con éxito!';
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--accent-gradient);
            color: white;
            padding: 20px 40px;
            border-radius: 15px;
            font-size: 1.2rem;
            font-weight: 600;
            box-shadow: 0 10px 40px var(--glow-purple);
            z-index: 9999;
            animation: popIn 0.5s ease;
        `;

        document.body.appendChild(message);

        setTimeout(() => {
            message.style.animation = 'fadeOut 0.5s ease';
            setTimeout(() => message.remove(), 500);
        }, 2000);
    }

    renderLetters() {
        this.lettersGrid.innerHTML = '';
        // letters están ordenadas por Firebase, no necesitamos reverse si usamos orderBy('date', 'desc')
        const letters = this.letterManager.letters;

        if (letters.length === 0) {
            this.lettersGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <p>No hay cartas en el buzón</p>
                </div>
            `;
            return;
        }

        letters.forEach(letter => {
            const card = document.createElement('div');
            // Add 'pending-review' class if not reviewed
            const reviewClass = letter.reviewed ? 'reviewed' : 'pending-review';
            card.className = `letter-card ${letter.read ? 'read' : ''} ${reviewClass}`;
            // Use string ID safely
            card.dataset.id = letter.id;

            // Simplified envelope look - Only Sender Name
            card.innerHTML = `
                <div class="envelope-flap"></div>
                <div class="envelope-content">
                    <div class="stamp-small">📮</div>
                    <h3 class="envelope-sender">${letter.sender || 'Anónimo'}</h3>
                </div>
            `;

            card.addEventListener('click', () => this.openLetterModal(letter.id));
            this.lettersGrid.appendChild(card);
        });
    }

    openLetterModal(letterId) {
        this.currentLetterId = letterId;
        const letter = this.letterManager.getLetter(letterId);

        if (!letter) return;

        this.modalSender.textContent = `De: ${letter.sender || 'Anónimo'}`;
        this.modalDate.textContent = new Date(letter.date).toLocaleString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        this.modalMessage.textContent = letter.message;

        // Update reviewed badge
        if (letter.reviewed) {
            this.reviewedBadge.innerHTML = '<span class="reviewed-badge-large">✓ Revisada por moderador</span>';
        } else {
            this.reviewedBadge.innerHTML = '<span class="pending-badge-large">⏳ Pendiente de revisión</span>';
        }

        // Update read button state
        this.updateModalButtons(letter);

        this.letterModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    updateModalButtons(letter) {
        // Update read button state
        if (letter.read) {
            this.markReadBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                Ya marcada como leída
            `;
            this.markReadBtn.disabled = true;
            this.markReadBtn.style.opacity = '0.5';
        } else {
            this.markReadBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                Marcar como leída
            `;
            this.markReadBtn.disabled = false;
            this.markReadBtn.style.opacity = '1';
        }

        // Update reviewed button state
        if (letter.reviewed) {
            this.markReviewedBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                Ya marcada como revisada
            `;
            this.markReviewedBtn.disabled = true;
            this.markReviewedBtn.style.opacity = '0.5';
        } else {
            this.markReviewedBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                Marcar como revisada
            `;
            this.markReviewedBtn.disabled = false;
            this.markReviewedBtn.style.opacity = '1';
        }
    }

    closeLetterModal() {
        this.letterModal.classList.remove('active');
        document.body.style.overflow = '';
        this.currentLetterId = null;
    }

    async handleMarkAsRead() {
        if (!this.currentLetterId) return;
        const originalText = this.markReadBtn.innerHTML;
        this.markReadBtn.innerHTML = 'Guardando...';

        await this.letterManager.markAsRead(this.currentLetterId);

        // UI updates automatically via listener
        // But for modal button, we might want instant feedback if we kept the modal open?
        // Actually the listener will fire and we aren't re-rendering the modal content automatically unless we trigger it.
        // Let's manually update buttons for better UX responsiveness
        const letter = this.letterManager.getLetter(this.currentLetterId);
        if (letter) {
            letter.read = true; // Optimistic update
            this.updateModalButtons(letter);
        }
    }

    async handleMarkAsReviewed() {
        if (!this.currentLetterId) return;
        const originalText = this.markReviewedBtn.innerHTML;
        this.markReviewedBtn.innerHTML = 'Guardando...';

        await this.letterManager.markAsReviewed(this.currentLetterId);

        const letter = this.letterManager.getLetter(this.currentLetterId);
        if (letter) {
            letter.reviewed = true;
            this.updateModalButtons(letter);
            this.reviewedBadge.innerHTML = '<span class="reviewed-badge-large">✓ Revisada por moderador</span>';
        }
    }

    async handleDeleteLetter() {
        if (!this.currentLetterId) return;

        if (confirm('¿Estás seguro de que quieres eliminar esta carta?')) {
            await this.letterManager.deleteLetter(this.currentLetterId);
            this.closeLetterModal();
            // grid updates via listener
        }
    }

    updateStats() {
        const stats = this.letterManager.getStats();

        // User view
        if (this.letterCount) {
            this.letterCount.textContent = stats.total;
        }

        // Admin view
        if (this.totalLetters) {
            this.totalLetters.textContent = stats.total;
            this.unreadLetters.textContent = stats.unread;
            this.readLetters.textContent = stats.read;
        }
    }

    // ==========================================
    // THEME
    // ==========================================

    toggleTheme() {
        document.body.classList.toggle('light-theme');

        const isLight = document.body.classList.contains('light-theme');
        localStorage.setItem('buzonBlueTheme', isLight ? 'light' : 'dark');
    }
}

// ==========================================
// INITIALIZE APP
// ==========================================

// Add success message animation styles (Reuse existing)
const style = document.createElement('style');
style.textContent = `
    @keyframes popIn {
        0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
        50% { transform: translate(-50%, -50%) scale(1.1); }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
    
    @keyframes fadeOut {
        to { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    }
    
    .input-field.error { animation: shake 0.5s ease; border-color: #ff4757 !important; }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // No necesitamos asignar a window porque estamos en un módulo
    // Pero si quieres depurar:
    window.buzonApp = new BuzonApp();
});
