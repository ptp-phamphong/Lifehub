using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class SpeechToTextController : ControllerBase
    {
        private readonly ISpeechToTextService _speechToTextService;

        public SpeechToTextController(ISpeechToTextService speechToTextService)
        {
            _speechToTextService = speechToTextService;
        }

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
                using var memoryStream = new MemoryStream();
                await audioFile.CopyToAsync(memoryStream);
                byte[] audioData = memoryStream.ToArray();

                string transcribedText = await _speechToTextService.TranscribeAudioAsync(audioData, audioFile.FileName);

                return Ok(new { text = transcribedText });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
