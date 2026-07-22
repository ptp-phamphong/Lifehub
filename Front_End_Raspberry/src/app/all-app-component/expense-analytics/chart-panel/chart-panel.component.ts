import { Component, Input } from '@angular/core';

/**
 * Khung thẻ dùng chung cho mọi biểu đồ: tiêu đề, nút chuyển Biểu đồ/Bảng, và
 * trạng thái rỗng.
 *
 * Đây là thứ DUY NHẤT được chia sẻ giữa các biểu đồ. Không gộp phần vẽ vào một
 * component chung được: Angular render selector của component ở HTML namespace,
 * nên đặt <app-...> bên trong <svg> sẽ tạo ra một phần tử lạ trong cây SVG và
 * không vẽ gì cả - mà console vẫn sạch.
 *
 * Bảng số không phải tính năng phụ: vài bậc màu trong bảng phân loại nằm dưới
 * ngưỡng tương phản 3:1, và bảng chính là phương án bù bắt buộc cho chuyện đó.
 */
@Component({
  selector: 'app-chart-panel',
  templateUrl: './chart-panel.component.html',
  styleUrls: ['./chart-panel.component.scss']
})
export class ChartPanelComponent {
  /**
   * `title`/`subtitle`/`note` nhận CHUỖI ĐÃ DỊCH, dịch ở chỗ gọi.
   *
   * Cùng lựa chọn đã làm với `visit-trend-chart`: khung thẻ này không cần biết
   * `TranslateService` là gì chỉ vì mấy dòng tiêu đề, mà pipe ở template cha
   * vẫn tự chạy lại khi đổi ngôn ngữ.
   */
  @Input() title = '';
  @Input() subtitle = '';
  @Input() note = '';
  @Input() hasData = false;
  /** Ngược lại, chỗ này nhận KHOÁ: câu mặc định nằm sẵn trong từ điển. */
  @Input() emptyTextKey = 'analytics.emptyRange';

  view: 'chart' | 'table' = 'chart';
}
