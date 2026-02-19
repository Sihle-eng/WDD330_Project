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

// reminders.js – manage reminders for each milestone
document.addEventListener('DOMContentLoaded', () => {
    loadReminders();
});

function loadReminders() {
    const settings = Storage.getSettings();
    const milestones = Storage.getAllMilestones();
    const upcoming = Storage.getUpcomingMilestones(30); // next 30 days

    // Display next reminders summary
    displayNextReminders(upcoming);

    // Display all milestones with toggle
    displayMilestoneReminders(milestones, settings.reminderDays);
}

function displayNextReminders(upcoming) {
    const container = document.getElementById('nextRemindersList');
    if (!container) return; // <-- FIX: exit if container doesn't exist

    if (upcoming.length === 0) {
        container.innerHTML = '<p class="empty-state">No upcoming reminders.</p>';
        return;
    }

    let html = '';
    upcoming.slice(0, 5).forEach(m => {
        const date = new Date(m.date);
        const daysUntil = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));
        html += `
            <div class="reminder-item">
                <div class="reminder-info">
                    <h4>${m.title}</h4>
                    <p>${date.toLocaleDateString()} (${daysUntil} days)</p>
                </div>
                <span class="reminder-badge">Reminder set</span>
            </div>
        `;
    });
    container.innerHTML = html;
}

function displayMilestoneReminders(milestones, defaultDays) {
    const container = document.getElementById('milestoneRemindersList');
    if (!container) return; // <-- FIX: exit if container doesn't exist

    if (milestones.length === 0) {
        container.innerHTML = '<p class="empty-state">No milestones yet.</p>';
        return;
    }

    // Sort by date descending
    milestones.sort((a, b) => new Date(b.date) - new Date(a.date));

    let html = '';
    milestones.forEach(m => {
        const reminderEnabled = m.reminderEnabled !== false; // default true
        const reminderDays = m.reminderDays || defaultDays;
        html += `
            <div class="reminder-item" data-id="${m.id}">
                <div class="reminder-info">
                    <h4>${m.title}</h4>
                    <p>${new Date(m.date).toLocaleDateString()} • ${reminderDays} day(s) before</p>
                </div>
                <div class="reminder-toggle">
                    <input type="checkbox" class="milestone-reminder-toggle" ${reminderEnabled ? 'checked' : ''}>
                    <span class="toggle-label">Remind</span>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;

    // Add event listeners to toggles
    container.querySelectorAll('.milestone-reminder-toggle').forEach((toggle, index) => {
        toggle.addEventListener('change', (e) => {
            const milestoneId = e.target.closest('.reminder-item').dataset.id;
            const milestone = Storage.getMilestoneById(milestoneId);
            if (milestone) {
                milestone.reminderEnabled = e.target.checked;
                // Optionally allow custom reminder days per milestone (could add a select)
                Storage.updateMilestone(milestone);
            }
        });
    });
}