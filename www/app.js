// Bọc toàn bộ code để đảm bảo HTML đã tải xong 100% mới bắt đầu gắn sự kiện
document.addEventListener('DOMContentLoaded', () => {

    // Khởi tạo Google Auth an toàn
    if (window.Capacitor && Capacitor.Plugins.GoogleAuth) {
        Capacitor.Plugins.GoogleAuth.initialize();
    }

    // --- HÀM BẮN THÔNG BÁO ĐẨY (đã sửa: id 32-bit, bỏ sound, tạo channel mới) ---
    async function triggerNotification(title, bodyText) {
        const LN = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.LocalNotifications;
        if (!LN) {
            console.warn('LocalNotifications không có sẵn trong môi trường hiện tại');
            return;
        }
        try {
            let perm = await LN.checkPermissions();
            if (perm.display !== 'granted') perm = await LN.requestPermissions();
            if (perm.display !== 'granted') {
                console.warn('Người dùng từ chối quyền thông báo');
                return;
            }

            await LN.createChannel({
                id: 'survey_channel',
                name: 'Thông báo khảo sát',
                description: 'Thông báo từ ứng dụng khảo sát',
                importance: 5,
                visibility: 1
            });

            await LN.schedule({
                notifications: [{
                    id: Math.floor(Date.now() / 1000) % 2147483647, // số nguyên 32-bit
                    title,
                    body: bodyText,
                    channelId: 'survey_channel'
                    // không có "schedule" => hiện ngay lập tức
                }]
            });
        } catch (error) {
            console.error('Lỗi khi gửi thông báo:', error);
            alert('Lỗi thông báo: ' + (error.message || JSON.stringify(error))); // xóa dòng này khi đã chạy ổn
        }
    }

    // --- QUẢN LÝ TRẠNG THÁI ĐĂNG NHẬP ---
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const userGreeting = document.getElementById('userGreeting');
    const userNameText = document.getElementById('userNameText');
    const logoutBtn = document.getElementById('logoutBtn');
    let currentUser = null;

    function loadSavedUser() {
        try { return JSON.parse(localStorage.getItem('vku_user')); } catch (e) { return null; }
    }

    function saveUser(user) {
        try {
            if (user) localStorage.setItem('vku_user', JSON.stringify(user));
            else localStorage.removeItem('vku_user');
        } catch (e) { /* bỏ qua nếu storage không khả dụng */ }
    }

    // Ẩn nút đăng nhập + hiện lời chào (hoặc ngược lại)
    function updateAuthUI() {
        const loggedIn = !!currentUser;
        if (googleLoginBtn) googleLoginBtn.style.display = loggedIn ? 'none' : 'flex';
        if (userGreeting) userGreeting.style.display = loggedIn ? 'block' : 'none';
        if (loggedIn && userNameText) userNameText.textContent = currentUser.name;
    }

    // Khôi phục đăng nhập khi mở lại app (kể cả lúc không có mạng)
    currentUser = loadSavedUser();
    updateAuthUI();

    // 1. Nút Đăng nhập / Đăng xuất Google
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            try {
                const user = await Capacitor.Plugins.GoogleAuth.signIn();
                currentUser = {
                    name: user.name || user.displayName || user.givenName || user.email,
                    email: user.email || ''
                };
                saveUser(currentUser);
                updateAuthUI();
            } catch (error) {
                console.error('Lỗi đăng nhập Google:', error);
                alert('Đăng nhập thất bại. Vui lòng thử lại.');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await Capacitor.Plugins.GoogleAuth.signOut();
            } catch (error) {
                console.warn('Lỗi signOut (bỏ qua):', error);
            }
            currentUser = null;
            saveUser(null);
            updateAuthUI();
        });
    }

    // 2. Đăng ký Service Worker
    if ('serviceWorker' in navigator && !(window.Capacitor && Capacitor.isNativePlatform())) {
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
    let photoPath = "";
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
                    resultType: 'uri',
                    source: 'CAMERA',
                    saveToGallery: true
                });

                photoPath = image.path || image.webPath || '';

                photoPreview.src = image.webPath || image.path;
                photoPreview.style.display = 'block';

                console.log('Ảnh đã chụp và lưu vào Gallery');
                console.log('Photo path:', photoPath);
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
let isSyncing = false;

const request = indexedDB.open(
    'VKUInterviewDB',
    2
);

request.onupgradeneeded = (event) => {

    db = event.target.result;

    if (
        !db.objectStoreNames.contains(
            'offline_surveys'
        )
    ) {
        db.createObjectStore(
            'offline_surveys',
            {
                keyPath: 'uuid'
            }
        );
    }
};

request.onsuccess = (event) => { 
    db = event.target.result; 

    console.log('IndexedDB đã sẵn sàng'); 
};

request.onerror = (event) => {

    console.error(
        'Không thể mở IndexedDB:',
        event.target.error
    );
};

    // 7. Xử lý Gửi Form
    const form = document.getElementById('interviewForm');
    const statusMsg = document.getElementById('statusMessage');

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            // Chặn gửi nếu chưa đăng nhập
            if (!currentUser) {
                statusMsg.textContent = 'Vui lòng đăng nhập Google trước khi gửi dữ liệu!';
                statusMsg.style.color = 'red';
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

         const surveyData = {
    uuid: crypto.randomUUID(),

    sessionName:
        document.getElementById(
            'sessionName'
        ).value,

    interviewTime:
        document.getElementById(
            'interviewTime'
        ).value,

    interviewer:
        document.getElementById(
            'interviewer'
        ).value,

    interviewee:
        document.getElementById(
            'interviewee'
        ).value,

    qaContent:
        document.getElementById(
            'qaContent'
        ).value,

    location:
        locationInput
            ? locationInput.value
            : '',

    // Chỉ lưu đường dẫn ảnh
    photoPath: photoPath,

    timestamp:
        new Date().toISOString(),

    submittedBy:
        currentUser.email,

    // Trạng thái queue
    status: 'PENDING_SYNC'
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
async function saveOfflineData(data) {

    if (!db) {
        console.error(
            'IndexedDB chưa sẵn sàng'
        );
        return;
    }

    try {

        const transaction =
            db.transaction(
                ['offline_surveys'],
                'readwrite'
            );

        const store =
            transaction.objectStore(
                'offline_surveys'
            );

        store.put(data);

        transaction.oncomplete =
            async () => {

                console.log(
                    'Đã lưu khảo sát offline:',
                    data.uuid
                );

                if (statusMsg) {

                    statusMsg.textContent =
                        'Mất mạng! Dữ liệu đã được lưu trên thiết bị và chờ đồng bộ.';

                    statusMsg.style.color =
                        '#d97706';
                }

                await triggerNotification(
                    'Đã lưu offline 📱',
                    'Dữ liệu sẽ được đồng bộ khi có mạng trở lại.'
                );

                // Đăng ký Background Sync
               if (!(window.Capacitor && Capacitor.isNativePlatform())) {
    await registerBackgroundSync();
}

                resetForm();
            };

        transaction.onerror = () => {

            console.error(
                'Lỗi lưu IndexedDB:',
                transaction.error
            );
        };

    } catch (error) {

        console.error(
            'Lỗi saveOfflineData:',
            error
        );
    }
}

function resetForm() {

    if (form) {
        form.reset();
    }

    document.getElementById(
        'interviewTime'
    ).value = '';

    document.getElementById(
        'interviewee'
    ).value = '';

    if (locationInput) {
        locationInput.value = '';
    }

    photoPath = '';

    if (photoPreview) {

        photoPreview.style.display =
            'none';

        photoPreview.src = '';
    }
}

async function registerBackgroundSync() {

    if (!('serviceWorker' in navigator)) {
        return;
    }

    try {

        const registration =
            await navigator.serviceWorker.ready;

        if ('sync' in registration) {

            await registration.sync.register(
                'sync-surveys'
            );

            console.log(
                'Đã đăng ký Background Sync'
            );
        } else {

            console.log(
                'Trình duyệt không hỗ trợ Background Sync'
            );
        }

    } catch (error) {

        console.error(
            'Không đăng ký được Background Sync:',
            error
        );
    }
}

if (
    window.Capacitor &&
    Capacitor.Plugins &&
    Capacitor.Plugins.Network
) {

    Capacitor.Plugins.Network.addListener(
        'networkStatusChange',
        async (status) => {

            console.log(
                'Network status:',
                status
            );

            if (status.connected) {

                console.log(
                    '📡 Capacitor phát hiện có mạng'
                );

                await syncOfflineData();
            }
        }
    );
}

    // 8. Xử lý Đồng bộ khi có mạng trở lại
if (!(window.Capacitor && Capacitor.isNativePlatform())) {

    window.addEventListener(
        'online',
        async () => {

            console.log(
                '🌐 Mạng đã trở lại'
            );

            if (statusMsg) {

                statusMsg.textContent =
                    'Đã kết nối mạng! Đang đồng bộ dữ liệu...';

                statusMsg.style.color = 'blue';
            }

            await syncOfflineData();
        }
    );
}

    function getPendingSurveys() {

    return new Promise(
        (resolve, reject) => {

            const transaction =
                db.transaction(
                    ['offline_surveys'],
                    'readonly'
                );

            const store =
                transaction.objectStore(
                    'offline_surveys'
                );

            const request =
                store.getAll();

            request.onsuccess = () => {

                const surveys =
                    request.result
                        .filter(
                            survey =>
                                survey.status ===
                                'PENDING_SYNC'
                        );

                resolve(surveys);
            };

            request.onerror = () => {

                reject(
                    request.error
                );
            };
        }
    );
}

async function claimSurvey(uuid) {

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            ['offline_surveys'],
            'readwrite'
        );

        const store = transaction.objectStore(
            'offline_surveys'
        );

        const request = store.get(uuid);

        request.onsuccess = () => {

            const survey = request.result;

            // Không tồn tại
            if (!survey) {
                resolve(null);
                return;
            }

            // Survey không còn chờ đồng bộ
            if (survey.status !== 'PENDING_SYNC') {
                resolve(null);
                return;
            }

            // 🔒 Đánh dấu đang được xử lý
            survey.status = 'SYNCING';

            const updateRequest = store.put(survey);

            updateRequest.onsuccess = () => {
                console.log(
                    '🔒 Đã claim survey:',
                    uuid
                );

                resolve(survey);
            };

            updateRequest.onerror = () => {
                reject(updateRequest.error);
            };
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}
async function updateSurveyStatus(uuid, status) {

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            ['offline_surveys'],
            'readwrite'
        );

        const store = transaction.objectStore(
            'offline_surveys'
        );

        const request = store.get(uuid);

        request.onsuccess = () => {

            const survey = request.result;

            if (!survey) {
                resolve();
                return;
            }

            survey.status = status;

            const updateRequest =
                store.put(survey);

            updateRequest.onsuccess = () => {

                console.log(
                    `🔄 ${uuid} → ${status}`
                );

                resolve();
            };

            updateRequest.onerror = () => {
                reject(updateRequest.error);
            };
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

async function syncOfflineData() {

    // ==========================================
    // CHỐNG NHIỀU SYNC TRONG CÙNG APP
    // ==========================================

    if (isSyncing) {

        console.log(
            '⏳ Sync đang chạy, bỏ qua lần gọi này.'
        );

        return;
    }

    if (!db) {

        console.log(
            '⚠️ IndexedDB chưa sẵn sàng'
        );

        return;
    }

    if (!navigator.onLine) {

        console.log(
            '📴 Thiết bị vẫn offline'
        );

        return;
    }

    // 🔒 Khóa sync
    isSyncing = true;

    console.log(
        '🔒 Sync bắt đầu'
    );

    try {

        const surveys =
            await getPendingSurveys();

        if (surveys.length === 0) {

            console.log(
                '✅ Không có dữ liệu cần đồng bộ'
            );

            return;
        }

        console.log(
            `📦 Có ${surveys.length} survey đang chờ`
        );

        if (statusMsg) {

            statusMsg.textContent =
                `Đang đồng bộ ${surveys.length} dữ liệu...`;

            statusMsg.style.color = 'blue';
        }

        // ==========================================
        // GỬI TỪNG SURVEY
        // ==========================================

        for (const survey of surveys) {

            if (!navigator.onLine) {

                console.log(
                    '📴 Mất mạng trong lúc đồng bộ'
                );

                break;
            }

            try {

                // 🔒 CLAIM RECORD
                // Chỉ một process được quyền xử lý survey này
                const claimedSurvey =
                    await claimSurvey(
                        survey.uuid
                    );

                // Nếu process khác đã claim
                if (!claimedSurvey) {

                    console.log(
                        '⏭️ Survey đã được process:',
                        survey.uuid
                    );

                    continue;
                }

                console.log(
                    '📤 Đang gửi survey:',
                    claimedSurvey.uuid
                );

                await syncToServerAndCleanUp(
                    claimedSurvey
                );

                console.log(
                    '✅ Đã đồng bộ:',
                    claimedSurvey.uuid
                );

            } catch (error) {

                console.error(
                    '❌ Đồng bộ thất bại:',
                    survey.uuid,
                    error
                );

                // Gửi lỗi → cho phép thử lại
                await updateSurveyStatus(
                    survey.uuid,
                    'PENDING_SYNC'
                );
            }
        }

    } catch (error) {

        console.error(
            '❌ Lỗi syncOfflineData:',
            error
        );

    } finally {

        isSyncing = false;

        console.log(
            '🔓 Sync kết thúc'
        );
    }
}

async function getPhotoBase64(
    photoPath
) {

    if (!photoPath) {
        return '';
    }

    try {

        const Filesystem =
            Capacitor.Plugins.Filesystem;

        const result =
            await Filesystem.readFile({
                path: photoPath
            });

        return result.data;

    } catch (error) {

        console.error(
            'Không thể đọc ảnh:',
            photoPath,
            error
        );

        return '';
    }
}

async function syncToServerAndCleanUp(
    survey
) {

    if (!navigator.onLine) {
        throw new Error(
            'Thiết bị đang offline'
        );
    }

    console.log(
        'Đang đồng bộ:',
        survey.uuid
    );

    let photoBase64 = '';

    // Đọc ảnh từ bộ nhớ máy
    if (survey.photoPath) {

        photoBase64 =
            await getPhotoBase64(
                survey.photoPath
            );
    }

    const dataToSend = {
        ...survey,

        // Base64 chỉ tồn tại
        // trong lúc upload
        photo: photoBase64
    };

    // Không gửi đường dẫn nội bộ
    delete dataToSend.photoPath;

    try {

        await fetch(
            GOOGLE_SHEETS_API_URL,
            {
                method: 'POST',

                mode: 'no-cors',

                headers: {
                    'Content-Type':
                        'text/plain;charset=utf-8'
                },

                body:
                    JSON.stringify(
                        dataToSend
                    )
            }
        );

        console.log(
            'Đã gửi dữ liệu:',
            survey.uuid
        );

        // Chỉ xóa khỏi queue
        // sau khi fetch không bị lỗi
        await deleteFromIndexedDB(
            survey.uuid
        );

    } catch (error) {

        console.error(
            'Upload thất bại:',
            error
        );

        throw error;
    }
}

function deleteFromIndexedDB(uuid) {

    return new Promise(
        (resolve, reject) => {

            const transaction =
                db.transaction(
                    ['offline_surveys'],
                    'readwrite'
                );

            const store =
                transaction.objectStore(
                    'offline_surveys'
                );

            const request =
                store.delete(uuid);

            request.onsuccess = () => {

                console.log(
                    'Đã xóa queue:',
                    uuid
                );

                resolve();
            };

            request.onerror = () => {

                reject(
                    request.error
                );
            };

            transaction.oncomplete = () => {

                if (statusMsg) {

                    statusMsg.textContent =
                        'Đã đồng bộ dữ liệu offline thành công!';

                    statusMsg.style.color =
                        'green';
                }

                triggerNotification(
                    'Đồng bộ thành công 🔄',
                    'Dữ liệu nháp đã được gửi lên hệ thống.'
                );
            };
        }
    );
}

});