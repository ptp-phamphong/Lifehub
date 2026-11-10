using API_Raspberry.Dto;
using API_Raspberry.Mapper;
using API_Raspberry.Model;
using API_Raspberry.Repository;
using API_Raspberry.Service.Jobs;
using Hangfire;

namespace API_Raspberry.Service
{
    public interface IUehPortalSessionService
    {
        /// <summary>Entity đầy đủ (kể cả cookie) - chỉ dùng nội bộ backend, không trả ra API.</summary>
        UehPortalSession Get();

        /// <summary>Cookie đang lưu, hoặc null khi chưa có phiên.</summary>
        string GetCookieHeader();

        /// <summary>Trạng thái không kèm cookie, an toàn để trả ra API.</summary>
        UehSessionStatusDto GetStatus();

        /// <summary>Lưu cookie mới (đã được kiểm tra là còn đăng nhập) và đánh dấu phiên sống.</summary>
        void SaveValidated(string cookieHeader);

        /// <summary>Đánh dấu phiên đã chết. Gọi nhiều lần vẫn giữ ExpiredAt của lần đầu.</summary>
        void MarkExpired();

        /// <summary>Ghi nhận vừa gọi UEH thấy phiên còn sống.</summary>
        void MarkValidated();

        /// <summary>Ghi kết quả lượt đồng bộ cuối. Không có phiên thì bỏ qua.</summary>
        void RecordSync(bool success, string message, int count);

        /// <summary>
        /// Extension gửi cookie lên: kiểm tra với UEH, lưu nếu còn đăng nhập, và đẩy job đồng bộ khi
        /// cần (Q8). Cookie không còn đăng nhập thì KHÔNG ghi đè phiên đang lưu.
        /// </summary>
        Task<UehSessionSubmitResultDto> SubmitAsync(UehSessionSubmitDto dto);
    }

    public class UehPortalSessionService : IUehPortalSessionService
    {
        private readonly IUehPortalSessionRepository _repository;
        private readonly IUehPortalSessionMapper _mapper;
        private readonly IUehStudentScheduleService _uehStudentScheduleService;
        private readonly IBackgroundJobClient _backgroundJobClient;
        private readonly ILogger<UehPortalSessionService> _logger;

        public UehPortalSessionService(
            IUehPortalSessionRepository repository,
            IUehPortalSessionMapper mapper,
            IUehStudentScheduleService uehStudentScheduleService,
            IBackgroundJobClient backgroundJobClient,
            ILogger<UehPortalSessionService> logger)
        {
            _repository = repository;
            _mapper = mapper;
            _uehStudentScheduleService = uehStudentScheduleService;
            _backgroundJobClient = backgroundJobClient;
            _logger = logger;
        }

        public async Task<UehSessionSubmitResultDto> SubmitAsync(UehSessionSubmitDto dto)
        {
            var cookieHeader = dto?.CookieHeader;
            var forceSync = dto?.ForceSync ?? false;

            if (!UehSessionRules.IsValidCookieHeader(cookieHeader))
            {
                return Result(UehSessionOutcome.InvalidCookie, "Cookie không hợp lệ (rỗng, quá dài hoặc có ký tự xuống dòng).", forceSync);
            }

            var semester = (await _uehStudentScheduleService.GetSemestersToSyncAsync()).FirstOrDefault();
            if (semester == null)
            {
                return Result(UehSessionOutcome.NoSemester, "Chưa có học kỳ nào được đánh dấu đồng bộ (IsCurrentSemester = true) nên không kiểm tra được phiên.", forceSync);
            }

            var validation = await _uehStudentScheduleService.ValidateAsync(cookieHeader, semester);
            if (validation.ErrorKind == UehFetchErrorKind.SessionExpired)
            {
                return Result(UehSessionOutcome.NotLoggedIn, "Trình duyệt chưa đăng nhập UEH (cổng UEH trả về trang đăng nhập). Phiên đang lưu được giữ nguyên.", forceSync);
            }

            if (validation.ErrorKind == UehFetchErrorKind.PortalError)
            {
                return Result(UehSessionOutcome.PortalError, $"Không kiểm tra được phiên: {validation.Message}", forceSync);
            }

            var stored = _repository.Get();
            var storedCookie = stored?.CookieHeader;
            var storedValid = stored?.IsValid ?? false;

            var outcome = UehSessionRules.SavedOutcome(storedCookie, storedValid, cookieHeader);
            var shouldSync = UehSessionRules.ShouldSync(storedCookie, storedValid, cookieHeader, forceSync);

            SaveValidated(cookieHeader);

            string syncJobId = null;
            if (shouldSync)
            {
                syncJobId = _backgroundJobClient.Enqueue<IScheduleImportJob>(job => job.RunAsync());
            }

            var message = outcome switch
            {
                UehSessionOutcome.SavedNew => "Đã lưu phiên UEH mới.",
                UehSessionOutcome.Revived => "Phiên UEH đã hoạt động lại.",
                _ => "Phiên UEH vẫn còn hiệu lực."
            };
            if (syncJobId != null)
            {
                message += " Đang đồng bộ lịch học...";
            }

            return Result(outcome, message, forceSync, syncJobId);
        }

        // Một chỗ duy nhất ghi log cho Submit: chỉ outcome, forceSync và jobId - không bao giờ ghi cookie.
        private UehSessionSubmitResultDto Result(string outcome, string message, bool forceSync, string syncJobId = null)
        {
            _logger.LogInformation(
                "UehSession/Submit: outcome {Outcome}, forceSync {ForceSync}, syncJobId {SyncJobId}.",
                outcome, forceSync, syncJobId ?? "-");

            return new UehSessionSubmitResultDto
            {
                Outcome = outcome,
                Message = message,
                SyncJobId = syncJobId,
                Status = GetStatus()
            };
        }

        public UehPortalSession Get()
        {
            return _repository.Get();
        }

        public string GetCookieHeader()
        {
            return _repository.Get()?.CookieHeader;
        }

        public UehSessionStatusDto GetStatus()
        {
            return _mapper.ToStatusDto(_repository.Get());
        }

        public void SaveValidated(string cookieHeader)
        {
            var now = DateTime.UtcNow;
            var entity = _repository.Get() ?? new UehPortalSession();

            // SavedAt = lúc phiên NÀY được lưu lần đầu, không phải lần gửi gần nhất. Chỉ đặt lại khi là
            // phiên mới; nếu không, log "Sống được …" của UehKeepAliveJob sẽ luôn ngắn hơn tuổi thật của phiên.
            if (UehSessionRules.IsNewSession(entity.CookieHeader, cookieHeader))
            {
                entity.SavedAt = now;
            }

            entity.CookieHeader = cookieHeader;
            entity.LastValidatedAt = now;
            entity.ExpiredAt = null;
            entity.IsValid = true;

            _repository.Save(entity);
        }

        public void MarkExpired()
        {
            var entity = _repository.Get();
            if (entity == null || !entity.IsValid) return;

            entity.IsValid = false;
            entity.ExpiredAt = DateTime.UtcNow;
            _repository.Save(entity);
        }

        public void MarkValidated()
        {
            var entity = _repository.Get();
            if (entity == null) return;

            entity.LastValidatedAt = DateTime.UtcNow;
            _repository.Save(entity);
        }

        public void RecordSync(bool success, string message, int count)
        {
            var entity = _repository.Get();
            if (entity == null) return;

            entity.LastSyncAt = DateTime.UtcNow;
            entity.LastSyncSuccess = success;
            entity.LastSyncMessage = message;
            entity.LastSyncCount = count;
            _repository.Save(entity);
        }
    }
}
