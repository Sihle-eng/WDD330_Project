document.addEventListener('DOMContentLoaded', function () {
    console.log('LoveLine - Relationship Milestone Tracker initialized');

    initializeApp();
    setupEventListeners();
    loadDashboardData();
});

// ===== INITIALIZATION =====
function initializeApp() {
    // Initialize any required modules
    console.log('App initialized with Storage module');

    // Listen for storage updates
    window.addEventListener('storageUpdated', handleStorageUpdate);
}

function setupEventListeners() {
    // Quick Add Button
    const quickAddBtn = document.getElementById('quickAddBtn');
    if (quickAddBtn) {
        quickAddBtn.addEventListener('click', function () {
            window.location.href = 'add-milestone.html';
        });
    }

    // Navigation active state
    const navItems = document.querySelectorAll('.nav-item a');
    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            navItems.forEach(nav => nav.parentElement.classList.remove('active'));
            this.parentElement.classList.add('active');
        });
    });
}

// ===== DASHBOARD FUNCTIONS =====
function loadDashboardData() {
    updateWelcomeSection();
    updateUpcomingMilestones();
    updateRecentMilestones();
    updateStatistics();
}

function updateWelcomeSection() {
    const profile = Storage.getUserProfile();

    if (profile && profile.coupleName) {
        document.querySelector('.welcome-card h2').innerHTML =
            `<i class="fas fa-heart"></i> Welcome Back, ${profile.coupleName}!`;
    }

    // Calculate days together
    if (profile && profile.anniversaryDate) {
        const anniversary = new Date(profile.anniversaryDate);
        const today = new Date();
        const diffTime = Math.abs(today - anniversary);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        document.querySelector('.welcome-section .highlight').textContent = diffDays.toLocaleString();

        // Update next anniversary countdown
        updateNextAnniversary(anniversary);
    }
}

function updateNextAnniversary(originalDate) {
    const nextDate = Storage.getNextOccurrence(originalDate);
    const today = new Date();
    const diffTime = nextDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const countdownElement = document.querySelector('.next-anniversary .countdown');
    if (countdownElement) {
        countdownElement.textContent = `${diffDays} days`;
    }
}

function updateUpcomingMilestones() {
    const upcomingList = document.getElementById('upcoming-list');
    if (!upcomingList) return;

    const upcomingMilestones = Storage.getUpcomingMilestones(30);

    if (upcomingMilestones.length === 0) {
        upcomingList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-plus"></i>
                <p>No upcoming milestones. Add one to get started!</p>
                <a href="add-milestone.html" class="btn-text">Add Milestone</a>
            </div>
        `;
        return;
    }

    upcomingList.innerHTML = '';

    upcomingMilestones.slice(0, 5).forEach(milestone => {
        const milestoneDate = new Date(milestone.date);
        const nextDate = Storage.getNextOccurrence(milestoneDate);
        const today = new Date();
        const daysDiff = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

        const upcomingItem = document.createElement('div');
        upcomingItem.className = 'upcoming-item';
        upcomingItem.innerHTML = `
            <div class="upcoming-date">
                <span class="month">${nextDate.toLocaleString('default', { month: 'short' })}</span>
                <span class="day">${nextDate.getDate()}</span>
            </div>
            <div class="upcoming-details">
                <h4>${milestone.title}</h4>
                <p>${milestone.category.charAt(0).toUpperCase() + milestone.category.slice(1)}</p>
                <span class="days-away">${daysDiff} ${daysDiff === 1 ? 'day' : 'days'} to go</span>
            </div>
            <div class="upcoming-actions">
                <a href="milestone-detail.html?id=${milestone.id}" class="btn-icon">
                    <i class="fas fa-eye"></i>
                </a>
            </div>
        `;

        upcomingList.appendChild(upcomingItem);
    });

    // Add view all button if there are more than 5
    if (upcomingMilestones.length > 5) {
        const viewAllBtn = document.createElement('div');
        viewAllBtn.className = 'view-all-container';
        viewAllBtn.innerHTML = `
            <a href="#" class="view-all-link">
                View all ${upcomingMilestones.length} upcoming milestones
                <i class="fas fa-arrow-right"></i>
            </a>
        `;
        upcomingList.appendChild(viewAllBtn);
    }
}

function updateRecentMilestones() {
    const timelinePreview = document.getElementById('timeline-preview');
    if (!timelinePreview) return;

    const milestones = Storage.getAllMilestones();

    if (milestones.length === 0) {
        timelinePreview.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart"></i>
                <p>Your love story begins here!</p>
                <p class="hint">Add your first milestone to start tracking your journey</p>
                <a href="add-milestone.html" class="btn-primary">
                    <i class="fas fa-plus"></i> Add First Milestone
                </a>
            </div>
        `;
        return;
    }

    // Sort by date (newest first)
    const sortedMilestones = [...milestones].sort((a, b) =>
        new Date(b.date) - new Date(a.date)
    ).slice(0, 5);

    timelinePreview.innerHTML = `
        <div class="timeline-items">
            ${sortedMilestones.map((milestone, index) => `
                <div class="timeline-item ${index % 2 === 0 ? 'left' : 'right'}">
                    <div class="timeline-content">
                        <div class="timeline-date">${formatDate(milestone.date)}</div>
                        <div class="timeline-title">${milestone.title}</div>
                        <div class="timeline-category">
                            <span class="category-badge ${milestone.category}">
                                <i class="fas ${getCategoryIcon(milestone.category)}"></i>
                                ${milestone.category}
                            </span>
                        </div>
                        <div class="timeline-actions">
                            <a href="milestone-detail.html?id=${milestone.id}" class="btn-text">
                                View Details <i class="fas fa-arrow-right"></i>
                            </a>
                            <a href="add-milestone.html?edit=${milestone.id}" class="btn-icon">
                                <i class="fas fa-edit"></i>
                            </a>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function updateStatistics() {
    const stats = Storage.getStatistics();

    // Update stats cards
    const statCards = document.querySelectorAll('.stat-card');
    if (statCards.length >= 4) {
        statCards[0].querySelector('h3').textContent = stats.totalMilestones;
        statCards[1].querySelector('h3').textContent = stats.milestonesThisYear;
        statCards[2].querySelector('h3').textContent = stats.upcomingCount;
        statCards[3].querySelector('h3').textContent = stats.averagePerMonth;
    }
}

// ===== UTILITY FUNCTIONS =====
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function getCategoryIcon(category) {
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

// ===== EVENT HANDLERS =====
function handleStorageUpdate(event) {
    console.log('Storage updated, refreshing dashboard...');
    loadDashboardData();
}

// ===== MILESTONE MANAGEMENT =====

// Function to delete milestone (can be called from detail page)
function deleteMilestone(milestoneId, confirmMessage = 'Are you sure you want to delete this milestone?') {
    if (confirm(confirmMessage)) {
        const success = Storage.deleteMilestone(milestoneId);
        if (success) {
            alert('Milestone deleted successfully.');
            window.location.href = 'index.html';
        } else {
            alert('Error deleting milestone. Please try again.');
        }
    }
}

// Function to duplicate milestone
function duplicateMilestone(milestoneId) {
    const milestone = Storage.getMilestoneById(milestoneId);
    if (!milestone) return;

    // Create a copy with new ID
    const duplicate = { ...milestone };
    delete duplicate.id;
    duplicate.title = `${milestone.title} (Copy)`;
    duplicate.createdAt = new Date().toISOString();

    const success = Storage.saveMilestone(duplicate);
    if (success) {
        alert('Milestone duplicated successfully!');
        window.location.reload();
    } else {
        alert('Error duplicating milestone.');
    }
}

// ===== EXPORT/IMPORT FUNCTIONS =====
function exportData() {
    const data = Storage.exportData();
    if (!data) {
        alert('Error exporting data.');
        return;
    }

    // Create download link
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loveline-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('Data exported successfully!');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const success = Storage.importData(event.target.result);
            if (success) {
                alert('Data imported successfully!');
                window.location.reload();
            } else {
                alert('Error importing data. Please check the file format.');
            }
        };
        reader.readAsText(file);
    };

    input.click();
}

// ===== BATCH OPERATIONS =====
function deleteAllMilestones() {
    if (confirm('⚠️ WARNING: This will delete ALL milestones and cannot be undone. Are you absolutely sure?')) {
        if (confirm('⚠️ DOUBLE CONFIRM: This action cannot be reversed. Type "DELETE ALL" to confirm.')) {
            const confirmation = prompt('Type "DELETE ALL" to confirm deletion:');
            if (confirmation === 'DELETE ALL') {
                // Create backup first
                Storage.createBackup();

                // Clear milestones
                localStorage.removeItem(Storage.KEYS.MILESTONES);

                // Trigger update
                Storage.triggerStorageEvent();

                alert('All milestones have been deleted. A backup has been created.');
                window.location.reload();
            }
        }
    }
}

// ===== GLOBAL FUNCTIONS =====
window.LoveLine = {
    Storage,
    formatDate,
    deleteMilestone,
    duplicateMilestone,
    exportData,
    importData,
    deleteAllMilestones
};

// ===== NOTIFICATION FUNCTIONS (to be implemented later) =====
function checkForNotifications() {
    const settings = Storage.getSettings();

    if (!settings.notifications) return;

    const upcoming = Storage.getUpcomingMilestones(7); // Next 7 days

    upcoming.forEach(milestone => {
        const milestoneDate = new Date(milestone.date);
        const nextDate = Storage.getNextOccurrence(milestoneDate);
        const today = new Date();
        const daysDiff = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

        // Show notification if milestone is tomorrow
        if (daysDiff === 1) {
            showNotification(`Tomorrow: ${milestone.title}!`);
        }
    });
}

function showNotification(message) {
    // Check if browser supports notifications
    if (!("Notification" in window)) {
        return;
    }

    // Check if permission is already granted
    if (Notification.permission === "granted") {
        new Notification("LoveLine Reminder", {
            body: message,
            icon: "assets/icons/notification-icon.png"
        });
    } else if (Notification.permission !== "denied") {
        // Request permission
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification("LoveLine Reminder", {
                    body: message,
                    icon: "assets/icons/notification-icon.png"
                });
            }
        });
    }
}

// Check for notifications on page load
setTimeout(checkForNotifications, 2000);

// ===== SEARCH & FILTER FUNCTIONALITY =====

const SearchFilter = {
    currentFilters: {
        searchQuery: '',
        category: '',
        dateRange: 'all',
        customStart: '',
        customEnd: '',
        sortBy: 'date-desc'
    },

    init() {
        this.setupSearchListeners();
        this.loadSavedFilters();
    },

    setupSearchListeners() {
        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.searchQuery = e.target.value;
                this.performSearch();
            });
        }

        // Clear search
        const clearSearch = document.getElementById('clearSearch');
        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                searchInput.value = '';
                this.currentFilters.searchQuery = '';
                this.performSearch();
            });
        }

        // Category filter
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentFilters.category = e.target.value;
                this.performSearch();
            });
        }

        // Date filter
        const dateFilter = document.getElementById('dateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.currentFilters.dateRange = e.target.value;

                // Show/hide custom date range
                const customRange = document.getElementById('customDateRange');
                if (e.target.value === 'custom') {
                    customRange.style.display = 'block';
                } else {
                    customRange.style.display = 'none';
                    this.performSearch();
                }
            });
        }

        // Custom date inputs
        const dateFrom = document.getElementById('dateFrom');
        const dateTo = document.getElementById('dateTo');
        if (dateFrom && dateTo) {
            dateFrom.addEventListener('change', () => {
                this.currentFilters.customStart = dateFrom.value;
                this.currentFilters.customEnd = dateTo.value;
                this.performSearch();
            });
            dateTo.addEventListener('change', () => {
                this.currentFilters.customStart = dateFrom.value;
                this.currentFilters.customEnd = dateTo.value;
                this.performSearch();
            });
        }

        // Sort filter
        const sortFilter = document.getElementById('sortFilter');
        if (sortFilter) {
            sortFilter.addEventListener('change', (e) => {
                this.currentFilters.sortBy = e.target.value;
                this.performSearch();
            });
        }

        // Apply filters button
        const applyBtn = document.getElementById('applyFiltersBtn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.performSearch());
        }

        // Reset filters button
        const resetBtn = document.getElementById('resetFiltersBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetFilters());
        }

        // Close results
        const closeResults = document.getElementById('closeResults');
        if (closeResults) {
            closeResults.addEventListener('click', () => {
                document.getElementById('searchResults').style.display = 'none';
                this.resetFilters();
            });
        }

        // Quick filter chips (for categories)
        this.setupQuickFilters();
    },

    setupQuickFilters() {
        // Create quick filter chips for categories
        const quickFiltersContainer = document.createElement('div');
        quickFiltersContainer.className = 'filter-chips';
        quickFiltersContainer.innerHTML = `
            <span class="filter-chip active" data-category="">All</span>
            <span class="filter-chip" data-category="romance">💖 Romance</span>
            <span class="filter-chip" data-category="travel">✈️ Travel</span>
            <span class="filter-chip" data-category="commitment">💍 Commitment</span>
            <span class="filter-chip" data-category="achievement">🏆 Achievement</span>
            <span class="filter-chip" data-category="celebration">🎉 Celebration</span>
        `;

        const searchContainer = document.querySelector('.search-container');
        if (searchContainer) {
            searchContainer.appendChild(quickFiltersContainer);

            // Add click handlers
            quickFiltersContainer.querySelectorAll('.filter-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    // Remove active class from all chips
                    quickFiltersContainer.querySelectorAll('.filter-chip').forEach(c => {
                        c.classList.remove('active');
                    });

                    // Add active class to clicked chip
                    chip.classList.add('active');

                    // Update category filter
                    const category = chip.dataset.category;
                    this.currentFilters.category = category;
                    document.getElementById('categoryFilter').value = category;
                    this.performSearch();
                });
            });
        }
    },

    performSearch() {
        const milestones = Storage.getAllMilestones();
        let results = [...milestones];

        // Apply search query
        if (this.currentFilters.searchQuery) {
            const query = this.currentFilters.searchQuery.toLowerCase();
            results = results.filter(milestone => {
                return (
                    milestone.title.toLowerCase().includes(query) ||
                    (milestone.description && milestone.description.toLowerCase().includes(query)) ||
                    (milestone.tags && milestone.tags.some(tag => tag.toLowerCase().includes(query))) ||
                    (milestone.location && milestone.location.toLowerCase().includes(query))
                );
            });
        }

        // Apply category filter
        if (this.currentFilters.category) {
            results = results.filter(milestone =>
                milestone.category === this.currentFilters.category
            );
        }

        // Apply date range filter
        if (this.currentFilters.dateRange !== 'all') {
            const today = new Date();
            let startDate = new Date(today);

            switch (this.currentFilters.dateRange) {
                case 'year':
                    startDate.setFullYear(today.getFullYear() - 1);
                    break;
                case 'month':
                    startDate.setMonth(today.getMonth() - 1);
                    break;
                case 'week':
                    startDate.setDate(today.getDate() - 7);
                    break;
                case 'custom':
                    if (this.currentFilters.customStart && this.currentFilters.customEnd) {
                        startDate = new Date(this.currentFilters.customStart);
                        const endDate = new Date(this.currentFilters.customEnd);
                        results = results.filter(milestone => {
                            const milestoneDate = new Date(milestone.date);
                            return milestoneDate >= startDate && milestoneDate <= endDate;
                        });
                    }
                    break;
            }

            if (this.currentFilters.dateRange !== 'custom') {
                results = results.filter(milestone => {
                    const milestoneDate = new Date(milestone.date);
                    return milestoneDate >= startDate;
                });
            }
        }

        // Apply sorting
        results.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);

            switch (this.currentFilters.sortBy) {
                case 'date-desc':
                    return dateB - dateA;
                case 'date-asc':
                    return dateA - dateB;
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'significance':
                    const significanceOrder = { high: 3, medium: 2, low: 1 };
                    const sigA = significanceOrder[a.significance] || 2;
                    const sigB = significanceOrder[b.significance] || 2;
                    return sigB - sigA;
                default:
                    return dateB - dateA;
            }
        });

        this.displaySearchResults(results);
    },

    displaySearchResults(results) {
        const resultsContainer = document.getElementById('searchResults');
        const resultsGrid = document.getElementById('resultsGrid');
        const resultsCount = document.getElementById('resultsCount');

        if (!resultsContainer || !resultsGrid) return;

        // Show/hide results container
        if (results.length === 0 && !this.currentFilters.searchQuery &&
            !this.currentFilters.category && this.currentFilters.dateRange === 'all') {
            resultsContainer.style.display = 'none';
            return;
        }

        resultsContainer.style.display = 'block';
        resultsCount.textContent = `${results.length} Result${results.length !== 1 ? 's' : ''}`;

        // Clear previous results
        resultsGrid.innerHTML = '';

        if (results.length === 0) {
            resultsGrid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>No milestones found</h3>
                    <p>Try adjusting your search filters</p>
                </div>
            `;
            return;
        }

        // Display results
        results.forEach(milestone => {
            const resultCard = document.createElement('div');
            resultCard.className = 'result-card';

            const date = new Date(milestone.date);
            const description = milestone.description ?
                milestone.description.substring(0, 150) + (milestone.description.length > 150 ? '...' : '') :
                'No description';

            resultCard.innerHTML = `
                <div class="result-header">
                    <div>
                        <div class="result-title">${milestone.title}</div>
                        <div class="result-date">${date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}</div>
                    </div>
                    <span class="result-category">${this.formatCategory(milestone.category)}</span>
                </div>
                <div class="result-description">${description}</div>
                <div class="result-actions">
                    <a href="milestone-detail.html?id=${milestone.id}" class="btn-icon">
                        <i class="fas fa-eye"></i> View
                    </a>
                    <a href="add-milestone.html?edit=${milestone.id}" class="btn-icon">
                        <i class="fas fa-edit"></i> Edit
                    </a>
                </div>
            `;

            resultsGrid.appendChild(resultCard);
        });
    },

    resetFilters() {
        this.currentFilters = {
            searchQuery: '',
            category: '',
            dateRange: 'all',
            customStart: '',
            customEnd: '',
            sortBy: 'date-desc'
        };

        // Reset UI elements
        document.getElementById('searchInput').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('dateFilter').value = 'all';
        document.getElementById('sortFilter').value = 'date-desc';
        document.getElementById('customDateRange').style.display = 'none';
        document.getElementById('dateFrom').value = '';
        document.getElementById('dateTo').value = '';

        // Reset quick filter chips
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.classList.remove('active');
            if (chip.dataset.category === '') {
                chip.classList.add('active');
            }
        });

        // Hide results
        document.getElementById('searchResults').style.display = 'none';

        // Save cleared filters
        this.saveFilters();
    },

    loadSavedFilters() {
        const savedFilters = localStorage.getItem('loveLine_filters');
        if (savedFilters) {
            try {
                const filters = JSON.parse(savedFilters);
                this.currentFilters = { ...this.currentFilters, ...filters };

                // Apply to UI
                document.getElementById('searchInput').value = this.currentFilters.searchQuery;
                document.getElementById('categoryFilter').value = this.currentFilters.category;
                document.getElementById('dateFilter').value = this.currentFilters.dateRange;
                document.getElementById('sortFilter').value = this.currentFilters.sortBy;

                if (this.currentFilters.dateRange === 'custom') {
                    document.getElementById('customDateRange').style.display = 'block';
                    document.getElementById('dateFrom').value = this.currentFilters.customStart;
                    document.getElementById('dateTo').value = this.currentFilters.customEnd;
                }

                // Update quick filter chips
                document.querySelectorAll('.filter-chip').forEach(chip => {
                    chip.classList.remove('active');
                    if (chip.dataset.category === this.currentFilters.category) {
                        chip.classList.add('active');
                    }
                });

                // Perform search if there are active filters
                if (this.currentFilters.searchQuery || this.currentFilters.category ||
                    this.currentFilters.dateRange !== 'all') {
                    setTimeout(() => this.performSearch(), 100);
                }
            } catch (error) {
                console.error('Error loading saved filters:', error);
            }
        }
    },

    saveFilters() {
        localStorage.setItem('loveLine_filters', JSON.stringify(this.currentFilters));
    },

    formatCategory(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
};

// Initialize SearchFilter when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    // Add this to your existing DOMContentLoaded callback
    SearchFilter.init();
});

function updateTimelinePreview() {
    const timelinePreview = document.getElementById('timeline-preview');
    if (!timelinePreview) return;

    const milestones = Storage.getAllMilestones();

    if (milestones.length === 0) {
        timelinePreview.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart"></i>
                <p>Your love story begins here!</p>
                <p class="hint">Add your first milestone to start tracking your journey</p>
                <a href="add-milestone.html" class="btn-primary">
                    <i class="fas fa-plus"></i> Add First Milestone
                </a>
            </div>
        `;
        return;
    }

    // Get recent milestones (last 5)
    const recentMilestones = [...milestones]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    // Create a mini-timeline preview
    timelinePreview.innerHTML = `
        <div class="mini-timeline">
            <div class="mini-timeline-line"></div>
            <div class="mini-timeline-items">
                ${recentMilestones.map((milestone, index) => {
        const date = new Date(milestone.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });

        const category = milestone.category || 'other';
        const categoryColor = Timeline.categoryColors[category] || Timeline.categoryColors.other;

        return `
                        <div class="mini-timeline-item" data-milestone-id="${milestone.id}">
                            <div class="mini-marker" style="border-color: ${categoryColor};"></div>
                            <div class="mini-content">
                                <div class="mini-date">${formattedDate}</div>
                                <div class="mini-title">${milestone.title}</div>
                                <div class="mini-category">${milestone.category || 'Other'}</div>
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>
            
            <div class="timeline-preview-actions">
                <a href="timeline.html" class="btn-primary">
                    <i class="fas fa-stream"></i> View Full Timeline
                </a>
            </div>
        </div>
    `;

    // Add mini-timeline styles
    const style = document.createElement('style');
    style.textContent = `
        .mini-timeline {
            position: relative;
            padding: 1rem 0;
        }
        
        .mini-timeline-line {
            position: absolute;
            left: 20px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: linear-gradient(to bottom, var(--primary-color), var(--secondary-color));
        }
        
        .mini-timeline-items {
            position: relative;
            z-index: 2;
        }
        
        .mini-timeline-item {
            position: relative;
            margin-bottom: 1.5rem;
            padding-left: 50px;
        }
        
        .mini-marker {
            position: absolute;
            left: 15px;
            top: 0;
            width: 12px;
            height: 12px;
            background: white;
            border: 2px solid var(--primary-color);
            border-radius: 50%;
            transform: translateX(-50%);
        }
        
        .mini-content {
            background: white;
            padding: 0.75rem;
            border-radius: var(--radius-sm);
            box-shadow: var(--shadow);
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .mini-content:hover {
            transform: translateX(5px);
            box-shadow: var(--shadow-lg);
        }
        
        .mini-date {
            font-size: 0.85rem;
            color: var(--text-secondary);
            margin-bottom: 0.25rem;
        }
        
        .mini-title {
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.25rem;
        }
        
        .mini-category {
            font-size: 0.85rem;
            color: var(--primary-color);
            background: rgba(231, 84, 128, 0.1);
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 20px;
        }
        
        .timeline-preview-actions {
            text-align: center;
            margin-top: 2rem;
        }
    `;
    document.head.appendChild(style);

    // Add click events to mini timeline items
    document.querySelectorAll('.mini-timeline-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const milestoneId = e.currentTarget.dataset.milestoneId;
            window.location.href = `milestone-detail.html?id=${milestoneId}`;
        });
    });
}

// ===== DASHBOARD COUNTDOWN INTEGRATION =====
const AppStorage = {
    getUserProfile: function () {
        return JSON.parse(localStorage.getItem("userProfile"));
    },
    getNextOccurrence: function (date) {
        const today = new Date();
        const next = new Date(date);
        next.setFullYear(today.getFullYear());
        if (next < today) {
            next.setFullYear(today.getFullYear() + 1);
        }
        return next;
    }
};

function updateDashboardCountdown() {
    const countdownElement = document.querySelector('.next-anniversary .countdown');
    if (!countdownElement) return;

    const profile = AppStorage.getUserProfile();
    if (!profile || !profile.anniversaryDate) return;

    const anniversary = new Date(profile.anniversaryDate);
    const nextAnniversary = AppStorage.getNextOccurrence(anniversary);
    const today = new Date();
    const diff = nextAnniversary - today;

    if (diff <= 0) {
        countdownElement.textContent = 'Today!';
        countdownElement.style.color = 'var(--accent-color)';
        countdownElement.style.animation = 'pulse 1s infinite';
        return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    let displayText;
    if (days > 0) {
        displayText = `${days} day${days !== 1 ? 's' : ''}`;
        if (days <= 7) {
            displayText += `, ${hours} hour${hours !== 1 ? 's' : ''}`;
        }
    } else {
        displayText = `${hours} hour${hours !== 1 ? 's' : ''}`;
    }

    countdownElement.textContent = displayText;

    // Color coding based on proximity
    if (days <= 7) {
        countdownElement.style.color = 'var(--accent-color)';
    } else if (days <= 30) {
        countdownElement.style.color = 'var(--primary-color)';
    }
}

// Update countdown every minute
setInterval(updateDashboardCountdown, 60000);

// Initialize on page load
updateDashboardCountdown();

document.getElementById('suggest-background').addEventListener('click', async function () {
    const category = document.getElementById('milestone-category').value;
    const query = getQueryFromCategory(category);
    const imageData = await fetchUnsplashImage(query);

    if (imageData) {
        const preview = document.getElementById('image-preview');
        preview.innerHTML = `
      <img src="${imageData.urls.small}" alt="${imageData.alt}" />
      <p>Photo by <a href="${imageData.authorLink}" target="_blank">${imageData.author}</a> on Unsplash</p>
      <button id="apply-image">Apply as Background</button>
    `;

        document.getElementById('apply-image').addEventListener('click', function () {
            // Save image data to milestone object
            currentMilestone.backgroundImage = imageData.urls.regular;
            currentMilestone.imageAttribution = `${imageData.author} on Unsplash`;
            // Update UI
            updateMilestoneBackground(currentMilestone);
            cacheUnsplashImage(currentMilestone.id, imageData);
        });
    }
});