// utils.js – shared utility functions

function applyTheme(theme) {
    const root = document.documentElement;
    const themes = {
        romance: { primary: '#E75480', secondary: '#4A90E2' },
        ocean: { primary: '#4A90E2', secondary: '#2C3E50' },
        forest: { primary: '#2ECC71', secondary: '#27AE60' },
        sunset: { primary: '#F39C12', secondary: '#E67E22' }
    };
    if (themes[theme]) {
        root.style.setProperty('--primary-color', themes[theme].primary);
        root.style.setProperty('--secondary-color', themes[theme].secondary);
    }
}

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Storage !== 'undefined') {
        const settings = Storage.getSettings();
        applyTheme(settings.theme);
    }
});