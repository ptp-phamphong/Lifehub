import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MainTabComponent } from './all-app-component/main-tab/main-tab.component';
import { SystemInfoTabComponent } from './all-app-component/system-info-tab/system-info-tab.component';
import { ExpenseRecordComponent } from './all-app-component/expense-record/expense-record.component';
import { FormsModule } from '@angular/forms';
import { ExpenseRecordListComponent } from './all-app-component/expense-record-list/expense-record-list.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatNativeDateModule, NativeDateAdapter } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';

const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

export class AppDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: Object): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  override parse(value: any): Date | null {
    if (typeof value === 'string') {
      const parts = value.split('/');
      if (parts.length === 3) {
        const day = +parts[0];
        const month = +parts[1] - 1;
        const year = +parts[2];
        return new Date(year, month, day);
      }
    }
    return super.parse(value);
  }
}
import { MatFormFieldModule } from '@angular/material/form-field';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReasonTypeListComponent } from './all-app-component/reason-type/reason-type-list/reason-type-list.component';
import { ReasonTypeFormComponent } from './all-app-component/reason-type/reason-type-form/reason-type-form.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { MonthPaginationComponent } from './all-app-component/month-pagination/month-pagination.component';
import { CourseScheduleListComponent } from './all-app-component/course-schedule/course-schedule-list/course-schedule-list.component';
import { CourseScheduleFormComponent } from './all-app-component/course-schedule/course-schedule-form/course-schedule-form.component';
import { CourseCalendarComponent } from './all-app-component/course-schedule/course-calendar/course-calendar.component';
import { CourseWeekCalendarComponent } from './all-app-component/course-schedule/course-week-calendar/course-week-calendar.component';
import { CourseMonthCalendarComponent } from './all-app-component/course-schedule/course-month-calendar/course-month-calendar.component';
import { SettingsTabComponent } from './all-app-component/settings-tab/settings-tab.component';
import { SemesterMetadataListComponent } from './all-app-component/semester-metadata/semester-metadata-list/semester-metadata-list.component';
import { SemesterMetadataFormComponent } from './all-app-component/semester-metadata/semester-metadata-form/semester-metadata-form.component';
import { SystemConfigurationListComponent } from './all-app-component/system-configuration/system-configuration-list/system-configuration-list.component';
import { SystemConfigurationFormComponent } from './all-app-component/system-configuration/system-configuration-form/system-configuration-form.component';

@NgModule({
  declarations: [
    AppComponent,
    MainTabComponent,
    SystemInfoTabComponent,
    ExpenseRecordComponent,
    ExpenseRecordListComponent,
    ReasonTypeListComponent,
    ReasonTypeFormComponent,
    MonthPaginationComponent,
    CourseScheduleListComponent,
    CourseScheduleFormComponent,
    CourseCalendarComponent,
    CourseWeekCalendarComponent,
    CourseMonthCalendarComponent,
    SettingsTabComponent,
    SemesterMetadataListComponent,
    SemesterMetadataFormComponent,
    SystemConfigurationListComponent,
    SystemConfigurationFormComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    NgbModule,
    FormsModule,
    MatDialogModule,
    BrowserAnimationsModule,
    NgSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    MatFormFieldModule,
    BrowserAnimationsModule
  ],
  providers: [
    { provide: DateAdapter, useClass: AppDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
