namespace API_Raspberry.Service.Zalo
{
    /// <summary>
    /// Cấu hình tính năng gửi tin nhắn Zalo qua Playwright. Bind từ section "Zalo" trong appsettings.
    /// Toàn bộ CSS selector để ở đây (không hard-code trong service) để sau khi test với tài khoản
    /// thật chỉ cần sửa appsettings là chỉnh được, không phải build lại.
    /// </summary>
    public class ZaloOptions
    {
        /// <summary>Bật/tắt tính năng. null (mặc định) = chỉ bật trên Linux, xem Program.cs.</summary>
        public bool? Enabled { get; set; }

        /// <summary>Chromium hệ thống trên Pi. Dùng bản apt để né lỗi tải browser của Playwright trên ARM64.</summary>
        public string ExecutablePath { get; set; } = "/usr/bin/chromium";

        /// <summary>Thư mục lưu phiên đăng nhập (cookie/localStorage). Để ngoài thư mục deploy để không bị ghi đè.</summary>
        public string UserDataDir { get; set; } = "/home/<user>/BotApp/zalo-profile";

        /// <summary>
        /// Chạy ẩn (headless) hay hiện (headful dưới Xvfb). Mặc định false: headful vừa ít bị Zalo
        /// phát hiện automation hơn, vừa né được lỗi headless treo khi tải trang mạng trên Pi này.
        /// </summary>
        public bool Headless { get; set; } = false;

        /// <summary>Khoảng cách tối thiểu giữa 2 lần gửi (giây) chống spam -> giảm rủi ro khoá tài khoản.</summary>
        public int MinSecondsBetweenSends { get; set; } = 5;

        /// <summary>Thời gian tối đa chờ quét QR (giây) trước khi tự đóng browser cho nhẹ RAM.</summary>
        public int QrTimeoutSeconds { get; set; } = 180;

        /// <summary>Danh sách người nhận cố định hiện trên dropdown.</summary>
        public List<ZaloContactOption> Contacts { get; set; } = new();

        /// <summary>Các CSS selector của Zalo Web. Có default hợp lý nhưng CẦN chỉnh lại sau khi test thật.</summary>
        public ZaloSelectors Selectors { get; set; } = new();
    }

    public class ZaloContactOption
    {
        /// <summary>Mã nội bộ UI gửi lên, vd "me", "mom".</summary>
        public string Id { get; set; }

        /// <summary>Nhãn tiếng Việt hiện trên dropdown.</summary>
        public string Label { get; set; }

        /// <summary>Chuỗi gõ vào ô tìm kiếm Zalo để ra người này (tên hoặc số điện thoại).</summary>
        public string SearchTerm { get; set; }

        /// <summary>Tên hội thoại dùng để chọn đúng kết quả tìm kiếm (khớp theo text).</summary>
        public string MatchText { get; set; }
    }

    /// <summary>
    /// Các selector của giao diện Zalo Web. Đây là phần dễ vỡ nhất (phụ thuộc DOM Zalo) — giá trị
    /// mặc định chỉ là phỏng đoán, PHẢI đối chiếu và chỉnh lại khi chạy POC với tài khoản thật.
    /// </summary>
    public class ZaloSelectors
    {
        /// <summary>Phần tử chứa mã QR ở trang đăng nhập (thường là canvas).</summary>
        public string QrCanvas { get; set; } = "canvas";

        /// <summary>Phần tử chỉ xuất hiện khi đã đăng nhập (khung danh sách hội thoại).</summary>
        public string LoggedInMarker { get; set; } = "#leftContainer";

        /// <summary>Ô tìm kiếm liên hệ.</summary>
        public string SearchInput { get; set; } = "input[placeholder*='Tìm']";

        /// <summary>Một dòng kết quả trong danh sách hội thoại / tìm kiếm.</summary>
        public string SearchResult { get; set; } = ".conv-item";

        /// <summary>Ô soạn tin nhắn (contenteditable).</summary>
        public string MessageInput { get; set; } = "[contenteditable='true'][role='textbox']";
    }
}
