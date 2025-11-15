using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;

public class EmailService
{
    private readonly string _smtpHost;
    private readonly int _smtpPort;
    private readonly string _email;
    private readonly string _appPassword;

    public EmailService(string email, string appPassword)
    {
        _smtpHost = "smtp.gmail.com";
        _smtpPort = 587;
        _email = email;
        _appPassword = appPassword;
    }

    public async Task<bool> SendEmailAsync(string toEmail, string subject, string bodyHtml)
    {
        try
        {
            using (var client = new SmtpClient(_smtpHost, _smtpPort))
            {
                client.EnableSsl = true;
                client.UseDefaultCredentials = false;
                client.Credentials = new NetworkCredential(_email, _appPassword);

                var mail = new MailMessage();
                mail.From = new MailAddress(_email);
                mail.To.Add(toEmail);
                mail.Subject = subject;
                mail.Body = bodyHtml;
                mail.IsBodyHtml = true;

                await client.SendMailAsync(mail);
            }

            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine("Email send error: " + ex.Message);
            return false;
        }
    }
}
