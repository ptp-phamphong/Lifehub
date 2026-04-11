import { HttpClient } from '@angular/common/http';
import { Component, ViewContainerRef } from '@angular/core';
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
      error: (err) => console.error('Loi khi tai du lieu:', err)
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
    const confirmed = window.confirm(`Ban co chac chan muon xoa cau hinh "${item.keyConfig}" khong?`);
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
