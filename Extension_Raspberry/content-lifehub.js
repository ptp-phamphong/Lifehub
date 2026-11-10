// Chạy trên https://app.ptp-phamphong.com/* (KHÔNG chạy trên demo.ptp-phamphong.com).
// Đọc JWT mà Angular lưu trong localStorage và gửi cho background để dùng khi gọi API LifeHub.
// Angular bản prod dùng storagePrefix rỗng nên key là "auth_token" / "auth_expiration".
(() => {
  const TOKEN_KEY = "auth_token";
  const EXPIRATION_KEY = "auth_expiration";

  let lastSent = null;

  function pushToken() {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiration = localStorage.getItem(EXPIRATION_KEY);

    // Không có token (chưa đăng nhập / đã đăng xuất) thì không ghi đè token đang lưu: token cũ vẫn
    // có thể còn hạn, và background tự kiểm tra hạn trước khi dùng.
    if (!token || token === lastSent) return;

    lastSent = token;
    chrome.runtime.sendMessage({ type: "saveToken", token, expiration }).catch(() => {
      // Extension vừa được nạp lại: content script cũ mất kết nối. Lần tải trang sau sẽ gửi lại.
      lastSent = null;
    });
  }

  pushToken();

  // Đăng nhập xảy ra ngay trong tab này nên sự kiện "storage" không bắn. Kiểm tra lại định kỳ
  // và mỗi khi quay lại tab - đọc localStorage rất rẻ.
  setInterval(pushToken, 15000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") pushToken();
  });
})();
