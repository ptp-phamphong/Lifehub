# 📱 Hướng dẫn Build & Deploy Mobile App

## Yêu cầu cài đặt (chỉ 1 lần)

```powershell
# 1. Cài EAS CLI
npm install -g eas-cli

# 2. Đăng nhập tài khoản Expo
eas login
```

---

## 🔨 BUILD APK MỚI (tốn 1/30 builds miễn phí)

> Dùng khi: lần đầu, thêm thư viện native, nâng Expo SDK, đổi icon/tên app

```powershell
# Di chuyển vào thư mục project
cd Mobile_Raspberry

# Build APK (preview - cài trực tiếp lên điện thoại)
eas build --profile preview --platform android
```

- Đợi 10-15 phút, khi xong sẽ hiện link tải APK
- Hoặc vào https://expo.dev → Builds → Download

### Tải APK về máy tính bằng lệnh (tuỳ chọn)

```powershell
# Xem danh sách builds
eas build:list --platform android

# Tải APK mới nhất về thư mục hiện tại
eas build:download --platform android
```

### Cài lên điện thoại

- Gửi file APK qua Zalo/Telegram cho chính mình → mở trên điện thoại → cài
- Hoặc copy link download từ Expo → mở trên Chrome điện thoại → tải → cài
- Cho phép "cài từ nguồn không xác định" nếu điện thoại hỏi

---

## ⚡ CẬP NHẬT CODE (miễn phí, không giới hạn)

> Dùng khi: sửa code JS/TS, fix bug, thêm màn hình, đổi UI, sửa logic

```powershell
cd Mobile_Raspberry

# Push update lên điện thoại (app tự cập nhật khi mở)
eas update --channel preview --message "Mô tả thay đổi"
```

Ví dụ:
```powershell
eas update --channel preview --message "Fix bug hiển thị chi tiêu"
eas update --channel preview --message "Thêm filter theo tháng"
eas update --channel preview --message "Đổi màu giao diện"
```

- Mất ~30 giây upload
- Mở app trên điện thoại → app tự tải update mới

---

## 📋 SCRIPTS TẮT (đã cấu hình trong package.json)

```powershell
cd Mobile_Raspberry

npm run build:preview     # = eas build --profile preview --platform android
npm run build:prod        # = eas build --profile production --platform android
npm run update:preview    # = eas update --channel preview
npm run update:prod       # = eas update --channel production
```

---

## 🔄 QUY TRÌNH HÀNG NGÀY

```
1. Sửa code trên máy tính
2. Test bằng: npx expo start (quét QR trên Expo Go)
3. OK rồi → chạy: eas update --channel preview --message "mô tả"
4. Mở app trên điện thoại → tự cập nhật
```

---

## ❓ KHI NÀO DÙNG LỆNH NÀO?

| Tình huống                          | Lệnh                                        | Tốn build? |
|-------------------------------------|----------------------------------------------|------------|
| Lần đầu cài app                    | `eas build --profile preview --platform android` | ✅ Có    |
| Sửa code, fix bug, đổi UI          | `eas update --channel preview --message "..."` | ❌ Không  |
| Cài thêm thư viện native           | `eas build --profile preview --platform android` | ✅ Có    |
| Nâng cấp Expo SDK                  | `eas build --profile preview --platform android` | ✅ Có    |
| Đổi icon, tên app (app.json)       | `eas build --profile preview --platform android` | ✅ Có    |
| Đổi API URL, thêm màn hình mới    | `eas update --channel preview --message "..."` | ❌ Không  |
| Đổi native config (usesCleartextTraffic, permissions...) | `eas build --profile preview --platform android` | ✅ Có |

---

## 🚀 BUILD BẢN PRODUCTION (đưa lên Google Play)

> Chỉ dùng khi muốn publish lên CH Play

```powershell
cd Mobile_Raspberry

# Build file AAB (định dạng Google Play yêu cầu)
eas build --profile production --platform android

# Submit lên Google Play (cần cấu hình Google Service Account trước)
eas submit --platform android
```

---

## ⚠️ XỬ LÝ LỖI THƯỜNG GẶP

### Lỗi "network request failed" khi gọi API (HTTP)
- **Nguyên nhân**: Android 9+ chặn HTTP (cleartext traffic) mặc định. App cần `usesCleartextTraffic: true` trong app.json
- **Lưu ý**: Setting này là native config → phải **BUILD LẠI APK**, `eas update` KHÔNG đủ
- Nếu build rồi vẫn lỗi → kiểm tra: mở URL API trên Chrome điện thoại xem có truy cập được không (nhà mạng có thể chặn port không chuẩn)
```powershell
eas build --profile preview --platform android
```

### Lỗi "Command must be re-run"
```powershell
# Chỉ cần chạy lại lệnh build y hệt
eas build --profile preview --platform android
```

### Lỗi "Not logged in"
```powershell
eas login
```

### Muốn xoá cache build
```powershell
eas build --profile preview --platform android --clear-cache
```

### Kiểm tra trạng thái build
```powershell
eas build:list --platform android
```
