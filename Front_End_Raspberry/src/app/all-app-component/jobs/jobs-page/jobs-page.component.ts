import { Component, OnDestroy, OnInit } from '@angular/core';
import { JobsService } from 'src/app/services/jobs.service';
import {
  JOB_KEY_SCHEDULE_IMPORT,
  JOB_KEY_VISITOR_LOG_MAINTENANCE,
  JobRun,
  JobStatus
} from 'src/app/model/job.model';

@Component({
  selector: 'app-jobs-page',
  templateUrl: './jobs-page.component.html',
  styleUrls: ['./jobs-page.component.scss']
})
export class JobsPageComponent implements OnInit, OnDestroy {
  /** Các tác vụ có nút "Chạy ngay". Khóa phải khớp JobDefinitions.cs ở backend. */
  readonly jobs = [
    { key: JOB_KEY_SCHEDULE_IMPORT, label: 'Đồng bộ lịch học UEH' },
    { key: JOB_KEY_VISITOR_LOG_MAINTENANCE, label: 'Bảo trì nhật ký truy cập' }
  ];

  history: JobRun[] = [];
  loading = false;
  loadFailed = false;

  /** Khóa của tác vụ đang gửi yêu cầu chạy, để chỉ khóa đúng nút vừa bấm. */
  triggering: string | null = null;
  message: string | null = null;

  /** Dòng lỗi đang mở rộng. */
  expandedJobId: string | null = null;

  private pollTimer: any = null;

  constructor(private jobsService: JobsService) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  ngOnDestroy(): void {
    this.clearPoll();
  }

  loadHistory(): void {
    this.loading = true;
    this.jobsService.getHistory().subscribe({
      next: data => {
        this.history = data;
        this.loading = false;
        this.loadFailed = false;
        this.schedulePollIfBusy();
      },
      error: err => {
        console.error('Lỗi khi tải lịch sử tác vụ:', err);
        this.loading = false;
        this.loadFailed = true;
      }
    });
  }

  runJob(jobKey: string): void {
    this.triggering = jobKey;
    this.message = null;

    this.jobsService.trigger(jobKey).subscribe({
      next: () => {
        this.triggering = null;
        this.message = 'Đã gửi yêu cầu chạy. Theo dõi trạng thái ở bảng bên dưới.';
        // Tác vụ chạy nền nên phải tải lại mới thấy; schedulePollIfBusy sẽ tự theo tiếp
        // cho tới khi tác vụ xong.
        this.loadHistory();
      },
      error: err => {
        console.error('Lỗi khi chạy tác vụ:', err);
        this.triggering = null;
        this.message = 'Không gửi được yêu cầu chạy. Thử lại sau.';
      }
    });
  }

  toggleError(job: JobRun): void {
    if (!job.errorMessage) return;
    this.expandedJobId = this.expandedJobId === job.jobId ? null : job.jobId;
  }

  /** Nhãn tiếng Việt cho trạng thái Hangfire. */
  statusLabel(status: JobStatus): string {
    switch (status) {
      case 'Succeeded': return 'Thành công';
      case 'Failed': return 'Thất bại';
      case 'Processing': return 'Đang chạy';
      case 'Enqueued': return 'Đang chờ';
      case 'Scheduled': return 'Chờ thử lại';
      default: return status;
    }
  }

  statusClass(status: JobStatus): string {
    switch (status) {
      case 'Succeeded': return 'badge-succeeded';
      case 'Failed': return 'badge-failed';
      case 'Processing':
      case 'Enqueued': return 'badge-running';
      case 'Scheduled': return 'badge-retry';
      default: return 'badge-running';
    }
  }

  /** Đổi mili giây sang dạng dễ đọc; job đồng bộ UEH chạy tới ~30 giây. */
  formatDuration(ms?: number | null): string {
    if (ms === null || ms === undefined) return '—';
    if (ms < 1000) return `${ms} ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)} giây`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} phút ${Math.round(seconds % 60)} giây`;
  }

  /** Còn tác vụ chưa chạy xong thì tự tải lại, xong hết thì thôi (đỡ gọi API vô ích). */
  private schedulePollIfBusy(): void {
    this.clearPoll();

    const busy = this.history.some(
      job => job.status === 'Enqueued' || job.status === 'Processing' || job.status === 'Scheduled'
    );
    if (!busy) return;

    this.pollTimer = setTimeout(() => this.loadHistory(), 3000);
  }

  private clearPoll(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
