import { HttpClient } from '@angular/common/http';
import { Component, ViewContainerRef, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { environment } from 'src/environments/environment';
import { CourseSchedule } from 'src/app/model/course-schedule.model';
import { SemesterMetadata } from 'src/app/model/semester-metadata.model';
import { dowTranslationKey } from 'src/app/utils/day-of-week';
import { CourseScheduleFormComponent } from '../course-schedule-form/course-schedule-form.component';

@Component({
  selector: 'app-course-schedule-list',
  templateUrl: './course-schedule-list.component.html',
  styleUrls: ['./course-schedule-list.component.scss']
})
export class CourseScheduleListComponent {
  courses: CourseSchedule[] = [];
  semesters: SemesterMetadata[] = [];
  selectedSemesterMetadataId: number | null = null;

  /**
   * Thông báo import tách làm hai: khoá i18n do client tự sinh, và chuỗi
   * backend trả nguyên văn. Lưu chuỗi đã dịch vào một trường sẽ khiến nó đứng
   * yên ở ngôn ngữ cũ khi người dùng chuyển ngôn ngữ (§4.1 kế hoạch i18n).
   */
  importMessageKey: string = '';
  importMessageParams: Record<string, unknown> | undefined;
  importMessageRaw: string = '';
  importError: boolean = false;
  importing: boolean = false;

  private readonly translate = inject(TranslateService);

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private viewContainerRef: ViewContainerRef
  ) { }

  ngOnInit() {
    this.loadCourses();
    this.loadSemesters();
  }

  loadSemesters() {
    this.http.get<SemesterMetadata[]>(`${environment.apiBaseUrl}/GetAllSemesterMetadata`).subscribe({
      next: (data) => {
        this.semesters = data;
      },
      error: (err) => console.error('Lỗi khi tải học kỳ:', err)
    });
  }

  loadCourses() {
    this.http.get<CourseSchedule[]>(`${environment.apiBaseUrl}/GetAllCourseSchedule`).subscribe({
      next: (data) => {
        this.courses = data;
      },
      error: (err) => console.error('Lỗi khi tải dữ liệu:', err)
    });
  }

  openEditDialog(id: number): void {
    const dialogRef = this.dialog.open(CourseScheduleFormComponent, {
      width: '95vw',
      maxWidth: '550px',
      maxHeight: '92vh',
      data: { id },
      viewContainerRef: this.viewContainerRef
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'saved') {
        this.loadCourses();
      }
    });
  }

  deleteRecord(course: CourseSchedule) {
    // `window.confirm` chặn luồng và đóng ngay nên `instant()` ở đây là an toàn:
    // chuỗi dùng xong là bỏ, không lưu vào trường nào.
    const confirmed = window.confirm(
      this.translate.instant('course.confirmDelete', { name: course.courseName })
    );
    if (!confirmed) {
      return;
    }

    this.http.delete(`${environment.apiBaseUrl}/DeleteCourseSchedule/${course.id}`)
      .subscribe({
        next: () => {
          this.loadCourses();
        },
        error: (err) => {
          console.error(err);
        }
      });
  }

  /**
   * Nhãn thứ trong tuần. Là method nên được tính lại mỗi chu kỳ change
   * detection — đổi ngôn ngữ là đổi theo, khác với việc gán vào một trường.
   */
  dayOfWeekLabel(dow?: number): string {
    // Dạng đầy đủ: cột bảng đủ rộng. Bản cũ dùng 'Thứ 2'…'Thứ 7' nhưng lại rút
    // gọn Chủ nhật thành 'CN' — nay thống nhất, không còn lệch.
    const key = dowTranslationKey(dow, 'dowLong');
    return key ? this.translate.instant(key) : '';
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.clearImportMessage();
    this.importing = true;

    const formData = new FormData();
    formData.append('file', file);
    if (this.selectedSemesterMetadataId != null) {
      formData.append('semesterMetadataId', String(this.selectedSemesterMetadataId));
    }

    this.http.post<{ count: number }>(`${environment.apiBaseUrl}/ImportCourseSchedule`, formData)
      .subscribe({
        next: (res) => {
          this.importMessageKey = 'course.importSuccess';
          this.importMessageParams = { count: res.count };
          this.importError = false;
          this.importing = false;
          this.loadCourses();
        },
        error: (err) => {
          const raw = err.error?.toString();
          if (raw) {
            this.importMessageRaw = raw;
          } else {
            this.importMessageKey = 'course.importFailed';
          }
          this.importError = true;
          this.importing = false;
        }
      });

    // Reset input to allow re-selecting the same file
    input.value = '';
  }

  resetImportFromUeh() {
    const confirmed = window.confirm(this.translate.instant('course.confirmResetImport'));
    if (!confirmed) {
      return;
    }

    const confirmed2 = window.confirm(this.translate.instant('course.confirmResetImportAgain'));
    if (!confirmed2) {
      return;
    }

    this.clearImportMessage();
    this.importing = true;

    this.http.post<{ count: number; message?: string }>(`${environment.apiBaseUrl}/ResetImportCourseScheduleFromUeh`, {})
      .subscribe({
        next: (res) => {
          if (res.message) {
            this.importMessageRaw = res.message;
          } else {
            this.importMessageKey = 'course.resetImportSuccess';
            this.importMessageParams = { count: res.count };
          }
          this.importError = false;
          this.importing = false;
          this.loadCourses();
        },
        error: (err) => {
          const raw = err.error?.message || err.error?.toString();
          if (raw) {
            this.importMessageRaw = raw;
          } else {
            this.importMessageKey = 'course.resetImportFailed';
          }
          this.importError = true;
          this.importing = false;
        }
      });
  }

  deleteAll() {
    const confirmed = window.confirm(this.translate.instant('course.confirmDeleteAll'));
    if (!confirmed) {
      return;
    }
    const confirmed2 = window.confirm(this.translate.instant('course.confirmDeleteAllAgain'));
    if (!confirmed2) {
      return;
    }
    if (this.selectedSemesterMetadataId == null) {
      window.alert(this.translate.instant('course.selectSemesterToDelete'));
      return;
    }

    this.http.delete(`${environment.apiBaseUrl}/DeleteBySemesterMetadataId/${this.selectedSemesterMetadataId}`)
      .subscribe({
        next: () => {
          this.loadCourses();
        },
        error: (err) => {
          console.error(err);
        }
      });
  }

  /**
   * Tên + năm học kỳ đến từ DB nên hiển thị nguyên văn ở mọi ngôn ngữ; chỉ câu
   * thay thế khi chưa gán học kỳ mới là nhãn và được dịch (§4.3).
   */
  semesterDisplay(item: CourseSchedule): string {
    if (item.semesterName && item.semesterYear) {
      return `${item.semesterName} (${item.semesterYear})`;
    }

    if (item.semesterName) {
      return item.semesterName;
    }

    return this.translate.instant('course.noSemester');
  }

  private clearImportMessage() {
    this.importMessageKey = '';
    this.importMessageParams = undefined;
    this.importMessageRaw = '';
    this.importError = false;
  }
}
