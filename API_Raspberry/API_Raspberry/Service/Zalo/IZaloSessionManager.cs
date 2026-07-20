using API_Raspberry.Dto.Zalo;

namespace API_Raspberry.Service.Zalo
{
    /// <summary>
    /// Điều phối một phiên Zalo Web bằng Playwright. Singleton: chỉ có một session tại một thời điểm
    /// (Zalo Web chỉ cho phép một phiên web/tài khoản). Mọi thao tác browser được nối tiếp qua khoá nội bộ.
    /// Sau mỗi lần dùng, browser được đóng sạch để nhả RAM; phiên đăng nhập vẫn nằm trên đĩa (UserDataDir).
    /// </summary>
    public interface IZaloSessionManager
    {
        ZaloStatusDto GetStatus();

        IReadOnlyList<ZaloContactDto> GetContacts();

        /// <summary>Mở Zalo Web. Nếu phiên trên đĩa còn hiệu lực -> already_logged_in; nếu không -> trả ảnh QR.</summary>
        Task<ZaloLoginResultDto> StartLoginAsync();

        /// <summary>UI gọi định kỳ khi đang chờ quét QR: trả logged_in khi quét xong, hoặc QR mới nếu chưa.</summary>
        Task<ZaloLoginResultDto> GetLoginStatusAsync();

        /// <summary>Gửi một tin nhắn tới người nhận theo contactId. Đồng bộ, tự đóng browser khi xong.</summary>
        Task<ZaloSendResultDto> SendAsync(string contactId, string message);

        /// <summary>Đóng browser thủ công (nhả RAM). Phiên đăng nhập không mất.</summary>
        Task CloseAsync();
    }
}
