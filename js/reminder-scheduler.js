// reminder-scheduler.js
// Checks for due reminders and triggers notifications

const ReminderScheduler = {
    /**
     * Check all milestones for upcoming reminders
     */
    async checkReminders() {
        // Ensure we have permission
        const permission = await Notifications.requestPermission();
        if (permission !== 'granted') return;

        const milestones = Storage.getAllMilestones();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        milestones.forEach(milestone => {
            if (!milestone.reminder?.enabled) return;

            const milestoneDate = new Date(milestone.date);
            milestoneDate.setHours(0, 0, 0, 0);

            const daysDiff = Math.ceil((milestoneDate - today) / (1000 * 60 * 60 * 24));

            // Check if today is exactly the reminder day
            if (daysDiff === milestone.reminder.daysBefore) {
                // Avoid duplicate notification on same day
                if (milestone.reminder.lastTriggered === todayStr) return;

                // Show notification
                Notifications.show(`🎉 ${milestone.title} is coming up!`, {
                    body: `${milestone.reminder.daysBefore} days until ${milestone.date}`,
                    milestoneId: milestone.id,
                    tag: `reminder-${milestone.id}`,
                    requireInteraction: true
                });

                // Update last triggered
                milestone.reminder.lastTriggered = todayStr;
                Storage.saveMilestone(milestone);
            }
        });
    },

    /**
     * Start the reminder service (call once on page load)
     */
    start() {
        // Immediate check
        this.checkReminders();

        // Then check every 60 minutes
        setInterval(() => this.checkReminders(), 60 * 60 * 1000);
    }
};

window.ReminderScheduler = ReminderScheduler;