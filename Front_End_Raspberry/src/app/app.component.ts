import { Component, OnInit } from '@angular/core';
import { LoadingService } from './services/loading.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Front_End_Raspberry';

  constructor(
    public loadingService: LoadingService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.themeService.loadAndApplyTheme();
  }
}
