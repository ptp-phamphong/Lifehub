import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { VisitorLogService } from 'src/app/services/visitor-log.service';
import { VisitorKnownIp } from 'src/app/model/visitor-log.model';

/**
 * Quản lý danh sách "IP của tôi".
 * Các IP đăng nhập thành công vào trang admin sẽ tự xuất hiện ở đây (nhãn "auto: login ..."),
 * nên khi nhà mạng đổi IP thì chỉ cần đăng nhập một lần là tự đánh dấu lại.
 */
@Component({
  selector: 'app-known-ip-list',
  templateUrl: './known-ip-list.component.html',
  styleUrls: ['./known-ip-list.component.scss']
})
export class KnownIpListComponent implements OnInit {
  @Output() dataChanged = new EventEmitter<void>();

  knownIps: VisitorKnownIp[] = [];

  newIp = '';
  newLabel = '';
  message = '';

  constructor(private visitorLogService: VisitorLogService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.visitorLogService.getKnownIps().subscribe({
      next: data => (this.knownIps = data),
      error: err => console.error('Lỗi khi tải danh sách IP:', err)
    });
  }

  add(): void {
    const ip = this.newIp.trim();
    if (!ip) {
      this.message = 'Nhập địa chỉ IP trước đã.';
      return;
    }

    this.visitorLogService.markAsMine(ip, undefined, this.newLabel.trim() || 'Cua toi').subscribe({
      next: () => {
        this.newIp = '';
        this.newLabel = '';
        this.message = '';
        this.load();
        this.dataChanged.emit();
      },
      error: err => {
        console.error('Lỗi khi thêm IP:', err);
        this.message = 'Không thêm được IP.';
      }
    });
  }

  /** Bật/tắt cờ "của tôi" mà không xóa dòng - vẫn giữ được cái nhãn đã đặt. */
  toggleSelf(item: VisitorKnownIp): void {
    this.visitorLogService.updateKnownIp(item.id, item.label || '', !item.isSelf).subscribe({
      next: () => {
        this.load();
        this.dataChanged.emit();
      },
      error: err => console.error('Lỗi khi cập nhật IP:', err)
    });
  }

  remove(item: VisitorKnownIp): void {
    const confirmed = window.confirm(
      `Xoa danh dau cho ${item.ipAddress || item.visitorId}? Cac luot truy cap cua no se hien lai trong thong ke.`
    );
    if (!confirmed) return;

    this.visitorLogService.deleteKnownIp(item.id).subscribe({
      next: () => {
        this.load();
        this.dataChanged.emit();
      },
      error: err => console.error('Lỗi khi xóa IP:', err)
    });
  }
}
