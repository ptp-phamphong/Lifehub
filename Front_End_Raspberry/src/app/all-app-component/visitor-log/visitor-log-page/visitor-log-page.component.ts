import { Component, OnInit } from '@angular/core';
import { VisitorLogService } from 'src/app/services/visitor-log.service';
import { VisitorDailyPoint, VisitorLogFilter, VisitorSummary } from 'src/app/model/visitor-log.model';

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
   * Lịch sử dài hạn lấy từ bảng tổng hợp theo ngày. Chỉ hiện khi chọn "Tat ca",
   * vì đây là số liệu duy nhất còn sót lại sau khi dữ liệu thô bị xóa theo hạn lưu trữ.
   */
  history: VisitorDailyPoint[] = [];

  // Các lựa chọn nhanh cho khoảng thời gian.
  readonly rangeOptions = [
    { label: '7 ngay', days: 7 },
    { label: '30 ngay', days: 30 },
    { label: '90 ngay', days: 90 },
    { label: 'Tat ca', days: 0 }
  ];
  selectedRange = 30;

  // 1 = Portfolio, 2 = Trang login. null = ca hai.
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
      error: err => console.error('Loi khi tai tong quan:', err)
    });
  }

  private loadHistory(): void {
    if (this.selectedRange !== 0) {
      this.history = [];
      return;
    }

    this.visitorLogService.getHistory().subscribe({
      next: data => (this.history = data),
      error: err => console.error('Loi khi tai lich su dai han:', err)
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
    // Chỉ lấy phần ngày, tránh lệch múi giờ khi serialize.
    return date.toISOString().slice(0, 10);
  }
}
