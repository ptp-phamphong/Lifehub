namespace API_Raspberry.Dto
{
    /// <summary>Payload beacon gửi từ portfolio / trang login. Client KHÔNG gửi IP - server tự lấy.</summary>
    public class VisitEventCreateDto
    {
        public string Path { get; set; }
        public string Title { get; set; }
        public string Referrer { get; set; }
        public string Locale { get; set; }
        public string VisitorId { get; set; }
        public string SessionId { get; set; }
        public string Language { get; set; }
        public int? ScreenWidth { get; set; }
        public int? ScreenHeight { get; set; }
        /// <summary>"Portfolio" hoặc "AppLogin". Mặc định Portfolio.</summary>
        public string Area { get; set; }
    }

    /// <summary>Beacon gửi lúc rời trang để ghi thời gian ở lại.</summary>
    public class VisitLeaveDto
    {
        public int Id { get; set; }
        public int DurationMs { get; set; }
    }

    public class VisitEventDto
    {
        public int Id { get; set; }
        public int EventType { get; set; }
        public int Area { get; set; }
        public DateTime VisitedAt { get; set; }
        public string VisitorId { get; set; }
        public string SessionId { get; set; }
        public string IpAddress { get; set; }
        public string Path { get; set; }
        public string Locale { get; set; }
        public string PageTitle { get; set; }
        public string Referrer { get; set; }
        public string ReferrerDomain { get; set; }
        public string UtmSource { get; set; }
        public string UtmMedium { get; set; }
        public string UtmCampaign { get; set; }
        public string UserAgent { get; set; }
        public string Browser { get; set; }
        public string Os { get; set; }
        public string DeviceType { get; set; }
        public bool IsBot { get; set; }
        public string CountryCode { get; set; }
        public string CountryName { get; set; }
        public string City { get; set; }
        public string Language { get; set; }
        public int? ScreenWidth { get; set; }
        public int? ScreenHeight { get; set; }
        public int? DurationMs { get; set; }
        public string Detail { get; set; }

        /// <summary>Tính lúc query bằng cách so với bảng visitorKnownIp.</summary>
        public bool IsSelf { get; set; }
        /// <summary>Nhãn đặt cho IP này, nếu có.</summary>
        public string KnownLabel { get; set; }
    }

    /// <summary>Filter cho bảng visitor log. POST kèm body, theo đúng convention của ParamFilter.</summary>
    public class VisitorLogFilter
    {
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        /// <summary>null = tất cả; 1 = Portfolio; 2 = AppLogin.</summary>
        public int? Area { get; set; }
        /// <summary>null = tất cả; 1 = PageView; 2 = LoginSuccess; 3 = LoginFailed.</summary>
        public int? EventType { get; set; }
        public string PathContains { get; set; }
        public string IpAddress { get; set; }
        public string VisitorId { get; set; }
        public string CountryCode { get; set; }

        public bool ExcludeSelf { get; set; } = true;
        public bool ExcludeBots { get; set; } = true;

        public string SortColumn { get; set; } = "visitedAt";
        public string SortDirection { get; set; } = "desc";

        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 50;
    }

    public class PagedResult<T>
    {
        public List<T> Items { get; set; } = new List<T>();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    /// <summary>Một dòng trong biểu đồ / bảng xếp hạng.</summary>
    public class VisitorCountItemDto
    {
        public string Label { get; set; }
        public int Count { get; set; }
    }

    public class VisitorDailyPointDto
    {
        public DateTime Date { get; set; }
        public int Views { get; set; }
        public int Visitors { get; set; }
    }

    /// <summary>Số liệu tổng quan cho tab Overview.</summary>
    public class VisitorSummaryDto
    {
        public int TotalViews { get; set; }
        public int UniqueVisitors { get; set; }
        public int ReturningVisitors { get; set; }
        public int Sessions { get; set; }
        public int AvgDurationSeconds { get; set; }
        public int LoginAttempts { get; set; }
        public int FailedLogins { get; set; }

        public List<VisitorDailyPointDto> DailySeries { get; set; } = new List<VisitorDailyPointDto>();
        public List<VisitorCountItemDto> TopPages { get; set; } = new List<VisitorCountItemDto>();
        public List<VisitorCountItemDto> TopReferrers { get; set; } = new List<VisitorCountItemDto>();
        public List<VisitorCountItemDto> TopCountries { get; set; } = new List<VisitorCountItemDto>();
        public List<VisitorCountItemDto> TopDevices { get; set; } = new List<VisitorCountItemDto>();
        public List<VisitorCountItemDto> TopBrowsers { get; set; } = new List<VisitorCountItemDto>();
    }

    /// <summary>Một khách: gộp theo VisitorId. Trả lời câu hỏi "ai quay lại bao nhiêu lần".</summary>
    public class VisitorProfileDto
    {
        public string VisitorId { get; set; }
        public string IpAddress { get; set; }
        public DateTime FirstSeen { get; set; }
        public DateTime LastSeen { get; set; }
        public int Views { get; set; }
        public int Sessions { get; set; }
        public int DistinctPages { get; set; }
        public string CountryCode { get; set; }
        public string CountryName { get; set; }
        public string City { get; set; }
        public string Browser { get; set; }
        public string Os { get; set; }
        public string DeviceType { get; set; }
        public bool IsBot { get; set; }
        public bool IsSelf { get; set; }
        public string KnownLabel { get; set; }
    }
}
