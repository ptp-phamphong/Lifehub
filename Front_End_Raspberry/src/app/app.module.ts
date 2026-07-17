import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
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
import { LoadingInterceptor } from './interceptors/loading.interceptor';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { LoginComponent } from './all-app-component/login/login.component';

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
import { ThemeSettingsComponent } from './all-app-component/theme-settings/theme-settings.component';
import { UserListComponent } from './all-app-component/user-management/user-list/user-list.component';
import { UserFormComponent } from './all-app-component/user-management/user-form/user-form.component';
import { VisitorLogPageComponent } from './all-app-component/visitor-log/visitor-log-page/visitor-log-page.component';
import { JobsPageComponent } from './all-app-component/jobs/jobs-page/jobs-page.component';
import { VisitorOverviewComponent } from './all-app-component/visitor-log/visitor-overview/visitor-overview.component';
import { VisitorLogListComponent } from './all-app-component/visitor-log/visitor-log-list/visitor-log-list.component';
import { VisitorProfileListComponent } from './all-app-component/visitor-log/visitor-profile-list/visitor-profile-list.component';
import { KnownIpListComponent } from './all-app-component/visitor-log/known-ip-list/known-ip-list.component';
import { VisitTrendChartComponent } from './all-app-component/visitor-log/visit-trend-chart/visit-trend-chart.component';
import { ExpenseAnalyticsPageComponent } from './all-app-component/expense-analytics/expense-analytics-page/expense-analytics-page.component';
import { ChartPanelComponent } from './all-app-component/expense-analytics/chart-panel/chart-panel.component';
import { AnalyticsKpiRowComponent } from './all-app-component/expense-analytics/analytics-kpi-row/analytics-kpi-row.component';
import { IncomeExpenseChartComponent } from './all-app-component/expense-analytics/income-expense-chart/income-expense-chart.component';
import { CategoryRankChartComponent } from './all-app-component/expense-analytics/category-rank-chart/category-rank-chart.component';
import { CategoryStackChartComponent } from './all-app-component/expense-analytics/category-stack-chart/category-stack-chart.component';
import { WeekdayChartComponent } from './all-app-component/expense-analytics/weekday-chart/weekday-chart.component';
import { DayHeatmapChartComponent } from './all-app-component/expense-analytics/day-heatmap-chart/day-heatmap-chart.component';
import { CumulativeMonthChartComponent } from './all-app-component/expense-analytics/cumulative-month-chart/cumulative-month-chart.component';

@NgModule({ declarations: [
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
        ThemeSettingsComponent,
        UserListComponent,
        UserFormComponent,
        LoginComponent,
        VisitorLogPageComponent,
        JobsPageComponent,
        VisitorOverviewComponent,
        VisitorLogListComponent,
        VisitorProfileListComponent,
        KnownIpListComponent,
        VisitTrendChartComponent,
        ExpenseAnalyticsPageComponent,
        ChartPanelComponent,
        AnalyticsKpiRowComponent,
        IncomeExpenseChartComponent,
        CategoryRankChartComponent,
        CategoryStackChartComponent,
        WeekdayChartComponent,
        DayHeatmapChartComponent,
        CumulativeMonthChartComponent,
    ],
    bootstrap: [AppComponent], imports: [BrowserModule,
        AppRoutingModule,
        NgbModule,
        FormsModule,
        MatDialogModule,
        BrowserAnimationsModule,
        NgSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatInputModule,
        MatFormFieldModule,
        BrowserAnimationsModule], providers: [
        { provide: DateAdapter, useClass: AppDateAdapter },
        { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
        { provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        provideHttpClient(withInterceptorsFromDi()),
    ] })
export class AppModule { }
