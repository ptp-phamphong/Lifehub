using Microsoft.Extensions.Hosting;
using System;
using System.Device.Gpio;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace API_Raspberry.Service
{
    public class ButtonListener : BackgroundService
    {
        private readonly int _pin = 27;
        private readonly GpioController _controller;

        private readonly string _logFile = "/home/pi/BotApp/button.log";
        private static readonly object _fileLock = new object();
        private readonly List<string> emails = new List<string>() 
        {
            "ptp.phamphong@gmail.com",
            "phong.phamthanh@hcmut.edu.vn",
            "pvtoan66@gmail.com",
        };

        public ButtonListener()
        {
            _controller = new GpioController();

            // GIỐNG PYTHON: pull_up=False -> dùng PULL-DOWN
            _controller.OpenPin(_pin, PinMode.InputPullDown);

            // Tạo file nếu chưa có
            if (!File.Exists(_logFile))
            {
                File.WriteAllText(_logFile, $"== Log started at {DateTime.Now} ==\n");
            }
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            WriteLog("Start listen gipo 27");

            PinValue prev = _controller.Read(_pin);  // trạng thái ban đầu

            while (!stoppingToken.IsCancellationRequested)
            {
                var value = _controller.Read(_pin);

                // CHỈ GHI LOG KHI THAY ĐỔI TRẠNG THÁI (giống Python when_pressed/when_released)
                if (value != prev)
                {
                    if (value == PinValue.High)
                    {
                        var emailService = new EmailService(
                            email: Environment.GetEnvironmentVariable("EMAIL_ADDRESS"),
                            appPassword: Environment.GetEnvironmentVariable("EMAIL_APP_PASSWORD") // App Password đã tạo
                        );
                        //var emailService = new EmailService(
                        //    email: "tpthanhphong111@gmail.com",
                        //    appPassword: Environment.GetEnvironmentVariable("sehj pmvs qcjd qzfr") // App Password đã tạo
                        //);

                        foreach (string email in emails)
                        {

                            await emailService.SendEmailAsync(
                                toEmail: email,
                                subject: "Thông báo từ bà",
                                bodyHtml: "<h1>Bà đã nhấn nút</h1>"
                            );
                            WriteLog("Sent email to: " + email);
                        }
                        WriteLog("Button pressed!");
                    }
                    else
                    {
                        //WriteLog("Button released!");
                    }

                    prev = value;
                    await Task.Delay(50); // chống dội rất nhẹ, giống bounce_time
                }

                await Task.Delay(10);
            }
        }

        private void WriteLog(string message)
        {
            lock (_fileLock)
            {
                File.AppendAllText(_logFile,
                    $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} | {message}\n");
            }
        }

        public override void Dispose()
        {
            _controller.ClosePin(_pin);
            _controller.Dispose();
            base.Dispose();
        }
    }
}
