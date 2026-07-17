import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { VisitorLogService } from 'src/app/services/visitor-log.service';
import { VisitorLogFilter, VisitorProfile } from 'src/app/model/visitor-log.model';

/**
 * Gộp theo khách thay vì theo lượt xem: trả lời câu hỏi "ai đã quay lại bao nhiêu lần".
 * Sắp mặc định theo số lượt xem giảm dần -> người đọc kỹ nhất nằm trên cùng.
 */
@Component({
  selector: 'app-visitor-profile-list',
  templateUrl: './visitor-profile-list.component.html',
  styleUrls: ['./visitor-profile-list.component.scss']
})
export class VisitorProfileListComponent implements OnChanges {
  @Input() baseFilter!: VisitorLogFilter;

  @Output() dataChanged = new EventEmitter<void>();
  @Output() showVisitor = new EventEmitter<string>();

  visitors: VisitorProfile[] = [];
  sortColumn = 'views';
  sortDirection = 'desc';
  loading = false;

  constructor(private visitorLogService: VisitorLogService) {}

  ngOnChanges(): void {
    this.load();
  }

  load(): void {
    this.loading = true;

    const filter: VisitorLogFilter = {
      ...this.baseFilter,
      sortColumn: this.sortColumn,
      sortDirection: this.sortDirection
    };

    this.visitorLogService.getVisitors(filter).subscribe({
      next: data => {
        this.visitors = data;
        this.loading = false;
      },
      error: err => {
        console.error('Lỗi khi tải danh sách khách:', err);
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
    this.load();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return '';
    return this.sortDirection === 'asc' ? '▲' : '▼';
  }

  markAsMine(visitor: VisitorProfile): void {
    const label = window.prompt(
      `Dat ten cho khach nay (IP ${visitor.ipAddress}):`,
      visitor.knownLabel || 'Cua toi'
    );
    if (label === null) return;

    // Danh dau ca IP lan VisitorId: IP nha co the doi, nhung trinh duyet thi khong.
    this.visitorLogService.markAsMine(visitor.ipAddress, visitor.visitorId, label).subscribe({
      next: () => {
        this.dataChanged.emit();
        this.load();
      },
      error: err => console.error('Lỗi khi đánh dấu khách:', err)
    });
  }

  locationLabel(visitor: VisitorProfile): string {
    if (visitor.city && visitor.countryName) return `${visitor.city}, ${visitor.countryName}`;
    return visitor.countryName || visitor.city || '-';
  }
}
