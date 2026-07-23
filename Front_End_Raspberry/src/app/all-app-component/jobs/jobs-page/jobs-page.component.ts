import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { JobsService } from 'src/app/services/jobs.service';
import { LanguageService } from 'src/app/services/language.service';
import {
  JOB_KEY_SCHEDULE_IMPORT,
  JOB_KEY_VISITOR_LOG_MAINTENANCE,
  JOB_KEY_DEMO_RESEED,
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
    { key: JOB_KEY_SCHEDULE_IMPORT, labelKey: 'jobs.runScheduleImport' },
    { key: JOB_KEY_VISITOR_LOG_MAINTENANCE, labelKey: 'jobs.runVisitorLogMaintenance' },
    // Chạy trên instance demo (raspberry_demo) qua cầu nối kho Hangfire ở JobsService.
    { key: JOB_KEY_DEMO_RESEED, labelKey: 'jobs.runDemoReseed' }
  ];

  history: JobRun[] = [];
  loading = false;
  loadFailed = false;

  /** Khóa của tác vụ đang gửi yêu cầu chạy, để chỉ khóa đúng nút vừa bấm. */
  triggering: string | null = null;
  /** KHOÁ i18n, không phải chuỗi đã dịch (§4.1) — mọi thông báo ở đây do client sinh. */
  messageKey: string | null = null;

  /** Dòng lỗi đang mở rộng. */
  expandedJobId: string | null = null;

  private pollTimer: any = null;

  private readonly translate = inject(TranslateService);
  private readonly locale = inject(LanguageService).locale;

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
    this.messageKey = null;

    this.jobsService.trigger(jobKey).subscribe({
      next: () => {
        this.triggering = null;
        this.messageKey = 'jobs.triggered';
        // Tác vụ chạy nền nên phải tải lại mới thấy; schedulePollIfBusy sẽ tự theo tiếp
        // cho tới khi tác vụ xong.
        this.loadHistory();
      },
      error: err => {
        console.error('Lỗi khi chạy tác vụ:', err);
        this.triggering = null;
        this.messageKey = 'jobs.triggerFailed';
      }
    });
  }

  toggleError(job: JobRun): void {
    if (!job.errorMessage) return;
    this.expandedJobId = this.expandedJobId === job.jobId ? null : job.jobId;
  }

  /**
   * Nhãn hiển thị cho trạng thái Hangfire. Là method nên tính lại mỗi chu kỳ
   * change detection, đổi ngôn ngữ là đổi theo.
   *
   * Trạng thái lạ ngoài danh sách trả về chính chuỗi Hangfire — đó là dữ liệu
   * từ backend nên hiển thị nguyên văn, không bịa nhãn (§4.3).
   */
  statusLabel(status: JobStatus): string {
    switch (status) {
      case 'Succeeded': return this.translate.instant('jobs.statusSucceeded');
      case 'Failed': return this.translate.instant('jobs.statusFailed');
      case 'Processing': return this.translate.instant('jobs.statusProcessing');
      case 'Enqueued': return this.translate.instant('jobs.statusEnqueued');
      case 'Scheduled': return this.translate.instant('jobs.statusScheduled');
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

  /**
   * Đổi mili giây sang dạng dễ đọc; job đồng bộ UEH chạy tới ~30 giây.
   *
   * Dùng `toLocaleString` thay cho `toFixed`: `toFixed` luôn cho dấu chấm thập
   * phân, nên bản tiếng Việt trước đây hiển thị `1.5 giây` trong khi đúng phải
   * là `1,5 giây`. `ms` là ký hiệu quốc tế nên không dịch.
   */
  formatDuration(ms?: number | null): string {
    if (ms === null || ms === undefined) return '—';
    if (ms < 1000) return `${ms} ms`;

    const seconds = ms / 1000;
    if (seconds < 60) {
      const value = seconds.toLocaleString(this.locale(), {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      });
      return this.translate.instant('jobs.durationSeconds', { value });
    }

    return this.translate.instant('jobs.durationMinutes', {
      minutes: Math.floor(seconds / 60),
      seconds: Math.round(seconds % 60)
    });
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
