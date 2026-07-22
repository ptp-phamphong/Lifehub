import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
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

  /** KHOÁ i18n, không phải chuỗi đã dịch — xem §4.1 của kế hoạch i18n. */
  messageKey = '';

  private readonly translate = inject(TranslateService);

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
      this.messageKey = 'visitor.missingIp';
      return;
    }

    // Nhãn mặc định khi người dùng bỏ trống: dịch ở đây là đúng, vì nó chỉ quyết
    // định chuỗi được LƯU lần đầu. Đọc lại về sau thì đó là dữ liệu DB, hiện
    // nguyên văn bất kể ngôn ngữ đang chọn (§4.3).
    const label = this.newLabel.trim() || this.translate.instant('visitor.mine');

    this.visitorLogService.markAsMine(ip, undefined, label).subscribe({
      next: () => {
        this.newIp = '';
        this.newLabel = '';
        this.messageKey = '';
        this.load();
        this.dataChanged.emit();
      },
      error: err => {
        console.error('Lỗi khi thêm IP:', err);
        this.messageKey = 'visitor.addIpFailed';
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
      this.translate.instant('visitor.confirmDeleteKnownIp', {
        target: item.ipAddress || item.visitorId
      })
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
