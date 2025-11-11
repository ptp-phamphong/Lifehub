import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-system-info-tab',
  templateUrl: './system-info-tab.component.html',
  styleUrls: ['./system-info-tab.component.scss']
})
export class SystemInfoTabComponent {
  result: any;

  constructor(private http: HttpClient) {}

  callApi() {
    const url = `${environment.apiBaseUrl}/SystemInfo`;

    this.http.get(url).subscribe({
      next: (res) => this.result = res,
      error: (err) => this.result = { error: err.message }
    });
  }

}
