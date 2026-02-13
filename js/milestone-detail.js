// Handles loading and editing a single milestone

document.addEventListener('DOMContentLoaded', function () {
    // Get milestone ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const milestoneId = urlParams.get('id');

    if (!milestoneId) {
        alert('No milestone specified');
        return;
    }

    // Ensure Storage is available
    if (typeof Storage === 'undefined') {
        alert('Storage system not available. Please check your setup.');
        return;
    }

    // Load milestone data
    const milestone = Storage.getMilestoneById(milestoneId);
    if (!milestone) {
        alert('Milestone not found');
        return;
    }

    // Store milestone ID in hidden field
    const idField = document.getElementById('milestoneId');
    if (idField) idField.value = milestone.id;

    // Populate form fields
    populateForm(milestone);

    // Initialize photo gallery (if gallery.js is loaded)
    if (typeof PhotoGallery !== 'undefined') {
        new PhotoGallery(milestoneId);
    }

    // Handle form submission (update milestone)
    const form = document.getElementById('milestoneForm');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            saveMilestone(milestone);
        });
    }

    // Toggle reminder options visibility
    const enableReminder = document.getElementById('enable-reminder');
    const reminderOptions = document.getElementById('reminder-options');
    if (enableReminder && reminderOptions) {
        enableReminder.addEventListener('change', function (e) {
            reminderOptions.style.display = e.target.checked ? 'block' : 'none';
        });
    }
});

/**
 * Fill the form with milestone data
 */
function populateForm(milestone) {
    // Basic fields
    setFieldValue('title', milestone.title);
    setFieldValue('date', milestone.date);
    setFieldValue('category', milestone.category);
    setFieldValue('description', milestone.description);
    setFieldValue('location', milestone.location);

    // Significance radio
    if (milestone.significance) {
        const radio = document.querySelector(`input[name="significance"][value="${milestone.significance}"]`);
        if (radio) radio.checked = true;
    }

    // Tags (if you have tag functionality)
    if (milestone.tags && Array.isArray(milestone.tags) && typeof FormHandler !== 'undefined') {
        FormHandler.formState.tags = milestone.tags;
        FormHandler.renderTags();
    }

    // 🆕 Background image (for Unsplash picker)
    if (milestone.backgroundImage) {
        // Store globally so image-picker.js can show it
        window.selectedBackgroundUrl = milestone.backgroundImage;
        window.selectedBackgroundAttribution = milestone.imageAttribution || '';

        // Optional: update the image-picker UI to show current image (with escaping)
        const previewArea = document.getElementById('image-preview-area');
        if (previewArea) {
            // Basic escaping to prevent HTML injection
            const imgUrl = escapeHtml(milestone.backgroundImage);
            const attribution = escapeHtml(milestone.imageAttribution || '');
            previewArea.innerHTML = `
                <div class="selected-image-preview">
                    <img src="${imgUrl}" alt="Current background">
                    <p>Current background: ${attribution}</p>
                </div>
            `;
        }
    }

    // 🆕 Reminder settings
    if (milestone.reminder) {
        setFieldValue('enable-reminder', milestone.reminder.enabled);
        setFieldValue('reminder-days', milestone.reminder.daysBefore || 7);
        setFieldValue('reminder-time', milestone.reminder.time || '09:00');

        // Show/hide reminder options
        const reminderOptions = document.getElementById('reminder-options');
        if (reminderOptions) {
            reminderOptions.style.display = milestone.reminder.enabled ? 'block' : 'none';
        }
    }
}

/**
 * Helper to set form field value
 */
function setFieldValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;

    if (el.type === 'checkbox') {
        el.checked = !!value;
    } else {
        el.value = value || '';
    }
}

/**
 * Save updated milestone (preserves all original fields)
 */
function saveMilestone(originalMilestone) {
    // Collect form data (with safe defaults)
    const title = document.getElementById('title')?.value || '';
    const date = document.getElementById('date')?.value || '';
    const category = document.getElementById('category')?.value || '';
    const significance = document.querySelector('input[name="significance"]:checked')?.value || 'medium';
    const description = document.getElementById('description')?.value || '';
    const location = document.getElementById('location')?.value || '';
    const tags = window.FormHandler?.formState?.tags || originalMilestone.tags || [];

    // Background image (from global or keep existing)
    const backgroundImage = window.selectedBackgroundUrl || originalMilestone.backgroundImage || null;
    const imageAttribution = window.selectedBackgroundAttribution || originalMilestone.imageAttribution || '';

    // Reminder settings
    const reminderEnabled = document.getElementById('enable-reminder')?.checked || false;
    const reminderDays = parseInt(document.getElementById('reminder-days')?.value, 10);
    const reminderTime = document.getElementById('reminder-time')?.value || '09:00';

    // Build updated milestone by merging with original (preserves all fields)
    const updated = {
        ...originalMilestone,                     // keep all existing fields (createdAt, photos, etc.)
        title,
        date,
        category,
        significance,
        description,
        location,
        tags,
        backgroundImage,
        imageAttribution,
        reminder: {
            enabled: reminderEnabled,
            daysBefore: isNaN(reminderDays) ? 7 : reminderDays,   // safe integer fallback
            time: reminderTime,
            lastTriggered: originalMilestone.reminder?.lastTriggered || null
        }
    };

    // Save via Storage
    if (typeof Storage !== 'undefined' && Storage.saveMilestone) {
        const success = Storage.saveMilestone(updated);
        if (success) {
            alert('Milestone updated successfully!');
            window.location.href = 'index.html';
        } else {
            alert('Error saving milestone. Please try again.');
        }
    } else {
        alert('Storage system unavailable. Cannot save.');
    }
}

/**
 * Simple helper to escape HTML special characters (prevents XSS in preview)
 */
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}