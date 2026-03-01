using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class SpeechToTextController : ControllerBase
    {
        public SpeechToTextController()
        {
        }

        /// <summary>
        /// Nhận file audio upload từ mobile, gửi đến Azure OpenAI Whisper,
        /// trả về text đã transcribe.
        /// </summary>
        [HttpPost]
        [Route("SpeechToText")]
        public async Task<IActionResult> SpeechToText([FromForm] IFormFile audioFile)
        {

            if (audioFile == null || audioFile.Length == 0)
            {
                return BadRequest(new { error = "Không có file audio." });
            }

            try
            {
                // Đọc file thành byte array
                using var memoryStream = new MemoryStream();
                await audioFile.CopyToAsync(memoryStream);
                byte[] audioData = memoryStream.ToArray();

                // Gọi Azure OpenAI Whisper
                SpeechToTextService service = new SpeechToTextService();
                string transcribedText = await service.TranscribeAudioAsync(audioData, audioFile.FileName);

                return Ok(new { text = transcribedText });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
