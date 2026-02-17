// ===== app.js – LoveLine Global Application Script =====
// Single entry point – no duplicate listeners, no stray code.

document.addEventListener('DOMContentLoaded', function () {
    console.log('LoveLine - Relationship Milestone Tracker initialized');

    // ===== 1. GLOBAL SERVICES (run on every page) =====
    if (window.ReminderScheduler) {
        ReminderScheduler.start();
    }

    // Listen for storage updates (used across all pages)
    window.addEventListener('storageUpdated', handleStorageUpdate);

    // Setup navigation active state
    setupNavigation();

    // ===== 2. DASHBOARD SPECIFIC (only if on dashboard page) =====
    if (document.querySelector('.welcome-card')) {
        console.log('Dashboard detected – loading dashboard data');
        loadDashboardData();

        // Quick Add button (dashboard)
        const quickAddBtn = document.getElementById('quickAddBtn');
        if (quickAddBtn) {
            quickAddBtn.addEventListener('click', () => window.location.href = 'add-milestone.html');
        }
    }

    // ===== 3. SEARCH & FILTER (only if on timeline/search page) =====
    if (document.getElementById('searchInput')) {
        SearchFilter.init();
    }

    // ===== 4. LOGOUT HANDLER =====
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault(); // Important in case it's inside a form
            console.log('Logout clicked');
            Auth.logout();      // Calls the logout method from auth.js
        });
    } else {
        console.warn('Logout button not found');
    }

    // ===== 5. LEGACY NOTIFICATION CHECK =====
    setTimeout(checkForNotifications, 2000);
});

// =========================================================================
// DASHBOARD FUNCTIONS – only called when dashboard elements exist
// =========================================================================

function loadDashboardData() {
    updateWelcomeSection();
    updateUpcomingMilestones();
    updateRecentMilestones();
    updateStatistics();
}

function updateWelcomeSection() {
    const welcomeHeader = document.querySelector('.welcome-card h2');
    if (!welcomeHeader) return;

    const profile = Storage.getUserProfile();
    if (profile?.coupleName) {
        welcomeHeader.innerHTML = `<i class="fas fa-heart"></i> Welcome Back, ${profile.coupleName}!`;
    }

    if (profile?.anniversaryDate) {
        const anniversary = new Date(profile.anniversaryDate);
        const today = new Date();
        const diffTime = Math.abs(today - anniversary);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const highlightEl = document.querySelector('.welcome-section .highlight');
        if (highlightEl) highlightEl.textContent = diffDays.toLocaleString();

        updateNextAnniversary(anniversary);
    }
}

function updateNextAnniversary(originalDate) {
    const nextDate = Storage.getNextOccurrence(originalDate);
    const today = new Date();
    const diffTime = nextDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const countdownEl = document.querySelector('.next-anniversary .countdown');
    if (countdownEl) {
        countdownEl.textContent = `${diffDays} days`;
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

    let html = '';
    upcomingMilestones.slice(0, 5).forEach(milestone => {
        const milestoneDate = new Date(milestone.date);
        const nextDate = Storage.getNextOccurrence(milestoneDate);
        const today = new Date();
        const daysDiff = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

        html += `
            <div class="upcoming-item">
                <div class="upcoming-date">
                    <span class="month">${nextDate.toLocaleString('default', { month: 'short' })}</span>
                    <span class="day">${nextDate.getDate()}</span>
                </div>
                <div class="upcoming-details">
                    <h4>${milestone.title}</h4>
                    <p>${capitalize(milestone.category)}</p>
                    <span class="days-away">${daysDiff} ${daysDiff === 1 ? 'day' : 'days'} to go</span>
                </div>
                <div class="upcoming-actions">
                    <a href="milestone-detail.html?id=${milestone.id}" class="btn-icon">
                        <i class="fas fa-eye"></i>
                    </a>
                </div>
            </div>
        `;
    });

    if (upcomingMilestones.length > 5) {
        html += `
            <div class="view-all-container">
                <a href="#" class="view-all-link">
                    View all ${upcomingMilestones.length} upcoming milestones
                    <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        `;
    }

    upcomingList.innerHTML = html;
}

function updateRecentMilestones() {
    const timelinePreview = document.getElementById('timeline-preview');
    if (!timelinePreview) return;

    try {
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

        const sortedMilestones = [...milestones]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        let html = '<div class="timeline-items">';
        sortedMilestones.forEach((milestone, index) => {
            html += `
                <div class="timeline-item ${index % 2 === 0 ? 'left' : 'right'}">
                    <div class="timeline-content">
                        <div class="timeline-date">${formatDate(milestone.date)}</div>
                        <div class="timeline-title">${milestone.title}</div>
                        <div class="timeline-category">
                            <span class="category-badge ${milestone.category}">
                                <i class="fas ${getCategoryIcon(milestone.category)}"></i>
                                ${capitalize(milestone.category)}
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
            `;
        });
        html += '</div>';
        timelinePreview.innerHTML = html;
    } catch (error) {
        console.error('Error in updateRecentMilestones:', error);
        timelinePreview.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Something went wrong loading your milestones.</p>
                <button onclick="location.reload()" class="btn-text">Try Again</button>
            </div>
        `;
    }
}

function updateStatistics() {
    const stats = Storage.getStatistics();
    const statCards = document.querySelectorAll('.stat-card');
    if (statCards.length >= 4) {
        const values = [
            stats.totalMilestones,
            stats.milestonesThisYear,
            stats.upcomingCount,
            stats.averagePerMonth
        ];
        statCards.forEach((card, index) => {
            const h3 = card.querySelector('h3');
            if (h3 && values[index] !== undefined) h3.textContent = values[index];
        });
    }
}

// =========================================================================
// GLOBAL UTILITIES
// =========================================================================

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function getCategoryIcon(category) {
    const icons = {
        romance: 'fa-heart',
        travel: 'fa-plane',
        commitment: 'fa-home',
        achievement: 'fa-trophy',
        celebration: 'fa-gift',
        first: 'fa-star',
        growth: 'fa-seedling',
        other: 'fa-heart-circle-plus'
    };
    return icons[category] || 'fa-heart';
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// =========================================================================
// NAVIGATION
// =========================================================================

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item a');
    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            navItems.forEach(nav => nav.parentElement.classList.remove('active'));
            this.parentElement.classList.add('active');
        });
    });
}

// =========================================================================
// STORAGE EVENT HANDLER
// =========================================================================

function handleStorageUpdate(event) {
    console.log('Storage updated, refreshing dashboard...');
    if (document.querySelector('.welcome-card')) {
        loadDashboardData();
    }
}

// =========================================================================
// MILESTONE ACTIONS (called from other pages)
// =========================================================================

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

function duplicateMilestone(milestoneId) {
    const milestone = Storage.getMilestoneById(milestoneId);
    if (!milestone) return;

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

// =========================================================================
// EXPORT / IMPORT
// =========================================================================

function exportData() {
    const data = Storage.exportData();
    if (!data) {
        alert('Error exporting data.');
        return;
    }

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

function deleteAllMilestones() {
    if (confirm('⚠️ WARNING: This will delete ALL milestones and cannot be undone. Are you absolutely sure?')) {
        if (confirm('⚠️ DOUBLE CONFIRM: This action cannot be reversed. Type "DELETE ALL" to confirm.')) {
            const confirmation = prompt('Type "DELETE ALL" to confirm deletion:');
            if (confirmation === 'DELETE ALL') {
                Storage.createBackup();
                localStorage.removeItem(Storage.KEYS.MILESTONES);
                Storage.triggerStorageEvent();
                alert('All milestones have been deleted. A backup has been created.');
                window.location.reload();
            }
        }
    }
}

// =========================================================================
// LEGACY NOTIFICATION FUNCTIONS
// =========================================================================

function checkForNotifications() {
    const settings = Storage.getSettings();
    if (!settings.notifications) return;

    const upcoming = Storage.getUpcomingMilestones(7);
    upcoming.forEach(milestone => {
        const milestoneDate = new Date(milestone.date);
        const nextDate = Storage.getNextOccurrence(milestoneDate);
        const today = new Date();
        const daysDiff = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) {
            showNotification(`Tomorrow: ${milestone.title}!`);
        }
    });
}

function showNotification(message) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
        new Notification("LoveLine Reminder", {
            body: message,
            icon: "assets/icons/notification-icon.png"
        });
    } else if (Notification.permission !== "denied") {
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

// =========================================================================
// SEARCH & FILTER MODULE
// =========================================================================

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
        if (!document.getElementById('searchInput')) return;
        console.log('SearchFilter initialized');
        this.setupSearchListeners();
        this.loadSavedFilters();
    },

    setupSearchListeners() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.searchQuery = e.target.value;
                this.performSearch();
                this.saveFilters();
            });
        }

        const clearSearch = document.getElementById('clearSearch');
        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                this.currentFilters.searchQuery = '';
                this.performSearch();
                this.saveFilters();
            });
        }

        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentFilters.category = e.target.value;
                this.performSearch();
                this.saveFilters();
            });
        }

        const dateFilter = document.getElementById('dateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.currentFilters.dateRange = e.target.value;
                const customRange = document.getElementById('customDateRange');
                if (customRange) customRange.style.display = e.target.value === 'custom' ? 'block' : 'none';
                if (e.target.value !== 'custom') {
                    this.performSearch();
                    this.saveFilters();
                }
            });
        }

        const dateFrom = document.getElementById('dateFrom');
        const dateTo = document.getElementById('dateTo');
        if (dateFrom && dateTo) {
            dateFrom.addEventListener('change', () => {
                this.currentFilters.customStart = dateFrom.value;
                this.currentFilters.customEnd = dateTo.value;
                this.performSearch();
                this.saveFilters();
            });
            dateTo.addEventListener('change', () => {
                this.currentFilters.customStart = dateFrom.value;
                this.currentFilters.customEnd = dateTo.value;
                this.performSearch();
                this.saveFilters();
            });
        }

        const sortFilter = document.getElementById('sortFilter');
        if (sortFilter) {
            sortFilter.addEventListener('change', (e) => {
                this.currentFilters.sortBy = e.target.value;
                this.performSearch();
                this.saveFilters();
            });
        }

        const applyBtn = document.getElementById('applyFiltersBtn');
        if (applyBtn) applyBtn.addEventListener('click', () => this.performSearch());

        const resetBtn = document.getElementById('resetFiltersBtn');
        if (resetBtn) resetBtn.addEventListener('click', () => this.resetFilters());

        const closeResults = document.getElementById('closeResults');
        if (closeResults) {
            closeResults.addEventListener('click', () => {
                const resultsContainer = document.getElementById('searchResults');
                if (resultsContainer) resultsContainer.style.display = 'none';
                this.resetFilters();
            });
        }

        this.setupQuickFilters();
    },

    setupQuickFilters() {
        const searchContainer = document.querySelector('.search-container');
        if (!searchContainer || searchContainer.querySelector('.filter-chips')) return;

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

        searchContainer.appendChild(quickFiltersContainer);

        quickFiltersContainer.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                quickFiltersContainer.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const category = chip.dataset.category;
                this.currentFilters.category = category;
                const categoryFilter = document.getElementById('categoryFilter');
                if (categoryFilter) categoryFilter.value = category;
                this.performSearch();
                this.saveFilters();
            });
        });
    },

    performSearch() {
        const milestones = Storage.getAllMilestones();
        let results = [...milestones];

        if (this.currentFilters.searchQuery) {
            const query = this.currentFilters.searchQuery.toLowerCase();
            results = results.filter(m =>
                (m.title?.toLowerCase().includes(query)) ||
                (m.description?.toLowerCase().includes(query)) ||
                (m.tags?.some(tag => tag.toLowerCase().includes(query))) ||
                (m.location?.toLowerCase().includes(query))
            );
        }

        if (this.currentFilters.category) {
            results = results.filter(m => m.category === this.currentFilters.category);
        }

        if (this.currentFilters.dateRange !== 'all') {
            const today = new Date();
            let startDate = new Date(today);

            switch (this.currentFilters.dateRange) {
                case 'year': startDate.setFullYear(today.getFullYear() - 1); break;
                case 'month': startDate.setMonth(today.getMonth() - 1); break;
                case 'week': startDate.setDate(today.getDate() - 7); break;
                case 'custom':
                    if (this.currentFilters.customStart && this.currentFilters.customEnd) {
                        const start = new Date(this.currentFilters.customStart);
                        const end = new Date(this.currentFilters.customEnd);
                        results = results.filter(m => {
                            const d = new Date(m.date);
                            return d >= start && d <= end;
                        });
                    }
                    break;
            }

            if (this.currentFilters.dateRange !== 'custom') {
                results = results.filter(m => new Date(m.date) >= startDate);
            }
        }

        results.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            switch (this.currentFilters.sortBy) {
                case 'date-desc': return dateB - dateA;
                case 'date-asc': return dateA - dateB;
                case 'title': return (a.title || '').localeCompare(b.title || '');
                case 'significance':
                    const order = { high: 3, medium: 2, low: 1 };
                    return (order[b.significance] || 2) - (order[a.significance] || 2);
                default: return dateB - dateA;
            }
        });

        this.displaySearchResults(results);
    },

    displaySearchResults(results) {
        const resultsContainer = document.getElementById('searchResults');
        const resultsGrid = document.getElementById('resultsGrid');
        const resultsCount = document.getElementById('resultsCount');
        if (!resultsContainer || !resultsGrid) return;

        const hasActiveFilters = this.currentFilters.searchQuery || this.currentFilters.category || this.currentFilters.dateRange !== 'all';
        if (!hasActiveFilters) {
            resultsContainer.style.display = 'none';
            return;
        }

        resultsContainer.style.display = 'block';
        if (resultsCount) resultsCount.textContent = `${results.length} Result${results.length !== 1 ? 's' : ''}`;

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

        results.forEach(milestone => {
            const card = document.createElement('div');
            card.className = 'result-card';
            const date = new Date(milestone.date);
            const description = milestone.description
                ? milestone.description.substring(0, 150) + (milestone.description.length > 150 ? '...' : '')
                : 'No description';

            card.innerHTML = `
                <div class="result-header">
                    <div>
                        <div class="result-title">${milestone.title}</div>
                        <div class="result-date">${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    </div>
                    <span class="result-category">${this.formatCategory(milestone.category)}</span>
                </div>
                <div class="result-description">${description}</div>
                <div class="result-actions">
                    <a href="milestone-detail.html?id=${milestone.id}" class="btn-icon"><i class="fas fa-eye"></i> View</a>
                    <a href="add-milestone.html?edit=${milestone.id}" class="btn-icon"><i class="fas fa-edit"></i> Edit</a>
                </div>
            `;
            resultsGrid.appendChild(card);
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

        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';

        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) categoryFilter.value = '';

        const dateFilter = document.getElementById('dateFilter');
        if (dateFilter) dateFilter.value = 'all';

        const sortFilter = document.getElementById('sortFilter');
        if (sortFilter) sortFilter.value = 'date-desc';

        const customRange = document.getElementById('customDateRange');
        if (customRange) customRange.style.display = 'none';

        const dateFrom = document.getElementById('dateFrom');
        const dateTo = document.getElementById('dateTo');
        if (dateFrom) dateFrom.value = '';
        if (dateTo) dateTo.value = '';

        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.classList.remove('active');
            if (chip.dataset.category === '') chip.classList.add('active');
        });

        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) resultsContainer.style.display = 'none';

        this.saveFilters();
    },

    loadSavedFilters() {
        const saved = localStorage.getItem('loveLine_filters');
        if (!saved) return;
        try {
            const filters = JSON.parse(saved);
            this.currentFilters = { ...this.currentFilters, ...filters };

            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = this.currentFilters.searchQuery || '';

            const categoryFilter = document.getElementById('categoryFilter');
            if (categoryFilter) categoryFilter.value = this.currentFilters.category || '';

            const dateFilter = document.getElementById('dateFilter');
            if (dateFilter) dateFilter.value = this.currentFilters.dateRange || 'all';

            const sortFilter = document.getElementById('sortFilter');
            if (sortFilter) sortFilter.value = this.currentFilters.sortBy || 'date-desc';

            if (this.currentFilters.dateRange === 'custom') {
                const customRange = document.getElementById('customDateRange');
                if (customRange) customRange.style.display = 'block';
                const dateFrom = document.getElementById('dateFrom');
                const dateTo = document.getElementById('dateTo');
                if (dateFrom) dateFrom.value = this.currentFilters.customStart || '';
                if (dateTo) dateTo.value = this.currentFilters.customEnd || '';
            }

            document.querySelectorAll('.filter-chip').forEach(chip => {
                chip.classList.remove('active');
                if (chip.dataset.category === this.currentFilters.category) chip.classList.add('active');
            });

            if (this.currentFilters.searchQuery || this.currentFilters.category || this.currentFilters.dateRange !== 'all') {
                setTimeout(() => this.performSearch(), 50);
            }
        } catch (e) {
            console.error('Error loading saved filters:', e);
        }
    },

    saveFilters() {
        localStorage.setItem('loveLine_filters', JSON.stringify(this.currentFilters));
    },

    formatCategory(category) {
        if (!category) return '';
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
};

// =========================================================================
// GLOBAL NAMESPACE
// =========================================================================
window.LoveLine = {
    Storage,
    formatDate,
    deleteMilestone,
    duplicateMilestone,
    exportData,
    importData,
    deleteAllMilestones,
    SearchFilter
    // Note: logout is handled by Auth, not exposed here
};