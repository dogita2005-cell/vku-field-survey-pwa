# VKU Field Survey PWA
Ứng dụng PWA hỗ trợ khảo sát cơ sở vật chất tại trường VKU, hoạt động tốt ngay cả khi không có mạng (Offline-First).

## Tính năng chính
- Cài đặt trực tiếp lên màn hình chính (Installable).
- Lưu giao diện và tài nguyên tĩnh bằng Service Worker (Cache-First).
- Lưu trữ dữ liệu biểu mẫu ngoại tuyến bằng IndexedDB.
- Tự động đồng bộ dữ liệu lên Server khi có mạng trở lại.

## Cài đặt cục bộ
1. Clone repository này về máy.
2. Chạy lệnh: `python -m http.server 8080`
3. Truy cập `http://localhost:8080`