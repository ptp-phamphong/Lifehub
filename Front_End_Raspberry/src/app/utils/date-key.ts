// Tách khóa ngày/tháng từ một Date theo GIỜ ĐỊA PHƯƠNG.
//
// ─────────────────────────────────────────────────────────────────────
// KHÔNG BAO GIỜ dùng toISOString() để làm việc này.
//
// toISOString() đổi sang UTC trước. Ở UTC+7 (giờ Việt Nam):
//
//   new Date(2026, 6, 17, 0, 30).toISOString()
//     -> '2026-07-16T17:30:00Z'  -> .slice(0,10) -> '2026-07-16'   SAI, lệch 1 ngày
//
// Hậu quả cụ thể đã gặp:
//   * Khoản chi lúc rạng sáng bị xếp vào NGÀY HÔM TRƯỚC.
//   * Khoản chi ngày cuối tháng bị xếp vào THÁNG TRƯỚC.
//   * Mốc lọc "N ngày gần nhất" lùi thêm một ngày — và chỉ sai khi người dùng
//     mở trang trong khoảng 00:00–07:00, nên nó chạy đúng gần cả ngày rồi thỉnh
//     thoảng sai. Đây là kiểu lỗi rất khó phát hiện.
//
// Backend lưu thời gian bằng DateTime.Now (giờ địa phương của Pi) và so sánh
// theo biên ngày địa phương, nên khóa ở client cũng phải là giờ địa phương.
// ─────────────────────────────────────────────────────────────────────

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** 'YYYY-MM-DD' theo giờ địa phương. */
export function toDayKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 'YYYY-MM' theo giờ địa phương. */
export function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
