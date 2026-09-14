# Ứng dụng Phỏng vấn Hiện trường (PWA)
Ứng dụng PWA hỗ trợ thu thập dữ liệu phỏng vấn tại thực địa. Hệ thống cho phép ghi nhận nội dung, định vị tọa độ và chụp ảnh ngay cả khi thiết bị không có kết nối mạng (Offline-First).

## Tính năng chính
- Tối ưu chuẩn Mobile-First và Cài đặt trực tiếp lên màn hình chính (Installable).
- Lưu đệm giao diện và tài nguyên tĩnh bằng Service Worker (Cache-First).
- Tích hợp GPS lấy tọa độ hiện trường và Camera chụp ảnh trực tiếp.
- Lưu trữ dữ liệu biểu mẫu (bao gồm ảnh mã hóa Base64) ngoại tuyến bằng IndexedDB.
- Tự động đồng bộ hóa dữ liệu lên Google Sheets (thông qua Apps Script) khi có mạng trở lại.

## Cài đặt cục bộ
1. Clone repository này về máy.
2. Chạy lệnh: `python -m http.server 8080`
3. Truy cập `http://localhost:8080` để trải nghiệm.