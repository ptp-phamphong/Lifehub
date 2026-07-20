import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';

/** Một chỉ số đã tách sẵn phần số và phần đơn vị để render bằng hai cỡ chữ. */
interface Readout {
  value: string;
  unit: string;
}

@Component({
  selector: 'app-system-info-tab',
  templateUrl: './system-info-tab.component.html',
  styleUrls: ['./system-info-tab.component.scss']
})
export class SystemInfoTabComponent implements OnInit {
  result: any;
  loading: boolean = false;
  lastUpdated: Date = null;

  // Thang đo nhiệt cho đồng hồ CPU.
  readonly tempMin = 30;
  readonly tempMax = 90;
  // Raspberry Pi bắt đầu hạ xung nhịp ở 80°C - đây là con số người dùng thực sự
  // cần biết, nên nó được đánh dấu thẳng trên thang đo thay vì chỉ đổi màu chữ.
  readonly tempThrottle = 80;
  // Dưới ngưỡng này coi như mát; giữa hai ngưỡng là ấm.
  readonly tempWarm = 60;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.callApi();
  }

  callApi() {
    this.loading = true;
    const url = `${environment.apiBaseUrl}/SystemInfo`;

    this.http.get(url).subscribe({
      next: (res) => {
        this.result = res;
        this.loading = false;
        this.lastUpdated = new Date();
      },
      error: (err) => {
        this.result = { error: err.message };
        this.loading = false;
      }
    });
  }

  /** Nhiệt độ CPU dạng số; NaN nếu backend trả chuỗi lạ. */
  get cpuTemp(): number {
    return parseFloat(this.result?.cpuTemperature);
  }

  get hasCpuTemp(): boolean {
    return !isNaN(this.cpuTemp);
  }

  /** Vị trí kim trên thang đo, tính theo phần trăm bề ngang. */
  get tempPercent(): number {
    return this.clampPercent(this.cpuTemp, this.tempMin, this.tempMax);
  }

  /** Vị trí vạch ngưỡng hạ xung trên cùng thang đo. */
  get throttlePercent(): number {
    return this.clampPercent(this.tempThrottle, this.tempMin, this.tempMax);
  }

  /** 'mat' | 'am' | 'nong' - quyết định màu của kim và của con số. */
  get tempState(): string {
    if (!this.hasCpuTemp) return 'mat';
    if (this.cpuTemp >= this.tempThrottle) return 'nong';
    if (this.cpuTemp >= this.tempWarm) return 'am';
    return 'mat';
  }

  get tempStateLabel(): string {
    switch (this.tempState) {
      case 'nong': return 'Đang hạ xung nhịp';
      case 'am':   return 'Ấm';
      default:     return 'Mát';
    }
  }

  /** RAM còn trống, đã bỏ chữ tiếng Anh do `free -h` sinh ra. */
  get ram(): Readout {
    return this.splitReadout(this.result?.ramAvailable);
  }

  /** Dung lượng đĩa còn trống, đã bỏ chữ tiếng Anh do `df -h` sinh ra. */
  get disk(): Readout {
    return this.splitReadout(this.result?.memoryAvailable);
  }

  /**
   * Backend ghép sẵn chuỗi kiểu "2.7GiB available" / "19GB free" (xem
   * CurrentInfoService: `awk '{print $7"B available"}'`). Giao diện là tiếng Việt
   * nên tách lấy số + đơn vị và bỏ phần chữ tiếng Anh, thay vì đổi hợp đồng API.
   */
  private splitReadout(raw: string): Readout {
    if (!raw) return { value: '—', unit: '' };
    if (raw.startsWith('ERR:')) return { value: '—', unit: '' };

    const match = /^([\d.,]+)\s*([A-Za-z]+)?/.exec(raw.trim());
    if (!match) return { value: raw, unit: '' };

    return { value: match[1], unit: match[2] || '' };
  }

  private clampPercent(value: number, min: number, max: number): number {
    if (isNaN(value)) return 0;
    const pct = ((value - min) / (max - min)) * 100;
    return Math.max(0, Math.min(100, pct));
  }
}
