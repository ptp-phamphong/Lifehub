import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { CourseSchedule } from 'src/app/model/course-schedule.model';


@Component({
  selector: 'app-course-calendar',
  templateUrl: './course-calendar.component.html',
  styleUrls: ['./course-calendar.component.scss']
})
export class CourseCalendarComponent {
  showMonth: boolean = true;
  showExpense: boolean = false;
}
