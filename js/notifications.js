// ===== NOTIFICATION SYSTEM =====
const NotificationManager = {
    // Configuration
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

    // Initialize notification manager
    init() {
        console.log('Notification Manager initialized');
        this.loadConfig();
        this.requestPermission();
        this.setupServiceWorker();
    },

    // Load configuration from localStorage
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

    // Save configuration
    saveConfig() {
        localStorage.setItem('loveLine_notificationConfig', JSON.stringify(this.config));
    },

    // Request notification permission
    requestPermission() {
        if (!("Notification" in window)) {
            console.log("This browser does not support notifications.");
            this.config.permission = 'unsupported';
            return;
        }

        if (Notification.permission === "granted") {
            this.config.permission = "granted";
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                this.config.permission = permission;
                this.saveConfig();
            });
        } else {
            this.config.permission = "denied";
        }
    },

    // Setup service worker for push notifications
    async setupServiceWorker() {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    },

    // Send notification
    sendNotification(title, options = {}) {
        if (!this.config.enabled || this.config.permission !== "granted") {
            return false;
        }

        const defaultOptions = {
            body: '',
            icon: '/assets/icons/notification-icon.png',
            badge: '/assets/icons/badge-icon.png',
            tag: 'loveline-notification',
            renotify: true,
            requireInteraction: false,
            silent: !this.config.soundEnabled,
            vibrate: this.config.vibrationEnabled ? [200, 100, 200] : []
        };

        const notificationOptions = { ...defaultOptions, ...options };

        // Show notification
        const notification = new Notification(title, notificationOptions);

        // Handle notification click
        notification.onclick = function (event) {
            event.preventDefault();
            window.focus();
            this.close();

            // Navigate to countdown page or specific milestone
            if (options.data && options.data.url) {
                window.location.href = options.data.url;
            } else {
                window.location.href = '/countdown.html';
            }
        };

        // Play sound if enabled
        if (this.config.soundEnabled && !notificationOptions.silent) {
            this.playNotificationSound();
        }

        return true;
    },

    // Play notification sound
    playNotificationSound() {
        const audio = new Audio('/assets/sounds/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(error => {
            console.log('Audio play failed:', error);
            // Fallback to beep sound
            this.playBeepSound();
        });
    },

    // Play beep sound (fallback)
    playBeepSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.log('Audio context not supported:', error);
        }
    },

    // Schedule countdown notification
    scheduleCountdownNotification(countdown, offsetMinutes = 15) {
        if (!this.config.notificationTypes.countdown) return;

        const targetDate = new Date(countdown.targetDate);
        const notificationTime = new Date(targetDate.getTime() - (offsetMinutes * 60000));
        const now = new Date();

        // Only schedule if in the future
        if (notificationTime > now) {
            const timeUntilNotification = notificationTime - now;

            setTimeout(() => {
                this.sendNotification(
                    `⏰ ${countdown.title} is coming up!`,
                    {
                        body: `Only ${offsetMinutes} minutes until ${countdown.title}`,
                        data: { url: `/countdown.html` },
                        requireInteraction: true
                    }
                );
            }, timeUntilNotification);

            console.log(`Notification scheduled for ${countdown.title} in ${timeUntilNotification}ms`);
        }
    },

    // Schedule anniversary notification
    scheduleAnniversaryNotification(anniversaryDate, years) {
        if (!this.config.notificationTypes.anniversary) return;

        const nextAnniversary = Storage.getNextOccurrence(anniversaryDate);
        const now = new Date();
        const timeUntilAnniversary = nextAnniversary - now;

        // Schedule 1 day before
        const dayBefore = new Date(nextAnniversary.getTime() - (24 * 60 * 60000));
        const timeUntilDayBefore = dayBefore - now;

        if (timeUntilDayBefore > 0) {
            setTimeout(() => {
                this.sendNotification(
                    `🎉 Anniversary Tomorrow!`,
                    {
                        body: `Your ${years}-year anniversary is tomorrow!`,
                        data: { url: `/countdown.html` },
                        requireInteraction: true
                    }
                );
            }, timeUntilDayBefore);
        }

        // Schedule on the day
        if (timeUntilAnniversary > 0) {
            setTimeout(() => {
                this.sendNotification(
                    `🎊 Happy Anniversary!`,
                    {
                        body: `Congratulations on ${years} years together!`,
                        data: { url: `/countdown.html` },
                        requireInteraction: true
                    }
                );
            }, timeUntilAnniversary);
        }
    },

    // Schedule milestone reminder
    scheduleMilestoneReminder(milestone, offsetMinutes = 15) {
        if (!this.config.notificationTypes.milestone) return;

        const nextOccurrence = Storage.getNextOccurrence(new Date(milestone.date));
        const notificationTime = new Date(nextOccurrence.getTime() - (offsetMinutes * 60000));
        const now = new Date();

        if (notificationTime > now) {
            const timeUntilNotification = notificationTime - now;

            setTimeout(() => {
                this.sendNotification(
                    `🌟 ${milestone.title} Anniversary`,
                    {
                        body: `Time to celebrate ${milestone.title}!`,
                        data: { url: `/milestone-detail.html?id=${milestone.id}` },
                        requireInteraction: true
                    }
                );
            }, timeUntilNotification);
        }
    },

    // Check and schedule all notifications
    scheduleAllNotifications() {
        // Clear existing timeouts
        this.clearAllScheduledNotifications();

        // Get user profile
        const profile = Storage.getUserProfile();
        if (profile && profile.anniversaryDate) {
            const anniversary = new Date(profile.anniversaryDate);
            const years = new Date().getFullYear() - anniversary.getFullYear();
            this.scheduleAnniversaryNotification(anniversary, years);
        }

        // Get milestones with reminders
        const milestones = Storage.getAllMilestones();
        milestones.forEach(milestone => {
            if (milestone.setReminder) {
                this.scheduleMilestoneReminder(milestone, 15); // 15 minutes before
            }
        });

        // Get custom countdowns
        const customCountdowns = JSON.parse(localStorage.getItem('loveLine_customCountdowns') || '[]');
        customCountdowns.forEach(countdown => {
            if (countdown.setReminder) {
                this.scheduleCountdownNotification(countdown, 15); // 15 minutes before
            }
        });
    },

    // Clear all scheduled notifications
    clearAllScheduledNotifications() {
        // In a real app, you'd track and clear specific timeouts
        // For simplicity, we'll rely on page reloads for now
        console.log('All scheduled notifications cleared');
    },

    // Send test notification
    sendTestNotification() {
        return this.sendNotification(
            'LoveLine Test Notification',
            {
                body: 'This is a test notification from LoveLine',
                requireInteraction: true
            }
        );
    },

    // Enable/disable notifications
    setEnabled(enabled) {
        this.config.enabled = enabled;
        this.saveConfig();

        if (enabled && this.config.permission !== "granted") {
            this.requestPermission();
        }
    },

    // Set notification types
    setNotificationType(type, enabled) {
        if (this.config.notificationTypes[type] !== undefined) {
            this.config.notificationTypes[type] = enabled;
            this.saveConfig();
        }
    }
};

// Initialize notification manager
if (typeof window !== 'undefined') {
    window.NotificationManager = NotificationManager;
    document.addEventListener('DOMContentLoaded', () => NotificationManager.init());
}