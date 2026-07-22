import { HttpClient } from '@angular/common/http';
import { Component, ViewContainerRef, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { SystemConfiguration } from 'src/app/model/system-configuration.model';
import { environment } from 'src/environments/environment';
import { SystemConfigurationFormComponent } from '../system-configuration-form/system-configuration-form.component';

@Component({
  selector: 'app-system-configuration-list',
  templateUrl: './system-configuration-list.component.html',
  styleUrls: ['./system-configuration-list.component.scss']
})
export class SystemConfigurationListComponent {
  configurations: SystemConfiguration[] = [];

  // `window.confirm` cần chuỗi ngay tại chỗ gọi — một trong số ít nơi dùng
  // `instant()`. Không lưu kết quả vào field.
  private readonly translate = inject(TranslateService);

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private viewContainerRef: ViewContainerRef
  ) {}

  ngOnInit() {
    this.loadConfigurations();
  }

  loadConfigurations() {
    this.http.get<SystemConfiguration[]>(`${environment.apiBaseUrl}/GetAllSystemConfiguration`).subscribe({
      next: (data) => {
        this.configurations = data;
      },
      error: (err) => console.error('Lỗi khi tải dữ liệu:', err)
    });
  }

  openEditDialog(id: number): void {
    const dialogRef = this.dialog.open(SystemConfigurationFormComponent, {
      width: '440px',
      data: { id },
      viewContainerRef: this.viewContainerRef
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'saved') {
        this.loadConfigurations();
      }
    });
  }

  deleteRecord(item: SystemConfiguration) {
    // Khóa cấu hình chèn nguyên văn từ DB — chỉ câu chữ quanh nó mới dịch.
    const confirmed = window.confirm(
      this.translate.instant('systemConfig.confirmDelete', { name: item.keyConfig })
    );
    if (!confirmed) {
      return;
    }

    this.http.delete(`${environment.apiBaseUrl}/DeleteSystemConfigurationById/${item.id}`)
      .subscribe({
        next: () => {
          this.loadConfigurations();
        },
        error: (err) => {
          console.error(err);
        }
      });
  }
}
