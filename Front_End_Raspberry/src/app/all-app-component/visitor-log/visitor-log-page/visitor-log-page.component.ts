import { Component, OnInit } from '@angular/core';
import { VisitorLogService } from 'src/app/services/visitor-log.service';
import { VisitorDailyPoint, VisitorLogFilter, VisitorSummary } from 'src/app/model/visitor-log.model';
import { toDayKey } from 'src/app/utils/date-key';

type TabKey = 'overview' | 'visits' | 'visitors' | 'myips';

@Component({
  selector: 'app-visitor-log-page',
  templateUrl: './visitor-log-page.component.html',
  styleUrls: ['./visitor-log-page.component.scss']
})
export class VisitorLogPageComponent implements OnInit {
  activeTab: TabKey = 'overview';

  /** Bộ lọc chung cho mọi tab. Thay đổi object (không sửa tại chỗ) để ngOnChanges của con chạy. */
  filter!: VisitorLogFilter;

  summary: VisitorSummary | null = null;

  /**
   * Lịch sử dài hạn lấy từ bảng tổng hợp theo ngày. Chỉ hiện khi chọn "Tất cả",
   * vì đây là số liệu duy nhất còn sót lại sau khi dữ liệu thô bị xóa theo hạn lưu trữ.
   */
  history: VisitorDailyPoint[] = [];

  // Các lựa chọn nhanh cho khoảng thời gian. Giữ KHOÁ i18n chứ không giữ chuỗi
  // đã dịch, nếu không mấy cái nút này sẽ kẹt ở ngôn ngữ lúc component khởi tạo.
  readonly rangeOptions = [
    { labelKey: 'visitor.range7', days: 7 },
    { labelKey: 'visitor.range30', days: 30 },
    { labelKey: 'visitor.range90', days: 90 },
    { labelKey: 'visitor.rangeAll', days: 0 }
  ];
  selectedRange = 30;

  // 1 = Portfolio, 2 = Trang login. null = cả hai.
  selectedArea: number | null = null;

  excludeSelf = true;
  excludeBots = true;
  pathContains = '';

  constructor(private visitorLogService: VisitorLogService) {}

  ngOnInit(): void {
    // Giá trị mặc định của 2 ô tick lấy từ bảng systemConfiguration
    // (key VisitorLog.ExcludeSelfByDefault / VisitorLog.ExcludeBotsByDefault),
    // nên đổi cấu hình là đổi được hành vi mà không cần build lại.
    this.visitorLogService.getSettings().subscribe({
      next: settings => {
        this.excludeSelf = settings.excludeSelfByDefault;
        this.excludeBots = settings.excludeBotsByDefault;
        this.applyFilter();
      },
      error: () => this.applyFilter() // không đọc được config thì dùng mặc định an toàn
    });
  }

  /** Dựng lại object filter -> các component con nhận @Input mới và tự tải lại. */
  applyFilter(): void {
    this.filter = {
      fromDate: this.fromDate(),
      toDate: null,
      area: this.selectedArea,
      eventType: null,
      pathContains: this.pathContains.trim() || null,
      ipAddress: null,
      visitorId: null,
      countryCode: null,
      excludeSelf: this.excludeSelf,
      excludeBots: this.excludeBots,
      sortColumn: 'visitedAt',
      sortDirection: 'desc',
      page: 1,
      pageSize: 50
    };

    this.loadSummary();
    this.loadHistory();
  }

  loadSummary(): void {
    this.visitorLogService.getSummary(this.filter).subscribe({
      next: data => (this.summary = data),
      error: err => console.error('Lỗi khi tải tổng quan:', err)
    });
  }

  private loadHistory(): void {
    if (this.selectedRange !== 0) {
      this.history = [];
      return;
    }

    this.visitorLogService.getHistory().subscribe({
      next: data => (this.history = data),
      error: err => console.error('Lỗi khi tải lịch sử dài hạn:', err)
    });
  }

  setTab(tab: TabKey): void {
    this.activeTab = tab;
  }

  /** Lọc mọi lượt truy cập của đúng một khách (bấm từ bảng). */
  showVisitor(visitorId: string): void {
    this.filter = { ...this.filter, visitorId, page: 1 };
    this.activeTab = 'visits';
  }

  clearVisitorFilter(): void {
    this.filter = { ...this.filter, visitorId: null, page: 1 };
  }

  /** Đánh dấu / bỏ đánh dấu IP xong thì mọi con số đều đổi -> tải lại tổng quan. */
  onDataChanged(): void {
    this.loadSummary();
  }

  private fromDate(): string | null {
    if (!this.selectedRange) return null;

    const date = new Date();
    date.setDate(date.getDate() - this.selectedRange);

    // Phải lấy khóa ngày theo GIỜ ĐỊA PHƯƠNG. Trước đây chỗ này dùng
    // date.toISOString().slice(0, 10) kèm chú thích "tránh lệch múi giờ" —
    // nhưng nó gây ra đúng điều đó: toISOString() đổi sang UTC trước, nên ở
    // UTC+7 mọi thời điểm từ 00:00 đến 07:00 sẽ lùi về ngày hôm trước và mốc
    // lọc bị rộng thêm một ngày. Sai lệch chỉ xuất hiện khi mở trang vào rạng
    // sáng, nên nó chạy đúng gần cả ngày rồi thỉnh thoảng lệch.
    // Backend so sánh theo biên ngày địa phương (VisitEventRepository:
    // filter.FromDate.Value.Date), nên client cũng phải gửi ngày địa phương.
    return toDayKey(date);
  }
}
