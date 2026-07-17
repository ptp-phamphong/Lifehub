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
  @Input() title = '';
  @Input() subtitle = '';
  @Input() note = '';
  @Input() hasData = false;
  @Input() emptyText = 'Chưa có dữ liệu trong khoảng thời gian này';

  view: 'chart' | 'table' = 'chart';
}
