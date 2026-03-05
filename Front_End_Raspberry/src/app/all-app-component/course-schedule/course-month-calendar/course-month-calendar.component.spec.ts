import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseMonthCalendarComponent } from './course-month-calendar.component';

describe('CourseMonthCalendarComponent', () => {
  let component: CourseMonthCalendarComponent;
  let fixture: ComponentFixture<CourseMonthCalendarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CourseMonthCalendarComponent]
    });
    fixture = TestBed.createComponent(CourseMonthCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
