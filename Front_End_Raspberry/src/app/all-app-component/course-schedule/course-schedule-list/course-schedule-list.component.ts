import { HttpClient } from '@angular/common/http';
import { Component, ViewContainerRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';
import { CourseSchedule } from 'src/app/model/course-schedule.model';
import { SemesterMetadata } from 'src/app/model/semester-metadata.model';
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
  importMessage: string = '';
  importError: boolean = false;
  importing: boolean = false;

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
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa môn "${course.courseName}" không?`);
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

  dayOfWeekLabel(dow?: number): string {
    const labels: { [key: number]: string } = {
      2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5',
      6: 'Thứ 6', 7: 'Thứ 7', 8: 'CN'
    };
    return dow ? labels[dow] || '' : '';
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importMessage = '';
    this.importError = false;
    this.importing = true;

    const formData = new FormData();
    formData.append('file', file);
    if (this.selectedSemesterMetadataId != null) {
      formData.append('semesterMetadataId', String(this.selectedSemesterMetadataId));
    }

    this.http.post<{ count: number }>(`${environment.apiBaseUrl}/ImportCourseSchedule`, formData)
      .subscribe({
        next: (res) => {
          this.importMessage = `Import thành công ${res.count} dòng!`;
          this.importError = false;
          this.importing = false;
          this.loadCourses();
        },
        error: (err) => {
          this.importMessage = err.error?.toString() || 'Import thất bại!';
          this.importError = true;
          this.importing = false;
        }
      });

    // Reset input to allow re-selecting the same file
    input.value = '';
  }

  deleteAll() {
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ không?`);
    if (!confirmed) {
      return;
    }
    const confirmed2 = window.confirm(`Chắc chắn nha, đây là không thể thu hồi`);
    if (!confirmed2) {
      return;
    }
    if (this.selectedSemesterMetadataId == null) {
      window.alert('Vui lòng chọn học kỳ cần xóa toàn bộ.');
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

  semesterDisplay(item: CourseSchedule): string {
    if (item.semesterName && item.semesterYear) {
      return `${item.semesterName} (${item.semesterYear})`;
    }

    if (item.semesterName) {
      return item.semesterName;
    }

    return 'Chưa gán học kỳ';
  }
}
