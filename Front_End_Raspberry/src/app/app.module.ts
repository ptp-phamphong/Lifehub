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

@NgModule({
  declarations: [
    AppComponent,
    MainTabComponent,
    SystemInfoTabComponent,
    ExpenseRecordComponent,
    ExpenseRecordListComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    NgbModule,
    FormsModule,
    MatDialogModule,
    BrowserAnimationsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
