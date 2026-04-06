/**
 * MediRemind Pro - Advanced Medicine Reminder App
 * Play Store Quality JavaScript
 */

// ============================================
// App State Management
// ============================================

const AppState = {
    medicines: [],
    history: [],
    settings: {
        userName: '',
        notifications: true,
        darkMode: false,
        notificationSound: 'default'
    },
    currentEditId: null,
    reminderTimers: {},
    charts: {}
};

// ============================================
// Utility Functions
// ============================================

const Utils = {
    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Format time to 12-hour format
    formatTime(time24) {
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    },

    // Format date
    formatDate(date) {
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        return new Date(date).toLocaleDateString('en-US', options);
    },

    // Get greeting based on time
    getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        if (hour < 21) return 'Good Evening';
        return 'Good Night';
    },

    // Get day name
    getDayName(dayIndex) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[dayIndex];
    },

    // Save to localStorage
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Storage error:', e);
        }
    },

    // Load from localStorage
    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Storage error:', e);
            return null;
        }
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// ============================================
// Toast Notifications
// ============================================

const Toast = {
    container: null,

    init() {
        this.container = document.getElementById('toast-container');
    },

    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
            warning: '<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none" stroke="#667eea" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
        };

        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <span class="toast-message">${message}</span>
            <button class="toast-close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;

        toast.querySelector('.toast-close').addEventListener('click', () => this.remove(toast));
        this.container.appendChild(toast);

        setTimeout(() => this.remove(toast), duration);
    },

    remove(toast) {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }
};

// ============================================
// Theme Management
// ============================================

const ThemeManager = {
    init() {
        const savedTheme = Utils.loadFromStorage('theme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            this.setDark(true);
        }
    },

    toggle() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        this.setDark(!isDark);
    },

    setDark(isDark) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        Utils.saveToStorage('theme', isDark ? 'dark' : 'light');
        AppState.settings.darkMode = isDark;
        
        const toggle = document.getElementById('darkmode-toggle');
        if (toggle) toggle.checked = isDark;
    }
};

// ============================================
// Notification System
// ============================================

const NotificationSystem = {
    permission: 'default',

    async init() {
        if ('Notification' in window) {
            this.permission = Notification.permission;
            if (this.permission === 'default') {
                const result = await Notification.requestPermission();
                this.permission = result;
            }
        }
    },

    async send(title, body, tag) {
        if (this.permission !== 'granted') return;

        const options = {
            body,
            icon: 'assets/icons/icon-192.png',
            badge: 'assets/icons/icon-192.png',
            tag,
            vibrate: [200, 100, 200],
            requireInteraction: true,
            actions: [
                { action: 'take', title: 'Mark as Taken' },
                { action: 'snooze', title: 'Snooze' }
            ]
        };

        try {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(title, options);
                });
            } else {
                new Notification(title, options);
            }
        } catch (e) {
            console.error('Notification error:', e);
        }
    },

    playSound() {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleRUYisftumQUFo7V9bFmGxuO0vmrbR0ckM77pnAfIZPP/5xzIyWVzf+Rdycmls3/hXwnJ5bN/3l9JyeWzf9ufCcnls3/Yn0nJ5bN/1d9JyeWzf9LfScnls3/QH0nJ5bN/zV9JyeWzf8qfScnls3/Hn0nJ5bN/xN9JyeWzf8IfScnls3/AH0=');
        audio.volume = 0.5;
        audio.play().catch(() => {});
    }
};

// ============================================
// Medicine Management
// ============================================

const MedicineManager = {
    add(medicine) {
        medicine.id = Utils.generateId();
        medicine.createdAt = new Date().toISOString();
        medicine.status = {};
        
        AppState.medicines.push(medicine);
        this.save();
        this.scheduleReminders(medicine);
        UI.renderMedicines();
        UI.renderSchedule();
        UI.updateStats();
        
        Toast.show(`${medicine.name} added successfully!`, 'success');
    },

    update(id, updates) {
        const index = AppState.medicines.findIndex(m => m.id === id);
        if (index !== -1) {
            AppState.medicines[index] = { ...AppState.medicines[index], ...updates };
            this.save();
            this.cancelReminders(id);
            this.scheduleReminders(AppState.medicines[index]);
            UI.renderMedicines();
            UI.renderSchedule();
            
            Toast.show('Medicine updated!', 'success');
        }
    },

    delete(id) {
        const medicine = AppState.medicines.find(m => m.id === id);
        if (medicine) {
            AppState.medicines = AppState.medicines.filter(m => m.id !== id);
            this.save();
            this.cancelReminders(id);
            UI.renderMedicines();
            UI.renderSchedule();
            UI.updateStats();
            
            Toast.show(`${medicine.name} removed`, 'info');
        }
    },

    markAsTaken(id, time) {
        const medicine = AppState.medicines.find(m => m.id === id);
        if (medicine) {
            const today = new Date().toDateString();
            if (!medicine.status[today]) medicine.status[today] = {};
            medicine.status[today][time] = 'taken';
            
            // Add to history
            AppState.history.unshift({
                id: Utils.generateId(),
                medicineId: id,
                medicineName: medicine.name,
                dosage: medicine.dosage,
                time,
                status: 'taken',
                timestamp: new Date().toISOString()
            });
            
            this.save();
            this.saveHistory();
            UI.renderSchedule();
            UI.renderHistory();
            UI.updateStats();
            
            Toast.show(`${medicine.name} marked as taken ✓`, 'success');
        }
    },

    scheduleReminders(medicine) {
        if (!AppState.settings.notifications) return;

        const today = new Date().getDay();
        if (!medicine.days.includes(today.toString())) return;

        medicine.times.forEach(time => {
            const [hours, minutes] = time.split(':');
            const now = new Date();
            const reminderTime = new Date();
            reminderTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            if (reminderTime > now) {
                const timeout = reminderTime - now;
                const timerId = setTimeout(() => {
                    this.triggerReminder(medicine, time);
                }, timeout);

                if (!AppState.reminderTimers[medicine.id]) {
                    AppState.reminderTimers[medicine.id] = [];
                }
                AppState.reminderTimers[medicine.id].push(timerId);
            }
        });
    },

    cancelReminders(id) {
        if (AppState.reminderTimers[id]) {
            AppState.reminderTimers[id].forEach(timerId => clearTimeout(timerId));
            delete AppState.reminderTimers[id];
        }
    },

    triggerReminder(medicine, time) {
        NotificationSystem.playSound();
        NotificationSystem.send(
            'Time for your medicine!',
            `${medicine.name} - ${medicine.dosage}`,
            `reminder-${medicine.id}-${time}`
        );
        
        UI.showReminderModal(medicine, time);
    },

    save() {
        Utils.saveToStorage('medicines', AppState.medicines);
    },

    saveHistory() {
        // Keep only last 100 entries
        AppState.history = AppState.history.slice(0, 100);
        Utils.saveToStorage('history', AppState.history);
    },

    load() {
        const medicines = Utils.loadFromStorage('medicines');
        const history = Utils.loadFromStorage('history');
        
        if (medicines) AppState.medicines = medicines;
        if (history) AppState.history = history;

        // Schedule reminders for all medicines
        AppState.medicines.forEach(medicine => {
            this.scheduleReminders(medicine);
        });
    }
};

// ============================================
// UI Management
// ============================================

const UI = {
    elements: {},

    init() {
        this.cacheElements();
        this.bindEvents();
        this.initSplashScreen();
        this.updateGreeting();
        this.updateDate();
        
        // Update time every minute
        setInterval(() => this.updateGreeting(), 60000);
    },

    cacheElements() {
        this.elements = {
            splashScreen: document.getElementById('splash-screen'),
            app: document.getElementById('app'),
            userNameDisplay: document.getElementById('user-name'),
            greetingTime: document.getElementById('greeting-time'),
            currentDate: document.getElementById('current-date'),
            todayCount: document.getElementById('today-count'),
            takenCount: document.getElementById('taken-count'),
            pendingCount: document.getElementById('pending-count'),
            streakCount: document.getElementById('streak-count'),
            notifCount: document.getElementById('notif-count'),
            medicinesList: document.getElementById('medicines-list'),
            emptyMedicines: document.getElementById('empty-medicines'),
            scheduleTimeline: document.getElementById('schedule-timeline'),
            historyList: document.getElementById('history-list'),
            addModal: document.getElementById('add-modal'),
            medicineForm: document.getElementById('medicine-form'),
            reminderModal: document.getElementById('reminder-modal'),
            profileModal: document.getElementById('profile-modal')
        };
    },

    bindEvents() {
        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => ThemeManager.toggle());

        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.closest('.tab-btn').dataset.tab));
        });

        // Bottom navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const nav = e.target.closest('.nav-item').dataset.nav;
                if (nav === 'add') this.openAddModal();
                else if (nav === 'profile') this.openProfileModal();
                else if (nav === 'stats') this.switchTab('dashboard');
                else if (nav === 'schedule') this.switchTab('schedule');
                else this.switchTab('medicines');
            });
        });

        // FAB and Add buttons
        document.getElementById('fab-btn')?.addEventListener('click', () => this.openAddModal());
        document.getElementById('add-medicine-btn')?.addEventListener('click', () => this.openAddModal());

        // Modal close buttons
        document.getElementById('close-modal')?.addEventListener('click', () => this.closeAddModal());
        document.getElementById('cancel-btn')?.addEventListener('click', () => this.closeAddModal());
        document.getElementById('close-profile')?.addEventListener('click', () => this.closeProfileModal());

        // Modal overlay clicks
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', () => {
                this.closeAddModal();
                this.closeProfileModal();
                this.closeReminderModal();
            });
        });

        // Medicine form
        this.elements.medicineForm?.addEventListener('submit', (e) => this.handleMedicineSubmit(e));

        // Add time button
        document.getElementById('add-time-btn')?.addEventListener('click', () => this.addTimeSlot());

        // Filter pills
        document.querySelectorAll('.filter-pill').forEach(pill => {
            pill.addEventListener('click', (e) => this.filterSchedule(e.target.dataset.filter));
        });

        // Profile form
        document.getElementById('profile-form')?.addEventListener('submit', (e) => this.handleProfileSubmit(e));

        // Dark mode toggle in profile
        document.getElementById('darkmode-toggle')?.addEventListener('change', (e) => {
            ThemeManager.setDark(e.target.checked);
        });

        // Clear data
        document.getElementById('clear-data-btn')?.addEventListener('click', () => this.clearAllData());

        // Refresh tip
        document.getElementById('refresh-tip')?.addEventListener('click', () => this.refreshHealthTip());

        // Export history
        document.getElementById('export-history')?.addEventListener('click', () => this.exportHistory());

        // Reminder actions
        document.getElementById('snooze-btn')?.addEventListener('click', () => this.snoozeReminder());
        document.getElementById('take-btn')?.addEventListener('click', () => this.takeReminder());
    },

    initSplashScreen() {
        // Create particles
        const particlesContainer = document.getElementById('particles');
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                position: absolute;
                width: ${Math.random() * 10 + 5}px;
                height: ${Math.random() * 10 + 5}px;
                background: rgba(255,255,255,${Math.random() * 0.5 + 0.2});
                border-radius: 50%;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation: float ${Math.random() * 3 + 2}s ease-in-out infinite;
            `;
            particlesContainer.appendChild(particle);
        }

        // Hide splash after animation
        setTimeout(() => {
            this.elements.splashScreen.classList.add('fade-out');
            this.elements.app.classList.remove('hidden');
            
            setTimeout(() => {
                this.elements.splashScreen.style.display = 'none';
            }, 500);
        }, 2500);
    },

    updateGreeting() {
        const greeting = Utils.getGreeting();
        this.elements.greetingTime.textContent = greeting;
        
        const userName = AppState.settings.userName || 'Welcome!';
        this.elements.userNameDisplay.textContent = userName;
    },

    updateDate() {
        const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        this.elements.currentDate.textContent = new Date().toLocaleDateString('en-US', options);
    },

    updateStats() {
        const today = new Date().toDateString();
        const currentDay = new Date().getDay().toString();
        
        let todayTotal = 0;
        let takenCount = 0;

        AppState.medicines.forEach(medicine => {
            if (medicine.days.includes(currentDay)) {
                todayTotal += medicine.times.length;
                
                if (medicine.status[today]) {
                    Object.values(medicine.status[today]).forEach(status => {
                        if (status === 'taken') takenCount++;
                    });
                }
            }
        });

        const pendingCount = todayTotal - takenCount;
        
        // Calculate streak
        let streak = 0;
        const checkDate = new Date();
        
        while (true) {
            checkDate.setDate(checkDate.getDate() - 1);
            const dateStr = checkDate.toDateString();
            const dayNum = checkDate.getDay().toString();
            
            let dayComplete = true;
            let hasMeds = false;
            
            AppState.medicines.forEach(medicine => {
                if (medicine.days.includes(dayNum)) {
                    hasMeds = true;
                    medicine.times.forEach(time => {
                        if (!medicine.status[dateStr] || medicine.status[dateStr][time] !== 'taken') {
                            dayComplete = false;
                        }
                    });
                }
            });
            
            if (!hasMeds || !dayComplete) break;
            streak++;
            if (streak >= 365) break;
        }

        // Update DOM with animation
        this.animateValue(this.elements.todayCount, todayTotal);
        this.animateValue(this.elements.takenCount, takenCount);
        this.animateValue(this.elements.pendingCount, pendingCount);
        this.animateValue(this.elements.streakCount, streak);
        
        this.elements.notifCount.textContent = pendingCount;
        this.elements.notifCount.style.display = pendingCount > 0 ? 'flex' : 'none';
    },

    animateValue(element, value) {
        const current = parseInt(element.textContent) || 0;
        if (current === value) return;
        
        const duration = 500;
        const steps = 20;
        const increment = (value - current) / steps;
        let step = 0;
        
        const timer = setInterval(() => {
            step++;
            element.textContent = Math.round(current + increment * step);
            if (step >= steps) {
                element.textContent = value;
                clearInterval(timer);
            }
        }, duration / steps);
    },

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        // Initialize charts if dashboard
        if (tabName === 'dashboard') {
            setTimeout(() => Charts.init(), 100);
        }
    },

    renderMedicines() {
        const container = this.elements.medicinesList;
        const emptyState = this.elements.emptyMedicines;

        if (AppState.medicines.length === 0) {
            container.innerHTML = '';
            container.appendChild(emptyState);
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        const medicineIcons = {
            pill: '💊',
            capsule: '💉',
            syrup: '🧴',
            drops: '💧'
        };

        container.innerHTML = AppState.medicines.map(medicine => {
            const today = new Date().toDateString();
            const currentDay = new Date().getDay().toString();
            const isScheduledToday = medicine.days.includes(currentDay);
            
            let takenToday = 0;
            if (medicine.status[today]) {
                takenToday = Object.values(medicine.status[today]).filter(s => s === 'taken').length;
            }
            
            const allTaken = isScheduledToday && takenToday === medicine.times.length;

            return `
                <div class="medicine-card ${allTaken ? 'taken' : ''}" 
                     data-id="${medicine.id}"
                     style="--card-gradient: var(--${medicine.color || 'gradient-1'})">
                    <div class="medicine-icon ${medicine.color || 'gradient-1'}">
                        ${medicineIcons[medicine.type] || '💊'}
                    </div>
                    <div class="medicine-info">
                        <div class="medicine-name">
                            ${medicine.name}
                            ${!isScheduledToday ? '<span style="font-size: 0.7rem; opacity: 0.6;">(Not today)</span>' : ''}
                        </div>
                        <div class="medicine-dosage">${medicine.dosage} • ${medicine.quantity} ${medicine.type}</div>
                        <div class="medicine-times">
                            ${medicine.times.map(time => {
                                const isTaken = medicine.status[today]?.[time] === 'taken';
                                return `
                                    <span class="time-badge ${isTaken ? 'taken' : ''}">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <polyline points="12 6 12 12 16 14"></polyline>
                                        </svg>
                                        ${Utils.formatTime(time)}
                                        ${isTaken ? ' ✓' : ''}
                                    </span>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    <div class="medicine-actions">
                        <button class="action-btn edit" data-id="${medicine.id}" title="Edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="action-btn delete" data-id="${medicine.id}" title="Delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Bind edit/delete events
        container.querySelectorAll('.action-btn.edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openEditModal(btn.dataset.id);
            });
        });

        container.querySelectorAll('.action-btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this medicine?')) {
                    MedicineManager.delete(btn.dataset.id);
                }
            });
        });
    },

    renderSchedule(filter = 'all') {
        const container = this.elements.scheduleTimeline;
        const today = new Date().toDateString();
        const currentDay = new Date().getDay().toString();
        
        const scheduleItems = [];

        AppState.medicines.forEach(medicine => {
            if (!medicine.days.includes(currentDay)) return;
            
            medicine.times.forEach(time => {
                const status = medicine.status[today]?.[time] || 'pending';
                
                if (filter === 'all' || filter === status) {
                    scheduleItems.push({
                        medicine,
                        time,
                        status,
                        sortTime: time
                    });
                }
            });
        });

        // Sort by time
        scheduleItems.sort((a, b) => a.sortTime.localeCompare(b.sortTime));

        if (scheduleItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h4>No medicines scheduled</h4>
                    <p>${filter !== 'all' ? `No ${filter} medicines` : 'Add medicines to see your schedule'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = scheduleItems.map(item => `
            <div class="schedule-item ${item.status}" data-id="${item.medicine.id}" data-time="${item.time}">
                <div class="schedule-card">
                    <div class="schedule-time">${Utils.formatTime(item.time)}</div>
                    <div class="schedule-info">
                        <div class="schedule-name">${item.medicine.name}</div>
                        <div class="schedule-dosage">${item.medicine.dosage}</div>
                    </div>
                    <span class="schedule-status ${item.status}">${item.status}</span>
                </div>
            </div>
        `).join('');

        // Bind click to mark as taken
        container.querySelectorAll('.schedule-item.pending').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const time = item.dataset.time;
                MedicineManager.markAsTaken(id, time);
            });
        });
    },

    filterSchedule(filter) {
        document.querySelectorAll('.filter-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.filter === filter);
        });
        this.renderSchedule(filter);
    },

    renderHistory() {
        const container = this.elements.historyList;
        
        if (AppState.history.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h4>No history yet</h4>
                    <p>Your medication history will appear here</p>
                </div>
            `;
            return;
        }

        // Group by date
        const grouped = {};
        AppState.history.forEach(entry => {
            const date = new Date(entry.timestamp).toDateString();
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(entry);
        });

        let html = '';
        Object.entries(grouped).slice(0, 7).forEach(([date, entries]) => {
            const dateObj = new Date(date);
            const isToday = date === new Date().toDateString();
            const isYesterday = date === new Date(Date.now() - 86400000).toDateString();
            
            const dateLabel = isToday ? 'Today' : isYesterday ? 'Yesterday' : Utils.formatDate(dateObj);
            
            html += `<div class="history-date">${dateLabel}</div>`;
            
            entries.forEach(entry => {
                const time = new Date(entry.timestamp).toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit' 
                });
                
                html += `
                    <div class="history-item">
                        <div class="history-icon ${entry.status}">
                            ${entry.status === 'taken' ? '✓' : '✗'}
                        </div>
                        <div class="history-info">
                            <div class="history-name">${entry.medicineName}</div>
                            <div class="history-details">${entry.dosage}</div>
                        </div>
                        <div class="history-time">${time}</div>
                    </div>
                `;
            });
        });

        container.innerHTML = html;
    },

    openAddModal() {
        AppState.currentEditId = null;
        document.getElementById('modal-title').textContent = 'Add New Medicine';
        document.getElementById('submit-text').textContent = 'Add Medicine';
        this.elements.medicineForm.reset();
        this.resetTimeSlots();
        this.elements.addModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    openEditModal(id) {
        const medicine = AppState.medicines.find(m => m.id === id);
        if (!medicine) return;

        AppState.currentEditId = id;
        document.getElementById('modal-title').textContent = 'Edit Medicine';
        document.getElementById('submit-text').textContent = 'Save Changes';

        // Populate form
        document.getElementById('med-name').value = medicine.name;
        document.getElementById('med-dosage').value = medicine.dosage;
        document.getElementById('med-quantity').value = medicine.quantity;
        document.getElementById('med-notes').value = medicine.notes || '';

        // Type
        document.querySelector(`input[name="med-type"][value="${medicine.type}"]`).checked = true;

        // Color
        document.querySelector(`input[name="med-color"][value="${medicine.color}"]`).checked = true;

        // Days
        document.querySelectorAll('input[name="days"]').forEach(cb => {
            cb.checked = medicine.days.includes(cb.value);
        });

        // Times
        this.resetTimeSlots();
        const timeSlotsContainer = document.getElementById('time-slots');
        medicine.times.forEach((time, index) => {
            if (index === 0) {
                timeSlotsContainer.querySelector('.time-input').value = time;
            } else {
                this.addTimeSlot(time);
            }
        });

        this.elements.addModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeAddModal() {
        this.elements.addModal.classList.remove('active');
        document.body.style.overflow = '';
        AppState.currentEditId = null;
    },

    addTimeSlot(value = '') {
        const container = document.getElementById('time-slots');
        const slot = document.createElement('div');
        slot.className = 'time-slot';
        slot.innerHTML = `
            <input type="time" class="time-input" value="${value}" required>
            <button type="button" class="remove-time">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
        
        slot.querySelector('.remove-time').addEventListener('click', () => {
            slot.remove();
            this.updateRemoveButtons();
        });
        
        container.appendChild(slot);
        this.updateRemoveButtons();
    },

    resetTimeSlots() {
        const container = document.getElementById('time-slots');
        container.innerHTML = `
            <div class="time-slot">
                <input type="time" class="time-input" required>
                <button type="button" class="remove-time" style="display: none;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;
    },

    updateRemoveButtons() {
        const slots = document.querySelectorAll('.time-slot');
        slots.forEach(slot => {
            const btn = slot.querySelector('.remove-time');
            btn.style.display = slots.length > 1 ? 'flex' : 'none';
        });
    },

    handleMedicineSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const times = Array.from(document.querySelectorAll('.time-input'))
            .map(input => input.value)
            .filter(t => t);
        
        const days = Array.from(document.querySelectorAll('input[name="days"]:checked'))
            .map(cb => cb.value);

        if (times.length === 0) {
            Toast.show('Please add at least one time', 'error');
            return;
        }

        if (days.length === 0) {
            Toast.show('Please select at least one day', 'error');
            return;
        }

        const medicine = {
            name: document.getElementById('med-name').value.trim(),
            dosage: document.getElementById('med-dosage').value.trim(),
            quantity: parseInt(document.getElementById('med-quantity').value),
            type: formData.get('med-type'),
            color: formData.get('med-color'),
            times,
            days,
            notes: document.getElementById('med-notes').value.trim()
        };

        if (AppState.currentEditId) {
            MedicineManager.update(AppState.currentEditId, medicine);
        } else {
            MedicineManager.add(medicine);
        }

        this.closeAddModal();
    },

    openProfileModal() {
        document.getElementById('profile-name').value = AppState.settings.userName;
        document.getElementById('notifications-toggle').checked = AppState.settings.notifications;
        document.getElementById('darkmode-toggle').checked = AppState.settings.darkMode;
        document.getElementById('notification-sound').value = AppState.settings.notificationSound;
        
        this.elements.profileModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeProfileModal() {
        this.elements.profileModal.classList.remove('active');
        document.body.style.overflow = '';
    },

    handleProfileSubmit(e) {
        e.preventDefault();
        
        AppState.settings.userName = document.getElementById('profile-name').value.trim();
        AppState.settings.notifications = document.getElementById('notifications-toggle').checked;
        AppState.settings.notificationSound = document.getElementById('notification-sound').value;
        
        Utils.saveToStorage('settings', AppState.settings);
        this.updateGreeting();
        this.closeProfileModal();
        
        Toast.show('Settings saved!', 'success');
    },

    showReminderModal(medicine, time) {
        const content = document.getElementById('reminder-content');
        const medicineIcons = { pill: '💊', capsule: '💉', syrup: '🧴', drops: '💧' };
        
        content.innerHTML = `
            <div class="reminder-medicine">
                <div class="reminder-med-icon">${medicineIcons[medicine.type] || '💊'}</div>
                <div class="reminder-med-info">
                    <div class="reminder-med-name">${medicine.name}</div>
                    <div class="reminder-med-dosage">${medicine.dosage} at ${Utils.formatTime(time)}</div>
                </div>
            </div>
        `;

        this.elements.reminderModal.dataset.medicineId = medicine.id;
        this.elements.reminderModal.dataset.time = time;
        this.elements.reminderModal.classList.add('active');
    },

    closeReminderModal() {
        this.elements.reminderModal.classList.remove('active');
    },

    snoozeReminder() {
        const modal = this.elements.reminderModal;
        const medicine = AppState.medicines.find(m => m.id === modal.dataset.medicineId);
        const time = modal.dataset.time;
        
        this.closeReminderModal();
        Toast.show('Reminder snoozed for 10 minutes', 'info');
        
        setTimeout(() => {
            MedicineManager.triggerReminder(medicine, time);
        }, 10 * 60 * 1000);
    },

    takeReminder() {
        const modal = this.elements.reminderModal;
        MedicineManager.markAsTaken(modal.dataset.medicineId, modal.dataset.time);
        this.closeReminderModal();
    },

    clearAllData() {
        if (confirm('Are you sure you want to delete all data? This cannot be undone.')) {
            localStorage.clear();
            AppState.medicines = [];
            AppState.history = [];
            this.renderMedicines();
            this.renderSchedule();
            this.renderHistory();
            this.updateStats();
            this.closeProfileModal();
            Toast.show('All data cleared', 'info');
        }
    },

    refreshHealthTip() {
        const tips = [
            "Taking medicines at the same time each day helps maintain consistent levels in your body.",
            "Store your medications in a cool, dry place away from direct sunlight.",
            "Always complete your full course of antibiotics, even if you feel better.",
            "Drink plenty of water when taking medications unless advised otherwise.",
            "Keep a list of all your medications to share with healthcare providers.",
            "Check expiration dates regularly and dispose of expired medications safely.",
            "Some medications work better with food, while others should be taken on an empty stomach.",
            "Never share prescription medications with others.",
            "Set multiple reminders if you tend to forget your medications.",
            "Keep emergency contact information with your medication list."
        ];
        
        const currentTip = document.querySelector('#health-tip p').textContent;
        let newTip;
        do {
            newTip = tips[Math.floor(Math.random() * tips.length)];
        } while (newTip === currentTip && tips.length > 1);
        
        document.querySelector('#health-tip p').textContent = newTip;
    },

    exportHistory() {
        const data = AppState.history.map(entry => ({
            Medicine: entry.medicineName,
            Dosage: entry.dosage,
            Time: entry.time,
            Status: entry.status,
            Date: new Date(entry.timestamp).toLocaleString()
        }));

        const csv = [
            Object.keys(data[0] || {}).join(','),
            ...data.map(row => Object.values(row).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medicine-history-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        Toast.show('History exported!', 'success');
    }
};

// ============================================
// Charts Management
// ============================================

const Charts = {
    initialized: false,

    init() {
        if (this.initialized) {
            this.updateCharts();
            return;
        }

        this.createAdherenceChart();
        this.createDistributionChart();
        this.updateProgress();
        this.initialized = true;
    },

    createAdherenceChart() {
        const ctx = document.getElementById('adherence-chart');
        if (!ctx) return;

        const labels = [];
        const data = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            
            const dateStr = date.toDateString();
            const dayNum = date.getDay().toString();
            let total = 0;
            let taken = 0;
            
            AppState.medicines.forEach(medicine => {
                if (medicine.days.includes(dayNum)) {
                    total += medicine.times.length;
                    if (medicine.status[dateStr]) {
                        taken += Object.values(medicine.status[dateStr]).filter(s => s === 'taken').length;
                    }
                }
            });
            
            data.push(total > 0 ? Math.round((taken / total) * 100) : 0);
        }

        if (AppState.charts.adherence) {
            AppState.charts.adherence.destroy();
        }

        AppState.charts.adherence = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Adherence %',
                    data,
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { display: false },
                        ticks: {
                            callback: value => value + '%'
                        }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    },

    createDistributionChart() {
        const ctx = document.getElementById('distribution-chart');
        if (!ctx) return;

        const timeSlots = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
        
        AppState.medicines.forEach(medicine => {
            medicine.times.forEach(time => {
                const hour = parseInt(time.split(':')[0]);
                if (hour < 12) timeSlots.Morning++;
                else if (hour < 17) timeSlots.Afternoon++;
                else if (hour < 21) timeSlots.Evening++;
                else timeSlots.Night++;
            });
        });

        if (AppState.charts.distribution) {
            AppState.charts.distribution.destroy();
        }

        AppState.charts.distribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(timeSlots),
                datasets: [{
                    data: Object.values(timeSlots),
                    backgroundColor: [
                        'rgba(102, 126, 234, 0.8)',
                        'rgba(240, 147, 251, 0.8)',
                        'rgba(17, 153, 142, 0.8)',
                        'rgba(242, 153, 74, 0.8)'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                },
                cutout: '60%'
            }
        });
    },

    updateProgress() {
        const circle = document.getElementById('progress-circle');
        const valueEl = document.getElementById('progress-value');
        if (!circle || !valueEl) return;

        // Calculate monthly adherence
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        let total = 0;
        let taken = 0;

        for (let d = new Date(startOfMonth); d <= now; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toDateString();
            const dayNum = d.getDay().toString();
            
            AppState.medicines.forEach(medicine => {
                if (medicine.days.includes(dayNum)) {
                    total += medicine.times.length;
                    if (medicine.status[dateStr]) {
                        taken += Object.values(medicine.status[dateStr]).filter(s => s === 'taken').length;
                    }
                }
            });
        }

        const percentage = total > 0 ? Math.round((taken / total) * 100) : 0;
        const circumference = 283;
        const offset = circumference - (percentage / 100) * circumference;

        circle.style.strokeDashoffset = offset;
        
        // Animate value
        let current = 0;
        const timer = setInterval(() => {
            current += 2;
            if (current >= percentage) {
                current = percentage;
                clearInterval(timer);
            }
            valueEl.textContent = current;
        }, 20);
    },

    updateCharts() {
        this.createAdherenceChart();
        this.createDistributionChart();
        this.updateProgress();
    }
};

// ============================================
// App Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize components
    Toast.init();
    ThemeManager.init();
    NotificationSystem.init();
    
    // Load saved data
    const savedSettings = Utils.loadFromStorage('settings');
    if (savedSettings) {
        AppState.settings = { ...AppState.settings, ...savedSettings };
    }
    
    MedicineManager.load();
    
    // Initialize UI
    UI.init();
    UI.renderMedicines();
    UI.renderSchedule();
    UI.renderHistory();
    UI.updateStats();

    // Add gradient definition for progress circle
    const svg = document.querySelector('.circular-progress svg');
    if (svg) {
        const defs = document.createElementNS('[w3.org](http://www.w3.org/2000/svg)', 'defs');
        defs.innerHTML = `
            <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#667eea"/>
                <stop offset="100%" stop-color="#764ba2"/>
            </linearGradient>
        `;
        svg.insertBefore(defs, svg.firstChild);
    }
});

// Handle visibility change to reschedule reminders
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Reschedule all reminders when app becomes visible
        AppState.medicines.forEach(medicine => {
            MedicineManager.cancelReminders(medicine.id);
            MedicineManager.scheduleReminders(medicine);
        });
        UI.updateStats();
        UI.renderSchedule();
    }
});
