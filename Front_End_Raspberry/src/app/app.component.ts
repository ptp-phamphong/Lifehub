import { Component, OnInit } from '@angular/core';
import { LoadingService } from './services/loading.service';
import { ThemeService } from './services/theme.service';
import { LanguageService } from './services/language.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Front_End_Raspberry';

  constructor(
    public loadingService: LoadingService,
    private themeService: ThemeService,
    private languageService: LanguageService
  ) {
    // Đặt ngôn ngữ trong constructor chứ không phải ngOnInit: bản dịch phải sẵn
    // sàng trước lần render đầu, nếu không sẽ nháy key thô ra màn hình.
    this.languageService.init();
  }

  ngOnInit(): void {
    this.themeService.loadAndApplyTheme();
  }
}
