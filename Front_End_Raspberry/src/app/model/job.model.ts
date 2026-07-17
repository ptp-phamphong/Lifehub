/** Khớp với API_Raspberry/Dto/JobRunDto.cs */
export interface JobRun {
  jobId: string;
  /** Tên tiếng Việt do backend dịch sẵn, vd "Đồng bộ lịch học UEH". */
  jobName: string;
  status: JobStatus;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number | null;
  /** Chỉ có khi status = Failed. */
  errorMessage?: string | null;
}

/**
 * Trạng thái do Hangfire quản lý.
 * Lưu ý: 'Scheduled' KHÔNG phải "đã lên lịch chạy sau" mà là "vừa lỗi, đang chờ thử lại".
 */
export type JobStatus = 'Succeeded' | 'Failed' | 'Processing' | 'Enqueued' | 'Scheduled';

/** Khóa gửi lên POST Jobs/Trigger/{jobKey} — phải khớp JobDefinitions.cs ở backend. */
export const JOB_KEY_SCHEDULE_IMPORT = 'schedule-import';
export const JOB_KEY_VISITOR_LOG_MAINTENANCE = 'visitor-log-maintenance';
