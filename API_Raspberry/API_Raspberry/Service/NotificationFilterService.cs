using API_Raspberry.Dto;
using API_Raspberry.Mapper;
using API_Raspberry.Model;
using API_Raspberry.Repository;

namespace API_Raspberry.Service
{
    public interface INotificationFilterService
    {
        List<NotificationFilterDto> GetAll();
        List<NotificationFilterDto> GetActiveFilters();
        NotificationFilterDto GetById(int id);
        int Add(NotificationFilterCreateDto dto);
        void Update(int id, NotificationFilterUpdateDto dto);
        void DeleteById(int id);
        void SeedDefaults();
    }

    public class NotificationFilterService : INotificationFilterService
    {
        private readonly INotificationFilterRepository _repository;
        private readonly INotificationFilterMapper _mapper;

        public NotificationFilterService(INotificationFilterRepository repository, INotificationFilterMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public List<NotificationFilterDto> GetAll()
        {
            var entities = _repository.GetAll();
            return _mapper.ToDtoList(entities);
        }

        /// <summary>
        /// Trả về tất cả filter đang active, gom theo type.
        /// Mobile app sẽ gọi endpoint này để cache filter config.
        /// </summary>
        public List<NotificationFilterDto> GetActiveFilters()
        {
            var packages = _repository.GetActiveByType("package");
            var keywords = _repository.GetActiveByType("keyword");
            var flags = _repository.GetActiveByType("flag");

            var all = new List<NotificationFilter>();
            all.AddRange(packages);
            all.AddRange(keywords);
            all.AddRange(flags);

            return _mapper.ToDtoList(all);
        }

        public NotificationFilterDto GetById(int id)
        {
            var entity = _repository.GetById(id);
            return _mapper.ToDto(entity);
        }

        public int Add(NotificationFilterCreateDto dto)
        {
            var entity = _mapper.ToEntity(dto);
            return _repository.Add(entity);
        }

        public void Update(int id, NotificationFilterUpdateDto dto)
        {
            var entity = _repository.GetById(id);
            if (entity != null)
            {
                _mapper.UpdateEntity(entity, dto);
                _repository.Update(entity);
            }
        }

        public void DeleteById(int id)
        {
            _repository.DeleteById(id);
        }

        /// <summary>
        /// Seed các filter mặc định (chuyển từ hardcode sang DB).
        /// Chỉ thêm nếu chưa tồn tại.
        /// </summary>
        public void SeedDefaults()
        {
            var defaults = new List<NotificationFilter>
            {
                // === Packages hệ thống ===
                new NotificationFilter { FilterType = "package", FilterValue = "android", Description = "Hệ thống Android", IsActive = true, CreatedDate = DateTime.Now },
                new NotificationFilter { FilterType = "package", FilterValue = "com.android.systemui", Description = "System UI", IsActive = true, CreatedDate = DateTime.Now },
                new NotificationFilter { FilterType = "package", FilterValue = "com.android.vending", Description = "Google Play Store", IsActive = true, CreatedDate = DateTime.Now },
                new NotificationFilter { FilterType = "package", FilterValue = "com.google.android.gms", Description = "Google Play Services", IsActive = true, CreatedDate = DateTime.Now },
                new NotificationFilter { FilterType = "package", FilterValue = "com.samsung.android.incallui", Description = "Samsung incoming call UI", IsActive = true, CreatedDate = DateTime.Now },
                new NotificationFilter { FilterType = "package", FilterValue = "com.samsung.android.app.smartcapture", Description = "Samsung screenshot", IsActive = true, CreatedDate = DateTime.Now },

                // === Keywords hệ thống ===
                new NotificationFilter { FilterType = "keyword", FilterValue = "bong bóng chat đang bật", Description = "Chat bubble notification", IsActive = true, CreatedDate = DateTime.Now },
                new NotificationFilter { FilterType = "keyword", FilterValue = "đang hiện trên các ứng dụng khác", Description = "Overlay notification", IsActive = true, CreatedDate = DateTime.Now },
                new NotificationFilter { FilterType = "keyword", FilterValue = "đang chạy trong nền", Description = "Background service (VI)", IsActive = true, CreatedDate = DateTime.Now },
                new NotificationFilter { FilterType = "keyword", FilterValue = "running in the background", Description = "Background service (EN)", IsActive = true, CreatedDate = DateTime.Now },
                new NotificationFilter { FilterType = "keyword", FilterValue = "bubble", Description = "Chat bubble (EN)", IsActive = true, CreatedDate = DateTime.Now },
                new NotificationFilter { FilterType = "keyword", FilterValue = "is displaying over other apps", Description = "Overlay (EN)", IsActive = true, CreatedDate = DateTime.Now },
                new NotificationFilter { FilterType = "keyword", FilterValue = "đang hoạt động", Description = "Active service notification", IsActive = true, CreatedDate = DateTime.Now },
                new NotificationFilter { FilterType = "keyword", FilterValue = "usb debugging", Description = "USB debugging notification", IsActive = true, CreatedDate = DateTime.Now },
                new NotificationFilter { FilterType = "keyword", FilterValue = "charging this device", Description = "Charging notification (EN)", IsActive = true, CreatedDate = DateTime.Now },
                new NotificationFilter { FilterType = "keyword", FilterValue = "đang sạc", Description = "Charging notification (VI)", IsActive = true, CreatedDate = DateTime.Now },

                // === Android notification flags ===
                new NotificationFilter { FilterType = "flag", FilterValue = "ongoing", Description = "FLAG_ONGOING_EVENT - thông báo persistent (nhạc, download...)", IsActive = true, CreatedDate = DateTime.Now },
                new NotificationFilter { FilterType = "flag", FilterValue = "foreground_service", Description = "FLAG_FOREGROUND_SERVICE - service đang chạy foreground", IsActive = true, CreatedDate = DateTime.Now },
                new NotificationFilter { FilterType = "flag", FilterValue = "no_clear", Description = "FLAG_NO_CLEAR - không thể xóa bằng tay", IsActive = false, CreatedDate = DateTime.Now },
                new NotificationFilter { FilterType = "flag", FilterValue = "group_summary", Description = "FLAG_GROUP_SUMMARY - tóm tắt nhóm notification", IsActive = true, CreatedDate = DateTime.Now },
            };

            _repository.SeedDefaults(defaults);
        }
    }
}
