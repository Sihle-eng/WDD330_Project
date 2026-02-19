
//Import dependencies 

import { fetchUnsplashImages, getImageAttribution } from './api-services.js';

class ImagePicker {
    constructor() {
        this.selectedImage = null;
        this.container = document.getElementById('image-suggestions-container');
        this.suggestBtn = document.getElementById('suggest-image-btn');
        this.hiddenInput = document.getElementById('selected-image-data');
        this.previewArea = document.getElementById('image-preview-area');

        // Guard: if required elements are missing, log a warning and disable functionality
        if (!this.container) {
            console.warn('ImagePicker: Container element #image-suggestions-container not found.');
            return;
        }
        if (!this.suggestBtn) {
            console.warn('ImagePicker: Suggest button #suggest-image-btn not found.');
            return;
        }

        this.suggestBtn.addEventListener('click', () => this.loadSuggestions());
    }

    async loadSuggestions() {
        // Safely retrieve category and title; fallback to empty strings if elements missing
        const categoryEl = document.getElementById('category');
        const titleEl = document.getElementById('title');

        const category = categoryEl?.value || '';
        const title = titleEl?.value || '';

        // Build query from category and title
        let query = `${category} ${title}`.trim();
        if (query.length < 3) {
            query = this.getDefaultQuery(category);
        }

        this.showLoading();
        this.suggestBtn.disabled = true;

        try {
            const images = await fetchUnsplashImages(query, 'landscape', 6);
            this.displayImages(images);
        } catch (error) {
            console.error('Image fetch error:', error);
            this.showError('Failed to load images. Please try again.');
        } finally {
            this.suggestBtn.disabled = false;
        }
    }

    displayImages(images) {
        if (!images || images.length === 0) {
            this.showError('No images found. Try a different search.');
            return;
        }

        let html = '<div class="image-suggestions-grid">';

        images.forEach((image, index) => {
            // Ensure image has the expected properties; provide fallbacks if missing
            const safeImage = {
                urls: image.urls || { small: '', regular: '' },
                alt: image.alt || 'Unsplash image',
                author: image.author || { name: 'Unknown', link: '#' }
            };

            html += `
                <div class="image-suggestion-item" data-index="${index}">
                    <img src="${safeImage.urls.small}" 
                         alt="${safeImage.alt}" 
                         loading="lazy"
                         data-full-url="${safeImage.urls.regular}">
                    <div class="image-select-overlay">
                        <button class="select-image-btn" data-index="${index}">Select</button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        // Add Unsplash attribution (assumes getImageAttribution returns a string)
        html += getImageAttribution(images[0]);

        this.container.innerHTML = html;

        // Attach click listeners to each image item (whole card)
        document.querySelectorAll('.image-suggestion-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Prevent triggering when clicking the button inside
                if (e.target.closest('.select-image-btn')) return;
                const index = item.dataset.index;
                this.selectImage(index, images[index]);
            });
        });

        // Attach click listeners to each Select button
        document.querySelectorAll('.select-image-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click from also firing
                const index = btn.dataset.index;
                this.selectImage(index, images[index]);
            });
        });
    }

    selectImage(index, imageData) {
        if (!imageData) return;

        // Remove previous selection
        document.querySelectorAll('.image-suggestion-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Mark current as selected
        const selectedItem = document.querySelector(`.image-suggestion-item[data-index="${index}"]`);
        if (selectedItem) selectedItem.classList.add('selected');

        // Store selected image
        this.selectedImage = imageData;

        // --- ✅ SET GLOBAL VARIABLES for FormHandler ---
        window.selectedBackgroundUrl = imageData.urls?.regular || null;
        window.selectedBackgroundAttribution = imageData.author?.name
            ? `${imageData.author.name} on Unsplash`
            : '';

        // Update hidden input (if present)
        if (this.hiddenInput) {
            this.hiddenInput.value = JSON.stringify({
                url: imageData.urls?.regular || '',
                alt: imageData.alt || '',
                author: imageData.author?.name || '',
                authorLink: imageData.author?.link || ''
            });
        }

        // Show preview
        this.showPreview(imageData);

        console.log('Selected image:', imageData);
    }

    showPreview(imageData) {
        if (!this.previewArea) return;
        this.previewArea.innerHTML = `
            <div class="selected-image-preview">
                <img src="${imageData.urls?.small || ''}" alt="Selected background">
                <p>Selected: ${imageData.alt || 'No caption'}</p>
                <small>by ${imageData.author?.name || 'Unknown'} on Unsplash</small>
            </div>
        `;
    }

    showLoading() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="image-picker-loading">
                <div class="spinner"></div>
                <p>Finding beautiful images for you...</p>
            </div>
        `;
    }

    showError(message) {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="image-picker-error">
                <p>❌ ${message}</p>
                <button id="retry-suggest-btn">Try Again</button>
            </div>
        `;
        document.getElementById('retry-suggest-btn')?.addEventListener('click', () => this.loadSuggestions());
    }

    getDefaultQuery(category) {
        const defaults = {
            'anniversary': 'romantic sunset couple',
            'date': 'dinner date restaurant',
            'trip': 'travel vacation destination',
            'default': 'love relationship happy'
        };
        // Ensure category is a string; if not, use 'default'
        const safeCategory = (category && typeof category === 'string') ? category.toLowerCase() : 'default';
        return defaults[safeCategory] || defaults.default;
    }

    getSelectedImage() {
        return this.selectedImage;
    }
}

// Initialize and expose globally for other scripts (FormHandler, etc.)
let imagePicker;
document.addEventListener('DOMContentLoaded', () => {
    // Only create instance if the container exists (prevents errors on pages without the picker)
    if (document.getElementById('image-suggestions-container')) {
        imagePicker = new ImagePicker();
        window.imagePicker = imagePicker; // Optional global reference
    }
});