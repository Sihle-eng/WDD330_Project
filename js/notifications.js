// Unified notification module – use Notifications for all new code

const Notifications = {
    /**
     * Check if browser supports notifications
     */
    isSupported() {
        return 'Notification' in window;
    },

    /**
     * Request permission from user
     */
    async requestPermission() {
        if (!this.isSupported()) {
            console.warn('Notifications not supported');
            return 'unsupported';
        }

        if (Notification.permission === 'granted') {
            return 'granted';
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission;
        }

        return Notification.permission;
    },

    /**
     * Show a notification
     * @returns {boolean} true if notification was shown
     */
    show(title, options = {}) {
        if (!this.isSupported()) return false;

        if (Notification.permission === 'granted') {
            try {
                const notification = new Notification(title, {
                    icon: '/assets/icons/heart-icon.png',
                    badge: '/assets/icons/badge.png',
                    vibrate: [200, 100, 200],
                    ...options
                });

                notification.onclick = () => {
                    window.focus();
                    if (options.milestoneId) {
                        window.location.href = `/milestone-detail.html?id=${options.milestoneId}`;
                    }
                    notification.close();
                };

                return true;  // success
            } catch (error) {
                console.error('Failed to show notification:', error);
                return false;
            }
        } else {
            console.log('Notification permission not granted');
            return false;
        }
    },

    /**
     * Play a notification sound (falls back to beep)
     */
    playSound() {
        const audio = new Audio('/assets/sounds/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => this.playBeep());
    },

    /**
     * Fallback beep sound using Web Audio API
     */
    playBeep() {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) throw new Error('Web Audio API not supported');

            const audioContext = new AudioContextClass();

            // Resume context (required by autoplay policies)
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    this._createBeep(audioContext);
                }).catch(e => console.warn('Could not resume AudioContext:', e));
            } else {
                this._createBeep(audioContext);
            }
        } catch (error) {
            console.log('Beep not available:', error);
        }
    },

    /**
     * Internal: create the actual beep sound
     */
    _createBeep(audioContext) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);

        // Clean up after finish
        oscillator.onended = () => {
            audioContext.close().catch(console.warn);
        };
    }
};

// ===== LEGACY SUPPORT (NotificationManager) =====
// Kept for backward compatibility – now fully functional and delegates to Notifications

const NotificationManager = {
    config: {
        enabled: true,
        permission: null,
        soundEnabled: true,
        vibrationEnabled: true,
        notificationTypes: {
            countdown: true,
            anniversary: true,
            milestone: true,
            reminder: true
        }
    },

    // Store scheduled timeouts so they can be cleared
    _scheduledTimeouts: [],

    init() {
        console.log('Notification Manager initialized (legacy)');
        this.loadConfig();
        this.requestPermission(); // async, but not awaited – config.permission will update later
        // No service worker needed for local notifications
    },

    loadConfig() {
        const savedConfig = localStorage.getItem('loveLine_notificationConfig');
        if (savedConfig) {
            try {
                this.config = { ...this.config, ...JSON.parse(savedConfig) };
            } catch (error) {
                console.error('Error loading notification config:', error);
            }
        }
    },

    saveConfig() {
        localStorage.setItem('loveLine_notificationConfig', JSON.stringify(this.config));
    },

    async requestPermission() {
        const permission = await Notifications.requestPermission();
        this.config.permission = permission;
        this.saveConfig();
        return permission;
    },

    /**
     * Send a notification – returns boolean success
     */
    sendNotification(title, options = {}) {
        if (!this.config.enabled) return false;
        return Notifications.show(title, options);
    },

    playNotificationSound() {
        if (this.config.soundEnabled) {
            Notifications.playSound();
        }
    },

    playBeepSound() {
        Notifications.playBeep();
    },

    /**
     * Schedule a countdown notification (e.g., X minutes before an event)
     * @param {Object} countdown  - countdown object with { date, title, id? }
     * @param {number} offsetMinutes - minutes before the event to notify
     */
    scheduleCountdownNotification(countdown, offsetMinutes = 15) {
        if (!this.config.notificationTypes.countdown) return;

        const eventTime = new Date(countdown.date).getTime();
        const now = Date.now();
        const offsetMs = offsetMinutes * 60 * 1000;
        const notifyTime = eventTime - offsetMs;

        if (notifyTime > now) {
            const timeoutId = setTimeout(() => {
                this.sendNotification(
                    `Countdown: ${countdown.title}`,
                    {
                        body: `Your event happens in ${offsetMinutes} minutes!`,
                        milestoneId: countdown.id,
                        tag: 'countdown'
                    }
                );
                this.playNotificationSound();
            }, notifyTime - now);

            this._scheduledTimeouts.push(timeoutId);
        }
    },

    /**
     * Schedule an anniversary notification (yearly)
     * @param {string} anniversaryDate - ISO date string
     * @param {number} years - number of years
     */
    scheduleAnniversaryNotification(anniversaryDate, years) {
        if (!this.config.notificationTypes.anniversary) return;

        const nextAnniversary = new Date(anniversaryDate);
        nextAnniversary.setFullYear(nextAnniversary.getFullYear() + years);
        const now = Date.now();
        const notifyTime = nextAnniversary.getTime();

        if (notifyTime > now) {
            const timeoutId = setTimeout(() => {
                this.sendNotification(
                    `Anniversary: ${years} years!`,
                    {
                        body: `Celebrate your ${years} year anniversary today.`,
                        tag: 'anniversary'
                    }
                );
                this.playNotificationSound();
            }, notifyTime - now);

            this._scheduledTimeouts.push(timeoutId);
        }
    },

    /**
     * Schedule a milestone reminder
     * @param {Object} milestone - milestone object with { date, title, id }
     * @param {number} offsetMinutes - minutes before to notify
     */
    scheduleMilestoneReminder(milestone, offsetMinutes = 15) {
        if (!this.config.notificationTypes.milestone) return;

        const eventTime = new Date(milestone.date).getTime();
        const now = Date.now();
        const offsetMs = offsetMinutes * 60 * 1000;
        const notifyTime = eventTime - offsetMs;

        if (notifyTime > now) {
            const timeoutId = setTimeout(() => {
                this.sendNotification(
                    `Milestone Reminder: ${milestone.title}`,
                    {
                        body: `This milestone is coming up in ${offsetMinutes} minutes.`,
                        milestoneId: milestone.id,
                        tag: 'milestone'
                    }
                );
                this.playNotificationSound();
            }, notifyTime - now);

            this._scheduledTimeouts.push(timeoutId);
        }
    },

    /**
     * Schedule all notifications from stored data (call after loading milestones/countdowns)
     */
    scheduleAllNotifications() {
        this.clearAllScheduledNotifications();

        // Example: load milestones from Storage and schedule each
        if (typeof Storage !== 'undefined' && Storage.getMilestones) {
            const milestones = Storage.getMilestones();
            milestones.forEach(milestone => {
                if (milestone.reminder && milestone.reminder.enabled) {
                    this.scheduleMilestoneReminder(milestone, milestone.reminder.daysBefore * 24 * 60);
                }
            });
        }

        // Similarly load countdowns from your data source
        // ... (implement based on your app)
    },

    /**
     * Clear all scheduled timeouts
     */
    clearAllScheduledNotifications() {
        this._scheduledTimeouts.forEach(id => clearTimeout(id));
        this._scheduledTimeouts = [];
        console.log('All scheduled notifications cleared');
    },

    /**
     * Send a test notification
     */
    sendTestNotification() {
        return this.sendNotification(
            'LoveLine Test Notification',
            {
                body: 'This is a test notification from LoveLine',
                requireInteraction: true
            }
        );
    },

    setEnabled(enabled) {
        this.config.enabled = enabled;
        this.saveConfig();
        if (enabled && this.config.permission !== 'granted') {
            this.requestPermission();
        }
    },

    setNotificationType(type, enabled) {
        if (this.config.notificationTypes.hasOwnProperty(type)) {
            this.config.notificationTypes[type] = enabled;
            this.saveConfig();
        }
    }
};

// Expose both modules globally
if (typeof window !== 'undefined') {
    window.Notifications = Notifications;
    window.NotificationManager = NotificationManager;
    // Optional: auto-init if needed (uncomment next line)
    // document.addEventListener('DOMContentLoaded', () => NotificationManager.init());
}