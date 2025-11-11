import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MainTabComponent } from './all-app-component/main-tab/main-tab.component';
import { SystemInfoTabComponent } from './all-app-component/system-info-tab/system-info-tab.component';

@NgModule({
  declarations: [
    AppComponent,
    MainTabComponent,
    SystemInfoTabComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    NgbModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
