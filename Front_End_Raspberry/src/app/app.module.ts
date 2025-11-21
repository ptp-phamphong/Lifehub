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
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReasonTypeListComponent } from './all-app-component/reason-type/reason-type-list/reason-type-list.component';
import { ReasonTypeFormComponent } from './all-app-component/reason-type/reason-type-form/reason-type-form.component';
import { NgSelectModule } from '@ng-select/ng-select';

@NgModule({
  declarations: [
    AppComponent,
    MainTabComponent,
    SystemInfoTabComponent,
    ExpenseRecordComponent,
    ExpenseRecordListComponent,
    ReasonTypeListComponent,
    ReasonTypeFormComponent,
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
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
