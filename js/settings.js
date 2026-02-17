// settings.js (simplified)

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    document.getElementById('settingsForm').addEventListener('submit', saveSettings);
    document.getElementById('resetSettings').addEventListener('click', resetToDefault);
    document.getElementById('enableNotifications').addEventListener('change', toggleReminderDays);
});

function loadSettings() {
    const profile = Storage.getUserProfile() || {};
    const settings = Storage.getSettings() || {};

    document.getElementById('coupleName').value = profile.coupleName || '';
    if (profile.anniversaryDate) {
        document.getElementById('anniversaryDate').value = profile.anniversaryDate;
    }

    document.getElementById('enableNotifications').checked = settings.notifications || false;
    document.getElementById('reminderDays').value = settings.reminderDays || 7;
    document.getElementById('theme').value = settings.theme || 'romance';

    toggleReminderDays();
}

function saveSettings(e) {
    e.preventDefault();

    const profile = {
        coupleName: document.getElementById('coupleName').value,
        anniversaryDate: document.getElementById('anniversaryDate').value
    };
    Storage.saveUserProfile(profile);

    const settings = {
        notifications: document.getElementById('enableNotifications').checked,
        reminderDays: parseInt(document.getElementById('reminderDays').value),
        theme: document.getElementById('theme').value
    };
    Storage.saveSettings(settings);

    // Apply the new theme immediately
    applyTheme(settings.theme);

    if (settings.notifications && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }

    alert('Settings saved successfully!');
}

function resetToDefault() {
    if (confirm('Reset all settings to default?')) {
        Storage.clearSettings();
        loadSettings();
        applyTheme('romance');
    }
}

function toggleReminderDays() {
    const enabled = document.getElementById('enableNotifications').checked;
    document.getElementById('reminderDaysGroup').style.display = enabled ? 'block' : 'none';
}