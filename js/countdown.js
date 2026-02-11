// ===== SIMPLIFIED COUNTDOWN TIMER IMPLEMENTATION =====


const CountdownManager = {
    // Configuration
    config: {
        showSeconds: true,
        use24Hour: false,
        showProgressBar: true,
        autoCelebrate: true,
        theme: 'default',
        updateInterval: 1000
    },

    // State
    state: {
        activeCountdowns: [],
        completedCountdowns: [],
        countdownInterval: null,
        isCelebrating: false,
        currentView: 'upcoming',
        currentDisplay: 'cards'
    },

    // Celebration ideas database
    celebrationIdeas: [
        {
            id: 1,
            title: "Romantic Dinner at Home",
            description: "Cook a special meal together, set the table with candles, and enjoy a romantic evening in.",
            icon: "fa-utensils",
            tags: ["romantic", "home", "food"]
        },
        {
            id: 2,
            title: "Memory Lane Scrapbooking",
            description: "Create a scrapbook of your favorite photos and memories from your relationship.",
            icon: "fa-book",
            tags: ["creative", "memories", "indoor"]
        },
        {
            id: 3,
            title: "Stargazing Picnic",
            description: "Pack a picnic basket, find a quiet spot away from city lights, and watch the stars together.",
            icon: "fa-star",
            tags: ["outdoor", "romantic", "nature"]
        },
        {
            id: 4,
            title: "Couple's Spa Day",
            description: "Give each other massages, take a bubble bath together, and relax with face masks.",
            icon: "fa-spa",
            tags: ["relaxing", "home", "pampering"]
        },
        {
            id: 5,
            title: "Recreate Your First Date",
            description: "Go back to where you had your first date and reminisce about how far you've come.",
            icon: "fa-heart",
            tags: ["romantic", "nostalgic", "date"]
        },
        {
            id: 6,
            title: "Adventure Day",
            description: "Try something new together like hiking, kayaking, or visiting a new city.",
            icon: "fa-hiking",
            tags: ["adventure", "outdoor", "active"]
        },
        {
            id: 7,
            title: "Love Letter Exchange",
            description: "Write heartfelt letters to each other expressing your love and appreciation.",
            icon: "fa-envelope",
            tags: ["romantic", "emotional", "meaningful"]
        },
        {
            id: 8,
            title: "Dance Party at Home",
            description: "Create a playlist of your favorite songs and have a private dance party in your living room.",
            icon: "fa-music",
            tags: ["fun", "home", "active"]
        }
    ],

    // Modal event handlers (to track and clean up)
    modalHandlers: {
        clickHandler: null,
        contentHandler: null,
        escapeHandler: null
    },

    // Initialize countdown manager
    init() {
        console.log('Countdown Manager initialized');

        this.loadConfiguration();
        this.loadCountdowns();
        this.setupEventListeners();
        this.updateUI();
        this.startCountdownLoop();
        this.loadCelebrationIdeas();
        this.setupModal();
    },

    // Setup modal with proper event listeners
    setupModal() {
        const modal = document.getElementById('countdownSettingsModal');
        if (!modal) return;

        const modalContent = modal.querySelector('.modal-content');
        const triggerBtn = document.getElementById('mainCountdownSettings');
        const closeBtn = modal.querySelector('.modal-close');

        // Remove existing event listeners first
        this.cleanupModalListeners();

        // Close modal when clicking outside
        this.modalHandlers.clickHandler = (e) => {
            if (e.target === modal && modal.classList.contains('active')) {
                this.closeModal();
            }
        };

        // Prevent clicks inside modal from closing it
        this.modalHandlers.contentHandler = (e) => {
            e.stopPropagation();
        };

        // Escape key handler
        this.modalHandlers.escapeHandler = (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                this.closeModal();
            }
        };

        modal.addEventListener('click', this.modalHandlers.clickHandler);
        if (modalContent) {
            modalContent.addEventListener('click', this.modalHandlers.contentHandler);
        }
        document.addEventListener('keydown', this.modalHandlers.escapeHandler);

        // Ensure modal is hidden on init
        modal.classList.remove('active');
        modal.style.display = 'none';
    },

    // Clean up modal event listeners
    cleanupModalListeners() {
        const modal = document.getElementById('countdownSettingsModal');
        const modalContent = modal?.querySelector('.modal-content');

        if (modal && this.modalHandlers.clickHandler) {
            modal.removeEventListener('click', this.modalHandlers.clickHandler);
        }
        if (modalContent && this.modalHandlers.contentHandler) {
            modalContent.removeEventListener('click', this.modalHandlers.contentHandler);
        }
        if (this.modalHandlers.escapeHandler) {
            document.removeEventListener('keydown', this.modalHandlers.escapeHandler);
        }

        // Reset handlers
        this.modalHandlers = {
            clickHandler: null,
            contentHandler: null,
            escapeHandler: null
        };
    },

    // Load configuration from localStorage
    loadConfiguration() {
        const savedConfig = localStorage.getItem('loveLine_countdownConfig');
        if (savedConfig) {
            try {
                this.config = { ...this.config, ...JSON.parse(savedConfig) };
            } catch (error) {
                console.error('Error loading countdown config:', error);
            }
        }
    },

    // Save configuration to localStorage
    saveConfiguration() {
        localStorage.setItem('loveLine_countdownConfig', JSON.stringify(this.config));
    },

    // Load countdowns from storage
    loadCountdowns() {
        // Load completed celebrations
        const completed = localStorage.getItem('loveLine_completedCelebrations');
        if (completed) {
            try {
                this.state.completedCountdowns = JSON.parse(completed);
            } catch (error) {
                console.error('Error loading completed celebrations:', error);
            }
        }

        // Load milestones with reminders as countdowns
        this.loadMilestoneCountdowns();

        // Update active countdowns
        this.updateActiveCountdowns();

        // Setup main countdown
        if (this.state.activeCountdowns.length > 0) {
            this.setupMainCountdown(this.state.activeCountdowns[0]);
        } else {
            this.setupDefaultAnniversary();
        }
    },

    // Load milestones with reminders
    loadMilestoneCountdowns() {
        const milestones = Storage.getAllMilestones();
        const today = new Date();

        // Filter milestones that have reminders and future dates
        const milestoneCountdowns = milestones
            .filter(milestone => {
                // Check if milestone has reminder enabled
                if (!milestone.setReminder) return false;

                // Get next occurrence
                const milestoneDate = new Date(milestone.date);
                const nextOccurrence = Storage.getNextOccurrence(milestoneDate);

                // Only include future dates
                return nextOccurrence > today;
            })
            .map(milestone => {
                const milestoneDate = new Date(milestone.date);
                const nextOccurrence = Storage.getNextOccurrence(milestoneDate);

                return {
                    id: `milestone_${milestone.id}`,
                    type: 'milestone',
                    title: milestone.title,
                    targetDate: nextOccurrence.toISOString(),
                    originalDate: milestone.date,
                    description: milestone.description,
                    category: milestone.category,
                    color: this.getCategoryColor(milestone.category),
                    icon: this.getCategoryIcon(milestone.category),
                    significance: milestone.significance,
                    isRecurring: true
                };
            });

        this.state.milestoneCountdowns = milestoneCountdowns;
    },

    // Update active countdowns list
    updateActiveCountdowns() {
        const allCountdowns = [
            ...this.state.milestoneCountdowns || []
        ];

        // Sort by date (soonest first)
        this.state.activeCountdowns = allCountdowns.sort((a, b) =>
            new Date(a.targetDate) - new Date(b.targetDate)
        );

        // Update active countdowns count
        const activeElement = document.getElementById('activeCountdowns');
        if (activeElement) {
            activeElement.textContent = this.state.activeCountdowns.length;
        }
    },

    // Setup default anniversary if no countdowns exist
    setupDefaultAnniversary() {
        const profile = Storage.getUserProfile();

        if (profile && profile.anniversaryDate) {
            const anniversaryDate = new Date(profile.anniversaryDate);
            const nextAnniversary = Storage.getNextOccurrence(anniversaryDate);

            const defaultCountdown = {
                id: 'default_anniversary',
                type: 'anniversary',
                title: 'Relationship Anniversary',
                targetDate: nextAnniversary.toISOString(),
                description: `Celebrating ${new Date().getFullYear() - anniversaryDate.getFullYear() + 1} years together`,
                color: '#E75480',
                icon: 'fa-heart',
                isRecurring: true
            };

            this.setupMainCountdown(defaultCountdown);
        } else {
            // Show placeholder if no anniversary date set
            this.showPlaceholderCountdown();
        }
    },

    // Setup main countdown display
    setupMainCountdown(countdown) {
        if (!countdown) return;

        // Update UI elements
        const titleElement = document.getElementById('mainCountdownTitle');
        const subtitleElement = document.getElementById('mainCountdownSubtitle');
        const dateElement = document.getElementById('targetDate');

        if (titleElement) titleElement.textContent = countdown.title;

        if (subtitleElement) {
            if (countdown.description) {
                subtitleElement.textContent = countdown.description;
            } else {
                subtitleElement.textContent = 'Counting down to your special moment';
            }
        }

        // Update target date display
        const targetDate = new Date(countdown.targetDate);
        if (dateElement) {
            dateElement.textContent = targetDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        // Set progress bar color
        const progressFill = document.getElementById('countdownProgress');
        if (progressFill) {
            progressFill.style.background = `linear-gradient(90deg, ${countdown.color}, ${this.lightenColor(countdown.color, 30)})`;
        }

        // Start countdown
        this.updateCountdown(countdown);
    },

    // Show placeholder countdown
    showPlaceholderCountdown() {
        const titleElement = document.getElementById('mainCountdownTitle');
        const subtitleElement = document.getElementById('mainCountdownSubtitle');
        const dateElement = document.getElementById('targetDate');
        const timeRemainingElement = document.getElementById('timeRemaining');

        if (titleElement) titleElement.textContent = 'No Countdowns Yet';
        if (subtitleElement) subtitleElement.textContent = 'Add a milestone with reminders to get started';
        if (dateElement) dateElement.textContent = '--/--/----';
        if (timeRemainingElement) timeRemainingElement.textContent = '-- days';

        // Reset timer display
        ['days', 'hours', 'minutes', 'seconds'].forEach(unit => {
            const element = document.getElementById(unit);
            if (element) element.textContent = '--';
        });
    },

    // Update countdown display
    updateCountdown(countdown) {
        const now = new Date();
        const target = new Date(countdown.targetDate);
        const diff = target - now;

        if (diff <= 0) {
            // Countdown reached zero
            this.handleCountdownComplete(countdown);
            return;
        }

        // Calculate time units
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        // Update main countdown display
        if (countdown === this.state.activeCountdowns[0]) {
            this.updateMainCountdownDisplay(days, hours, minutes, seconds, target);
        }

        // Update countdown card if it exists
        this.updateCountdownCard(countdown.id, days, hours, minutes, seconds);
    },

    // Update main countdown display
    updateMainCountdownDisplay(days, hours, minutes, seconds, target) {
        // Update time values with animation
        this.updateTimeValue('days', days.toString().padStart(2, '0'));
        this.updateTimeValue('hours', hours.toString().padStart(2, '0'));
        this.updateTimeValue('minutes', minutes.toString().padStart(2, '0'));

        if (this.config.showSeconds) {
            const secondsElement = document.getElementById('seconds');
            if (secondsElement) {
                secondsElement.textContent = seconds.toString().padStart(2, '0');
            }
        }

        // Update time remaining text
        const totalHours = days * 24 + hours;
        let timeRemainingText;
        const timeRemainingElement = document.getElementById('timeRemaining');

        if (days > 30) {
            const months = Math.floor(days / 30);
            timeRemainingText = `${months} month${months !== 1 ? 's' : ''}`;
        } else if (days > 0) {
            timeRemainingText = `${days} day${days !== 1 ? 's' : ''}`;
        } else if (hours > 0) {
            timeRemainingText = `${hours} hour${hours !== 1 ? 's' : ''}`;
        } else {
            timeRemainingText = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }

        if (timeRemainingElement) {
            timeRemainingElement.textContent = timeRemainingText;
        }

        // Update progress bar
        if (this.config.showProgressBar) {
            this.updateProgressBar(target);
        }
    },

    // Update time value with animation
    updateTimeValue(elementId, newValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const currentValue = element.textContent;

        if (currentValue !== newValue) {
            element.classList.add('changed');
            element.textContent = newValue;

            // Remove animation class after animation completes
            setTimeout(() => {
                element.classList.remove('changed');
            }, 500);
        }
    },

    // Update progress bar
    updateProgressBar(targetDate) {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

        // Calculate percentage of year passed (or use another metric)
        const totalYearTime = endOfYear - startOfYear;
        const timePassed = now - startOfYear;
        const percentage = Math.min(100, (timePassed / totalYearTime) * 100);

        const progressFill = document.getElementById('countdownProgress');
        const progressPercentage = document.getElementById('progressPercentage');
        const progressText = document.getElementById('progressText');

        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        if (progressPercentage) {
            progressPercentage.textContent = `${Math.round(percentage)}%`;
        }
        if (progressText) {
            progressText.textContent = 'Year progress';
        }
    },

    // Update countdown card
    updateCountdownCard(countdownId, days, hours, minutes, seconds) {
        const card = document.querySelector(`[data-countdown-id="${countdownId}"]`);
        if (!card) return;

        // Update time display based on remaining time
        let timeDisplay, unitDisplay;

        if (days > 0) {
            timeDisplay = days;
            unitDisplay = 'days';
        } else if (hours > 0) {
            timeDisplay = hours;
            unitDisplay = 'hours';
        } else if (minutes > 0) {
            timeDisplay = minutes;
            unitDisplay = 'minutes';
        } else {
            timeDisplay = seconds;
            unitDisplay = 'seconds';
        }

        const timeElement = card.querySelector('.countdown-card-time');
        const unitElement = card.querySelector('.countdown-card-unit');

        if (timeElement) timeElement.textContent = timeDisplay;
        if (unitElement) unitElement.textContent = unitDisplay;

        // Update progress bar in card
        const progressBar = card.querySelector('.countdown-card-progress .progress-fill');
        if (progressBar) {
            const totalSeconds = days * 86400 + hours * 3600 + minutes * 60 + seconds;
            const percentage = 100 - Math.min(100, (totalSeconds / (30 * 86400)) * 100); // 30-day scale
            progressBar.style.width = `${percentage}%`;
        }
    },

    // Handle countdown completion
    handleCountdownComplete(countdown) {
        console.log(`Countdown complete: ${countdown.title}`);

        // Trigger celebration
        if (this.config.autoCelebrate) {
            this.triggerCelebration(countdown);
        }

        // Remove from active countdowns
        this.state.activeCountdowns = this.state.activeCountdowns.filter(c => c.id !== countdown.id);

        // Add to completed celebrations
        this.state.completedCountdowns.unshift({
            ...countdown,
            completedAt: new Date().toISOString(),
            celebrated: true
        });

        // Save completed celebrations
        this.saveCompletedCelebrations();

        // Update UI
        this.updateUI();

        // Setup next countdown if available
        if (this.state.activeCountdowns.length > 0) {
            this.setupMainCountdown(this.state.activeCountdowns[0]);
        } else {
            this.setupDefaultAnniversary();
        }
    },

    // Trigger celebration
    triggerCelebration(countdown) {
        if (this.state.isCelebrating) return;

        this.state.isCelebrating = true;

        // Show celebration notification
        this.showCelebrationNotification(countdown);

        // Launch confetti
        this.launchConfetti();

        // Mark as celebrating
        setTimeout(() => {
            this.state.isCelebrating = false;
        }, 5000);
    },

    // Show celebration notification
    showCelebrationNotification(countdown) {
        const notification = document.getElementById('celebrationNotification');
        const titleElement = document.getElementById('celebrationTitle');
        const messageElement = document.getElementById('celebrationMessage');

        if (!notification || !titleElement || !messageElement) return;

        // Update notification content
        titleElement.textContent = `🎉 ${countdown.title}!`;
        messageElement.textContent = 'Time to celebrate this special moment!';

        // Show notification
        notification.style.display = 'block';

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (notification && notification.style.display !== 'none') {
                notification.style.display = 'none';
            }
        }, 10000);
    },

    // Launch confetti
    launchConfetti() {
        if (typeof confetti !== 'function') {
            console.warn('Confetti library not loaded');
            return;
        }

        const count = 200;
        const defaults = {
            origin: { y: 0.7 }
        };

        function fire(particleRatio, opts) {
            confetti({
                ...defaults,
                ...opts,
                particleCount: Math.floor(count * particleRatio)
            });
        }

        fire(0.25, {
            spread: 26,
            startVelocity: 55,
        });
        fire(0.2, {
            spread: 60,
        });
        fire(0.35, {
            spread: 100,
            decay: 0.91,
            scalar: 0.8
        });
        fire(0.1, {
            spread: 120,
            startVelocity: 25,
            decay: 0.92,
            scalar: 1.2
        });
        fire(0.1, {
            spread: 120,
            startVelocity: 45,
        });
    },

    // Start countdown update loop
    startCountdownLoop() {
        if (this.state.countdownInterval) {
            clearInterval(this.state.countdownInterval);
        }

        this.state.countdownInterval = setInterval(() => {
            this.updateAllCountdowns();
        }, this.config.updateInterval);
    },

    // Update all active countdowns
    updateAllCountdowns() {
        this.state.activeCountdowns.forEach(countdown => {
            this.updateCountdown(countdown);
        });
    },

    // Setup event listeners
    setupEventListeners() {
        // Clean up any existing listeners first
        this.cleanupEventListeners();

        // View toggle buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            const handler = (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            };
            btn.addEventListener('click', handler);
            btn.dataset.listenerId = 'view-toggle';
        });

        // Display toggle buttons
        document.querySelectorAll('.display-btn').forEach(btn => {
            const handler = (e) => {
                const display = e.currentTarget.dataset.display;
                this.switchDisplay(display);
            };
            btn.addEventListener('click', handler);
            btn.dataset.listenerId = 'display-toggle';
        });

        // Settings button
        const settingsBtn = document.getElementById('mainCountdownSettings');
        if (settingsBtn) {
            const handler = () => this.showSettingsModal();
            settingsBtn.addEventListener('click', handler);
            settingsBtn.dataset.listenerId = 'settings-modal';
        }

        // Celebrate now button
        const celebrateBtn = document.getElementById('celebrateNowBtn');
        if (celebrateBtn) {
            const handler = () => {
                const mainCountdown = this.state.activeCountdowns[0];
                if (mainCountdown) {
                    this.triggerCelebration(mainCountdown);
                }
            };
            celebrateBtn.addEventListener('click', handler);
            celebrateBtn.dataset.listenerId = 'celebrate-now';
        }

        // Toggle completed button
        const toggleCompletedBtn = document.getElementById('toggleCompletedBtn');
        if (toggleCompletedBtn) {
            const handler = (e) => {
                this.toggleCompletedCelebrations(e.currentTarget);
            };
            toggleCompletedBtn.addEventListener('click', handler);
            toggleCompletedBtn.dataset.listenerId = 'toggle-completed';
        }

        // Refresh ideas button
        const refreshIdeasBtn = document.getElementById('refreshIdeasBtn');
        if (refreshIdeasBtn) {
            const handler = () => this.loadCelebrationIdeas();
            refreshIdeasBtn.addEventListener('click', handler);
            refreshIdeasBtn.dataset.listenerId = 'refresh-ideas';
        }

        // Refresh countdowns button
        const refreshCountdownsBtn = document.getElementById('refreshCountdownsBtn');
        if (refreshCountdownsBtn) {
            const handler = () => this.refreshCountdowns();
            refreshCountdownsBtn.addEventListener('click', handler);
            refreshCountdownsBtn.dataset.listenerId = 'refresh-countdowns';
        }

        // Close celebration notification
        const closeCelebrationBtn = document.getElementById('closeCelebrationBtn');
        if (closeCelebrationBtn) {
            const handler = () => {
                const notification = document.getElementById('celebrationNotification');
                if (notification) notification.style.display = 'none';
            };
            closeCelebrationBtn.addEventListener('click', handler);
            closeCelebrationBtn.dataset.listenerId = 'close-celebration';
        }

        // Settings modal buttons
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        if (saveSettingsBtn) {
            const handler = () => this.saveSettings();
            saveSettingsBtn.addEventListener('click', handler);
            saveSettingsBtn.dataset.listenerId = 'save-settings';
        }

        const resetSettingsBtn = document.getElementById('resetSettingsBtn');
        if (resetSettingsBtn) {
            const handler = () => this.resetSettings();
            resetSettingsBtn.addEventListener('click', handler);
            resetSettingsBtn.dataset.listenerId = 'reset-settings';
        }

        // Modal close button
        const modalCloseBtn = document.querySelector('.modal-close');
        if (modalCloseBtn) {
            const handler = () => this.closeModal();
            modalCloseBtn.addEventListener('click', handler);
            modalCloseBtn.dataset.listenerId = 'modal-close';
        }
    },

    // Clean up event listeners
    cleanupEventListeners() {
        const elements = [
            'mainCountdownSettings',
            'celebrateNowBtn',
            'toggleCompletedBtn',
            'refreshIdeasBtn',
            'refreshCountdownsBtn',
            'closeCelebrationBtn',
            'saveSettingsBtn',
            'resetSettingsBtn'
        ];

        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const clone = element.cloneNode(true);
                element.parentNode.replaceChild(clone, element);
            }
        });

        // Clean up modal listeners
        this.cleanupModalListeners();
    },

    // Switch view
    switchView(view) {
        this.state.currentView = view;

        // Update button states
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === view) {
                btn.classList.add('active');
            }
        });

        // Update countdowns display based on view
        this.updateUI();
    },

    // Switch display mode
    switchDisplay(display) {
        this.state.currentDisplay = display;

        // Update button states
        document.querySelectorAll('.display-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.display === display) {
                btn.classList.add('active');
            }
        });

        // Update container class
        const container = document.getElementById('countdownsContainer');
        if (container) {
            container.className = 'countdowns-container ' + display + '-view';
        }
    },

    // Show settings modal
    showSettingsModal() {
        const modal = document.getElementById('countdownSettingsModal');
        if (!modal) return;

        // Load current settings into form
        const showSeconds = document.getElementById('showSeconds');
        const use24Hour = document.getElementById('use24Hour');
        const showProgressBar = document.getElementById('showProgressBar');
        const autoCelebrate = document.getElementById('autoCelebrate');
        const countdownTheme = document.getElementById('countdownTheme');

        if (showSeconds) showSeconds.checked = this.config.showSeconds;
        if (use24Hour) use24Hour.checked = this.config.use24Hour;
        if (showProgressBar) showProgressBar.checked = this.config.showProgressBar;
        if (autoCelebrate) autoCelebrate.checked = this.config.autoCelebrate;
        if (countdownTheme) countdownTheme.value = this.config.theme;

        modal.classList.add('active');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Focus on first input for accessibility
        setTimeout(() => {
            const firstInput = modal.querySelector('input, select, button');
            if (firstInput) firstInput.focus();
        }, 100);
    },

    // Close modal method
    closeModal() {
        const modal = document.getElementById('countdownSettingsModal');
        if (!modal) return;

        modal.classList.remove('active');

        // Use timeout to allow animation to complete before hiding
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';

            // Return focus to settings button
            const settingsBtn = document.getElementById('mainCountdownSettings');
            if (settingsBtn) {
                setTimeout(() => settingsBtn.focus(), 50);
            }
        }, 300);
    },

    // Save settings
    saveSettings() {
        // Get values from form
        const showSeconds = document.getElementById('showSeconds');
        const use24Hour = document.getElementById('use24Hour');
        const showProgressBar = document.getElementById('showProgressBar');
        const autoCelebrate = document.getElementById('autoCelebrate');
        const countdownTheme = document.getElementById('countdownTheme');

        if (showSeconds) this.config.showSeconds = showSeconds.checked;
        if (use24Hour) this.config.use24Hour = use24Hour.checked;
        if (showProgressBar) this.config.showProgressBar = showProgressBar.checked;
        if (autoCelebrate) this.config.autoCelebrate = autoCelebrate.checked;
        if (countdownTheme) this.config.theme = countdownTheme.value;

        // Save to localStorage
        this.saveConfiguration();

        // Apply theme
        this.applyTheme();

        // Close modal
        this.closeModal();

        // Show notification
        this.showNotification('Settings saved successfully!', 'success');
    },

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#2ecc71' : '#3498db'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    },

    // Reset settings to defaults
    resetSettings() {
        if (confirm('Reset all countdown settings to defaults?')) {
            this.config = {
                showSeconds: true,
                use24Hour: false,
                showProgressBar: true,
                autoCelebrate: true,
                theme: 'default',
                updateInterval: 1000
            };

            this.saveConfiguration();
            this.applyTheme();

            // Refresh the modal form
            this.closeModal();
            setTimeout(() => this.showSettingsModal(), 350);
        }
    },

    // Apply theme
    applyTheme() {
        const body = document.body;

        // Remove existing theme classes
        body.classList.remove('theme-minimal', 'theme-vibrant', 'theme-dark');

        // Add new theme class
        if (this.config.theme !== 'default') {
            body.classList.add(`theme-${this.config.theme}`);
        }
    },

    // Toggle completed celebrations
    toggleCompletedCelebrations(button) {
        const container = document.getElementById('completedContainer');
        if (!container) return;

        const isVisible = container.style.display !== 'none';

        if (isVisible) {
            container.style.display = 'none';
            button.innerHTML = '<i class="fas fa-chevron-down"></i> Show';
        } else {
            container.style.display = 'grid';
            button.innerHTML = '<i class="fas fa-chevron-up"></i> Hide';
            this.renderCompletedCelebrations();
        }
    },

    // Save completed celebrations
    saveCompletedCelebrations() {
        localStorage.setItem('loveLine_completedCelebrations', JSON.stringify(this.state.completedCountdowns));
    },

    // Update UI
    updateUI() {
        this.updateCountdownsGrid();
        this.updateStats();
        this.updateCompletedCount();
    },

    // Update countdowns grid
    updateCountdownsGrid() {
        const container = document.getElementById('countdownsContainer');
        if (!container) return;

        if (this.state.activeCountdowns.length <= 1) {
            // Only main countdown exists
            container.innerHTML = `
                <div class="empty-countdowns">
                    <i class="fas fa-clock"></i>
                    <h4>No additional countdowns</h4>
                    <p>Add more milestones with reminders to see them here</p>
                    <a href="add-milestone.html" class="btn-primary">
                        <i class="fas fa-plus"></i> Add Milestone with Reminder
                    </a>
                </div>
            `;
            return;
        }

        // Remove main countdown from the grid (it's already displayed separately)
        const gridCountdowns = this.state.activeCountdowns.slice(1);

        let gridHTML = '';

        gridCountdowns.forEach(countdown => {
            const targetDate = new Date(countdown.targetDate);
            const now = new Date();
            const diff = targetDate - now;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));

            gridHTML += `
                <div class="countdown-card" data-countdown-id="${countdown.id}">
                    <div class="countdown-card-header">
                        <div>
                            <div class="countdown-card-title">${countdown.title}</div>
                            <div class="countdown-card-date">
                                ${targetDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            })}
                            </div>
                        </div>
                        <div class="countdown-card-actions">
                            <button class="btn-icon celebrate-btn" data-id="${countdown.id}">
                                <i class="fas fa-champagne-glasses"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="countdown-card-timer">
                        <div class="countdown-card-time">${days}</div>
                        <div class="countdown-card-unit">days</div>
                        <div class="countdown-card-icon">
                            <i class="fas ${countdown.icon}"></i>
                        </div>
                    </div>
                    
                    <div class="countdown-card-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="background: ${countdown.color}; width: ${Math.min(100, (days / 30) * 100)}%"></div>
                        </div>
                    </div>
                    
                    <div class="countdown-card-footer">
                        <span class="countdown-type">${this.formatCategoryName(countdown.category)}</span>
                        <span class="countdown-days">${days} days to go</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = gridHTML;

        // Add event listeners to celebrate buttons
        document.querySelectorAll('.celebrate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const countdownId = e.currentTarget.dataset.id;
                this.celebrateCountdown(countdownId);
            });
        });
    },

    // Render completed celebrations
    renderCompletedCelebrations() {
        const container = document.getElementById('completedContainer');
        if (!container) return;

        if (this.state.completedCountdowns.length === 0) {
            container.innerHTML = `
                <div class="empty-completed">
                    <p>No completed celebrations yet</p>
                </div>
            `;
            return;
        }

        let completedHTML = '';

        this.state.completedCountdowns.slice(0, 6).forEach(countdown => {
            const completedDate = new Date(countdown.completedAt);

            completedHTML += `
                <div class="completed-item">
                    <div class="completed-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="completed-info">
                        <div class="completed-title">${countdown.title}</div>
                        <div class="completed-date">
                            Celebrated on ${completedDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            })}
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = completedHTML;
    },

    // Update stats
    updateStats() {
        // Next countdown time
        const nextElement = document.getElementById('nextCountdown');
        if (nextElement) {
            if (this.state.activeCountdowns.length > 0) {
                const next = this.state.activeCountdowns[0];
                const target = new Date(next.targetDate);
                const now = new Date();
                const days = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

                nextElement.textContent = days > 0 ? `${days} days` : 'Today!';
            } else {
                nextElement.textContent = '--';
            }
        }

        // Upcoming count
        const upcomingElement = document.getElementById('upcomingCount');
        if (upcomingElement) {
            upcomingElement.textContent = this.state.activeCountdowns.length;
        }

        // Celebrated count
        const celebratedElement = document.getElementById('celebratedCount');
        if (celebratedElement) {
            celebratedElement.textContent = this.state.completedCountdowns.length;
        }

        // Total days counted
        const totalDaysElement = document.getElementById('totalDaysCounted');
        if (totalDaysElement) {
            let totalDays = 0;
            this.state.completedCountdowns.forEach(countdown => {
                const created = new Date(countdown.createdAt || countdown.targetDate);
                const completed = new Date(countdown.completedAt || new Date());
                const days = Math.ceil((completed - created) / (1000 * 60 * 60 * 24));
                totalDays += days;
            });
            totalDaysElement.textContent = totalDays;
        }
    },

    // Update completed count
    updateCompletedCount() {
        const container = document.getElementById('completedContainer');
        if (!container) return;

        this.renderCompletedCelebrations();
    },

    // Load celebration ideas
    loadCelebrationIdeas() {
        const container = document.getElementById('celebrationIdeas');
        if (!container) return;

        // Shuffle array to get random ideas
        const shuffledIdeas = [...this.celebrationIdeas]
            .sort(() => Math.random() - 0.5)
            .slice(0, 4);

        let ideasHTML = '';

        shuffledIdeas.forEach(idea => {
            ideasHTML += `
                <div class="idea-card" data-idea-id="${idea.id}">
                    <div class="idea-icon">
                        <i class="fas ${idea.icon}"></i>
                    </div>
                    <div class="idea-title">${idea.title}</div>
                    <div class="idea-description">${idea.description}</div>
                    <div class="idea-tags">
                        ${idea.tags.map(tag => `<span class="idea-tag">${tag}</span>`).join('')}
                    </div>
                </div>
            `;
        });

        container.innerHTML = ideasHTML;

        // Add click events to idea cards
        document.querySelectorAll('.idea-card').forEach(card => {
            card.addEventListener('click', () => {
                const title = card.querySelector('.idea-title').textContent;
                this.showNotification(`Great idea! "${title}" selected. Add it to your celebration plans!`, 'success');
            });
        });
    },

    // Celebrate specific countdown
    celebrateCountdown(countdownId) {
        const countdown = this.state.activeCountdowns.find(c => c.id === countdownId);
        if (countdown) {
            this.triggerCelebration(countdown);
        }
    },

    // Refresh countdowns
    refreshCountdowns() {
        this.loadCountdowns();
        this.updateUI();
        this.showNotification('Countdowns refreshed!', 'success');
    },

    // Utility functions
    getCategoryColor(category) {
        const colors = {
            'romance': '#E75480',
            'travel': '#4A90E2',
            'commitment': '#9B59B6',
            'achievement': '#2ECC71',
            'celebration': '#F39C12',
            'first': '#1ABC9C',
            'growth': '#3498DB',
            'other': '#95A5A6'
        };
        return colors[category] || colors.other;
    },

    getCategoryIcon(category) {
        const icons = {
            'romance': 'fa-heart',
            'travel': 'fa-plane',
            'commitment': 'fa-home',
            'achievement': 'fa-trophy',
            'celebration': 'fa-gift',
            'first': 'fa-star',
            'growth': 'fa-seedling',
            'other': 'fa-heart-circle-plus'
        };
        return icons[category] || icons.other;
    },

    formatCategoryName(category) {
        return category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Other';
    },

    lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16),
            amt = Math.round(2.55 * percent),
            R = (num >> 16) + amt,
            G = (num >> 8 & 0x00FF) + amt,
            B = (num & 0x0000FF) + amt;

        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    },

    // Cleanup method
    cleanup() {
        if (this.state.countdownInterval) {
            clearInterval(this.state.countdownInterval);
            this.state.countdownInterval = null;
        }

        this.cleanupEventListeners();
        this.cleanupModalListeners();
    }
};

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    CountdownManager.init();

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        CountdownManager.cleanup();
    });

    // Also cleanup on page hide (for SPA navigation)
    window.addEventListener('pagehide', () => {
        CountdownManager.cleanup();
    });
});

document.addEventListener("DOMContentLoaded", () => {
    confetti();
});
