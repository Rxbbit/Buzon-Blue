// ==========================================
// DATA MANAGEMENT
// ==========================================

const ADMIN_PASSWORD = 'ChaterinaAzuleja17'; // Change this for production

class LetterManager {
    constructor() {
        this.letters = this.loadLetters();
    }

    loadLetters() {
        const stored = localStorage.getItem('buzonBlueLetters');
        return stored ? JSON.parse(stored) : [];
    }

    saveLetters() {
        localStorage.setItem('buzonBlueLetters', JSON.stringify(this.letters));
    }

    addLetter(sender, message) {
        const letter = {
            id: Date.now(),
            sender: sender || 'Anónimo',
            message: message,
            date: new Date().toISOString(),
            read: false,
            reviewed: false
        };
        this.letters.push(letter);
        this.saveLetters();
        return letter;
    }

    getLetter(id) {
        return this.letters.find(letter => letter.id === parseInt(id));
    }

    markAsRead(id) {
        const letter = this.getLetter(id);
        if (letter) {
            letter.read = true;
            this.saveLetters();
        }
    }

    markAsReviewed(id) {
        const letter = this.getLetter(id);
        if (letter) {
            letter.reviewed = true;
            this.saveLetters();
        }
    }

    deleteLetter(id) {
        this.letters = this.letters.filter(letter => letter.id !== parseInt(id));
        this.saveLetters();
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
        this.letterManager = new LetterManager();
        this.currentView = 'user';
        this.currentLetterId = null;
        this.isLoggedIn = false;

        this.initElements();
        this.initEventListeners();
        this.initTheme();
        this.updateStats();
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

    handleSendLetter() {
        const sender = this.senderName.value.trim();
        const message = this.letterMessage.value.trim();

        if (!message) {
            this.letterMessage.focus();
            return;
        }

        try {
            this.letterManager.addLetter(sender, message);

            // Clear form
            this.senderName.value = '';
            this.letterMessage.value = '';

            // Update stats
            this.updateStats();

            // Show success animation
            this.showSuccessMessage();
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                alert('El almacenamiento está lleno. Por favor, limpia las cartas antiguas desde el panel de administrador.');
            } else {
                alert('Error al enviar la carta: ' + error.message);
            }
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
        const letters = [...this.letterManager.letters].reverse(); // Show newest first

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
            card.dataset.id = letter.id;

            // Simplified envelope look - Only Sender Name
            card.innerHTML = `
                <div class="envelope-flap"></div>
                <div class="envelope-content">
                    <div class="stamp-small">📮</div>
                    <h3 class="envelope-sender">${letter.sender}</h3>
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

        this.modalSender.textContent = `De: ${letter.sender}`;
        this.modalDate.textContent = new Date(letter.date).toLocaleString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        this.modalMessage.textContent = letter.message;

        // Remove image handling logic as it's being deleted
        if (this.modalImage) this.modalImage.style.display = 'none';

        // Update reviewed badge
        if (letter.reviewed) {
            this.reviewedBadge.innerHTML = '<span class="reviewed-badge-large">✓ Revisada por moderador</span>';
        } else {
            this.reviewedBadge.innerHTML = '<span class="pending-badge-large">⏳ Pendiente de revisión</span>';
        }

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

        this.letterModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeLetterModal() {
        this.letterModal.classList.remove('active');
        document.body.style.overflow = '';
        this.currentLetterId = null;
    }

    handleMarkAsRead() {
        if (!this.currentLetterId) return;

        this.letterManager.markAsRead(this.currentLetterId);

        // Update modal button
        this.markReadBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
            Ya marcada como leída
        `;
        this.markReadBtn.disabled = true;
        this.markReadBtn.style.opacity = '0.5';

        // Update grid and stats
        this.renderLetters();
        this.updateStats();
    }

    handleMarkAsReviewed() {
        if (!this.currentLetterId) return;

        this.letterManager.markAsReviewed(this.currentLetterId);

        // Update modal button
        this.markReviewedBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Ya marcada como revisada
        `;
        this.markReviewedBtn.disabled = true;
        this.markReviewedBtn.style.opacity = '0.5';

        // Update badge
        this.reviewedBadge.innerHTML = '<span class="reviewed-badge-large">✓ Revisada por moderador</span>';

        // Update grid and stats
        this.renderLetters();
        this.updateStats();
    }

    handleDeleteLetter() {
        if (!this.currentLetterId) return;

        if (confirm('¿Estás seguro de que quieres eliminar esta carta?')) {
            this.letterManager.deleteLetter(this.currentLetterId);
            this.closeLetterModal();
            this.renderLetters();
            this.updateStats();
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

// Add success message animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes popIn {
        0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0;
        }
        50% {
            transform: translate(-50%, -50%) scale(1.1);
        }
        100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
        }
    }
    
    @keyframes fadeOut {
        to {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
        }
    }
    
    .input-field.error {
        animation: shake 0.5s ease;
        border-color: #ff4757 !important;
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// Initialize app when DOM is ready
let buzonApp;
document.addEventListener('DOMContentLoaded', () => {
    buzonApp = new BuzonApp();
});
