import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainTabComponent } from './all-app-component/main-tab/main-tab.component';
import { SystemInfoTabComponent } from './all-app-component/system-info-tab/system-info-tab.component';
import { ExpenseRecordListComponent } from './all-app-component/expense-record-list/expense-record-list.component';
import { ReasonTypeListComponent } from './all-app-component/reason-type/reason-type-list/reason-type-list.component';
import { CourseScheduleListComponent } from './all-app-component/course-schedule/course-schedule-list/course-schedule-list.component';
import { CourseCalendarComponent } from './all-app-component/course-schedule/course-calendar/course-calendar.component';
import { SettingsTabComponent } from './all-app-component/settings-tab/settings-tab.component';
import { SemesterMetadataListComponent } from './all-app-component/semester-metadata/semester-metadata-list/semester-metadata-list.component';
import { SystemConfigurationListComponent } from './all-app-component/system-configuration/system-configuration-list/system-configuration-list.component';
import { ThemeSettingsComponent } from './all-app-component/theme-settings/theme-settings.component';
import { UserListComponent } from './all-app-component/user-management/user-list/user-list.component';
import { VisitorLogPageComponent } from './all-app-component/visitor-log/visitor-log-page/visitor-log-page.component';
import { JobsPageComponent } from './all-app-component/jobs/jobs-page/jobs-page.component';
import { ZaloPageComponent } from './all-app-component/zalo/zalo-page/zalo-page.component';
import { ExpenseAnalyticsPageComponent } from './all-app-component/expense-analytics/expense-analytics-page/expense-analytics-page.component';
import { AuthGuard } from './guards/auth.guard';
import { LoginComponent } from './all-app-component/login/login.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainTabComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'system-info' },
      { path: 'system-info', component: SystemInfoTabComponent },
      { path: 'expense-record-list', component: ExpenseRecordListComponent },
      { path: 'expense-analytics', component: ExpenseAnalyticsPageComponent },
      { path: 'course-calendar', component: CourseCalendarComponent },
      {
        path: 'settings',
        component: SettingsTabComponent,
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'reason-type-settings' },
          { path: 'reason-type-settings', component: ReasonTypeListComponent },
          { path: 'course-schedule-settings', component: CourseScheduleListComponent },
          { path: 'semester-settings', component: SemesterMetadataListComponent },
          { path: 'system-configuration-settings', component: SystemConfigurationListComponent },
          { path: 'theme-settings', component: ThemeSettingsComponent },
          { path: 'user-settings', component: UserListComponent },
          { path: 'visitor-log-settings', component: VisitorLogPageComponent },
          { path: 'jobs-settings', component: JobsPageComponent },
          { path: 'zalo-settings', component: ZaloPageComponent }
        ]
      },
      { path: 'reason-type-settings', redirectTo: 'settings/reason-type-settings', pathMatch: 'full' },
      { path: 'setting/reason-type-settings', redirectTo: 'settings/reason-type-settings', pathMatch: 'full' },
      { path: 'course-schedule-settings', redirectTo: 'settings/course-schedule-settings', pathMatch: 'full' },
      { path: 'setting/course-schedule-settings', redirectTo: 'settings/course-schedule-settings', pathMatch: 'full' },
      { path: 'semester-settings', redirectTo: 'settings/semester-settings', pathMatch: 'full' },
      { path: 'setting/semester-settings', redirectTo: 'settings/semester-settings', pathMatch: 'full' },
      { path: 'system-configuration-settings', redirectTo: 'settings/system-configuration-settings', pathMatch: 'full' },
      { path: 'setting/system-configuration-settings', redirectTo: 'settings/system-configuration-settings', pathMatch: 'full' },
      { path: 'theme-settings', redirectTo: 'settings/theme-settings', pathMatch: 'full' },
      { path: 'setting/theme-settings', redirectTo: 'settings/theme-settings', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
