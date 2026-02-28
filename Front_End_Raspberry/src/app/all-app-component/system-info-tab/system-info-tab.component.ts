import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-system-info-tab',
  templateUrl: './system-info-tab.component.html',
  styleUrls: ['./system-info-tab.component.scss']
})
export class SystemInfoTabComponent implements OnInit {
  result: any;
  loading: boolean = false;
  lastUpdated: Date = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.callApi();
  }

  callApi() {
    this.loading = true;
    const url = `${environment.apiBaseUrl}/SystemInfo`;

    this.http.get(url).subscribe({
      next: (res) => {
        this.result = res;
        this.loading = false;
        this.lastUpdated = new Date();
      },
      error: (err) => {
        this.result = { error: err.message };
        this.loading = false;
      }
    });
  }

}
