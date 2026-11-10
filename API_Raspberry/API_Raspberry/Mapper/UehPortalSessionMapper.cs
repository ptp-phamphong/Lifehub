using API_Raspberry.Dto;
using API_Raspberry.Model;

namespace API_Raspberry.Mapper
{
    public interface IUehPortalSessionMapper
    {
        UehSessionStatusDto ToStatusDto(UehPortalSession entity);
    }

    public class UehPortalSessionMapper : IUehPortalSessionMapper
    {
        // Không map CookieHeader: cookie không bao giờ được rời khỏi backend.
        public UehSessionStatusDto ToStatusDto(UehPortalSession entity)
        {
            if (entity == null)
            {
                return new UehSessionStatusDto { HasSession = false };
            }

            return new UehSessionStatusDto
            {
                HasSession = true,
                IsValid = entity.IsValid,
                SavedAt = AsUtc(entity.SavedAt),
                LastValidatedAt = AsUtc(entity.LastValidatedAt),
                ExpiredAt = AsUtc(entity.ExpiredAt),
                LastSyncAt = AsUtc(entity.LastSyncAt),
                LastSyncSuccess = entity.LastSyncSuccess,
                LastSyncMessage = entity.LastSyncMessage,
                LastSyncCount = entity.LastSyncCount
            };
        }

        // MySQL không lưu DateTimeKind nên đọc lên là Unspecified, JSON ra thiếu "Z" và trình duyệt
        // hiểu nhầm thành giờ máy. Mọi cột thời gian của bảng này đều ghi bằng UtcNow.
        private static DateTime AsUtc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);

        private static DateTime? AsUtc(DateTime? value) => value.HasValue ? AsUtc(value.Value) : (DateTime?)null;
    }
}
