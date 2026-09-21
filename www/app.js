// 1. Đăng ký Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker đã đăng ký thành công'))
            .catch(err => console.error('Lỗi đăng ký Service Worker:', err));
    });
}

// 2. Thiết lập IndexedDB để lưu nháp Offline
let db;
const request = indexedDB.open('VKUInterviewDB', 1);

request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains('offline_surveys')) {
        db.createObjectStore('offline_surveys', { keyPath: 'id', autoIncrement: true });
    }
};

request.onsuccess = (event) => {
    db = event.target.result;
};

// 3. Xử lý Vị trí (GPS)
const locationInput = document.getElementById('locationData');
document.getElementById('getLocationBtn').addEventListener('click', () => {
    if (!navigator.geolocation) {
        alert('Trình duyệt của bạn không hỗ trợ GPS');
        return;
    }
    locationInput.value = 'Đang lấy tọa độ...';
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            locationInput.value = `${position.coords.latitude}, ${position.coords.longitude}`;
        },
        (error) => {
            console.error('Lỗi GPS:', error);
            locationInput.value = 'Không thể lấy vị trí';
            alert('Vui lòng bật định vị và cấp quyền cho trình duyệt.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
});

// 4. Xử lý Ảnh Chụp (Chuyển đổi thành Base64)
let photoBase64 = "";
const cameraInput = document.getElementById('cameraInput');
const photoPreview = document.getElementById('photoPreview');

cameraInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            photoBase64 = event.target.result;
            photoPreview.src = photoBase64;
            photoPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

// 5. Cấu hình Google Apps Script Endpoint
const GOOGLE_SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbwKaUGOE6IksSEoIgWGy6SKUsY3NT_ORGlngkT045Hft9rp9L2w6h7sOblqG6nQvsbkRg/exec';

// 6. Xử lý Gửi Form
const form = document.getElementById('interviewForm');
const statusMsg = document.getElementById('statusMessage');

form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Đã cập nhật ĐẦY ĐỦ các trường mới ở đây
    const surveyData = {
        sessionName: document.getElementById('sessionName').value,
        interviewTime: document.getElementById('interviewTime').value,
        interviewer: document.getElementById('interviewer').value,
        interviewee: document.getElementById('interviewee').value,
        qaContent: document.getElementById('qaContent').value,
        location: locationInput.value,
        photo: photoBase64,
        timestamp: new Date().toISOString()
    };

    if (navigator.onLine) {
        statusMsg.textContent = 'Đang gửi dữ liệu lên server...';
        statusMsg.style.color = 'blue';
        sendToServer(surveyData, true);
    } else {
        saveOfflineData(surveyData);
    }
});

// Hàm gửi trực tiếp lên Server (Google Sheets)
function sendToServer(data, isDirectSubmit) {
    fetch(GOOGLE_SHEETS_API_URL, {
        method: 'POST',
        mode: 'no-cors', 
        // Đã sửa thành text/plain để vượt tường lửa trình duyệt
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data)
    }).then(() => {
        statusMsg.textContent = 'Đã gửi báo cáo thành công!';
        statusMsg.style.color = 'green';
        if (isDirectSubmit) resetForm();
    }).catch(err => {
        console.error('Lỗi khi gửi API:', err);
        saveOfflineData(data);
    });
}

// Hàm lưu nháp vào IndexedDB khi Offline
function saveOfflineData(data) {
    const transaction = db.transaction(['offline_surveys'], 'readwrite');
    const store = transaction.objectStore('offline_surveys');
    
    store.add(data).onsuccess = () => {
        statusMsg.textContent = 'Mất mạng! Dữ liệu đã lưu nháp vào thiết bị.';
        statusMsg.style.color = '#d97706';
        resetForm();
    };
}

// Làm sạch form sau khi ghi nhận (Đã gộp chung các trường mới)
function resetForm() {
    form.reset();
    document.getElementById('interviewTime').value = '';
    document.getElementById('interviewee').value = '';
    locationInput.value = '';
    photoBase64 = '';
    photoPreview.style.display = 'none';
    photoPreview.src = '';
}

// 7. Xử lý Đồng bộ khi có mạng trở lại
window.addEventListener('online', () => {
    statusMsg.textContent = 'Đã kết nối mạng! Đang đồng bộ dữ liệu...';
    statusMsg.style.color = 'blue';
    syncOfflineData();
});

function syncOfflineData() {
    if (!db) return;

    const transaction = db.transaction(['offline_surveys'], 'readonly');
    const store = transaction.objectStore('offline_surveys');
    
    store.getAll().onsuccess = (event) => {
        const surveys = event.target.result;
        if (surveys.length === 0) return;

        surveys.forEach(survey => {
            syncToServerAndCleanUp(survey);
        });
    };
}

function syncToServerAndCleanUp(survey) {
    fetch(GOOGLE_SHEETS_API_URL, {
        method: 'POST',
        mode: 'no-cors',
        // Đã sửa thành text/plain
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(survey)
    }).then(() => {
        deleteFromIndexedDB(survey.id);
    }).catch(err => console.error('Lỗi đồng bộ:', err));
}

function deleteFromIndexedDB(id) {
    const transaction = db.transaction(['offline_surveys'], 'readwrite');
    transaction.objectStore('offline_surveys').delete(id).onsuccess = () => {
        statusMsg.textContent = 'Đã đồng bộ toàn bộ dữ liệu offline thành công!';
        statusMsg.style.color = 'green';
    };
}