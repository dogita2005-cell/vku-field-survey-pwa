// 1. Đăng ký Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker đã đăng ký thành công:', reg.scope))
            .catch(err => console.error('Lỗi đăng ký Service Worker:', err));
    });
}

// 2. Thiết lập IndexedDB để lưu nháp Offline
let db;
const request = indexedDB.open('VKUSurveyDB', 1);

request.onupgradeneeded = (event) => {
    db = event.target.result;
    // Tạo Object Store tên là 'offline_surveys'
    if (!db.objectStoreNames.contains('offline_surveys')) {
        db.createObjectStore('offline_surveys', { keyPath: 'id', autoIncrement: true });
    }
};

request.onsuccess = (event) => {
    db = event.target.result;
    console.log('IndexedDB đã sẵn sàng.');
};

request.onerror = (event) => {
    console.error('Lỗi mở IndexedDB:', event.target.error);
};

// 3. Bắt sự kiện Submit Form
const form = document.getElementById('surveyForm');
const statusMsg = document.getElementById('statusMessage');

form.addEventListener('submit', (e) => {
    e.preventDefault(); // Ngăn trình duyệt load lại trang

    // Thu thập dữ liệu từ form
    const surveyData = {
        room: document.getElementById('room').value,
        status: document.getElementById('status').value,
        notes: document.getElementById('notes').value,
        timestamp: new Date().toISOString()
    };

    // Kiểm tra mạng
    if (navigator.onLine) {
        // Đang có mạng -> Gửi thẳng lên server (ở đây giả lập bằng console.log)
        console.log('Đã gửi lên server:', surveyData);
        statusMsg.textContent = 'Đã gửi thành công (Online)!';
        statusMsg.style.color = 'green';
        form.reset();
    } else {
        // Mất mạng -> Lưu vào IndexedDB
        saveOfflineData(surveyData);
    }
});

// Hàm lưu dữ liệu vào IndexedDB
function saveOfflineData(data) {
    const transaction = db.transaction(['offline_surveys'], 'readwrite');
    const store = transaction.objectStore('offline_surveys');
    
    const addRequest = store.add(data);

    addRequest.onsuccess = () => {
        statusMsg.textContent = 'Mất mạng! Khảo sát đã được lưu nháp ngoại tuyến.';
        statusMsg.style.color = '#d97706'; // Màu cam cảnh báo
        form.reset();
    };

    addRequest.onerror = (err) => {
        console.error('Lỗi lưu offline:', err);
    };
}
// Lắng nghe sự kiện khi có mạng trở lại
window.addEventListener('online', () => {
    console.log('Đã kết nối mạng lại! Đang đồng bộ dữ liệu...');
    statusMsg.textContent = 'Đã kết nối mạng! Đang đồng bộ dữ liệu...';
    statusMsg.style.color = 'blue';
    
    // Gọi hàm đồng bộ
    syncOfflineData();
});
function syncOfflineData() {
    if (!db) return; // Nếu database chưa khởi tạo xong thì bỏ qua

    const transaction = db.transaction(['offline_surveys'], 'readonly');
    const store = transaction.objectStore('offline_surveys');
    
    // Lấy tất cả dữ liệu trong store
    const request = store.getAll(); 

    request.onsuccess = (event) => {
        const surveys = event.target.result;
        
        if (surveys.length === 0) {
            console.log('Không có dữ liệu offline nào cần đồng bộ.');
            return;
        }

        // Duyệt qua từng bản ghi để gửi lên server
        surveys.forEach(survey => {
            sendToServerAndCleanUp(survey);
        });
    };
}
function sendToServerAndCleanUp(survey) {
    // GIẢ LẬP GỬI SERVER: Trong thực tế, bạn sẽ dùng fetch() gọi API ở đây
    // fetch('https://api.vku.udn.vn/surveys', { method: 'POST', body: JSON.stringify(survey) })
    console.log('Đang đồng bộ dữ liệu lên server:', survey);

    // Giả lập độ trễ mạng 1 giây để dễ quan sát, sau đó tiến hành xóa
    setTimeout(() => {
        const transaction = db.transaction(['offline_surveys'], 'readwrite');
        const store = transaction.objectStore('offline_surveys');
        
        // Xóa bản ghi dựa vào ID khóa chính
        const deleteRequest = store.delete(survey.id);

        deleteRequest.onsuccess = () => {
            console.log(`Đã đồng bộ và xóa bản nháp (ID: ${survey.id}).`);
            statusMsg.textContent = 'Đã đồng bộ tất cả dữ liệu offline thành công!';
            statusMsg.style.color = 'green';
        };
    }, 1000);
}