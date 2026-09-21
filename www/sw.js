const CACHE_NAME = 'vku-interview-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json'
];

// Sự kiện Install: Pre-cache toàn bộ App Shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Đang pre-cache tài nguyên lõi cho App Phỏng vấn...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
    self.skipWaiting(); // Ép Service Worker mới kích hoạt ngay lập tức
});

// Sự kiện Activate: Dọn dẹp các phiên bản cache cũ (nếu có update)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Đang xóa cache cũ:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Bắt đầu kiểm soát các trang đang mở ngay lập tức
});

// Sự kiện Fetch: Chiến lược Cache-First (Ưu tiên Cache, nếu không có mới gọi Network)
self.addEventListener('fetch', event => {
    // Bỏ qua các request gọi API (Google Sheets) hoặc extension của trình duyệt
    if (event.request.url.startsWith('http') && !event.request.url.includes('google')) {
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    // Nếu tìm thấy file trong cache, trả về file đó. Nếu không, tải qua mạng.
                    return cachedResponse || fetch(event.request);
                })
        );
    }
});