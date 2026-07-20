import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { VisitorLogService } from 'src/app/services/visitor-log.service';
import { PagedResult, VisitEvent, VisitorLogFilter } from 'src/app/model/visitor-log.model';

@Component({
  selector: 'app-visitor-log-list',
  templateUrl: './visitor-log-list.component.html',
  styleUrls: ['./visitor-log-list.component.scss']
})
export class VisitorLogListComponent implements OnChanges {
  /** Bộ lọc chung do màn hình cha giữ (khoảng ngày, khu vực, ẩn traffic của mình...). */
  @Input() baseFilter!: VisitorLogFilter;

  /** Báo cho cha biết cần tải lại (ví dụ vừa đánh dấu một IP là của mình). */
  @Output() dataChanged = new EventEmitter<void>();

  /** Xem toàn bộ lượt truy cập của một khách. */
  @Output() showVisitor = new EventEmitter<string>();

  result: PagedResult<VisitEvent> | null = null;

  sortColumn = 'visitedAt';
  sortDirection = 'desc';
  page = 1;
  pageSize = 50;

  readonly pageSizes = [25, 50, 100];

  loading = false;

  constructor(private visitorLogService: VisitorLogService) {}

  ngOnChanges(): void {
    // Đổi bộ lọc thì luôn quay về trang 1, nếu không sẽ rơi vào trang trống.
    this.page = 1;
    this.load();
  }

  load(): void {
    this.loading = true;

    const filter: VisitorLogFilter = {
      ...this.baseFilter,
      sortColumn: this.sortColumn,
      sortDirection: this.sortDirection,
      page: this.page,
      pageSize: this.pageSize
    };

    this.visitorLogService.getPaged(filter).subscribe({
      next: data => {
        this.result = data;
        this.loading = false;
      },
      error: err => {
        console.error('Lỗi khi tải nhật ký truy cập:', err);
        this.loading = false;
      }
    });
  }

  onSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'desc';
    }
    this.page = 1;
    this.load();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return '';
    return this.sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  goToPage(page: number): void {
    if (!this.result) return;
    if (page < 1 || page > this.result.totalPages) return;

    this.page = page;
    this.load();
  }

  onPageSizeChange(): void {
    this.page = 1;
    this.load();
  }

  markAsMine(row: VisitEvent): void {
    if (!row.ipAddress) return;

    const label = window.prompt(
      `Dat ten cho IP ${row.ipAddress} (vi du: Nha, Dien thoai 4G):`,
      row.knownLabel || 'Cua toi'
    );
    if (label === null) return;

    this.visitorLogService.markAsMine(row.ipAddress, undefined, label).subscribe({
      next: () => {
        // Cha se tai lai: IP nay bi an khoi bang neu dang bat "an traffic cua minh",
        // ke ca cac luot truy cap cu.
        this.dataChanged.emit();
        this.load();
      },
      error: err => console.error('Lỗi khi đánh dấu IP:', err)
    });
  }

  /** Số trang hiển thị quanh trang hiện tại (không in ra cả nghìn nút). */
  get pageWindow(): number[] {
    if (!this.result) return [];

    const total = this.result.totalPages;
    const current = this.result.page;
    const span = 2;

    const from = Math.max(1, current - span);
    const to = Math.min(total, current + span);

    const pages: number[] = [];
    for (let i = from; i <= to; i++) pages.push(i);
    return pages;
  }

  eventTypeLabel(row: VisitEvent): string {
    switch (row.eventType) {
      case 2: return 'Login OK';
      case 3: return 'Login FAIL';
      default: return 'Xem trang';
    }
  }

  formatDuration(ms?: number): string {
    if (!ms || ms <= 0) return '-';
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }

  locationLabel(row: VisitEvent): string {
    if (!row.countryName && !row.city) return '-';
    if (row.city && row.countryName) return `${row.city}, ${row.countryName}`;
    return row.countryName || row.city || '-';
  }
}
