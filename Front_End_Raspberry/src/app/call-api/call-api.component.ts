import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-call-api',
  templateUrl: './call-api.component.html'
})
export class CallApiComponent {
  result: any;

  constructor(private http: HttpClient) {}

  callApi() {
    const url = `${environment.apiBaseUrl}/WeatherForecast`;

    this.http.get(url).subscribe({
      next: (res) => this.result = res,
      error: (err) => this.result = { error: err.message }
    });
  }
}
