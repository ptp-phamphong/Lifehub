using System.Reflection;
using API_Raspberry.Filters;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Tests
{
    /// <summary>
    /// Chụp lại danh sách action được mở trên instance demo. Ai thêm hoặc bỏ [AllowInDemo] thì
    /// test này đỏ, buộc phải sửa danh sách bên dưới - thay đổi allowlist luôn hiện rõ khi review.
    /// Trước khi thêm một dòng: action đó có gửi mail/Zalo, gọi dịch vụ ngoài, hay lộ dữ liệu
    /// thật không? Nếu có thì không được mở trên demo.
    /// </summary>
    public class DemoAllowlistTests
    {
        private static readonly string[] ExpectedAllowlist =
        {
            "AuthController.Login",
            "CourseScheduleController.Add",
            "CourseScheduleController.Delete",
            "CourseScheduleController.DeleteBySemesterMetadataId",
            "CourseScheduleController.GetAll",
            "CourseScheduleController.GetById",
            "CourseScheduleController.GetByMonth",
            "CourseScheduleController.GetByWeek",
            "CourseScheduleController.Update",
            "ExpenseRecordController.DeleteById",
            "ExpenseRecordController.ExpenseNote",
            "ExpenseRecordController.GetAllExpenseNote",
            "ExpenseRecordController.GetExpenseById",
            "ExpenseRecordController.GetExpensesByMonth",
            "ExpenseRecordController.SumAll",
            "ExpenseRecordController.SumAllWithFilter",
            "ExpenseRecordController.SumByCurrentMonth",
            "ExpenseRecordController.SumByCurrentWeek",
            "ExpenseRecordController.UpdateById",
            "IncomeRecordController.DeleteIncomeById",
            "IncomeRecordController.GetAllIncomeNote",
            "IncomeRecordController.GetIncomeById",
            "IncomeRecordController.IncomeNote",
            "IncomeRecordController.SumAllIncome",
            "IncomeRecordController.SumAllIncomeWithFilter",
            "IncomeRecordController.SumIncomeByCurrentMonth",
            "IncomeRecordController.SumIncomeByCurrentWeek",
            "IncomeRecordController.UpdateIncomeById",
            "ReasonTypeController.AddReasonType",
            "ReasonTypeController.GetAllReasonType",
            "ReasonTypeController.GetReasonTypeById",
            "ReasonTypeController.UpdateReasonTypeById",
            "SemesterMetadataController.GetAll",
            "SystemConfigurationController.Add",
            "SystemConfigurationController.DeleteById",
            "SystemConfigurationController.GetAll",
            "SystemConfigurationController.GetById",
            "SystemConfigurationController.UpdateById",
            "SystemInfoController.Get",
            "ThemeSettingController.GetThemeSetting",
            "ThemeSettingController.UpdateThemeSetting",
            "UserController.GetAll",
        };

        // Những controller có tác dụng phụ thật: tuyệt đối không action nào được mở trên demo.
        private static readonly string[] NeverAllowedControllers =
        {
            "AiExpenseController", "JobsController", "NotificationEmailController",
            "NotificationFilterController", "PhoneNotificationController", "UehStudentScheduleController",
            "VisitController", "VisitorLogController", "ZaloController",
        };

        private static IEnumerable<MethodInfo> AllowedActions() =>
            typeof(Program).Assembly.GetTypes()
                .Where(t => typeof(ControllerBase).IsAssignableFrom(t) && !t.IsAbstract)
                .SelectMany(t => t.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
                .Where(m => m.GetCustomAttribute<AllowInDemoAttribute>() != null);

        [Fact]
        public void Allowlist_matches_the_reviewed_snapshot()
        {
            var actual = AllowedActions()
                .Select(m => $"{m.DeclaringType.Name}.{m.Name}")
                .OrderBy(s => s, StringComparer.Ordinal)
                .ToArray();

            Assert.Equal(ExpectedAllowlist.OrderBy(s => s, StringComparer.Ordinal), actual);
        }

        [Fact]
        public void Controllers_with_real_side_effects_are_fully_blocked()
        {
            var leaked = AllowedActions()
                .Where(m => NeverAllowedControllers.Contains(m.DeclaringType.Name))
                .Select(m => $"{m.DeclaringType.Name}.{m.Name}")
                .ToList();

            Assert.Empty(leaked);
        }

        [Fact]
        public void Every_never_allowed_controller_still_exists()
        {
            // Đổi tên controller thì danh sách trên mất tác dụng âm thầm - bắt lỗi đó ở đây.
            var names = typeof(Program).Assembly.GetTypes().Select(t => t.Name).ToHashSet();
            Assert.All(NeverAllowedControllers, n => Assert.Contains(n, names));
        }

        [Fact]
        public void AllowInDemo_cannot_be_put_on_a_class()
        {
            var usage = typeof(AllowInDemoAttribute).GetCustomAttribute<AttributeUsageAttribute>();
            Assert.Equal(AttributeTargets.Method, usage.ValidOn);
        }
    }
}
