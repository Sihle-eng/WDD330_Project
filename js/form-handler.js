// ===== FORM HANDLER MODULE =====
const FormHandler = {
    // Form state
    formState: {
        tags: [],
        photos: [],
        isEditing: false,
        milestoneId: null
    },

    // Initialize form
    init() {
        console.log('Form Handler initialized');

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
            document.querySelector('h1').innerHTML = `<i class="fas fa-edit"></i> Edit Milestone`;
            document.querySelector('.form-subtitle').textContent = 'Update your special moment';

            // Populate form fields
            document.getElementById('milestoneId').value = milestone.id;
            document.getElementById('title').value = milestone.title || '';
            document.getElementById('date').value = milestone.date || '';
            document.getElementById('category').value = milestone.category || '';
            document.getElementById('description').value = milestone.description || '';
            document.getElementById('location').value = milestone.location || '';

            // Set significance
            if (milestone.significance) {
                document.querySelector(`input[name="significance"][value="${milestone.significance}"]`).checked = true;
            }

            // Load tags
            if (milestone.tags && Array.isArray(milestone.tags)) {
                this.formState.tags = milestone.tags;
                this.renderTags();
            }

            // Load photos
            if (milestone.photoIds && Array.isArray(milestone.photoIds)) {
                this.loadMilestonePhotos(milestone.photoIds);
            }

            // Set reminder
            if (milestone.setReminder) {
                document.getElementById('setReminder').checked = true;
            }

            // Update button text
            document.getElementById('saveBtn').innerHTML = '<i class="fas fa-save"></i> Update Milestone';
        }
    },

    // Load photos for a milestone
    loadMilestonePhotos(photoIds) {
        // For now, we'll store photo data in the milestone itself
        // In a real app, you'd fetch from storage
        this.formState.photos = photoIds.map(id => ({ id, url: `data:image/jpeg;base64,...` }));
        this.renderPhotoPreviews();
    },

    // Setup event listeners
    setupEventListeners() {
        // Form submission
        const form = document.getElementById('milestoneForm');
        form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Cancel button
        document.getElementById('cancelBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
                window.location.href = 'index.html';
            }
        });

        // Photo upload
        const photoUploadArea = document.getElementById('photoUploadArea');
        const photoInput = document.getElementById('photos');

        photoUploadArea.addEventListener('click', () => photoInput.click());
        photoUploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        photoUploadArea.addEventListener('drop', (e) => this.handleFileDrop(e));
        photoInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Tag input
        const tagInput = document.getElementById('tagInput');
        tagInput.addEventListener('keypress', (e) => this.handleTagInput(e));

        // Character counters
        document.getElementById('title').addEventListener('input', (e) => this.updateCharCount(e));
        document.getElementById('description').addEventListener('input', (e) => this.updateCharCount(e));

        // Date max validation
        const dateInput = document.getElementById('date');
        const today = new Date().toISOString().split('T')[0];
        dateInput.max = '2025-12-31'; // Allow future dates up to 2025

        // Modal buttons
        document.querySelector('.modal-close').addEventListener('click', () => this.hideModal());
        document.getElementById('viewMilestoneBtn').addEventListener('click', () => this.viewMilestone());
        document.getElementById('addAnotherBtn').addEventListener('click', () => this.resetForm());
        document.getElementById('goHomeBtn').addEventListener('click', () => window.location.href = 'index.html');

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

        // Initial counts
        this.updateCharCount({ target: titleInput });
        this.updateCharCount({ target: descInput });
    },

    // Update character count display
    updateCharCount(event) {
        const input = event.target;
        const charCount = input.value.length;
        const maxLength = input.getAttribute('maxlength');
        const counter = input.parentElement.querySelector('.char-count');

        if (counter) {
            counter.textContent = `${charCount}/${maxLength} characters`;

            // Add warning style if approaching limit
            if (charCount > maxLength * 0.9) {
                counter.style.color = 'var(--warning-color)';
            } else {
                counter.style.color = 'var(--text-secondary)';
            }
        }
    },

    // Handle form submission
    handleSubmit(event) {
        event.preventDefault();

        // Validate form
        if (!this.validateForm()) {
            return;
        }

        // Get form data
        const formData = this.getFormData();

        // Save to storage
        const success = Storage.saveMilestone(formData);

        if (success) {
            this.showSuccessModal(formData.id);
        } else {
            alert('Error saving milestone. Please try again.');
        }
    },

    // Validate form
    validateForm() {
        const title = document.getElementById('title').value.trim();
        const date = document.getElementById('date').value;
        const category = document.getElementById('category').value;

        // Check required fields
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

        // Validate date is not in the future (unless it's a planned milestone)
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

        const data = {
            title: formData.get('title'),
            date: formData.get('date'),
            category: formData.get('category'),
            significance: document.querySelector('input[name="significance"]:checked')?.value || 'medium',
            description: formData.get('description'),
            location: formData.get('location'),
            tags: this.formState.tags,
            photoIds: this.formState.photos.map(photo => photo.id),
            setReminder: document.getElementById('setReminder').checked
        };

        // Add ID if editing
        const id = formData.get('id');
        if (id) {
            data.id = id;
        }

        return data;
    },

    // Handle file selection
    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        this.processFiles(files);
    },

    // Handle drag over
    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'copy';

        const uploadArea = document.getElementById('photoUploadArea');
        uploadArea.style.borderColor = 'var(--primary-color)';
        uploadArea.style.background = 'rgba(231, 84, 128, 0.05)';
    },

    // Handle file drop
    handleFileDrop(event) {
        event.preventDefault();
        event.stopPropagation();

        const uploadArea = document.getElementById('photoUploadArea');
        uploadArea.style.borderColor = '';
        uploadArea.style.background = '';

        const files = Array.from(event.dataTransfer.files);
        this.processFiles(files);
    },

    // Process uploaded files
    processFiles(files) {
        // Filter for images only
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            alert('Please select only image files (JPG, PNG, GIF)');
            return;
        }

        // Check file sizes (max 5MB)
        const oversizedFiles = imageFiles.filter(file => file.size > 5 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            alert('Some files are too large. Maximum file size is 5MB.');
            return;
        }

        // Process each file
        imageFiles.forEach(file => {
            this.processImageFile(file);
        });
    },

    // Process individual image file
    processImageFile(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const photoData = {
                id: Storage.generatePhotoId(),
                name: file.name,
                size: file.size,
                type: file.type,
                dataUrl: e.target.result,
                uploadedAt: new Date().toISOString()
            };

            // Save to storage
            const photoId = Storage.savePhoto(photoData);
            if (photoId) {
                this.formState.photos.push({
                    id: photoId,
                    url: e.target.result,
                    name: file.name
                });
                this.renderPhotoPreviews();
            }
        };

        reader.readAsDataURL(file);
    },

    // Render photo previews
    renderPhotoPreviews() {
        const previewContainer = document.getElementById('photoPreview');
        previewContainer.innerHTML = '';

        this.formState.photos.forEach((photo, index) => {
            const preview = document.createElement('div');
            preview.className = 'preview-image';

            preview.innerHTML = `
                <img src="${photo.url}" alt="${photo.name || 'Photo'}">
                <button class="remove-photo" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;

            previewContainer.appendChild(preview);
        });

        // Add remove button listeners
        document.querySelectorAll('.remove-photo').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(e.target.closest('button').dataset.index);
                this.removePhoto(index);
            });
        });
    },

    // Remove photo
    removePhoto(index) {
        if (confirm('Remove this photo?')) {
            const photo = this.formState.photos[index];

            // Remove from storage
            Storage.deletePhoto(photo.id);

            // Remove from state
            this.formState.photos.splice(index, 1);
            this.renderPhotoPreviews();
        }
    },

    // Handle tag input
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

    // Render tags
    renderTags() {
        const tagsContainer = document.getElementById('tagsContainer');
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

        // Add remove listeners
        document.querySelectorAll('.remove-tag').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('button').dataset.index);
                this.removeTag(index);
            });
        });
    },

    // Remove tag
    removeTag(index) {
        this.formState.tags.splice(index, 1);
        this.renderTags();
    },

    // Load suggestion templates
    loadSuggestionTemplates() {
        document.querySelectorAll('.suggestion-item').forEach(button => {
            button.addEventListener('click', (e) => {
                const template = e.currentTarget.dataset.template;
                this.applySuggestionTemplate(template);
            });
        });
    },

    // Apply suggestion template
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

        // Apply template data
        document.getElementById('title').value = data.title;
        document.getElementById('category').value = data.category;
        document.querySelector(`input[name="significance"][value="${data.significance}"]`).checked = true;
        document.getElementById('description').value = data.description;

        // Set tags
        this.formState.tags = data.tags;
        this.renderTags();

        // Set today's date
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;

        // Update character counters
        this.updateCharCount({ target: document.getElementById('title') });
        this.updateCharCount({ target: document.getElementById('description') });

        // Show confirmation
        alert(`"${data.title}" template applied! Fill in the remaining details.`);
    },

    // Show success modal
    showSuccessModal(milestoneId) {
        this.formState.lastSavedId = milestoneId;
        const modal = document.getElementById('confirmationModal');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    // Hide modal
    hideModal() {
        const modal = document.getElementById('confirmationModal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
    },

    // View saved milestone
    viewMilestone() {
        if (this.formState.lastSavedId) {
            window.location.href = `milestone-detail.html?id=${this.formState.lastSavedId}`;
        }
    },

    // Reset form for adding another
    resetForm() {
        const form = document.getElementById('milestoneForm');
        form.reset();

        // Reset state
        this.formState.tags = [];
        this.formState.photos = [];
        this.formState.isEditing = false;
        this.formState.milestoneId = null;

        // Reset UI
        document.getElementById('milestoneId').value = '';
        document.querySelector('input[name="significance"][value="medium"]').checked = true;
        document.getElementById('photoPreview').innerHTML = '';
        document.getElementById('tagsContainer').innerHTML = '';

        // Update title if editing
        if (document.querySelector('h1').innerHTML.includes('Edit')) {
            document.querySelector('h1').innerHTML = `<i class="fas fa-heart-circle-plus"></i> Add New Milestone`;
            document.querySelector('.form-subtitle').textContent = 'Capture your special moments and celebrate your journey together';
            document.getElementById('saveBtn').innerHTML = '<i class="fas fa-save"></i> Save Milestone';
        }

        // Hide modal
        this.hideModal();

        // Scroll to top
        window.scrollTo(0, 0);

        // Focus on title
        document.getElementById('title').focus();
    }
};

// Initialize form handler when DOM loads
document.addEventListener('DOMContentLoaded', () => FormHandler.init());