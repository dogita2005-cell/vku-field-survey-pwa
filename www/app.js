// Bọc toàn bộ code để đảm bảo HTML đã tải xong 100% mới bắt đầu gắn sự kiện
document.addEventListener('DOMContentLoaded', () => {

    // Khởi tạo Google Auth an toàn
    if (window.Capacitor && Capacitor.Plugins.GoogleAuth) {
        Capacitor.Plugins.GoogleAuth.initialize();
    }

    // --- HÀM BẮN THÔNG BÁO ĐẨY ---
// --- HÀM BẮN THÔNG BÁO ĐẨY ĐÃ SỬA CHUẨN XÁC CHO ANDROID ---
    async function triggerNotification(title, bodyText) {
        try {
            if (window.Capacitor && Capacitor.Plugins.LocalNotifications) {
                // 1. Xin quyền thông báo
                const permStatus = await Capacitor.Plugins.LocalNotifications.requestPermissions();
                if (permStatus.display !== 'granted') {
                    console.log('Người dùng chưa cấp quyền thông báo!');
                    return;
                }

                // 2. Tạo kênh thông báo mặc định cho Android (Bắt buộc phải có từ Android 8+)
                try {
                    await Capacitor.Plugins.LocalNotifications.createChannel({
                        id: 'default_channel',
                        name: 'Thông báo khảo sát',
                        importance: 5, // Mức độ quan trọng cao nhất để nổ chuông/banner
                        visibility: 1,
                        sound: 'default'
                    });
                } catch (e) {
                    console.log('Kênh thông báo có thể đã tồn tại:', e);
                }

                // 3. Tiến hành bắn thông báo ngay lập tức
                await Capacitor.Plugins.LocalNotifications.schedule({
                    notifications: [
                        {
                            title: title,
                            body: bodyText,
                            id: new Date().getTime(),
                            channelId: 'default_channel', // Gắn vào kênh đã tạo để Android chịu hiển thị
                            schedule: { at: new Date(new Date().getTime() + 100) }
                        }
                    ]
                });
                console.log('Đã gửi lệnh hiển thị thông báo thành công!');
            }
        } catch (error) {
            console.error('Lỗi khi bắn thông báo:', error);
        }
    }
    // 1. Nút Đăng nhập Google
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            try {
                const user = await Capacitor.Plugins.GoogleAuth.signIn();
                const userName = user.name || user.displayName || user.email;
                alert('Xin chào ' + userName + '!');
            } catch (error) {
                console.error('Lỗi đăng nhập Google:', error);
                alert('Đăng nhập thất bại. Xem chi tiết trong console.');
            }
        });
    }

    // 2. Đăng ký Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker đã đăng ký thành công'))
            .catch(err => console.error('Lỗi đăng ký Service Worker:', err));
    }

    // 3. Nút Xử lý Vị trí (GPS)
    const locationInput = document.getElementById('locationData');
    const getLocationBtn = document.getElementById('getLocationBtn');
    
    if (getLocationBtn && locationInput) {
        getLocationBtn.addEventListener('click', async () => {
            locationInput.value = 'Đang lấy tọa độ...';
            try {
                if (window.Capacitor && Capacitor.Plugins.Geolocation) {
                    await Capacitor.Plugins.Geolocation.requestPermissions();
                    const coordinates = await Capacitor.Plugins.Geolocation.getCurrentPosition({
                        enableHighAccuracy: true,
                        timeout: 10000
                    });
                    locationInput.value = `${coordinates.coords.latitude}, ${coordinates.coords.longitude}`;
                } else {
                    alert('Lỗi: Chưa tải được Plugin GPS của Capacitor!');
                }
            } catch (error) {
                console.error('Lỗi GPS:', error);
                locationInput.value = 'Không thể lấy vị trí';
                alert('Vui lòng bật Định vị (GPS) trên điện thoại và cấp quyền.');
            }
        });
    }

    // 4. Nút Xử lý Ảnh Chụp Bằng Capacitor (Đã bật lưu Gallery)
    let photoBase64 = "";
    const cameraBtn = document.getElementById('cameraInput'); 
    const photoPreview = document.getElementById('photoPreview');
    
    if (cameraBtn && photoPreview) {
        cameraBtn.addEventListener('click', async (e) => {
            e.preventDefault(); 
            try {
                if (window.Capacitor && Capacitor.Plugins.Camera) {
                    const image = await Capacitor.Plugins.Camera.getPhoto({
                        quality: 85,
                        allowEditing: false,
                        resultType: 'base64', 
                        source: 'CAMERA',     
                        saveToGallery: true   // LƯU ẢNH VÀO BỘ SƯU TẬP ĐIỆN THOẠI
                    });
                    photoBase64 = 'data:image/jpeg;base64,' + image.base64String;
                    photoPreview.src = photoBase64;
                    photoPreview.style.display = 'block';
                } else {
                    alert('Lỗi: Chưa tải được Plugin Camera của Capacitor!');
                }
            } catch (error) {
                console.error('Lỗi khi chụp ảnh bằng Capacitor:', error);
            }
        });
    }

    // 5. Cấu hình Google Apps Script Endpoint
    const GOOGLE_SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbwKaUGOE6IksSEoIgWGy6SKUsY3NT_ORGlngkT045Hft9rp9L2w6h7sOblqG6nQvsbkRg/exec';

    // 6. Thiết lập IndexedDB để lưu nháp Offline
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

    // 7. Xử lý Gửi Form
    const form = document.getElementById('interviewForm');
    const statusMsg = document.getElementById('statusMessage');

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const surveyData = {
                sessionName: document.getElementById('sessionName').value,
                interviewTime: document.getElementById('interviewTime').value,
                interviewer: document.getElementById('interviewer').value,
                interviewee: document.getElementById('interviewee').value,
                qaContent: document.getElementById('qaContent').value,
                location: locationInput ? locationInput.value : '',
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
    }

    // Các hàm phụ trợ
    function sendToServer(data, isDirectSubmit) {
        fetch(GOOGLE_SHEETS_API_URL, {
            method: 'POST',
            mode: 'no-cors', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(data)
        }).then(() => {
            if(statusMsg) {
                statusMsg.textContent = 'Đã gửi báo cáo thành công!';
                statusMsg.style.color = 'green';
            }
            // Bắn thông báo thành công
            triggerNotification("Thành công! 🎉", "Đã gửi dữ liệu phỏng vấn lên Google Sheets.");
            if (isDirectSubmit) resetForm();
        }).catch(err => {
            console.error('Lỗi khi gửi API:', err);
            saveOfflineData(data);
        });
    }

    function saveOfflineData(data) {
        if(!db) return;
        const transaction = db.transaction(['offline_surveys'], 'readwrite');
        const store = transaction.objectStore('offline_surveys');
        store.add(data).onsuccess = () => {
            if(statusMsg) {
                statusMsg.textContent = 'Mất mạng! Dữ liệu đã lưu nháp vào thiết bị.';
                statusMsg.style.color = '#d97706';
            }
            // Bắn thông báo lưu nháp offline
            triggerNotification("Đã lưu nháp 📱", "Mất kết nối mạng. Dữ liệu đã được lưu trữ trên thiết bị.");
            resetForm();
        };
    }

    function resetForm() {
        if(form) form.reset();
        document.getElementById('interviewTime').value = '';
        document.getElementById('interviewee').value = '';
        if(locationInput) locationInput.value = '';
        photoBase64 = '';
        if(photoPreview) {
            photoPreview.style.display = 'none';
            photoPreview.src = '';
        }
    }

    // 8. Xử lý Đồng bộ khi có mạng trở lại
    window.addEventListener('online', () => {
        if(statusMsg) {
            statusMsg.textContent = 'Đã kết nối mạng! Đang đồng bộ dữ liệu...';
            statusMsg.style.color = 'blue';
        }
        syncOfflineData();
    });

    function syncOfflineData() {
        if (!db) return;
        const transaction = db.transaction(['offline_surveys'], 'readonly');
        const store = transaction.objectStore('offline_surveys');
        
        store.getAll().onsuccess = (event) => {
            const surveys = event.target.result;
            if (surveys.length === 0) return;
            surveys.forEach(survey => syncToServerAndCleanUp(survey));
        };
    }

    function syncToServerAndCleanUp(survey) {
        fetch(GOOGLE_SHEETS_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(survey)
        }).then(() => {
            deleteFromIndexedDB(survey.id);
        }).catch(err => console.error('Lỗi đồng bộ:', err));
    }

    function deleteFromIndexedDB(id) {
        const transaction = db.transaction(['offline_surveys'], 'readwrite');
        transaction.objectStore('offline_surveys').delete(id).onsuccess = () => {
            if(statusMsg) {
                statusMsg.textContent = 'Đã đồng bộ toàn bộ dữ liệu offline thành công!';
                statusMsg.style.color = 'green';
            }
            triggerNotification("Đồng bộ thành công 🔄", "Dữ liệu nháp đã được đẩy lên hệ thống.");
        };
    }
});