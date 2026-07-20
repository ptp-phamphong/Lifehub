import { HttpClient } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CourseSchedule } from 'src/app/model/course-schedule.model';
import { SemesterMetadata } from 'src/app/model/semester-metadata.model';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-course-schedule-form',
  templateUrl: './course-schedule-form.component.html',
  styleUrls: ['./course-schedule-form.component.scss']
})
export class CourseScheduleFormComponent {
  courseName: string = '';
  courseCode: string = '';
  startDate: Date | null = null;
  endDate: Date | null = null;
  startTime: string = '';
  endTime: string = '';
  room: string = '';
  address: string = '';
  semesterMetadataId: number | null = null;
  dayOfWeek: number | null = null;
  message: string = '';
  // Xem ghi chú ở expense-record.component.ts: emoji cũ là tín hiệu duy nhất
  // phân biệt thành công/lỗi, nên bỏ emoji thì phải có trường trạng thái này.
  messageType: 'success' | 'error' | 'warning' = 'success';
  id: number = 0;
  semesters: SemesterMetadata[] = [];

  constructor(
    private http: HttpClient,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<CourseScheduleFormComponent>
  ) {}

  ngOnInit() {
    this.id = this.data.id;
    this.loadSemesters();
    if (this.id > 0) {
      this.loadCourse();
    }
  }

  loadSemesters() {
    this.http.get<SemesterMetadata[]>(`${environment.apiBaseUrl}/GetAllSemesterMetadata`)
      .subscribe({
        next: (res) => {
          this.semesters = res || [];
        },
        error: (err) => {
          console.error(err);
          this.semesters = [];
        }
      });
  }

  loadCourse() {
    this.http.get<CourseSchedule>(`${environment.apiBaseUrl}/GetCourseScheduleById/${this.id}`)
      .subscribe({
        next: (res) => {
          this.courseName = res.courseName || '';
          this.courseCode = res.courseCode || '';
          this.startDate = res.startDate ? new Date(res.startDate) : null;
          this.endDate = res.endDate ? new Date(res.endDate) : null;
          this.startTime = res.startTime || '';
          this.endTime = res.endTime || '';
          this.room = res.room || '';
          this.address = res.address || '';
          this.semesterMetadataId = res.semesterMetadataId ?? null;
          this.dayOfWeek = res.dayOfWeek ?? null;
        },
        error: (err) => {
          console.error(err);
          this.messageType = 'error';
          this.message = 'Tải dữ liệu thất bại!';
        }
      });
  }

  submitForm() {
    if (!this.courseName || !this.courseCode) {
      this.messageType = 'warning';
      this.message = 'Vui lòng nhập tên môn và mã môn.';
      return;
    }

    const payload: CourseSchedule = {
      courseName: this.courseName,
      courseCode: this.courseCode,
      startDate: this.startDate ? this.toLocalDateString(this.startDate) : undefined,
      endDate: this.endDate ? this.toLocalDateString(this.endDate) : undefined,
      startTime: this.startTime || undefined,
      endTime: this.endTime || undefined,
      room: this.room,
      address: this.address,
      semesterMetadataId: this.semesterMetadataId ?? undefined,
      dayOfWeek: this.dayOfWeek ?? undefined,
    };

    if (this.id > 0) {
      this.http.put(`${environment.apiBaseUrl}/UpdateCourseSchedule/${this.id}`, payload)
        .subscribe({
          next: () => {
            this.messageType = 'success';
            this.message = 'Cập nhật thành công!';
            this.dialogRef.close('saved');
          },
          error: (err) => {
            console.error(err);
            this.messageType = 'error';
            this.message = 'Cập nhật thất bại!';
          }
        });
    } else {
      this.http.post(`${environment.apiBaseUrl}/AddCourseSchedule`, payload)
        .subscribe({
          next: () => {
            this.messageType = 'success';
            this.message = 'Thêm thành công!';
            this.dialogRef.close('saved');
          },
          error: (err) => {
            console.error(err);
            this.messageType = 'error';
            this.message = 'Thêm thất bại!';
          }
        });
    }
  }

  cancel() {
    this.dialogRef.close();
  }

  private toLocalDateString(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
