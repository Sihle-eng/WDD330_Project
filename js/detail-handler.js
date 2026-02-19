//  DETAIL PAGE HANDLER 
const DetailHandler = {
    // State
    state: {
        milestone: null,
        photos: [],
        currentPhotoIndex: 0,
        memories: [],
        relatedMilestones: []
    },

    // Initialize
    init() {
        console.log('Detail Handler initialized');

        // Get milestone ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const milestoneId = urlParams.get('id');

        if (!milestoneId) {
            this.showErrorState();
            return;
        }

        this.loadMilestoneData(milestoneId);
        this.setupEventListeners();
    },

    // Load milestone data
    loadMilestoneData(milestoneId) {
        const milestone = Storage.getMilestoneById(milestoneId);

        if (!milestone) {
            this.showErrorState();
            return;
        }

        this.state.milestone = milestone;
        this.renderMilestoneDetails();
        this.loadPhotos();
        this.loadMemories();
        this.loadRelatedMilestones();

        // Hide loading, show content
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('detailCard').style.display = 'block';
    },

    // Render milestone details
    renderMilestoneDetails() {
        const m = this.state.milestone;

        // Format date
        const date = new Date(m.date);
        const today = new Date();

        // Calculate days ago
        const diffTime = Math.abs(today - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Update DOM elements
        document.getElementById('milestoneTitle').textContent = m.title;
        document.getElementById('dateDay').textContent = date.getDate();
        document.getElementById('dateMonth').textContent = date.toLocaleString('default', { month: 'long' });
        document.getElementById('dateYear').textContent = date.getFullYear();
        document.getElementById('milestoneDescription').textContent = m.description || 'No description provided.';
        document.getElementById('daysAgo').textContent = `${diffDays.toLocaleString()} days ago`;

        // Update category
        const categoryBadge = document.getElementById('milestoneCategory');
        categoryBadge.innerHTML = `<i class="fas ${this.getCategoryIcon(m.category)}"></i><span>${this.formatCategory(m.category)}</span>`;
        categoryBadge.className = `category-badge ${m.category}`;

        // Update significance
        const significanceBadge = document.getElementById('milestoneSignificance');
        significanceBadge.innerHTML = `<i class="fas fa-star"></i><span>${this.formatSignificance(m.significance)}</span>`;
        significanceBadge.className = `significance-badge ${m.significance}`;

        // Update location if exists
        if (m.location) {
            document.getElementById('milestoneLocation').textContent = m.location;
            document.getElementById('locationSection').style.display = 'block';
        }

        // Update tags if exist
        if (m.tags && m.tags.length > 0) {
            const tagsContainer = document.getElementById('detailTags');
            tagsContainer.innerHTML = '';
            m.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'detail-tag';
                tagElement.textContent = tag;
                tagsContainer.appendChild(tagElement);
            });
            document.getElementById('tagsSection').style.display = 'block';
        }

        // Update stats
        const profile = Storage.getUserProfile();
        if (profile && profile.anniversaryDate) {
            const anniversary = new Date(profile.anniversaryDate);
            const yearsTogether = date.getFullYear() - anniversary.getFullYear();
            document.getElementById('yearsTogether').textContent = `${yearsTogether} year${yearsTogether !== 1 ? 's' : ''}`;

            // Next anniversary
            const nextAnniversary = Storage.getNextOccurrence(date);
            const daysToAnniversary = Math.ceil((nextAnniversary - today) / (1000 * 60 * 60 * 24));
            document.getElementById('nextAnniversary').textContent = `${daysToAnniversary} day${daysToAnniversary !== 1 ? 's' : ''}`;
        }

        // Photo count
        const photoCount = m.photoIds ? m.photoIds.length : 0;
        document.getElementById('photoCount').textContent = `${photoCount} photo${photoCount !== 1 ? 's' : ''}`;

        // Update created/updated dates
        if (m.createdAt) {
            document.getElementById('createdDate').textContent = this.formatDate(new Date(m.createdAt));
        }
        if (m.updatedAt) {
            document.getElementById('updatedDate').textContent = this.formatDate(new Date(m.updatedAt));
        }
    },

    // Load photos
    loadPhotos() {
        const m = this.state.milestone;

        if (!m.photoIds || m.photoIds.length === 0) {
            document.getElementById('noPhotos').style.display = 'block';
            document.getElementById('galleryNav').style.display = 'none';
            return;
        }

        document.getElementById('noPhotos').style.display = 'none';

        // Load actual photo objects from storage
        const photos = Storage.getPhotosByMilestone(m.id);
        this.state.photos = photos.map(photo => ({
            id: photo.id,
            url: photo.dataUrl || `https://via.placeholder.com/400x400/e8f4f8/2C3E50?text=Photo+${photo.id.substring(0, 4)}`,
            title: m.title,
            date: m.date
        }));

        this.renderGallery();
    },

    // Render gallery
    renderGallery() {
        const galleryGrid = document.getElementById('galleryGrid');
        galleryGrid.innerHTML = '';

        this.state.photos.forEach((photo, index) => {
            const galleryItem = document.createElement('a');
            galleryItem.className = 'gallery-item';
            galleryItem.dataset.index = index;
            galleryItem.href = photo.url;
            galleryItem.setAttribute('data-lightbox', 'milestone-gallery');
            galleryItem.setAttribute('data-title', photo.title || 'Photo');

            galleryItem.innerHTML = `
                <img src="${photo.url}" alt="${photo.title}">
                <div class="gallery-overlay">
                    <div>${photo.title}</div>
                </div>
            `;

            galleryGrid.appendChild(galleryItem);
        });

        // Hide custom gallery navigation if using Lightbox2
        document.getElementById('galleryNav').style.display = 'none';
        // Optionally update photo count
        document.getElementById('currentPhoto').textContent = this.state.photos.length > 0 ? '1' : '0';
        document.getElementById('totalPhotos').textContent = this.state.photos.length;

        // Reset current photo index
        this.state.currentPhotoIndex = 0;
    },

    // Load memories
    loadMemories() {
        // Load memories from localStorage
        const memoriesKey = `loveLine_memories_${this.state.milestone.id}`;
        const savedMemories = localStorage.getItem(memoriesKey);

        if (savedMemories) {
            this.state.memories = JSON.parse(savedMemories);
        }

        this.renderMemories();
    },

    // Render memories
    renderMemories() {
        const memoriesList = document.getElementById('memoriesList');
        memoriesList.innerHTML = '';

        if (this.state.memories.length === 0) {
            memoriesList.innerHTML = `
                <div class="empty-related">
                    <p>No memories yet. Add your first memory!</p>
                </div>
            `;
            return;
        }

        // Sort by date (newest first)
        const sortedMemories = [...this.state.memories].sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        sortedMemories.forEach((memory, index) => {
            const memoryElement = document.createElement('div');
            memoryElement.className = 'memory-item';
            memoryElement.innerHTML = `
                <div class="memory-content">${memory.content}</div>
                <div class="memory-meta">
                    <div class="memory-date">
                        <i class="fas fa-clock"></i>
                        ${this.formatDate(new Date(memory.createdAt))}
                    </div>
                    <button class="delete-memory" data-index="${index}">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            `;
            memoriesList.appendChild(memoryElement);
        });

        // Add delete event listeners
        document.querySelectorAll('.delete-memory').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this.deleteMemory(index);
            });
        });
    },

    // Load related milestones
    loadRelatedMilestones() {
        const allMilestones = Storage.getAllMilestones();
        const currentMilestone = this.state.milestone;

        // Find related milestones (same category, within 30 days, or same tags)
        this.state.relatedMilestones = allMilestones.filter(milestone => {
            if (milestone.id === currentMilestone.id) return false;

            // Check if same category
            if (milestone.category === currentMilestone.category) return true;

            // Check if dates are within 30 days
            const currentDate = new Date(currentMilestone.date);
            const otherDate = new Date(milestone.date);
            const diffDays = Math.abs((currentDate - otherDate) / (1000 * 60 * 60 * 24));
            if (diffDays <= 30) return true;

            // Check for overlapping tags
            if (currentMilestone.tags && milestone.tags) {
                const commonTags = currentMilestone.tags.filter(tag =>
                    milestone.tags.includes(tag)
                );
                if (commonTags.length > 0) return true;
            }

            return false;
        }).slice(0, 5); // Limit to 5

        this.renderRelatedMilestones();
    },

    // Render related milestones
    renderRelatedMilestones() {
        const container = document.getElementById('relatedMilestones');

        if (this.state.relatedMilestones.length === 0) {
            container.innerHTML = `
                <div class="empty-related">
                    <p>No related milestones found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        this.state.relatedMilestones.forEach(milestone => {
            const date = new Date(milestone.date);
            const item = document.createElement('a');
            item.className = 'related-item';
            item.href = `milestone-detail.html?id=${milestone.id}`;

            item.innerHTML = `
                <div class="related-date">
                    ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div class="related-title">${milestone.title}</div>
                <div class="related-category">${this.formatCategory(milestone.category)}</div>
            `;

            container.appendChild(item);
        });
    },

    // Setup event listeners
    setupEventListeners() {
        // Edit button
        document.getElementById('editBtn').addEventListener('click', () => {
            window.location.href = `add-milestone.html?edit=${this.state.milestone.id}`;
        });

        // Delete button
        document.getElementById('deleteBtn').addEventListener('click', () => this.showDeleteConfirmation());

        // Share button
        document.getElementById('shareBtn').addEventListener('click', () => this.shareMilestone());

        // Add photos button
        const addPhotosBtn = document.getElementById('addPhotosBtn');
        if (addPhotosBtn) {
            addPhotosBtn.addEventListener('click', () => {
                window.location.href = `add-milestone.html?edit=${this.state.milestone.id}`;
            });
        }

        // Save memory button
        document.getElementById('saveMemoryBtn').addEventListener('click', () => this.saveMemory());

        // Print button
        document.getElementById('printBtn').addEventListener('click', () => window.print());

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => this.exportMilestone());

        // Celebrate button
        document.getElementById('celebrateBtn').addEventListener('click', () => this.showCelebration());

        // Modal buttons
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => this.hideModal());
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => this.confirmDelete());
        document.querySelector('.modal-close').addEventListener('click', () => this.hideModal());

        // Lightbox navigation
        document.getElementById('lightboxClose').addEventListener('click', () => this.closeLightbox());
        document.getElementById('lightboxPrev').addEventListener('click', () => this.navigateLightbox(-1));
        document.getElementById('lightboxNext').addEventListener('click', () => this.navigateLightbox(1));

        // Keyboard navigation for lightbox
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('lightboxModal').classList.contains('active')) {
                if (e.key === 'Escape') this.closeLightbox();
                if (e.key === 'ArrowLeft') this.navigateLightbox(-1);
                if (e.key === 'ArrowRight') this.navigateLightbox(1);
            }
        });
    },

    // Show delete confirmation modal
    showDeleteConfirmation() {
        const modal = document.getElementById('confirmationModal');
        const preview = document.getElementById('deletePreview');

        preview.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="font-size: 2rem; color: var(--primary-color);">
                    <i class="fas fa-heart"></i>
                </div>
                <div>
                    <strong>${this.state.milestone.title}</strong><br>
                    <small>${this.formatDate(new Date(this.state.milestone.date))}</small>
                </div>
            </div>
        `;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    // Hide modal
    hideModal() {
        document.getElementById('confirmationModal').classList.remove('active');
        document.body.style.overflow = '';
    },

    // Confirm delete
    confirmDelete() {
        const success = Storage.deleteMilestone(this.state.milestone.id);

        if (success) {
            alert('Milestone deleted successfully.');
            window.location.href = 'index.html';
        } else {
            alert('Error deleting milestone. Please try again.');
            this.hideModal();
        }
    },

    // Share milestone
    shareMilestone() {
        const milestone = this.state.milestone;
        const shareText = `Check out our milestone: ${milestone.title} on ${this.formatDate(new Date(milestone.date))}`;
        const shareUrl = window.location.href;

        if (navigator.share) {
            navigator.share({
                title: 'Our LoveLine Milestone',
                text: shareText,
                url: shareUrl
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
                .then(() => alert('Link copied to clipboard!'))
                .catch(() => alert('Could not share. Please copy the URL manually.'));
        }
    },

    // Save memory
    saveMemory() {
        const memoryInput = document.getElementById('memoryNote');
        const content = memoryInput.value.trim();

        if (!content) {
            alert('Please enter a memory first.');
            return;
        }

        const newMemory = {
            id: Date.now().toString(),
            content: content,
            createdAt: new Date().toISOString()
        };

        this.state.memories.unshift(newMemory);
        this.saveMemoriesToStorage();
        this.renderMemories();

        // Clear input
        memoryInput.value = '';

        // Show success message
        const successMsg = document.createElement('div');
        successMsg.className = 'memory-item';
        successMsg.style.backgroundColor = 'rgba(46, 204, 113, 0.1)';
        successMsg.innerHTML = `
            <div class="memory-content">Memory added successfully!</div>
            <div class="memory-meta">
                <div class="memory-date">
                    <i class="fas fa-check-circle"></i>
                    Just now
                </div>
            </div>
        `;

        const memoriesList = document.getElementById('memoriesList');
        if (memoriesList.firstChild) {
            memoriesList.insertBefore(successMsg, memoriesList.firstChild);
        } else {
            memoriesList.appendChild(successMsg);
        }

        // Remove success message after 3 seconds
        setTimeout(() => {
            if (successMsg.parentNode) {
                successMsg.remove();
            }
        }, 3000);
    },

    // Delete memory
    deleteMemory(index) {
        if (confirm('Delete this memory?')) {
            this.state.memories.splice(index, 1);
            this.saveMemoriesToStorage();
            this.renderMemories();
        }
    },

    // Save memories to storage
    saveMemoriesToStorage() {
        const memoriesKey = `loveLine_memories_${this.state.milestone.id}`;
        localStorage.setItem(memoriesKey, JSON.stringify(this.state.memories));
    },

    // Open lightbox
    openLightbox(index) {
        this.state.currentPhotoIndex = index;
        this.updateLightbox();

        const lightbox = document.getElementById('lightboxModal');
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    // Close lightbox
    closeLightbox() {
        document.getElementById('lightboxModal').classList.remove('active');
        document.body.style.overflow = '';
    },

    // Navigate lightbox
    navigateLightbox(direction) {
        this.state.currentPhotoIndex += direction;

        // Loop around
        if (this.state.currentPhotoIndex < 0) {
            this.state.currentPhotoIndex = this.state.photos.length - 1;
        } else if (this.state.currentPhotoIndex >= this.state.photos.length) {
            this.state.currentPhotoIndex = 0;
        }

        this.updateLightbox();
    },

    // Update lightbox content
    updateLightbox() {
        const photo = this.state.photos[this.state.currentPhotoIndex];

        document.getElementById('lightboxImage').src = photo.url;
        document.getElementById('lightboxTitle').textContent = photo.title || this.state.milestone.title;
        document.getElementById('lightboxDate').textContent = this.formatDate(new Date(photo.date || this.state.milestone.date));
    },

    // Export milestone
    exportMilestone() {
        const milestone = this.state.milestone;
        const exportData = {
            milestone: milestone,
            photos: this.state.photos,
            memories: this.state.memories,
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `milestone-${milestone.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        alert('Milestone exported successfully!');
    },

    // Show celebration
    showCelebration() {
        const milestone = this.state.milestone;

        // Create celebration modal
        const celebrationModal = document.createElement('div');
        celebrationModal.className = 'modal active';
        celebrationModal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-champagne-glasses"></i> Celebrate ${milestone.title}!</h3>
                    <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="modal-body" style="text-align: center;">
                    <div style="font-size: 4rem; color: var(--accent-color); margin: 1rem 0;">
                        <i class="fas fa-heart-circle-bolt"></i>
                    </div>
                    <p style="font-size: 1.2rem; margin-bottom: 1.5rem;">
                        Time to celebrate this special memory!
                    </p>
                    <div style="background: var(--background-color); padding: 1rem; border-radius: var(--radius); margin-bottom: 1.5rem;">
                        <h4>Celebration Ideas:</h4>
                        <ul style="text-align: left; margin: 1rem;">
                            <li>Recreate the moment</li>
                            <li>Look through old photos together</li>
                            <li>Share the story with friends</li>
                            <li>Plan a special date night</li>
                            <li>Write each other love notes</li>
                        </ul>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">
                        Close
                    </button>
                    <button class="btn-primary" id="setReminderBtn">
                        <i class="fas fa-bell"></i> Set Annual Reminder
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(celebrationModal);

        // Set annual reminder
        document.getElementById('setReminderBtn')?.addEventListener('click', () => {
            const milestone = this.state.milestone;
            milestone.setReminder = true;
            Storage.saveMilestone(milestone);
            alert('Annual reminder set! You\'ll be notified each year on this date.');
            celebrationModal.remove();
        });
    },

    // Show error state
    showErrorState() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('errorState').style.display = 'block';
    },

    // Utility functions
    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    formatCategory(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
    },

    formatSignificance(significance) {
        const levels = {
            'low': 'Low Importance',
            'medium': 'Medium Importance',
            'high': 'High Importance'
        };
        return levels[significance] || 'Medium Importance';
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
        return icons[category] || 'fa-heart';
    }
};

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => DetailHandler.init());