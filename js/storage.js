// ===== LOCAL STORAGE MODULE =====
const Storage = {
    // Keys for localStorage
    KEYS: {
        MILESTONES: 'loveLine_milestones',
        SETTINGS: 'loveLine_settings',
        USER_PROFILE: 'loveLine_userProfile',
        PHOTOS: 'loveLine_photos'
    },

    // ===== MILESTONE OPERATIONS =====

    // Get all milestones
    getAllMilestones() {
        try {
            const data = localStorage.getItem(this.KEYS.MILESTONES);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error reading milestones:', error);
            return [];
        }
    },

    // Get milestone by ID
    getMilestoneById(id) {
        const milestones = this.getAllMilestones();
        return milestones.find(milestone => milestone.id === id);
    },

    // Save milestone (create or update)
    saveMilestone(milestoneData) {
        try {
            const milestones = this.getAllMilestones();

            if (milestoneData.id) {
                // Update existing milestone
                const index = milestones.findIndex(m => m.id === milestoneData.id);
                if (index !== -1) {
                    milestoneData.updatedAt = new Date().toISOString();
                    milestones[index] = { ...milestones[index], ...milestoneData };
                } else {
                    throw new Error('Milestone not found');
                }
            } else {
                // Create new milestone
                const newMilestone = {
                    ...milestoneData,
                    id: this.generateMilestoneId(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                milestones.push(newMilestone);
            }

            localStorage.setItem(this.KEYS.MILESTONES, JSON.stringify(milestones));
            this.triggerStorageEvent();
            return true;
        } catch (error) {
            console.error('Error saving milestone:', error);
            return false;
        }
    },

    // Delete milestone
    deleteMilestone(id) {
        try {
            const milestones = this.getAllMilestones();
            const filteredMilestones = milestones.filter(milestone => milestone.id !== id);
            localStorage.setItem(this.KEYS.MILESTONES, JSON.stringify(filteredMilestones));
            this.triggerStorageEvent();
            return true;
        } catch (error) {
            console.error('Error deleting milestone:', error);
            return false;
        }
    },

    // Get milestones by date range
    getMilestonesByDateRange(startDate, endDate) {
        const milestones = this.getAllMilestones();
        return milestones.filter(milestone => {
            const milestoneDate = new Date(milestone.date);
            return milestoneDate >= startDate && milestoneDate <= endDate;
        });
    },

    // Get upcoming milestones (next 30 days)
    getUpcomingMilestones(days = 30) {
        const milestones = this.getAllMilestones();
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + days);

        return milestones.filter(milestone => {
            const milestoneDate = new Date(milestone.date);
            const nextOccurrence = this.getNextOccurrence(milestoneDate);
            return nextOccurrence >= today && nextOccurrence <= futureDate;
        }).sort((a, b) => {
            const dateA = this.getNextOccurrence(new Date(a.date));
            const dateB = this.getNextOccurrence(new Date(b.date));
            return dateA - dateB;
        });
    },

    // Get next occurrence of an annual milestone
    getNextOccurrence(originalDate) {
        const today = new Date();
        const currentYear = today.getFullYear();
        const milestoneDate = new Date(originalDate);

        // Set to current year
        milestoneDate.setFullYear(currentYear);

        // If already passed this year, set to next year
        if (milestoneDate < today) {
            milestoneDate.setFullYear(currentYear + 1);
        }

        return milestoneDate;
    },

    // ===== USER PROFILE OPERATIONS =====

    getUserProfile() {
        try {
            const data = localStorage.getItem(this.KEYS.USER_PROFILE);
            const defaultProfile = {
                coupleName: 'Lovebirds',
                anniversaryDate: new Date().toISOString().split('T')[0],
                partnerNames: ['Partner 1', 'Partner 2'],
                theme: 'default',
                notificationEnabled: true,
                notificationTime: '09:00'
            };
            return data ? { ...defaultProfile, ...JSON.parse(data) } : defaultProfile;
        } catch (error) {
            console.error('Error reading user profile:', error);
            return null;
        }
    },

    saveUserProfile(profileData) {
        try {
            const currentProfile = this.getUserProfile();
            const updatedProfile = { ...currentProfile, ...profileData };
            localStorage.setItem(this.KEYS.USER_PROFILE, JSON.stringify(updatedProfile));
            this.triggerStorageEvent();
            return true;
        } catch (error) {
            console.error('Error saving user profile:', error);
            return false;
        }
    },

    // ===== SETTINGS OPERATIONS =====

    getSettings() {
        try {
            const data = localStorage.getItem(this.KEYS.SETTINGS);
            const defaultSettings = {
                theme: 'light',
                notifications: true,
                notificationSound: 'gentle',
                autoBackup: false,
                showDaysTogether: true,
                celebrateAnniversaries: true,
                country: 'US',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };
            return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
        } catch (error) {
            console.error('Error reading settings:', error);
            return defaultSettings;
        }
    },

    saveSettings(settingsData) {
        try {
            const currentSettings = this.getSettings();
            const updatedSettings = { ...currentSettings, ...settingsData };
            localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(updatedSettings));
            this.triggerStorageEvent();
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    },

    // ===== PHOTO MANAGEMENT =====
    // Get photo by ID
    getPhotoById(photoId) {
        const photos = this.getPhotos();
        return photos.find(photo => photo.id === photoId) || null;
    },

    savePhoto(photoData) {
        try {
            const photos = this.getPhotos();
            const newPhoto = {
                ...photoData,
                id: this.generatePhotoId(),
                uploadedAt: new Date().toISOString()
            };
            photos.push(newPhoto);
            localStorage.setItem(this.KEYS.PHOTOS, JSON.stringify(photos));
            return newPhoto.id;
        } catch (error) {
            console.error('Error saving photo:', error);
            return null;
        }
    },

    getPhotos() {
        try {
            const data = localStorage.getItem(this.KEYS.PHOTOS);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error reading photos:', error);
            return [];
        }
    },

    getPhotosByMilestone(milestoneId) {
        const photos = this.getPhotos();
        return photos.filter(photo => photo.milestoneId === milestoneId);
    },

    deletePhoto(photoId) {
        try {
            const photos = this.getPhotos();
            const filteredPhotos = photos.filter(photo => photo.id !== photoId);
            localStorage.setItem(this.KEYS.PHOTOS, JSON.stringify(filteredPhotos));
            return true;
        } catch (error) {
            console.error('Error deleting photo:', error);
            return false;
        }
    },

    // ===== UTILITY FUNCTIONS =====

    generateMilestoneId() {
        return 'milestone_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    generatePhotoId() {
        return 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    triggerStorageEvent() {
        // Create and dispatch a custom event when storage changes
        const event = new CustomEvent('storageUpdated', {
            detail: { timestamp: new Date().toISOString() }
        });
        window.dispatchEvent(event);
    },

    // ===== DATA EXPORT/IMPORT =====

    exportData() {
        try {
            const data = {
                milestones: this.getAllMilestones(),
                userProfile: this.getUserProfile(),
                settings: this.getSettings(),
                photos: this.getPhotos(),
                exportDate: new Date().toISOString(),
                version: '1.0.0'
            };
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('Error exporting data:', error);
            return null;
        }
    },

    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);

            // Validate the data structure
            if (!data.milestones || !data.userProfile || !data.settings) {
                throw new Error('Invalid data format');
            }

            // Save each data type
            localStorage.setItem(this.KEYS.MILESTONES, JSON.stringify(data.milestones));
            localStorage.setItem(this.KEYS.USER_PROFILE, JSON.stringify(data.userProfile));
            localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(data.settings));

            if (data.photos) {
                localStorage.setItem(this.KEYS.PHOTOS, JSON.stringify(data.photos));
            }

            this.triggerStorageEvent();
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    },

    // ===== STATISTICS =====

    getStatistics() {
        const milestones = this.getAllMilestones();
        const today = new Date();
        const startOfYear = new Date(today.getFullYear(), 0, 1);

        const stats = {
            totalMilestones: milestones.length,
            milestonesThisYear: milestones.filter(m => {
                const milestoneDate = new Date(m.date);
                return milestoneDate >= startOfYear;
            }).length,
            byCategory: {},
            bySignificance: {
                high: 0,
                medium: 0,
                low: 0
            },
            upcomingCount: this.getUpcomingMilestones().length,
            averagePerMonth: 0
        };

        // Calculate category breakdown
        milestones.forEach(milestone => {
            // Category stats
            const category = milestone.category || 'uncategorized';
            stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

            // Significance stats
            const significance = milestone.significance || 'medium';
            stats.bySignificance[significance] = (stats.bySignificance[significance] || 0) + 1;
        });

        // Calculate average per month
        if (milestones.length > 0) {
            const dates = milestones.map(m => new Date(m.date)).sort((a, b) => a - b);
            const firstDate = dates[0];
            const monthsDiff = (today.getFullYear() - firstDate.getFullYear()) * 12 +
                (today.getMonth() - firstDate.getMonth());
            stats.averagePerMonth = monthsDiff > 0 ? (milestones.length / monthsDiff).toFixed(1) : milestones.length;
        }

        return stats;
    },

    // ===== BACKUP MANAGEMENT =====

    createBackup() {
        try {
            const backup = {
                data: this.exportData(),
                timestamp: new Date().toISOString(),
                backupId: 'backup_' + Date.now()
            };

            // Store last 5 backups
            const backups = this.getBackups();
            backups.unshift(backup);

            // Keep only 5 most recent backups
            if (backups.length > 5) {
                backups.pop();
            }

            localStorage.setItem('loveLine_backups', JSON.stringify(backups));
            return backup.backupId;
        } catch (error) {
            console.error('Error creating backup:', error);
            return null;
        }
    },

    getBackups() {
        try {
            const data = localStorage.getItem('loveLine_backups');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error reading backups:', error);
            return [];
        }
    },

    restoreBackup(backupId) {
        try {
            const backups = this.getBackups();
            const backup = backups.find(b => b.backupId === backupId);

            if (!backup) {
                throw new Error('Backup not found');
            }

            return this.importData(backup.data);
        } catch (error) {
            console.error('Error restoring backup:', error);
            return false;
        }
    }
};

// Make Storage available globally
window.Storage = Storage;


