// image-picker.js
// ================

import { fetchUnsplashImages, getImageAttribution } from './api-services.js';

class ImagePicker {
    constructor() {
        this.selectedImage = null;
        this.container = document.getElementById('image-suggestions-container');
        this.suggestBtn = document.getElementById('suggest-image-btn');
        this.hiddenInput = document.getElementById('selected-image-data');

        if (this.suggestBtn) {
            this.suggestBtn.addEventListener('click', () => this.loadSuggestions());
        }
    }

    async loadSuggestions() {
        const category = document.getElementById('milestone-category')?.value || 'default';
        const title = document.getElementById('milestone-title')?.value || '';

        // Create search query from category and title
        let query = `${category} ${title}`.trim();
        if (query.length < 3) {
            query = this.getDefaultQuery(category);
        }

        // Show loading state
        this.showLoading();
        this.suggestBtn.disabled = true;

        try {
            const images = await fetchUnsplashImages(query, 'landscape', 6);
            this.displayImages(images);
        } catch (error) {
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
            html += `
                <div class="image-suggestion-item" data-index="${index}">
                    <img src="${image.urls.small}" 
                         alt="${image.alt}" 
                         loading="lazy"
                         data-full-url="${image.urls.regular}">
                    <div class="image-select-overlay">
                        <button class="select-image-btn" onclick="imagePicker.selectImage(${index}, ${JSON.stringify(image).replace(/"/g, '&quot;')})">
                            Select
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        html += getImageAttribution(images[0]); // Show attribution for first image

        this.container.innerHTML = html;

        // Add click handlers for all images
        document.querySelectorAll('.image-suggestion-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.select-image-btn')) {
                    const index = item.dataset.index;
                    this.selectImage(index, images[index]);
                }
            });
        });
    }

    selectImage(index, imageData) {
        // Remove previous selection
        document.querySelectorAll('.image-suggestion-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Mark as selected
        document.querySelector(`[data-index="${index}"]`)?.classList.add('selected');

        // Store selected image
        this.selectedImage = imageData;

        // Update hidden input
        if (this.hiddenInput) {
            this.hiddenInput.value = JSON.stringify({
                url: imageData.urls.regular,
                alt: imageData.alt,
                author: imageData.author.name,
                authorLink: imageData.author.link
            });
        }

        // Show preview in milestone form
        this.showPreview(imageData);

        console.log('Selected image:', imageData);
    }

    showPreview(imageData) {
        // You can implement a larger preview elsewhere in the UI
        const previewArea = document.getElementById('image-preview-area');
        if (previewArea) {
            previewArea.innerHTML = `
                <div class="selected-image-preview">
                    <img src="${imageData.urls.small}" alt="Selected background">
                    <p>Selected: ${imageData.alt}</p>
                </div>
            `;
        }
    }

    showLoading() {
        this.container.innerHTML = `
            <div class="image-picker-loading">
                <div class="spinner"></div>
                <p>Finding beautiful images for you...</p>
            </div>
        `;
    }

    showError(message) {
        this.container.innerHTML = `
            <div class="image-picker-error">
                <p>❌ ${message}</p>
                <button onclick="imagePicker.loadSuggestions()">Try Again</button>
            </div>
        `;
    }

    getDefaultQuery(category) {
        const defaults = {
            'anniversary': 'romantic sunset couple',
            'date': 'dinner date restaurant',
            'trip': 'travel vacation destination',
            'default': 'love relationship happy'
        };
        return defaults[category] || defaults.default;
    }

    getSelectedImage() {
        return this.selectedImage;
    }
}

// Initialize on page load
let imagePicker;

document.addEventListener('DOMContentLoaded', () => {
    imagePicker = new ImagePicker();
});