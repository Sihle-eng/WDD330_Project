// ===== FORM HANDLER MODULE =====
const FormHandler = {
    // Form state
    formState: {
        tags: [],
        isEditing: false,
        milestoneId: null,
        lastSavedId: null,
        backgroundImage: null,
        imageAttribution: '',
        photos: [] // 🆕 Store selected photos (as File objects or data URLs)
    },

    // Initialize form
    init() {
        console.log('Form Handler initialized');

        // Check for required Storage module
        if (typeof Storage === 'undefined') {
            console.error('Storage module is not loaded. FormHandler cannot function.');
            return;
        }

        // Check if we're editing an existing milestone
        this.checkEditMode();

        // Set up event listeners
        this.setupEventListeners();

        // Initialize character counters
        this.initCharacterCounters();

        // Load suggestion templates
        this.loadSuggestionTemplates();
    },

    // Check if we're in edit mode (URL parameter ?edit=id)
    checkEditMode() {
        const urlParams = new URLSearchParams(window.location.search);
        const milestoneId = urlParams.get('edit');

        if (milestoneId) {
            this.loadMilestoneForEdit(milestoneId);
        }
    },

    // Load milestone data for editing
    loadMilestoneForEdit(milestoneId) {
        const milestone = Storage.getMilestoneById(milestoneId);

        if (milestone) {
            this.formState.isEditing = true;
            this.formState.milestoneId = milestoneId;

            // Update form title
            const h1 = document.querySelector('h1');
            if (h1) h1.innerHTML = `<i class="fas fa-edit"></i> Edit Milestone`;
            const subtitle = document.querySelector('.form-subtitle');
            if (subtitle) subtitle.textContent = 'Update your special moment';

            // Populate form fields
            const idField = document.getElementById('milestoneId');
            if (idField) idField.value = milestone.id || '';

            const titleField = document.getElementById('title');
            if (titleField) titleField.value = milestone.title || '';

            const dateField = document.getElementById('date');
            if (dateField) dateField.value = milestone.date || '';

            const categoryField = document.getElementById('category');
            if (categoryField) categoryField.value = milestone.category || '';

            const descField = document.getElementById('description');
            if (descField) descField.value = milestone.description || '';

            const locationField = document.getElementById('location');
            if (locationField) locationField.value = milestone.location || '';

            // Set significance
            if (milestone.significance) {
                const radio = document.querySelector(`input[name="significance"][value="${milestone.significance}"]`);
                if (radio) radio.checked = true;
            }

            // Load tags
            if (milestone.tags && Array.isArray(milestone.tags)) {
                this.formState.tags = milestone.tags;
                this.renderTags();
            }

            // Load background image info (for Unsplash picker)
            if (milestone.backgroundImage) {
                this.formState.backgroundImage = milestone.backgroundImage;
                this.formState.imageAttribution = milestone.imageAttribution || '';
                window.selectedBackgroundUrl = milestone.backgroundImage;
                window.selectedBackgroundAttribution = milestone.imageAttribution;
            }

            // 🆕 Load photos (if you store them in the milestone)
            if (milestone.photos && Array.isArray(milestone.photos)) {
                this.formState.photos = milestone.photos;
                this.renderPhotoPreviews(milestone.photos); // You'd need to implement this
            }

            // Load reminder settings
            if (milestone.reminder) {
                const enableReminder = document.getElementById('enable-reminder');
                if (enableReminder) enableReminder.checked = milestone.reminder.enabled || false;

                const reminderDays = document.getElementById('reminder-days');
                if (reminderDays) reminderDays.value = milestone.reminder.daysBefore || 7;

                const reminderTime = document.getElementById('reminder-time');
                if (reminderTime) reminderTime.value = milestone.reminder.time || '09:00';

                const options = document.getElementById('reminder-options');
                if (options) options.style.display = milestone.reminder.enabled ? 'block' : 'none';
            }

            // Update button text
            const saveBtn = document.getElementById('saveBtn');
            if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> Update Milestone';
        }
    },

    // Setup event listeners
    setupEventListeners() {
        // Form submission
        const form = document.getElementById('milestoneForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Cancel button
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
                    window.location.href = 'index.html';
                }
            });
        }

        // Tag input
        const tagInput = document.getElementById('tagInput');
        if (tagInput) {
            tagInput.addEventListener('keypress', (e) => this.handleTagInput(e));
        }

        // Character counters
        const titleInput = document.getElementById('title');
        const descInput = document.getElementById('description');
        if (titleInput) titleInput.addEventListener('input', (e) => this.updateCharCount(e));
        if (descInput) descInput.addEventListener('input', (e) => this.updateCharCount(e));

        // Reminder checkbox toggle
        const enableReminder = document.getElementById('enable-reminder');
        const reminderOptions = document.getElementById('reminder-options');
        if (enableReminder && reminderOptions) {
            enableReminder.addEventListener('change', function (e) {
                reminderOptions.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // 🆕 Photo upload: click area triggers file input
        const photoUploadArea = document.getElementById('photoUploadArea');
        const photoInput = document.getElementById('photos');
        if (photoUploadArea && photoInput) {
            photoUploadArea.addEventListener('click', () => {
                photoInput.click();
            });

            // Handle file selection
            photoInput.addEventListener('change', (e) => this.handlePhotoSelection(e));
        }

        // Modal buttons
        const modalClose = document.querySelector('.modal-close');
        if (modalClose) modalClose.addEventListener('click', () => this.hideModal());

        const viewBtn = document.getElementById('viewMilestoneBtn');
        if (viewBtn) viewBtn.addEventListener('click', () => this.viewMilestone());

        const addAnotherBtn = document.getElementById('addAnotherBtn');
        if (addAnotherBtn) addAnotherBtn.addEventListener('click', () => this.resetForm());

        const goHomeBtn = document.getElementById('goHomeBtn');
        if (goHomeBtn) goHomeBtn.addEventListener('click', () => window.location.href = 'index.html');

        // Click outside modal to close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal();
            }
        });
    },

    // Initialize character counters
    initCharacterCounters() {
        const titleInput = document.getElementById('title');
        const descInput = document.getElementById('description');
        if (titleInput) this.updateCharCount({ target: titleInput });
        if (descInput) this.updateCharCount({ target: descInput });
    },

    // Update character count display
    updateCharCount(event) {
        const input = event.target;
        const charCount = input.value.length;
        const maxLength = input.getAttribute('maxlength');
        const counter = input.parentElement.querySelector('.char-count');

        if (counter) {
            counter.textContent = `${charCount}/${maxLength} characters`;
            if (charCount > maxLength * 0.9) {
                counter.style.color = 'var(--warning-color)';
            } else {
                counter.style.color = 'var(--text-secondary)';
            }
        }
    },

    handleSubmit(event) {
        event.preventDefault();
        console.log('Form submitted – starting validation');

        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn.disabled) {
            console.log('Already submitting – ignoring');
            return;
        }
        saveBtn.disabled = true;

        try {
            // Validate
            if (!this.validateForm()) {
                console.log('Validation failed');
                saveBtn.disabled = false;
                return;
            }

            console.log('Validation passed – collecting form data');
            const formData = this.getFormData();
            console.log('Saving milestone:', formData);

            const success = Storage.saveMilestone(formData);
            console.log('Storage.saveMilestone returned:', success);

            if (success) {
                this.showSuccessModal(formData.id);
                // Button stays disabled (we may redirect)
            } else {
                alert('Error saving milestone. Please try again.');
                saveBtn.disabled = false;
            }
        } catch (error) {
            console.error('Exception during save:', error);
            alert('An unexpected error occurred. Check console for details.');
            saveBtn.disabled = false;
        }
    },
    // Validate form
    validateForm() {
        const title = document.getElementById('title').value.trim();
        const date = document.getElementById('date').value;
        const category = document.getElementById('category').value;

        if (!title) {
            alert('Please enter a title for your milestone');
            return false;
        }
        if (!date) {
            alert('Please select a date');
            return false;
        }
        if (!category) {
            alert('Please select a category');
            return false;
        }

        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
            if (!confirm('You\'ve selected a future date. Is this a planned milestone?')) {
                return false;
            }
        }

        return true;
    },

    // Get form data
    getFormData() {
        const form = document.getElementById('milestoneForm');
        const formData = new FormData(form);

        // Background image from global vars (set by image-picker.js)
        const backgroundImage = window.selectedBackgroundUrl || null;
        const imageAttribution = window.selectedBackgroundAttribution || '';

        // Reminder settings
        const reminderEnabled = document.getElementById('enable-reminder')?.checked || false;
        const reminderDays = parseInt(document.getElementById('reminder-days')?.value) || 7;
        const reminderTime = document.getElementById('reminder-time')?.value || '09:00';

        // 🆕 Get photos from formState (or process files as needed)
        // Here we store them as an array of objects with data URL and name
        // You may want to upload them to a server instead of storing as base64
        const photos = this.formState.photos.map(photo => ({
            name: photo.name,
            type: photo.type,
            size: photo.size,
            dataUrl: photo.dataUrl // or store as File if you plan to upload later
        }));

        const data = {
            title: formData.get('title'),
            date: formData.get('date'),
            category: formData.get('category'),
            significance: document.querySelector('input[name="significance"]:checked')?.value || 'medium',
            description: formData.get('description'),
            location: formData.get('location'),
            tags: this.formState.tags,
            backgroundImage: backgroundImage,
            imageAttribution: imageAttribution,
            photos: photos, // 🆕 Add photos to milestone data
            reminder: {
                enabled: reminderEnabled,
                daysBefore: reminderDays,
                time: reminderTime,
                lastTriggered: null
            }
        };

        // Add ID if editing
        const id = formData.get('id');
        if (id) {
            data.id = id;
        }

        return data;
    },

    // ===== TAG METHODS =====
    handleTagInput(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const input = event.target;
            const tagText = input.value.trim();

            if (tagText && !this.formState.tags.includes(tagText)) {
                this.formState.tags.push(tagText);
                this.renderTags();
                input.value = '';
            }
        }
    },

    renderTags() {
        const tagsContainer = document.getElementById('tagsContainer');
        if (!tagsContainer) return;

        tagsContainer.innerHTML = '';

        this.formState.tags.forEach((tag, index) => {
            const tagElement = document.createElement('div');
            tagElement.className = 'tag';
            tagElement.innerHTML = `
                ${tag}
                <button class="remove-tag" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            tagsContainer.appendChild(tagElement);
        });

        document.querySelectorAll('.remove-tag').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('button').dataset.index);
                this.removeTag(index);
            });
        });
    },

    removeTag(index) {
        this.formState.tags.splice(index, 1);
        this.renderTags();
    },

    // ===== PHOTO HANDLING METHODS =====
    handlePhotoSelection(event) {
        const files = Array.from(event.target.files);
        const previewContainer = document.getElementById('photoPreview');
        if (!previewContainer) return;

        // Clear previous previews and reset formState.photos
        previewContainer.innerHTML = '';
        this.formState.photos = [];

        files.forEach(file => {
            // Validate file type (accept images only)
            if (!file.type.startsWith('image/')) {
                alert(`File ${file.name} is not an image.`);
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert(`File ${file.name} exceeds 5MB limit.`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                // Create preview image
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = file.name;
                previewContainer.appendChild(img);

                // Store in formState (including dataUrl for later saving)
                this.formState.photos.push({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    dataUrl: e.target.result
                });
            };
            reader.readAsDataURL(file);
        });

        // If no valid files, clear preview
        if (this.formState.photos.length === 0) {
            previewContainer.innerHTML = '';
        }
    },

    // Optional: render existing photos when editing
    renderPhotoPreviews(photos) {
        const previewContainer = document.getElementById('photoPreview');
        if (!previewContainer) return;

        previewContainer.innerHTML = '';
        photos.forEach(photo => {
            const img = document.createElement('img');
            img.src = photo.dataUrl || photo; // if photo is just a URL
            img.alt = photo.name || 'Milestone photo';
            previewContainer.appendChild(img);
        });
    },

    // ===== SUGGESTION TEMPLATES =====
    loadSuggestionTemplates() {
        document.querySelectorAll('.suggestion-item').forEach(button => {
            button.addEventListener('click', (e) => {
                const template = e.currentTarget.dataset.template;
                this.applySuggestionTemplate(template);
            });
        });
    },

    applySuggestionTemplate(template) {
        const templates = {
            'first-date': {
                title: 'First Date',
                category: 'romance',
                significance: 'high',
                description: 'Our first official date. Remember how nervous we were?',
                tags: ['#firsts', '#nervous', '#excited']
            },
            'anniversary': {
                title: 'Anniversary',
                category: 'celebration',
                significance: 'high',
                description: 'Another wonderful year together!',
                tags: ['#celebration', '#love', '#anniversary']
            },
            'trip': {
                title: 'First Trip Together',
                category: 'travel',
                significance: 'medium',
                description: 'Our first adventure away from home!',
                tags: ['#travel', '#adventure', '#firsts']
            },
            'met-parents': {
                title: 'Met the Parents',
                category: 'growth',
                significance: 'medium',
                description: 'The big introduction!',
                tags: ['#family', '#milestone', '#nervous']
            },
            'moved-in': {
                title: 'Moved In Together',
                category: 'commitment',
                significance: 'high',
                description: 'Started our life together in our own place!',
                tags: ['#home', '#together', '#commitment']
            },
            'surprise': {
                title: 'Big Surprise',
                category: 'celebration',
                significance: 'high',
                description: 'One of us planned an amazing surprise!',
                tags: ['#surprise', '#thoughtful', '#excited']
            }
        };

        const data = templates[template];
        if (!data) return;

        const titleField = document.getElementById('title');
        if (titleField) titleField.value = data.title;

        const categoryField = document.getElementById('category');
        if (categoryField) categoryField.value = data.category;

        const significanceRadio = document.querySelector(`input[name="significance"][value="${data.significance}"]`);
        if (significanceRadio) significanceRadio.checked = true;

        const descField = document.getElementById('description');
        if (descField) descField.value = data.description;

        this.formState.tags = data.tags;
        this.renderTags();

        const today = new Date().toISOString().split('T')[0];
        const dateField = document.getElementById('date');
        if (dateField) dateField.value = today;

        this.updateCharCount({ target: titleField });
        this.updateCharCount({ target: descField });

        alert(`"${data.title}" template applied! Fill in the remaining details.`);
    },

    // ===== SUCCESS MODAL =====
    showSuccessModal(milestoneId) {
        console.log('showSuccessModal called with', milestoneId);
        this.formState.lastSavedId = milestoneId;
        const modal = document.getElementById('confirmationModal');
        console.log('Modal element found:', modal);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            console.log('Modal active class added');
        } else {
            console.error('Modal element not found!');
        }
    },

    hideModal() {
        const modal = document.getElementById('confirmationModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    viewMilestone() {
        if (this.formState.lastSavedId) {
            window.location.href = `milestone-detail.html?id=${this.formState.lastSavedId}`;
        }
    },

    resetForm() {
        const form = document.getElementById('milestoneForm');
        if (form) form.reset();

        this.formState.tags = [];
        this.formState.isEditing = false;
        this.formState.milestoneId = null;
        this.formState.backgroundImage = null;
        this.formState.imageAttribution = '';
        this.formState.photos = []; // 🆕 Clear photos

        // Reset hidden inputs and global vars
        const idField = document.getElementById('milestoneId');
        if (idField) idField.value = '';

        const defaultSignificance = document.querySelector('input[name="significance"][value="medium"]');
        if (defaultSignificance) defaultSignificance.checked = true;

        const tagsContainer = document.getElementById('tagsContainer');
        if (tagsContainer) tagsContainer.innerHTML = '';

        // Clear photo preview
        const previewContainer = document.getElementById('photoPreview');
        if (previewContainer) previewContainer.innerHTML = '';

        // Clear file input value so same file can be re-selected
        const photoInput = document.getElementById('photos');
        if (photoInput) photoInput.value = '';

        window.selectedBackgroundUrl = null;
        window.selectedBackgroundAttribution = '';

        // Reset reminder UI
        const enableReminder = document.getElementById('enable-reminder');
        if (enableReminder) enableReminder.checked = false;

        const reminderOptions = document.getElementById('reminder-options');
        if (reminderOptions) reminderOptions.style.display = 'none';

        // Update title if editing
        const h1 = document.querySelector('h1');
        if (h1 && h1.innerHTML.includes('Edit')) {
            h1.innerHTML = `<i class="fas fa-heart-circle-plus"></i> Add New Milestone`;
            const subtitle = document.querySelector('.form-subtitle');
            if (subtitle) subtitle.textContent = 'Capture your special moments and celebrate your journey together';

            const saveBtn = document.getElementById('saveBtn');
            if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Milestone';
        }

        this.hideModal();
        window.scrollTo(0, 0);
        const titleField = document.getElementById('title');
        if (titleField) titleField.focus();
    }
};

// Initialize form handler when DOM loads
document.addEventListener('DOMContentLoaded', () => FormHandler.init());