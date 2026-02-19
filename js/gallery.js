// Handles photo gallery for a specific milestone

class PhotoGallery {
    constructor(milestoneId) {
        if (typeof Storage === 'undefined') {
            console.error('PhotoGallery: Storage module is not loaded.');
            return;
        }

        this.milestoneId = milestoneId;
        this.container = document.getElementById('gallery-grid');
        this.uploadInput = document.getElementById('photo-upload');
        this.addBtn = document.getElementById('add-photo-btn');
        this.lightboxModal = document.getElementById('lightbox-modal');
        this.lightboxImg = document.getElementById('lightbox-img');
        this.lightboxCaption = document.getElementById('lightbox-caption');

        // Only initialize if the container exists (otherwise the gallery can't render)
        if (!this.container) {
            console.warn('PhotoGallery: Gallery container not found.');
            return;
        }

        this.init();
    }

    init() {
        this.render();
        this.bindEvents();
    }

    bindEvents() {
        if (this.addBtn && this.uploadInput) {
            this.addBtn.addEventListener('click', () => this.uploadInput.click());
        }

        if (this.uploadInput) {
            this.uploadInput.addEventListener('change', (e) => this.handleUpload(e));
        }

        // Close lightbox with close button
        const closeBtn = document.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (this.lightboxModal) this.lightboxModal.style.display = 'none';
            });
        }

        // Close lightbox by clicking outside the image
        window.addEventListener('click', (e) => {
            if (this.lightboxModal && e.target === this.lightboxModal) {
                this.lightboxModal.style.display = 'none';
            }
        });
    }

    render() {
        // Ensure Storage is available
        // if (typeof Storage === 'undefined') return;

        // const photos = Storage.getPhotosByMilestone(this.milestoneId) || [];

        // if (photos.length === 0) {
        //     this.container.innerHTML = '<p class="empty-gallery">No memories yet. Click "Add Photos" to start your gallery.</p>';
        //     return;
        // }

        let html = '';
        photos.forEach((photo) => {
            html += `
                <div class="gallery-item" data-photo-id="${photo.id}">
                    <img src="${photo.url}" alt="${photo.caption || 'Memory'}" loading="lazy">
                    <button class="delete-photo-btn" data-photo-id="${photo.id}">&times;</button>
                </div>
            `;
        });
        this.container.innerHTML = html;

        // Attach lightbox click to images
        this.container.querySelectorAll('.gallery-item img').forEach(img => {
            img.addEventListener('click', (e) => {
                const item = e.target.closest('.gallery-item');
                if (!item) return;
                const photoId = item.dataset.photoId;
                const photo = photos.find(p => p.id === photoId);
                if (photo) this.openLightbox(photo);
            });
        });

        // Attach delete to buttons
        this.container.querySelectorAll('.delete-photo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const photoId = btn.dataset.photoId;
                if (photoId) this.deletePhoto(photoId);
            });
        });
    }

    handleUpload(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        files.forEach(file => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                // Ensure Storage is available
                if (typeof Storage === 'undefined') {
                    alert('Storage module not available. Cannot save photo.');
                    return;
                }

                const photoData = {
                    milestoneId: this.milestoneId,
                    url: e.target.result, // data URL
                    caption: file.name,
                    uploadedAt: new Date().toISOString()
                };
                Storage.savePhoto(photoData);
                this.render();
            };
            reader.readAsDataURL(file);
        });

        // Clear input to allow re-upload of the same file
        this.uploadInput.value = '';
    }

    deletePhoto(photoId) {
        if (!photoId) return;
        if (confirm('Remove this photo?')) {
            if (typeof Storage === 'undefined') {
                alert('Storage module not available.');
                return;
            }
            Storage.deletePhoto(photoId);
            this.render();
        }
    }

    openLightbox(photo) {
        if (!this.lightboxModal || !this.lightboxImg || !this.lightboxCaption) {
            console.warn('Lightbox elements not found.');
            return;
        }
        this.lightboxImg.src = photo.url;
        this.lightboxCaption.textContent = photo.caption || '';
        this.lightboxModal.style.display = 'block';
    }
}

// Make globally available if needed
window.PhotoGallery = PhotoGallery;