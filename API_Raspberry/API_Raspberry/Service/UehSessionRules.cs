namespace API_Raspberry.Service
{
    /// <summary>
    /// Các quy tắc thuần (không I/O) của luồng nhận phiên UEH từ extension. Tách riêng để test.
    /// </summary>
    public static class UehSessionRules
    {
        public const int MaxCookieHeaderLength = 4096;

        /// <summary>Cookie định danh phiên ASP.NET của cổng UEH. Đã test 08/11/2026: chỉ cần cookie này.</summary>
        public const string SessionCookieName = "ASP.NET_SessionId";

        /// <summary>
        /// Cookie hợp lệ để lưu và gửi đi: không rỗng, ≤ 4096 ký tự, không có CR/LF.
        /// CR/LF bị chặn vì chuỗi này được đặt nguyên văn vào header Cookie của request ra UEH.
        /// </summary>
        public static bool IsValidCookieHeader(string cookieHeader)
        {
            if (string.IsNullOrWhiteSpace(cookieHeader)) return false;
            if (cookieHeader.Length > MaxCookieHeaderLength) return false;
            return cookieHeader.IndexOf('\r') < 0 && cookieHeader.IndexOf('\n') < 0;
        }

        /// <summary>
        /// Khóa để so "cùng một phiên hay không": giá trị ASP.NET_SessionId nếu có, ngược lại cả chuỗi.
        /// Không so cả chuỗi vì cookie phụ (vd cookie thống kê của trang) đổi liên tục, sẽ khiến mỗi
        /// lần mở trang đều bị coi là "phiên mới" và kích hoạt đồng bộ thừa.
        /// </summary>
        public static string SessionKey(string cookieHeader)
        {
            if (string.IsNullOrEmpty(cookieHeader)) return null;

            foreach (var part in cookieHeader.Split(';'))
            {
                var eq = part.IndexOf('=');
                if (eq <= 0) continue;

                var name = part.Substring(0, eq).Trim();
                if (string.Equals(name, SessionCookieName, StringComparison.OrdinalIgnoreCase))
                {
                    return part.Substring(eq + 1).Trim();
                }
            }

            return cookieHeader.Trim();
        }

        /// <summary>Phiên gửi lên là phiên mới so với phiên đang lưu (hoặc chưa lưu gì).</summary>
        public static bool IsNewSession(string storedCookie, string newCookie)
        {
            return storedCookie == null || SessionKey(storedCookie) != SessionKey(newCookie);
        }

        /// <summary>
        /// Có cần chạy đồng bộ sau khi lưu phiên không (Q8): phiên mới, phiên vừa sống lại, hoặc bấm nút.
        /// Phiên cũ vẫn sống thì không: job mỗi giờ đã lo, mở trang UEH không nên kéo thêm một lượt.
        /// </summary>
        public static bool ShouldSync(string storedCookie, bool storedValid, string newCookie, bool forceSync)
        {
            if (forceSync) return true;
            if (IsNewSession(storedCookie, newCookie)) return true;
            return !storedValid;
        }

        /// <summary>Outcome khi cookie đã được UEH xác nhận còn đăng nhập.</summary>
        public static string SavedOutcome(string storedCookie, bool storedValid, string newCookie)
        {
            if (IsNewSession(storedCookie, newCookie)) return Dto.UehSessionOutcome.SavedNew;
            return storedValid ? Dto.UehSessionOutcome.Unchanged : Dto.UehSessionOutcome.Revived;
        }
    }
}
