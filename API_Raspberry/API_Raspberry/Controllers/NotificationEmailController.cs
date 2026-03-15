using API_Raspberry.Dto;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class NotificationEmailController : ControllerBase
    {
        private const string TargetEmail = "ptp.phamphong@gmail.com";

        [HttpPost]
        [Route("SendNotificationEmail")]
        public async Task<IActionResult> SendNotificationEmail([FromBody] NotificationEmailDto dto)
        {
            if (dto?.Notifications == null || dto.Notifications.Count == 0)
                return BadRequest("Không có thông báo nào để gửi.");

            var email = Environment.GetEnvironmentVariable("EMAIL_ADDRESS");
            var appPassword = Environment.GetEnvironmentVariable("EMAIL_APP_PASSWORD");

            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(appPassword))
                return StatusCode(500, "Email chưa được cấu hình trên server.");

            var subject = $"📱 Báo cáo thông báo điện thoại - {DateTime.Now:dd/MM/yyyy HH:mm}";
            var bodyHtml = BuildHtmlBody(dto.Notifications);

            var emailService = new EmailService(email, appPassword);
            var success = await emailService.SendEmailAsync(TargetEmail, subject, bodyHtml);

            if (!success)
                return StatusCode(500, "Gửi email thất bại.");

            return Ok(new { message = $"Đã gửi {dto.Notifications.Count} thông báo qua email." });
        }

        private string BuildHtmlBody(List<NotificationItem> notifications)
        {
            var rows = string.Join("", notifications.Select((n, i) =>
                $@"<tr>
                    <td style='padding:8px;border:1px solid #ddd;text-align:center'>{i + 1}</td>
                    <td style='padding:8px;border:1px solid #ddd'>{System.Net.WebUtility.HtmlEncode(n.App)}</td>
                    <td style='padding:8px;border:1px solid #ddd'>{System.Net.WebUtility.HtmlEncode(n.Title)}</td>
                    <td style='padding:8px;border:1px solid #ddd'>{System.Net.WebUtility.HtmlEncode(n.Text)}</td>
                    <td style='padding:8px;border:1px solid #ddd;white-space:nowrap'>{System.Net.WebUtility.HtmlEncode(n.Time)}</td>
                </tr>"));

            return $@"
                <h2 style='color:#0d6efd'>📱 Báo cáo thông báo điện thoại</h2>
                <p>Tổng cộng: <strong>{notifications.Count}</strong> thông báo</p>
                <table style='border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:14px'>
                    <thead>
                        <tr style='background:#0d6efd;color:#fff'>
                            <th style='padding:10px;border:1px solid #ddd'>#</th>
                            <th style='padding:10px;border:1px solid #ddd'>Ứng dụng</th>
                            <th style='padding:10px;border:1px solid #ddd'>Tiêu đề</th>
                            <th style='padding:10px;border:1px solid #ddd'>Nội dung</th>
                            <th style='padding:10px;border:1px solid #ddd'>Thời gian</th>
                        </tr>
                    </thead>
                    <tbody>{rows}</tbody>
                </table>
                <p style='color:#999;font-size:12px;margin-top:20px'>Gửi từ Mobile Raspberry App</p>";
        }
    }
}
