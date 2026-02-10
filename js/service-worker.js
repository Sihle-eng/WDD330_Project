// ===== SERVICE WORKER FOR PUSH NOTIFICATIONS =====

const CACHE_NAME = 'loveline-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/countdown.html',
    '/css/styles.css',
    '/css/countdown.css',
    '/js/storage.js',
    '/js/countdown.js',
    '/assets/icons/notification-icon.png'
];

// Install event
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activate event
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

// Push notification event
self.addEventListener('push', event => {
    let data = {};

    if (event.data) {
        data = event.data.json();
    }

    const options = {
        body: data.body || 'New notification from LoveLine',
        icon: data.icon || '/assets/icons/notification-icon.png',
        badge: '/assets/icons/badge-icon.png',
        tag: data.tag || 'loveline-push',
        data: data.data || { url: '/' },
        actions: data.actions || [
            {
                action: 'view',
                title: 'View'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'LoveLine', options)
    );
});

// Notification click event
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'view') {
        const urlToOpen = event.notification.data.url || '/';

        event.waitUntil(
            clients.matchAll({
                type: 'window',
                includeUncontrolled: true
            }).then(windowClients => {
                // Check if there's already a window/tab open with the target URL
                for (let i = 0; i < windowClients.length; i++) {
                    const client = windowClients[i];
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                // If not, open a new window/tab
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
        );
    }
});

// Background sync for offline functionality
self.addEventListener('sync', event => {
    if (event.tag === 'sync-milestones') {
        event.waitUntil(syncMilestones());
    }
});

async function syncMilestones() {
    // This function would sync local changes with a server
    // For now, it's a placeholder for future offline functionality
    console.log('Syncing milestones...');
}