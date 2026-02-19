// User authentication with password validation

const Auth = {
    CURRENT_USER_KEY: 'loveline_currentUser',
    USERS_KEY: 'loveline_users', // stores { username: passwordHash }

    // Simple hash function (demo only – use bcrypt in production!)
    _hashPassword(password) {
        // In production, use a proper hashing algorithm with salt.
        // This base64 encoding is NOT secure – it's just for demonstration.
        return btoa(password);
    },

    // Check if a user is logged in
    isLoggedIn() {
        return !!localStorage.getItem(this.CURRENT_USER_KEY);
    },

    // Get current username
    getCurrentUser() {
        return localStorage.getItem(this.CURRENT_USER_KEY);
    },

    // Login or register with username, password, and confirmation
    login(username, password, confirmPassword) {
        // Trim and validate inputs
        if (!username || username.trim() === '') {
            alert('Please enter a username.');
            return false;
        }
        username = username.trim().toLowerCase();

        // Password validation
        if (!password || password.length < 8) {
            alert('Password must be at least 8 characters long.');
            return false;
        }
        if (password !== confirmPassword) {
            alert('Passwords do not match.');
            return false;
        }

        const hashed = this._hashPassword(password);
        const users = this._getUsers();

        if (users[username]) {
            // Existing user – verify password
            if (users[username] !== hashed) {
                alert('Invalid password.');
                return false;
            }
        } else {
            // New user – create account
            users[username] = hashed;
            this._saveUsers(users);
            this.initializeNewUser(username);
        }

        // Set current user
        localStorage.setItem(this.CURRENT_USER_KEY, username);
        return true;
    },

    // Get users object from localStorage
    _getUsers() {
        const data = localStorage.getItem(this.USERS_KEY);
        return data ? JSON.parse(data) : {};
    },

    // Save users object
    _saveUsers(users) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    },

    // Initialize default data for a new user
    initializeNewUser(username) {
        // Profile
        localStorage.setItem(`loveline_profile_${username}`, JSON.stringify({
            coupleName: '',
            anniversaryDate: ''
        }));
        // Settings
        localStorage.setItem(`loveline_settings_${username}`, JSON.stringify({
            notifications: false,
            reminderDays: 7,
            theme: 'romance'
        }));
    },

    // Logout
    logout() {
        localStorage.removeItem(this.CURRENT_USER_KEY);
        window.location.href = 'login.html';
    }
};