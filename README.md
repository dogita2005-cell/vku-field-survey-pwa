# VKU Interview Field Survey — PWA & Android App

Ứng dụng hỗ trợ thu thập dữ liệu phỏng vấn tại thực địa, hoạt động như một **Progressive Web App (PWA)** và đồng thời được đóng gói thành **ứng dụng Android gốc (native)** thông qua Capacitor. Hệ thống cho phép ghi nhận nội dung phỏng vấn, đăng nhập Google, định vị GPS, chụp ảnh và gửi báo cáo lên Google Sheets — hoạt động ổn định cả khi thiết bị không có kết nối mạng (Offline-First).

- **Live Demo (PWA):** https://vku-field-survey-pwa-nu.vercel.app
- **App ID (Android):** `com.vku.survey`

## Tính năng chính

- **Mobile-First & Installable:** Giao diện tối ưu cho thiết bị di động, hỗ trợ Safe Area, khóa font 16px chống zoom tự động trên iOS/Android; có thể cài trực tiếp lên màn hình chính (PWA).
- **Đăng nhập Google (Google Sign-In):** Bắt buộc đăng nhập trước khi gửi dữ liệu; phiên đăng nhập được lưu lại để dùng được cả khi offline.
- **Camera & GPS gốc (native):** Chụp ảnh và lấy tọa độ hiện trường thông qua plugin Capacitor (`@capacitor/camera`, `@capacitor/geolocation`) thay vì Web API thông thường; ảnh có thể lưu trực tiếp vào thư viện ảnh của máy.
- **Thông báo đẩy cục bộ (Local Notifications):** Báo cho người dùng biết khi gửi thành công, khi lưu nháp offline, hoặc khi đồng bộ dữ liệu hoàn tất.
- **Lưu trữ ngoại tuyến (IndexedDB):** Dữ liệu biểu mẫu (bao gồm ảnh mã hóa Base64) được lưu cục bộ khi mất mạng.
- **Service Worker (Cache-First):** Lưu đệm App Shell để ứng dụng vẫn mở được khi offline.
- **Tự động đồng bộ lên Google Sheets:** Khi có mạng trở lại, dữ liệu tồn đọng được tự động đẩy lên Google Sheets qua Google Apps Script.
- **Đóng gói ứng dụng Android:** Toàn bộ mã nguồn web được build thành APK/AAB thông qua Capacitor, chạy như một ứng dụng Android độc lập.

## Kiến trúc & công nghệ

| Thành phần | Công nghệ |
|---|---|
| Giao diện web / PWA | HTML, CSS, JavaScript thuần |
| Lưu trữ offline | IndexedDB (`offline_surveys`) |
| Cache tài nguyên tĩnh | Service Worker (Cache-First) |
| Backend lưu dữ liệu | Google Sheets + Google Apps Script |
| Đóng gói native | [Capacitor](https://capacitorjs.com/) |
| Đăng nhập | `@codetrix-studio/capacitor-google-auth` |
| Camera | `@capacitor/camera` |
| GPS | `@capacitor/geolocation` |
| Thông báo | `@capacitor/local-notifications` |

## Cấu trúc thư mục

```
├── www/                  # Mã nguồn web (PWA)
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── sw.js
│   └── manifest.json
├── android/               # Dự án Android sinh ra bởi Capacitor
├── icons/                 # Icon PWA / Android (192x192, 512x512)
├── capacitor.config.json  # Cấu hình Capacitor (appId, plugin GoogleAuth...)
└── package.json
```

## Cài đặt & chạy thử (PWA — chỉ web)

```bash
git clone https://github.com/dogita2005-cell/vku-field-survey-pwa.git
cd vku-field-survey-pwa
python -m http.server 8080 --directory www
```

Truy cập `http://localhost:8080` để trải nghiệm bản web.

## Build ứng dụng Android (Capacitor)

> Yêu cầu: Node.js, Android Studio (kèm Android SDK) đã được cài đặt.

```bash
# 1. Cài dependencies
npm install

# 2. Đồng bộ mã nguồn web (www/) sang dự án Android
npx cap sync android

# 3. Mở dự án bằng Android Studio để build/run
npx cap open android
```

Sau khi mở trong Android Studio, chọn **Build > Build Bundle(s) / APK(s) > Build APK(s)** để xuất file `.apk`, hoặc build trực tiếp bằng Gradle:

```bash
cd android
./gradlew assembleDebug     # xuất APK debug
./gradlew bundleRelease     # xuất AAB release
```

File kết quả nằm tại:
- `android/app/build/outputs/apk/debug/app-debug.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

## Cấu hình cần thiết

- **Google Apps Script Web App URL**: khai báo trong `www/app.js` (biến `GOOGLE_SHEETS_API_URL`).
- **Google Sign-In**: cấu hình `serverClientId` và `scopes` trong `capacitor.config.json`, phải khớp với OAuth Client ID tạo trên Google Cloud Console.

## Ghi chú

- Hiện tại trạng thái mạng (online/offline) đang được theo dõi bằng Web API tiêu chuẩn (`navigator.onLine`, sự kiện `online`), chưa dùng plugin `@capacitor/network`.
