using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using API_Raspberry.Dto;
using API_Raspberry.Model;

namespace API_Raspberry.Service
{
    public interface IAiExpenseService
    {
        Task<AiExpenseResponseDto> ParseExpenseFromText(string userInput, List<ReasonType> reasonTypes);
    }

    public class OllamaExpenseService : IAiExpenseService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IExpenseService _expenseService;
        private readonly IConfiguration _configuration;

        public OllamaExpenseService(IHttpClientFactory httpClientFactory, IExpenseService expenseService, IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _expenseService = expenseService;
            _configuration = configuration;
        }

        public async Task<AiExpenseResponseDto> ParseExpenseFromText(string userInput, List<ReasonType> reasonTypes)
        {
            var reasonTypeList = string.Join("\n", reasonTypes.Select(r => $"- Id: {r.Id}, Name: \"{r.ReasonName}\""));

            var systemPrompt = $@"Bạn là trợ lý phân tích chi tiêu. Người dùng sẽ nhập một câu mô tả chi tiêu bằng tiếng Việt.
Bạn cần trích xuất thông tin và trả về JSON với đúng format sau (KHÔNG có text nào khác ngoài JSON):
{{""reason"":""lý do chi tiêu"",""amount"":số tiền (số nguyên, đơn vị VND),""reasonTypeId"":id tag hoặc null,""createdDate"":""YYYY-MM-DDT00:00:00"" hoặc null}}

Danh sách tag (reasonType):
{reasonTypeList}

Quy tắc:
- ""15k"" = 15000, ""1tr"" = 1000000, ""200"" = 200000 (nếu không có đơn vị và >= 100 thì nhân 1000)
- Nếu không nói ngày thì createdDate = null
- Nếu chỉ nói ngày/tháng (vd: ""17/07"") thì dùng năm hiện tại {DateTime.Now.Year}
- Nếu nói hôm nay, hoặc không nói thời gian gì, dùng ngày tháng hiện tại {DateTime.Now}
- Chọn reasonTypeId phù hợp nhất từ danh sách trên, nếu không khớp thì để null
- CHỈ trả về JSON, KHÔNG giải thích gì thêm";

            var ollamaUrl = _configuration.GetValue<string>("Ollama:BaseUrl") ?? "http://localhost:11434";
            var model = _configuration.GetValue<string>("Ollama:Model") ?? "qwen2.5:0.5b";

            var requestBody = new
            {
                model = model,
                prompt = userInput,
                system = systemPrompt,
                stream = false,
                options = new
                {
                    temperature = 0.7,
                    num_predict = 200
                }
            };

            var client = _httpClientFactory.CreateClient();
            var json = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            HttpResponseMessage response;
            try
            {
                response = await client.PostAsync($"{ollamaUrl}/api/generate", content);
            }
            catch (Exception ex)
            {
                return new AiExpenseResponseDto
                {
                    Success = false,
                    Message = $"Không thể kết nối Ollama: {ex.Message}"
                };
            }

            if (!response.IsSuccessStatusCode)
            {
                return new AiExpenseResponseDto
                {
                    Success = false,
                    Message = $"Ollama trả về lỗi: {response.StatusCode}"
                };
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            var ollamaResponse = JsonSerializer.Deserialize<OllamaGenerateResponse>(responseJson);
            var aiText = ollamaResponse?.Response?.Trim() ?? "";

            // Try to extract JSON from the response
            var jsonStart = aiText.IndexOf('{');
            var jsonEnd = aiText.LastIndexOf('}');
            if (jsonStart < 0 || jsonEnd < 0 || jsonEnd <= jsonStart)
            {
                return new AiExpenseResponseDto
                {
                    Success = false,
                    Message = $"AI không trả về JSON hợp lệ: {aiText}"
                };
            }

            var jsonStr = aiText.Substring(jsonStart, jsonEnd - jsonStart + 1);

            ExpenseRecordCreateDto parsedDto;
            try
            {
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                parsedDto = JsonSerializer.Deserialize<ExpenseRecordCreateDto>(jsonStr, options);
            }
            catch (Exception ex)
            {
                return new AiExpenseResponseDto
                {
                    Success = false,
                    Message = $"Không parse được JSON từ AI: {ex.Message}. Raw: {jsonStr}"
                };
            }

            if (string.IsNullOrWhiteSpace(parsedDto.Reason) || parsedDto.Amount <= 0)
            {
                return new AiExpenseResponseDto
                {
                    Success = false,
                    Message = $"AI trả về dữ liệu không hợp lệ (reason trống hoặc amount <= 0). Raw: {jsonStr}"
                };
            }

            var newId = _expenseService.AddExpense(parsedDto);
            var saved = _expenseService.GetExpenseById(newId);

            return new AiExpenseResponseDto
            {
                Success = true,
                ExpenseId = newId,
                Message = "Thêm chi tiêu thành công từ AI",
                ParsedExpense = saved
            };
        }
    }

    public class OllamaGenerateResponse
    {
        [JsonPropertyName("response")]
        public string Response { get; set; }
    }
}
