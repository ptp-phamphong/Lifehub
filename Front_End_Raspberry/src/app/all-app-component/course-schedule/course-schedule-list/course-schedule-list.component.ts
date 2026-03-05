import { HttpClient } from '@angular/common/http';
import { Component, ViewContainerRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';
import { CourseSchedule } from 'src/app/model/course-schedule.model';
import { CourseScheduleFormComponent } from '../course-schedule-form/course-schedule-form.component';

@Component({
  selector: 'app-course-schedule-list',
  templateUrl: './course-schedule-list.component.html',
  styleUrls: ['./course-schedule-list.component.scss']
})
export class CourseScheduleListComponent {
  courses: CourseSchedule[] = [];

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private viewContainerRef: ViewContainerRef
  ) {}

  ngOnInit() {
    this.loadCourses();
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
      width: '550px',
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
}
