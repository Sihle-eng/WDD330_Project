const Timeline = {
    // Configuration
    config: {
        zoomLevel: 1.0,
        minZoom: 0.5,
        maxZoom: 2.0,
        zoomStep: 0.1,
        showPhotos: true,
        showSignificance: true,
        activeFilters: {
            categories: [], // Empty array means all categories
            significance: [] // Empty array means all significance levels
        },
        currentView: 'vertical', // 'vertical' or 'horizontal'
        currentYear: null // For year filtering
    },

    // State
    state: {
        milestones: [],
        filteredMilestones: [],
        years: [],
        categories: [],
        statistics: {},
        chartInstances: {}
    },

    // Category colors
    categoryColors: {
        'romance': '#E75480',
        'travel': '#4A90E2',
        'commitment': '#9B59B6',
        'achievement': '#2ECC71',
        'celebration': '#F39C12',
        'first': '#1ABC9C',
        'growth': '#3498DB',
        'other': '#95A5A6'
    },

    // Category icons
    categoryIcons: {
        'romance': 'fa-heart',
        'travel': 'fa-plane',
        'commitment': 'fa-home',
        'achievement': 'fa-trophy',
        'celebration': 'fa-gift',
        'first': 'fa-star',
        'growth': 'fa-seedling',
        'other': 'fa-heart-circle-plus'
    },

    // Initialize timeline
    init() {
        // 🛡️ GUARD: Only run if we're on a page that actually contains the timeline containers
        const container = document.getElementById('verticalTimeline');
        if (!container) {
            console.log('Timeline not on this page – skipping initialization.');
            return; // Exit early to prevent errors on dashboard etc.
        }

        console.log('Timeline initialized');
        try {
            this.loadMilestones();
            this.setupEventListeners();
            this.setupCharts();
            this.renderTimeline();
        } catch (error) {
            console.error('Timeline initialization error:', error);
        }
    },

    // Load milestones from storage
    loadMilestones() {
        this.state.milestones = Storage.getAllMilestones();

        // Sort milestones by date
        this.state.milestones.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Extract unique years
        this.extractYears();

        // Extract unique categories
        this.extractCategories();

        // Calculate statistics
        this.calculateStatistics();

        // Update UI counts
        this.updateCounts();
    },

    // Extract unique years from milestones
    extractYears() {
        const yearSet = new Set();
        this.state.milestones.forEach(milestone => {
            const year = new Date(milestone.date).getFullYear();
            yearSet.add(year);
        });

        this.state.years = Array.from(yearSet).sort();

        // Set current year to most recent if not set
        if (!this.config.currentYear && this.state.years.length > 0) {
            this.config.currentYear = this.state.years[this.state.years.length - 1];
        }
    },

    // Extract unique categories
    extractCategories() {
        const categorySet = new Set();
        this.state.milestones.forEach(milestone => {
            categorySet.add(milestone.category || 'other');
        });

        this.state.categories = Array.from(categorySet);
    },

    // Calculate statistics
    calculateStatistics() {
        const milestones = this.state.milestones;

        if (milestones.length === 0) {
            this.state.statistics = {
                total: 0,
                avgPerMonth: 0,
                busiestYear: null,
                highSignificance: 0,
                milestonesWithPhotos: 0,
                categoryDistribution: {},
                monthlyActivity: {},
                significanceDistribution: {
                    high: 0,
                    medium: 0,
                    low: 0
                }
            };
            return;
        }

        // Basic counts
        const highSignificance = milestones.filter(m => m.significance === 'high').length;
        const milestonesWithPhotos = milestones.filter(m => m.photoIds && m.photoIds.length > 0).length;

        // Calculate average per month
        const dates = milestones.map(m => new Date(m.date)).sort((a, b) => a - b);
        const firstDate = dates[0];
        const lastDate = dates[dates.length - 1];
        const monthsDiff = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 +
            (lastDate.getMonth() - firstDate.getMonth());
        const avgPerMonth = monthsDiff > 0 ? (milestones.length / (monthsDiff + 1)).toFixed(1) : milestones.length;

        // Find busiest year
        const yearCounts = {};
        milestones.forEach(milestone => {
            const year = new Date(milestone.date).getFullYear();
            yearCounts[year] = (yearCounts[year] || 0) + 1;
        });

        let busiestYear = null;
        let maxCount = 0;
        for (const [year, count] of Object.entries(yearCounts)) {
            if (count > maxCount) {
                maxCount = count;
                busiestYear = year;
            }
        }

        // Category distribution
        const categoryDistribution = {};
        milestones.forEach(milestone => {
            const category = milestone.category || 'other';
            categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
        });

        // Monthly activity (last 12 months)
        const monthlyActivity = {};
        const today = new Date();
        for (let i = 0; i < 12; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyActivity[monthKey] = 0;
        }

        milestones.forEach(milestone => {
            const date = new Date(milestone.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyActivity[monthKey] !== undefined) {
                monthlyActivity[monthKey]++;
            }
        });

        // Significance distribution
        const significanceDistribution = {
            high: 0,
            medium: 0,
            low: 0
        };

        milestones.forEach(milestone => {
            const significance = milestone.significance || 'medium';
            significanceDistribution[significance]++;
        });

        this.state.statistics = {
            total: milestones.length,
            avgPerMonth: avgPerMonth,
            busiestYear: busiestYear,
            highSignificance: highSignificance,
            milestonesWithPhotos: milestonesWithPhotos,
            categoryDistribution: categoryDistribution,
            monthlyActivity: monthlyActivity,
            significanceDistribution: significanceDistribution,
            timeSpanYears: this.calculateTimeSpanYears(),
            years: Object.keys(yearCounts).sort()
        };
    },

    // Calculate time span in years
    calculateTimeSpanYears() {
        if (this.state.milestones.length === 0) return 0;

        const dates = this.state.milestones.map(m => new Date(m.date));
        const firstDate = new Date(Math.min(...dates));
        const lastDate = new Date(Math.max(...dates));

        const years = lastDate.getFullYear() - firstDate.getFullYear();
        return years > 0 ? years : 1;
    },

    // Update UI counts
    updateCounts() {
        // All these elements should exist only on the timeline page
        const totalCount = document.getElementById('totalMilestonesCount');
        if (totalCount) totalCount.textContent = this.state.milestones.length;

        const timeSpan = document.getElementById('timeSpanYears');
        if (timeSpan) timeSpan.textContent = this.state.statistics.timeSpanYears || 0;

        const avgMonth = document.getElementById('avgPerMonth');
        if (avgMonth) avgMonth.textContent = this.state.statistics.avgPerMonth;

        const busiest = document.getElementById('busiestYear');
        if (busiest) busiest.textContent = this.state.statistics.busiestYear || '-';

        const highSig = document.getElementById('highSignificance');
        if (highSig) highSig.textContent = this.state.statistics.highSignificance;

        const withPhotos = document.getElementById('milestonesWithPhotos');
        if (withPhotos) withPhotos.textContent = this.state.statistics.milestonesWithPhotos;

        const rangeSpan = document.getElementById('timelineRange');
        if (rangeSpan && this.state.milestones.length > 0) {
            const dates = this.state.milestones.map(m => new Date(m.date));
            const minYear = new Date(Math.min(...dates)).getFullYear();
            const maxYear = new Date(Math.max(...dates)).getFullYear();
            rangeSpan.textContent = `${minYear} - ${maxYear}`;
        }

        const filterCount = document.getElementById('filterCount');
        if (filterCount) {
            const activeFilterCount = this.config.activeFilters.categories.length;
            filterCount.textContent = activeFilterCount === 0 ? 'All Categories' : `${activeFilterCount} Categories`;
        }
    },

    // Setup event listeners
    setupEventListeners() {
        // Helper to safely add event listeners
        const safeAddListener = (id, event, handler) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(event, handler);
        };

        safeAddListener('verticalViewBtn', 'click', () => this.switchView('vertical'));
        safeAddListener('horizontalViewBtn', 'click', () => this.switchView('horizontal'));
        safeAddListener('zoomInBtn', 'click', () => this.zoomIn());
        safeAddListener('zoomOutBtn', 'click', () => this.zoomOut());
        safeAddListener('resetZoomBtn', 'click', () => this.resetZoom());
        safeAddListener('scrollLeftBtn', 'click', () => this.scrollTimeline(-1));
        safeAddListener('scrollRightBtn', 'click', () => this.scrollTimeline(1));
        safeAddListener('toggleSignificanceBtn', 'click', () => this.toggleSignificance());
        safeAddListener('togglePhotosBtn', 'click', () => this.togglePhotos());
        safeAddListener('selectAllBtn', 'click', () => this.selectAllCategories());
        safeAddListener('applyFilterBtn', 'click', () => this.applyFilters());
        safeAddListener('clearFilterBtn', 'click', () => this.clearFilters());
        safeAddListener('printTimelineBtn', 'click', () => this.printTimeline());
        safeAddListener('exportTimelineBtn', 'click', () => this.exportTimeline());
        safeAddListener('toggleStatsBtn', 'click', () => this.toggleStatistics());

        // Close modal buttons
        const modalClose = document.querySelector('.modal-close');
        if (modalClose) modalClose.addEventListener('click', () => this.closeQuickView());
        safeAddListener('closeQuickViewBtn', 'click', () => this.closeQuickView());

        // Delegated listener for remove-photo (if needed)
        const modal = document.getElementById('quickViewModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-photo')) {
                    e.preventDefault();
                    e.target.disabled = true;
                    console.log('Remove photo clicked');
                }
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));

        // Window resize
        window.addEventListener('resize', () => this.handleResize());
    },

    // Switch between vertical and horizontal views
    switchView(view) {
        this.config.currentView = view;

        // Update button states
        const verticalBtn = document.getElementById('verticalViewBtn');
        const horizontalBtn = document.getElementById('horizontalViewBtn');
        if (verticalBtn) verticalBtn.classList.toggle('active', view === 'vertical');
        if (horizontalBtn) horizontalBtn.classList.toggle('active', view === 'horizontal');

        // Show/hide timelines
        const verticalTimeline = document.getElementById('verticalTimeline');
        const horizontalTimeline = document.getElementById('horizontalTimeline');
        if (verticalTimeline) verticalTimeline.style.display = view === 'vertical' ? 'block' : 'none';
        if (horizontalTimeline) horizontalTimeline.style.display = view === 'horizontal' ? 'block' : 'none';

        // Re-render timeline
        this.renderTimeline();
    },

    // Zoom in
    zoomIn() {
        if (this.config.zoomLevel < this.config.maxZoom) {
            this.config.zoomLevel += this.config.zoomStep;
            this.applyZoom();
        }
    },

    // Zoom out
    zoomOut() {
        if (this.config.zoomLevel > this.config.minZoom) {
            this.config.zoomLevel -= this.config.zoomStep;
            this.applyZoom();
        }
    },

    // Reset zoom
    resetZoom() {
        this.config.zoomLevel = 1.0;
        this.applyZoom();
    },

    // Apply zoom to timeline
    applyZoom() {
        const zoomLevelEl = document.getElementById('zoomLevel');
        if (zoomLevelEl) zoomLevelEl.textContent = `${Math.round(this.config.zoomLevel * 100)}%`;

        const timelineContainer = document.querySelector('.timeline-container');
        if (timelineContainer) {
            timelineContainer.style.transform = `scale(${this.config.zoomLevel})`;
            timelineContainer.style.transformOrigin = 'center top';
        }

        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        if (zoomInBtn) zoomInBtn.disabled = this.config.zoomLevel >= this.config.maxZoom;
        if (zoomOutBtn) zoomOutBtn.disabled = this.config.zoomLevel <= this.config.minZoom;
    },

    // Scroll timeline
    scrollTimeline(direction) {
        if (this.config.currentView === 'horizontal') {
            this.scrollHorizontalTimeline(direction);
        } else {
            this.scrollVerticalTimeline(direction);
        }
    },

    // Scroll vertical timeline
    scrollVerticalTimeline(direction) {
        const container = document.querySelector('.timeline-vertical');
        if (!container) return;
        const scrollAmount = 100;
        container.scrollTop += direction * scrollAmount;
        this.updateProgressBar();
    },

    // Scroll horizontal timeline
    scrollHorizontalTimeline(direction) {
        const container = document.querySelector('.timeline-horizontal');
        if (!container) return;
        const scrollAmount = 100;
        container.scrollLeft += direction * scrollAmount;
        this.updateProgressBar();
    },

    // Update progress bar
    updateProgressBar() {
        const container = document.querySelector('.timeline-container');
        if (!container) return;
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight - container.clientHeight;
        const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        const progressBar = document.getElementById('timelineProgress');
        if (progressBar) progressBar.style.width = `${progress}%`;
    },

    // Toggle significance display
    toggleSignificance() {
        this.config.showSignificance = !this.config.showSignificance;
        const button = document.getElementById('toggleSignificanceBtn');
        if (button) button.classList.toggle('active', this.config.showSignificance);
        this.renderTimeline();
    },

    // Toggle photos display
    togglePhotos() {
        this.config.showPhotos = !this.config.showPhotos;
        const button = document.getElementById('togglePhotosBtn');
        if (button) button.classList.toggle('active', this.config.showPhotos);
        this.renderTimeline();
    },

    // Select all categories
    selectAllCategories() {
        const checkboxes = document.querySelectorAll('.filter-option input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
    },

    // Apply filters
    applyFilters() {
        const checkboxes = document.querySelectorAll('.filter-option input[type="checkbox"]');
        const selectedCategories = [];

        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selectedCategories.push(checkbox.value);
            }
        });

        this.config.activeFilters.categories = selectedCategories;
        this.renderTimeline();
        this.updateFilterUI();
    },

    // Clear filters
    clearFilters() {
        const checkboxes = document.querySelectorAll('.filter-option input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        this.config.activeFilters.categories = [];
        this.renderTimeline();
        this.updateFilterUI();
    },

    // Update filter UI
    updateFilterUI() {
        const filterCount = document.getElementById('filterCount');
        if (filterCount) {
            const count = this.config.activeFilters.categories.length;
            filterCount.textContent = count === 0 ? 'All Categories' : `${count} Categories`;
        }
    },

    // Print timeline
    printTimeline() {
        window.print();
    },

    // Export timeline
    exportTimeline() {
        const timelineData = {
            milestones: this.state.milestones,
            statistics: this.state.statistics,
            exportDate: new Date().toISOString(),
            format: 'LoveLine Timeline Export'
        };

        const dataStr = JSON.stringify(timelineData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `loveline-timeline-${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    },

    // Toggle statistics panel
    toggleStatistics() {
        const content = document.getElementById('statsContent');
        const button = document.getElementById('toggleStatsBtn');
        if (!content || !button) return;

        if (content.style.display === 'none') {
            content.style.display = 'block';
            button.classList.remove('rotated');
        } else {
            content.style.display = 'none';
            button.classList.add('rotated');
        }
    },

    // Handle keyboard navigation
    handleKeyboardNavigation(e) {
        // Zoom with Ctrl + +/- keys
        if (e.ctrlKey) {
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                this.zoomIn();
            } else if (e.key === '-') {
                e.preventDefault();
                this.zoomOut();
            } else if (e.key === '0') {
                e.preventDefault();
                this.resetZoom();
            }
        }

        // Arrow keys for navigation
        if (e.key === 'ArrowLeft') {
            this.scrollTimeline(-1);
        } else if (e.key === 'ArrowRight') {
            this.scrollTimeline(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.switchView('vertical');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.switchView('horizontal');
        } else if (e.key === 'Escape') {
            this.closeQuickView();
        }
    },

    // Handle window resize
    handleResize() {
        // Re-render charts on resize
        if (this.state.chartInstances.categoryChart) {
            this.state.chartInstances.categoryChart.resize();
        }
        if (this.state.chartInstances.monthlyChart) {
            this.state.chartInstances.monthlyChart.resize();
        }
    },

    // Close quick view modal
    closeQuickView() {
        const modal = document.getElementById('quickViewModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    // Render timeline
    renderTimeline() {
        // Filter milestones
        this.filterMilestones();

        // Render based on current view
        if (this.config.currentView === 'vertical') {
            this.renderVerticalTimeline();
        } else {
            this.renderHorizontalTimeline();
        }

        // Update year navigation
        this.renderYearNavigation();

        // Update legend
        this.renderLegend();

        // Update charts
        this.updateCharts();

        // Update progress bar
        this.updateProgressBar();
    },

    // Filter milestones based on active filters
    filterMilestones() {
        let filtered = [...this.state.milestones];

        // Filter by category
        if (this.config.activeFilters.categories.length > 0) {
            filtered = filtered.filter(milestone =>
                this.config.activeFilters.categories.includes(milestone.category)
            );
        }

        // Filter by year if set
        if (this.config.currentYear) {
            filtered = filtered.filter(milestone =>
                new Date(milestone.date).getFullYear() === this.config.currentYear
            );
        }

        this.state.filteredMilestones = filtered;
    },

    // Render vertical timeline
    renderVerticalTimeline() {
        const container = document.getElementById('verticalTimeline');
        if (!container) return;

        if (this.state.filteredMilestones.length === 0) {
            container.innerHTML = `
                <div class="empty-timeline" id="emptyTimeline">
                    <i class="fas fa-heart"></i>
                    <h3>No milestones found</h3>
                    <p>${this.state.milestones.length === 0 ? 'Start by adding your first milestone!' : 'Try adjusting your filters'}</p>
                    ${this.state.milestones.length === 0 ?
                    '<a href="add-milestone.html" class="btn-primary"><i class="fas fa-plus"></i> Add First Milestone</a>' :
                    '<button class="btn-primary" id="clearFiltersBtn"><i class="fas fa-filter"></i> Clear Filters</button>'
                }
                </div>
            `;

            const clearFiltersBtn = document.getElementById('clearFiltersBtn');
            if (clearFiltersBtn) {
                clearFiltersBtn.addEventListener('click', () => this.clearFilters());
            }
            return;
        }

        let timelineHTML = `
            <div class="timeline-line"></div>
            <div class="timeline-items-container">
        `;

        this.state.filteredMilestones.forEach((milestone, index) => {
            const date = new Date(milestone.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            const isLeftSide = index % 2 === 0;
            const category = milestone.category || 'other';
            const categoryColor = this.categoryColors[category] || this.categoryColors.other;
            const categoryIcon = this.categoryIcons[category] || this.categoryIcons.other;

            let significanceStars = '';
            if (this.config.showSignificance) {
                const significance = milestone.significance || 'medium';
                const starCount = { high: 3, medium: 2, low: 1 }[significance] || 2;
                for (let i = 0; i < 3; i++) {
                    significanceStars += `<i class="fas fa-star significance-star ${i < starCount ? 'active' : ''}"></i>`;
                }
            }

            let photoPreview = '';
            if (this.config.showPhotos && milestone.photoIds && milestone.photoIds.length > 0) {
                const photos = Storage.getPhotosByMilestone(milestone.id);
                const photoCount = Math.min(photos.length, 3);
                photoPreview = `
                    <div class="timeline-photo-preview">
                        <div class="photo-grid">
                            ${photos.slice(0, photoCount).map((photo, i) => `
                                <div class="photo-thumbnail" data-milestone-id="${milestone.id}" data-photo-index="${i}">
                                    <img src="${photo.dataUrl || 'https://via.placeholder.com/100x100/e8f4f8/2C3E50?text=Photo+' + (i + 1)}" alt="${photo.name || 'Photo ' + (i + 1)}">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            timelineHTML += `
                <div class="timeline-item" data-milestone-id="${milestone.id}">
                    <div class="timeline-content ${isLeftSide ? 'left' : 'right'}" 
                         style="border-left-color: ${categoryColor}; border-left-width: 4px;">
                        <div class="timeline-date" style="background: ${categoryColor}">
                            ${formattedDate}
                        </div>
                        <h3 class="timeline-title" data-milestone-id="${milestone.id}">
                            ${milestone.title}
                        </h3>
                        <div class="timeline-category" style="background: ${categoryColor}20; color: ${categoryColor}">
                            <i class="fas ${categoryIcon}"></i>
                            ${this.formatCategoryName(category)}
                        </div>
                        <div class="timeline-description">
                            ${milestone.description || 'No description provided.'}
                        </div>
                        ${photoPreview}
                        <div class="timeline-footer">
                            <div class="timeline-significance">
                                ${significanceStars}
                            </div>
                            <div class="timeline-actions">

                                <a href="add-milestone.html?edit=${milestone.id}" class="btn-icon">
                                    <i class="fas fa-edit"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        timelineHTML += '</div>';
        container.innerHTML = timelineHTML;
        this.addTimelineEventListeners();
    },

    // Render horizontal timeline
    renderHorizontalTimeline() {
        const container = document.getElementById('horizontalTimeline');
        if (!container) return;

        if (this.state.filteredMilestones.length === 0) {
            container.innerHTML = `
                <div class="empty-timeline" id="emptyTimeline">
                    <i class="fas fa-heart"></i>
                    <h3>No milestones found</h3>
                    <p>${this.state.milestones.length === 0 ? 'Start by adding your first milestone!' : 'Try adjusting your filters'}</p>
                </div>
            `;
            return;
        }

        const dates = this.state.filteredMilestones.map(m => new Date(m.date));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        const totalDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);

        let timelineHTML = `
            <div class="timeline-horizontal-line"></div>
            <div class="horizontal-timeline-items">
        `;

        this.state.filteredMilestones.forEach((milestone) => {
            const date = new Date(milestone.date);
            const daysFromStart = (date - minDate) / (1000 * 60 * 60 * 24);
            const positionPercentage = totalDays > 0 ? (daysFromStart / totalDays) * 100 : 50;
            const category = milestone.category || 'other';
            const categoryColor = this.categoryColors[category] || this.categoryColors.other;

            timelineHTML += `
                <div class="horizontal-timeline-item" 
                     style="left: ${positionPercentage}%;"
                     data-milestone-id="${milestone.id}">
                    <div class="horizontal-marker" 
                         style="border-color: ${categoryColor};"
                         title="${milestone.title}">
                    </div>
                    <div class="horizontal-content">
                        <div class="timeline-date" style="background: ${categoryColor}">
                            ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <h4 class="timeline-title" data-milestone-id="${milestone.id}">
                            ${milestone.title}
                        </h4>
                        <div class="timeline-category" style="background: ${categoryColor}20; color: ${categoryColor}">
                            ${this.formatCategoryName(category)}
                        </div>
                    </div>
                </div>
            `;
        });

        timelineHTML += '</div>';
        container.innerHTML = timelineHTML;
        this.addTimelineEventListeners();
    },

    // Render year navigation
    renderYearNavigation() {
        const container = document.getElementById('yearNavigation');
        if (!container) return;

        if (this.state.years.length <= 1) {
            container.innerHTML = '';
            return;
        }

        let yearHTML = '<button class="year-btn" data-year="all">All Years</button>';
        this.state.years.forEach(year => {
            const isActive = this.config.currentYear === year;
            yearHTML += `
                <button class="year-btn ${isActive ? 'active' : ''}" data-year="${year}">
                    ${year}
                </button>
            `;
        });

        container.innerHTML = yearHTML;

        container.querySelectorAll('.year-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const year = e.currentTarget.dataset.year;
                this.config.currentYear = year === 'all' ? null : parseInt(year);

                container.querySelectorAll('.year-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.currentTarget.classList.add('active');

                this.renderTimeline();
            });
        });
    },

    // Render legend
    renderLegend() {
        const container = document.getElementById('timelineLegend');
        if (!container) return;

        let legendHTML = '';

        if (this.config.showSignificance) {
            legendHTML += `
                <div class="legend-item">
                    <div class="legend-color" style="background: var(--accent-color);"></div>
                    <span>High Importance</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: var(--primary-color);"></div>
                    <span>Medium Importance</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: var(--secondary-color);"></div>
                    <span>Low Importance</span>
                </div>
            `;
        }

        Object.entries(this.categoryColors).forEach(([category, color]) => {
            if (this.state.categories.includes(category)) {
                legendHTML += `
                    <div class="legend-item">
                        <div class="legend-color" style="background: ${color};"></div>
                        <span>${this.formatCategoryName(category)}</span>
                    </div>
                `;
            }
        });

        container.innerHTML = legendHTML;
    },

    // Add event listeners to timeline items
    addTimelineEventListeners() {
        document.querySelectorAll('.timeline-title').forEach(title => {
            title.addEventListener('click', (e) => {
                const milestoneId = e.currentTarget.dataset.milestoneId;
                this.showQuickView(milestoneId);
            });
        });

        document.querySelectorAll('.view-detail-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const milestoneId = e.currentTarget.dataset.milestoneId;
                this.showQuickView(milestoneId);
            });
        });

        document.querySelectorAll('.photo-thumbnail').forEach(thumbnail => {
            thumbnail.addEventListener('click', (e) => {
                const milestoneId = e.currentTarget.dataset.milestoneId;
                const photoIndex = e.currentTarget.dataset.photoIndex;
                this.showPhotoView(milestoneId, photoIndex);
            });
        });

        this.populateCategoryFilters();
    },

    // Show quick view modal
    showQuickView(milestoneId) {
        const milestone = Storage.getMilestoneById(milestoneId);
        if (!milestone) {
            console.error('Milestone not found:', milestoneId);
            return;
        }

        const date = new Date(milestone.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const titleEl = document.getElementById('quickViewTitle');
        if (titleEl) titleEl.textContent = milestone.title;

        let contentHTML = `
            <div class="quick-view-details">
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Category:</strong> ${this.formatCategoryName(milestone.category || 'other')}</p>
                <p><strong>Significance:</strong> ${this.formatSignificance(milestone.significance)}</p>
                ${milestone.location ? `<p><strong>Location:</strong> ${milestone.location}</p>` : ''}
                <p>${milestone.description || 'No description provided.'}</p>
            </div>
        `;

        if (milestone.tags && milestone.tags.length > 0) {
            const tagsHTML = milestone.tags.map(tag =>
                `<span class="quick-view-tag">${tag}</span>`
            ).join('');
            contentHTML += `<div class="quick-view-tags">${tagsHTML}</div>`;
        }

        if (milestone.photoIds && milestone.photoIds.length > 0) {
            const photoUrl = milestone.photoIds[0]; // adjust as needed
            contentHTML = `
                <div class="quick-view-photo">
                    <img src="${photoUrl}" alt="${milestone.title}">
                </div>
            ` + contentHTML;
        }

        const quickViewContent = document.getElementById('quickViewContent');
        if (quickViewContent) {
            quickViewContent.innerHTML = contentHTML;
        } else {
            console.error('quickViewContent element not found in the DOM');
        }

        const viewDetailsBtn = document.getElementById('viewDetailsBtn');
        if (viewDetailsBtn) viewDetailsBtn.href = `milestone-detail.html?id=${milestoneId}`;

        const editBtn = document.getElementById('editMilestoneBtn');
        if (editBtn) editBtn.href = `add-milestone.html?edit=${milestoneId}`;

        const modal = document.getElementById('quickViewModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },

    // Show photo view
    showPhotoView(milestoneId, photoIndex) {
        alert(`Viewing photo ${parseInt(photoIndex) + 1} of milestone ${milestoneId}`);
    },

    // Populate category filters
    populateCategoryFilters() {
        const container = document.getElementById('categoryFilters');
        if (!container) return;

        let filterHTML = '';
        this.state.categories.forEach(category => {
            const isChecked = this.config.activeFilters.categories.length === 0 ||
                this.config.activeFilters.categories.includes(category);

            filterHTML += `
                <div class="filter-option">
                    <input type="checkbox" id="filter-${category}" value="${category}" ${isChecked ? 'checked' : ''}>
                    <label for="filter-${category}">
                        <span class="category-icon">
                            <i class="fas ${this.categoryIcons[category] || this.categoryIcons.other}"></i>
                        </span>
                        <span>${this.formatCategoryName(category)}</span>
                    </label>
                </div>
            `;
        });

        container.innerHTML = filterHTML;
    },

    // Setup charts
    setupCharts() {
        const categoryCanvas = document.getElementById('categoryChartCanvas');
        const monthlyCanvas = document.getElementById('monthlyChartCanvas');
        if (!categoryCanvas || !monthlyCanvas) return;

        const categoryCtx = categoryCanvas.getContext('2d');
        const monthlyCtx = monthlyCanvas.getContext('2d');

        this.state.chartInstances.categoryChart = new Chart(categoryCtx, {
            type: 'doughnut',
            data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 1 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } }
                }
            }
        });

        this.state.chartInstances.monthlyChart = new Chart(monthlyCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Milestones',
                    data: [],
                    backgroundColor: 'rgba(231, 84, 128, 0.6)',
                    borderColor: 'rgba(231, 84, 128, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                plugins: { legend: { display: false } }
            }
        });
    },

    // Update charts with data
    updateCharts() {
        if (!this.state.chartInstances.categoryChart || !this.state.chartInstances.monthlyChart) return;

        const categoryData = this.state.statistics.categoryDistribution;
        const categoryLabels = Object.keys(categoryData);
        const categoryValues = Object.values(categoryData);
        const categoryColors = categoryLabels.map(cat => this.categoryColors[cat] || this.categoryColors.other);

        this.state.chartInstances.categoryChart.data.labels = categoryLabels.map(cat => this.formatCategoryName(cat));
        this.state.chartInstances.categoryChart.data.datasets[0].data = categoryValues;
        this.state.chartInstances.categoryChart.data.datasets[0].backgroundColor = categoryColors;
        this.state.chartInstances.categoryChart.update();

        const monthlyData = this.state.statistics.monthlyActivity;
        const monthlyLabels = Object.keys(monthlyData);
        const monthlyValues = Object.values(monthlyData);

        const formattedLabels = monthlyLabels.map(label => {
            const [year, month] = label.split('-');
            const date = new Date(year, month - 1, 1);
            return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        }).reverse();

        this.state.chartInstances.monthlyChart.data.labels = formattedLabels;
        this.state.chartInstances.monthlyChart.data.datasets[0].data = monthlyValues.reverse();
        this.state.chartInstances.monthlyChart.update();
    },

    // Format category name
    formatCategoryName(category) {
        return category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Other';
    },

    // Format significance
    formatSignificance(significance) {
        const levels = {
            'low': 'Low Importance',
            'medium': 'Medium Importance',
            'high': 'High Importance'
        };
        return levels[significance] || 'Medium Importance';
    }
};

// Initialize timeline when DOM loads
document.addEventListener('DOMContentLoaded', () => Timeline.init());