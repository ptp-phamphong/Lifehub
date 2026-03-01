using Azure.AI.OpenAI;
using OpenAI.Audio;
using System.ClientModel;
// using Whisper.net;
// using Whisper.net.Ggml;

namespace API_Raspberry.Service
{
    public class SpeechToTextService
    {
        private readonly string _endpoint;
        private readonly string _apiKey;
        private readonly string _deploymentName;

        public SpeechToTextService()
        {
            _endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT") ?? "";
            _apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY") ?? "";
            _deploymentName = Environment.GetEnvironmentVariable("AZURE_OPENAI_WHISPER_DEPLOYMENT") ?? "whisper";
        }

        /// <summary>
        /// Nhận file audio (byte[]) và gửi đến Azure OpenAI Whisper để chuyển thành text.
        /// </summary>
        public async Task<string> TranscribeAudioAsync(byte[] audioData, string fileName)
        {
            if (string.IsNullOrEmpty(_endpoint) || string.IsNullOrEmpty(_apiKey))
            {
                throw new InvalidOperationException(
                    "Azure OpenAI chưa được cấu hình. Hãy set AZURE_OPENAI_ENDPOINT và AZURE_OPENAI_KEY.");
            }

            AzureOpenAIClient azureClient = new AzureOpenAIClient(
                new Uri(_endpoint),
                new ApiKeyCredential(_apiKey));

            AudioClient audioClient = azureClient.GetAudioClient(_deploymentName);

            // Tạo stream từ byte array
            using MemoryStream audioStream = new MemoryStream(audioData);

            AudioTranscriptionOptions options = new AudioTranscriptionOptions
            {
                Language = "vi", // Tiếng Việt
                ResponseFormat = AudioTranscriptionFormat.Text
            };

            AudioTranscription transcription = await audioClient.TranscribeAudioAsync(
                audioStream, fileName, options);

            return transcription.Text ?? "";
        }

        #region Whisper.net Local (commented out - model thiếu chính xác)
        /*
        // Đường dẫn lưu model Whisper (cùng thư mục với binary)
        private static readonly string ModelDirectory = Path.Combine(AppContext.BaseDirectory, "WhisperModels");
        private static readonly string ModelPath = Path.Combine(ModelDirectory, "ggml-base.bin");
        private static readonly GgmlType ModelType = GgmlType.Base;

        private static async Task EnsureModelDownloadedAsync()
        {
            if (File.Exists(ModelPath))
                return;

            Directory.CreateDirectory(ModelDirectory);
            Console.WriteLine($"[Whisper] Đang tải model {ModelType}...");

            using var httpClient = new HttpClient();
            var downloader = new WhisperGgmlDownloader(httpClient);
            using var modelStream = await downloader.GetGgmlModelAsync(ModelType);
            using var fileStream = File.Create(ModelPath);
            await modelStream.CopyToAsync(fileStream);

            Console.WriteLine($"[Whisper] Tải xong! File: {ModelPath}");
        }

        public async Task<string> TranscribeAudioLocalAsync(byte[] audioData, string fileName)
        {
            await EnsureModelDownloadedAsync();

            string tempInputPath = Path.Combine(Path.GetTempPath(), $"whisper_input_{Guid.NewGuid()}{Path.GetExtension(fileName)}");
            string tempRawPath = Path.Combine(Path.GetTempPath(), $"whisper_{Guid.NewGuid()}.pcm");

            try
            {
                await File.WriteAllBytesAsync(tempInputPath, audioData);
                float[] samples = await ConvertToFloat32PcmAsync(tempInputPath, tempRawPath);

                using var whisperFactory = WhisperFactory.FromPath(ModelPath);
                using var processor = whisperFactory.CreateBuilder()
                    .WithLanguage("vi")
                    .Build();

                var segments = new List<string>();
                await foreach (var segment in processor.ProcessAsync(samples))
                {
                    segments.Add(segment.Text.Trim());
                }

                return string.Join(" ", segments);
            }
            finally
            {
                if (File.Exists(tempInputPath)) File.Delete(tempInputPath);
                if (File.Exists(tempRawPath)) File.Delete(tempRawPath);
            }
        }

        private static async Task<float[]> ConvertToFloat32PcmAsync(string inputPath, string outputPath)
        {
            try
            {
                var process = new System.Diagnostics.Process
                {
                    StartInfo = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "ffmpeg",
                        Arguments = $"-i \"{inputPath}\" -ar 16000 -ac 1 -f f32le \"{outputPath}\" -y",
                        RedirectStandardError = true,
                        UseShellExecute = false,
                        CreateNoWindow = true
                    }
                };

                process.Start();
                string stderr = await process.StandardError.ReadToEndAsync();
                await process.WaitForExitAsync();

                if (process.ExitCode != 0 || !File.Exists(outputPath))
                {
                    throw new InvalidOperationException(
                        $"ffmpeg convert thất bại (exit code: {process.ExitCode}).\n{stderr}");
                }

                byte[] rawBytes = await File.ReadAllBytesAsync(outputPath);
                float[] samples = new float[rawBytes.Length / 4];
                Buffer.BlockCopy(rawBytes, 0, samples, 0, rawBytes.Length);
                return samples;
            }
            catch (System.ComponentModel.Win32Exception)
            {
                throw new InvalidOperationException(
                    "ffmpeg chưa được cài. Cài đặt:\n" +
                    "  Windows: winget install ffmpeg\n" +
                    "  Raspberry Pi: sudo apt install ffmpeg");
            }
        }
        */
        #endregion
    }
}
