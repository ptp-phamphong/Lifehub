using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using API_Raspberry.Dto;
using API_Raspberry.Model;

namespace API_Raspberry.Service
{
    public class GeminiExpenseService : IAiExpenseService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IExpenseService _expenseService;
        private readonly IConfiguration _configuration;

        public GeminiExpenseService(IHttpClientFactory httpClientFactory, IExpenseService expenseService, IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _expenseService = expenseService;
            _configuration = configuration;
        }

        public async Task<AiExpenseResponseDto> ParseExpenseFromText(string userInput, List<ReasonType> reasonTypes)
        {
            var apiKey = _configuration.GetValue<string>("Gemini:ApiKey");
            if (string.IsNullOrEmpty(apiKey))
            {
                return new AiExpenseResponseDto
                {
                    Success = false,
                    Message = "Gemini API Key chưa được cấu hình. Hãy thêm 'Gemini:ApiKey' vào appsettings.json"
                };
            }

            var model = _configuration.GetValue<string>("Gemini:Model") ?? "gemini-2.0-flash";
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

            var requestBody = new GeminiRequest
            {
                Contents = new List<GeminiContent>
                {
                    new GeminiContent
                    {
                        Parts = new List<GeminiPart>
                        {
                            new GeminiPart { Text = userInput }
                        }
                    }
                },
                SystemInstruction = new GeminiContent
                {
                    Parts = new List<GeminiPart>
                    {
                        new GeminiPart { Text = systemPrompt }
                    }
                },
                GenerationConfig = new GeminiGenerationConfig
                {
                    Temperature = 0.7,
                    MaxOutputTokens = 200
                }
            };

            var client = _httpClientFactory.CreateClient();
            var jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
            };
            var json = JsonSerializer.Serialize(requestBody, jsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

            HttpResponseMessage response;
            try
            {
                response = await client.PostAsync(url, content);
            }
            catch (Exception ex)
            {
                return new AiExpenseResponseDto
                {
                    Success = false,
                    Message = $"Không thể kết nối Gemini API: {ex.Message}"
                };
            }

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                return new AiExpenseResponseDto
                {
                    Success = false,
                    Message = $"Gemini API trả về lỗi {response.StatusCode}: {errorBody}"
                };
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            var geminiResponse = JsonSerializer.Deserialize<GeminiResponse>(responseJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            var aiText = geminiResponse?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text?.Trim() ?? "";

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
                var parseOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                parsedDto = JsonSerializer.Deserialize<ExpenseRecordCreateDto>(jsonStr, parseOptions);
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
                Message = "Thêm chi tiêu thành công từ AI (Gemini)",
                ParsedExpense = saved
            };
        }
    }

    // Gemini API request/response models
    public class GeminiRequest
    {
        [JsonPropertyName("contents")]
        public List<GeminiContent> Contents { get; set; }

        [JsonPropertyName("systemInstruction")]
        public GeminiContent SystemInstruction { get; set; }

        [JsonPropertyName("generationConfig")]
        public GeminiGenerationConfig GenerationConfig { get; set; }
    }

    public class GeminiContent
    {
        [JsonPropertyName("parts")]
        public List<GeminiPart> Parts { get; set; }
    }

    public class GeminiPart
    {
        [JsonPropertyName("text")]
        public string Text { get; set; }
    }

    public class GeminiGenerationConfig
    {
        [JsonPropertyName("temperature")]
        public double Temperature { get; set; }

        [JsonPropertyName("maxOutputTokens")]
        public int MaxOutputTokens { get; set; }
    }

    public class GeminiResponse
    {
        [JsonPropertyName("candidates")]
        public List<GeminiCandidate> Candidates { get; set; }
    }

    public class GeminiCandidate
    {
        [JsonPropertyName("content")]
        public GeminiContent Content { get; set; }
    }
}
