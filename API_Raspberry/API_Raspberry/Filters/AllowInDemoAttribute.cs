namespace API_Raspberry.Filters
{
    /// <summary>
    /// Đánh dấu một action được phép chạy trên instance demo. Mọi action KHÔNG có attribute này
    /// đều bị DemoGateMiddleware trả 404 trên demo, kể cả action [AllowAnonymous].
    ///
    /// Cố ý chỉ đặt được trên method, không đặt được trên class: nếu đặt trên class thì action
    /// thêm vào controller đó sau này sẽ tự động mở trên demo, trái với nguyên tắc mặc định chặn.
    /// Endpoint mới chỉ cần gắn attribute này khi chắc chắn nó vô hại với tài khoản demo công khai
    /// (không gửi mail/Zalo, không gọi dịch vụ ngoài, không lộ dữ liệu thật).
    /// </summary>
    [AttributeUsage(AttributeTargets.Method, AllowMultiple = false, Inherited = false)]
    public sealed class AllowInDemoAttribute : Attribute
    {
    }
}
