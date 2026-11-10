namespace API_Raspberry.Service
{
    /// <summary>Kết quả một lần gọi cổng UEH.</summary>
    public enum UehFetchErrorKind
    {
        Ok,

        /// <summary>UEH trả trang đăng nhập (hoặc redirect tới đó): phiên đã chết. Thử lại vô ích.</summary>
        SessionExpired,

        /// <summary>Lỗi khác: HTTP 4xx/5xx, JSON hỏng, danh sách rỗng... Phiên có thể vẫn sống.</summary>
        PortalError
    }

    /// <summary>
    /// Hàm thuần nhận diện "UEH đang đòi đăng nhập lại". Tách riêng để test không cần HTTP.
    /// </summary>
    public static class UehPortalResponse
    {
        /// <summary>
        /// true khi phản hồi cho thấy phiên không còn đăng nhập:
        ///  - HTTP 3xx (client gọi với AllowAutoRedirect = false, phiên chết thì UEH redirect về loginst), hoặc
        ///  - chỗ phải là JSON mà nội dung lại là HTML (bắt đầu bằng '&lt;'), hoặc
        ///  - nội dung chứa ô của form đăng nhập (name="MatKhau" bản cũ, name="recaptchaV3" bản 11/2026).
        /// </summary>
        /// <param name="statusCode">Mã HTTP.</param>
        /// <param name="body">Nội dung phản hồi, có thể null.</param>
        /// <param name="expectJson">true với GetWeek (JSON); false với DrawingSchedules (vốn là HTML).</param>
        public static bool IsLoginResponse(int statusCode, string body, bool expectJson)
        {
            if (statusCode >= 300 && statusCode < 400)
            {
                return true;
            }

            if (string.IsNullOrEmpty(body))
            {
                return false;
            }

            if (expectJson && body.TrimStart().StartsWith("<", StringComparison.Ordinal))
            {
                return true;
            }

            // Trang đăng nhập cũ có ô MatKhau. Bản từ 11/2026 (loginst.ueh.edu.vn/signin) là form 2 bước gửi tới
            // /continue, chỉ còn __RequestVerificationToken + recaptchaV3 - nên nhận diện cả hai.
            return body.Contains("name=\"MatKhau\"", StringComparison.OrdinalIgnoreCase)
                || body.Contains("name=\"recaptchaV3\"", StringComparison.OrdinalIgnoreCase);
        }
    }
}
