// LOCAL STORAGE MODULE (with multi‑user support) 
const Storage = {
    // Base keys (without username)
    KEYS: {
        MILESTONES: 'loveline_milestones',
        SETTINGS: 'loveline_settings',
        USER_PROFILE: 'loveline_userProfile',
        PHOTOS: 'loveline_photos',
        BACKUPS: 'loveline_backups'
    },

    // Helper to get the full storage key for the current user
    _getKey(baseKey) {
        const user = Auth.getCurrentUser();
        if (!user) {
            console.warn('No user logged in – using default (guest) prefix');
            // For development, fallback to a default key; in production you'd redirect.
            return baseKey + '_guest';
        }
        return `${baseKey}_${user}`;
    },

    // ===== NORMALIZATION =====
    _normalizeMilestone(milestone) {
        if (!milestone) return null;
        return {
            id: milestone.id || this.generateMilestoneId(),
            title: milestone.title || '',
            date: milestone.date || new Date().toISOString().split('T')[0],
            category: milestone.category || 'other',
            description: milestone.description || '',
            significance: milestone.significance || 3,
            createdAt: milestone.createdAt || new Date().toISOString(),
            updatedAt: milestone.updatedAt || new Date().toISOString(),
            backgroundImage: milestone.backgroundImage || null,
            imageAttribution: milestone.imageAttribution || '',
            reminder: {
                enabled: false,
                daysBefore: 7,
                time: '09:00',
                lastTriggered: null,
                ...(milestone.reminder || {})
            },
            photos: milestone.photos || []   // photo objects stored directly
        };
    },

    // ===== MILESTONE OPERATIONS =====
    getAllMilestones() {
        try {
            const key = this._getKey(this.KEYS.MILESTONES);
            const data = localStorage.getItem(key);
            const milestones = data ? JSON.parse(data) : [];
            return milestones.map(m => this._normalizeMilestone(m));
        } catch (error) {
            console.error('Error reading milestones:', error);
            return [];
        }
    },

    getMilestoneById(id) {
        const milestones = this.getAllMilestones();
        return milestones.find(m => m.id === id) || null;
    },

    saveMilestone(milestoneData) {
        try {
            let milestones = this.getAllMilestones();
            const key = this._getKey(this.KEYS.MILESTONES);

            if (milestoneData.id) {
                const index = milestones.findIndex(m => m.id === milestoneData.id);
                if (index !== -1) {
                    const updated = {
                        ...milestones[index],
                        ...milestoneData,
                        updatedAt: new Date().toISOString()
                    };
                    milestones[index] = this._normalizeMilestone(updated);
                } else {
                    throw new Error('Milestone not found');
                }
            } else {
                const newMilestone = this._normalizeMilestone({
                    ...milestoneData,
                    id: this.generateMilestoneId(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                milestones.push(newMilestone);
            }

            localStorage.setItem(key, JSON.stringify(milestones));
            this.triggerStorageEvent();
            return true;
        } catch (error) {
            console.error('Error saving milestone:', error);
            return false;
        }
    },

    deleteMilestone(id) {
        try {
            const milestones = this.getAllMilestones();
            const filtered = milestones.filter(m => m.id !== id);
            const key = this._getKey(this.KEYS.MILESTONES);
            localStorage.setItem(key, JSON.stringify(filtered));
            this.triggerStorageEvent();
            return true;
        } catch (error) {
            console.error('Error deleting milestone:', error);
            return false;
        }
    },

    getMilestonesByDateRange(startDate, endDate) {
        const milestones = this.getAllMilestones();
        return milestones.filter(m => {
            const d = new Date(m.date);
            return d >= startDate && d <= endDate;
        });
    },

    getUpcomingMilestones(days = 30) {
        const milestones = this.getAllMilestones();
        const today = new Date();
        const future = new Date();
        future.setDate(today.getDate() + days);

        return milestones.filter(m => {
            const next = this.getNextOccurrence(new Date(m.date));
            return next >= today && next <= future;
        }).sort((a, b) => {
            const aNext = this.getNextOccurrence(new Date(a.date));
            const bNext = this.getNextOccurrence(new Date(b.date));
            return aNext - bNext;
        });
    },

    getNextOccurrence(originalDate) {
        const today = new Date();
        const next = new Date(originalDate);
        next.setFullYear(today.getFullYear());
        if (next < today) next.setFullYear(today.getFullYear() + 1);
        return next;
    },

    // ===== USER PROFILE OPERATIONS =====
    getUserProfile() {
        try {
            const key = this._getKey(this.KEYS.USER_PROFILE);
            const data = localStorage.getItem(key);
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
            return defaultProfile;
        }
    },

    saveUserProfile(profileData) {
        try {
            const current = this.getUserProfile();
            const updated = { ...current, ...profileData };
            const key = this._getKey(this.KEYS.USER_PROFILE);
            localStorage.setItem(key, JSON.stringify(updated));
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
            const key = this._getKey(this.KEYS.SETTINGS);
            const data = localStorage.getItem(key);
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
            const current = this.getSettings();
            const updated = { ...current, ...settingsData };
            const key = this._getKey(this.KEYS.SETTINGS);
            localStorage.setItem(key, JSON.stringify(updated));
            this.triggerStorageEvent();
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    },

    // ===== PHOTO MANAGEMENT =====
    getPhotoById(photoId) {
        const photos = this.getPhotos();
        return photos.find(p => p.id === photoId) || null;
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
            const key = this._getKey(this.KEYS.PHOTOS);
            localStorage.setItem(key, JSON.stringify(photos));
            return newPhoto.id;
        } catch (error) {
            console.error('Error saving photo:', error);
            return null;
        }
    },

    getPhotos() {
        try {
            const key = this._getKey(this.KEYS.PHOTOS);
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error reading photos:', error);
            return [];
        }
    },

    getPhotosByMilestone(milestoneId) {
        const photos = this.getPhotos();
        return photos.filter(p => p.milestoneId === milestoneId);
    },

    deletePhoto(photoId) {
        try {
            const photos = this.getPhotos();
            const filtered = photos.filter(p => p.id !== photoId);
            const key = this._getKey(this.KEYS.PHOTOS);
            localStorage.setItem(key, JSON.stringify(filtered));
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
        const event = new CustomEvent('storageUpdated', {
            detail: { timestamp: new Date().toISOString() }
        });
        window.dispatchEvent(event);
    },

    // ===== CLEAR SETTINGS =====
    clearSettings() {
        const key = this._getKey(this.KEYS.SETTINGS);
        if (key) localStorage.removeItem(key);
        const profileKey = this._getKey(this.KEYS.USER_PROFILE);
        if (profileKey) localStorage.removeItem(profileKey);
        this.triggerStorageEvent();
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
                version: '1.1.0'
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
            if (!data.milestones || !data.userProfile || !data.settings) {
                throw new Error('Invalid data format');
            }

            const normalizedMilestones = data.milestones.map(m => this._normalizeMilestone(m));

            const milestonesKey = this._getKey(this.KEYS.MILESTONES);
            const profileKey = this._getKey(this.KEYS.USER_PROFILE);
            const settingsKey = this._getKey(this.KEYS.SETTINGS);
            const photosKey = this._getKey(this.KEYS.PHOTOS);

            localStorage.setItem(milestonesKey, JSON.stringify(normalizedMilestones));
            localStorage.setItem(profileKey, JSON.stringify(data.userProfile));
            localStorage.setItem(settingsKey, JSON.stringify(data.settings));
            if (data.photos) {
                localStorage.setItem(photosKey, JSON.stringify(data.photos));
            }

            this.triggerStorageEvent();
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    },

    // ===== STATISTICS =====
    _mapSignificanceToCategory(significance) {
        if (significance <= 2) return 'low';
        if (significance === 3) return 'medium';
        return 'high';
    },

    getStatistics() {
        const milestones = this.getAllMilestones();
        const today = new Date();
        const startOfYear = new Date(today.getFullYear(), 0, 1);

        const stats = {
            totalMilestones: milestones.length,
            milestonesThisYear: milestones.filter(m => {
                const d = new Date(m.date);
                return d >= startOfYear;
            }).length,
            byCategory: {},
            bySignificance: { high: 0, medium: 0, low: 0 },
            upcomingCount: this.getUpcomingMilestones().length,
            averagePerMonth: 0
        };

        milestones.forEach(m => {
            const cat = m.category || 'uncategorized';
            stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;

            const sigCat = this._mapSignificanceToCategory(m.significance);
            stats.bySignificance[sigCat] = (stats.bySignificance[sigCat] || 0) + 1;
        });

        if (milestones.length > 0) {
            const dates = milestones.map(m => new Date(m.date)).sort((a, b) => a - b);
            const first = dates[0];
            const monthsDiff = (today.getFullYear() - first.getFullYear()) * 12 +
                (today.getMonth() - first.getMonth());
            stats.averagePerMonth = monthsDiff > 0 ? (milestones.length / monthsDiff).toFixed(1) : milestones.length;
        }

        return stats;
    },

    // ===== BACKUP MANAGEMENT (per user) =====
    createBackup() {
        try {
            const backup = {
                data: this.exportData(),
                timestamp: new Date().toISOString(),
                backupId: 'backup_' + Date.now()
            };
            const backups = this.getBackups();
            backups.unshift(backup);
            if (backups.length > 5) backups.pop();
            const key = this._getKey(this.KEYS.BACKUPS);
            localStorage.setItem(key, JSON.stringify(backups));
            return backup.backupId;
        } catch (error) {
            console.error('Error creating backup:', error);
            return null;
        }
    },

    getBackups() {
        try {
            const key = this._getKey(this.KEYS.BACKUPS);
            const data = localStorage.getItem(key);
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
            if (!backup) throw new Error('Backup not found');
            return this.importData(backup.data);
        } catch (error) {
            console.error('Error restoring backup:', error);
            return false;
        }
    }
};

window.Storage = Storage;