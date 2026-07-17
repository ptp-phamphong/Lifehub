import { HttpClient } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SystemConfiguration } from 'src/app/model/system-configuration.model';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-system-configuration-form',
  templateUrl: './system-configuration-form.component.html',
  styleUrls: ['./system-configuration-form.component.scss']
})
export class SystemConfigurationFormComponent {
  keyConfig: string = '';
  valueConfig: string = '';
  message: string = '';
  id: number = 0;

  constructor(
    private http: HttpClient,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<SystemConfigurationFormComponent>
  ) {}

  ngOnInit() {
    this.id = this.data.id;
    if (this.id > 0) {
      this.loadSystemConfiguration();
    }
  }

  loadSystemConfiguration() {
    this.http.get(`${environment.apiBaseUrl}/GetSystemConfigurationById/${this.id}`)
      .subscribe({
        next: (res) => {
          const record = Object.assign(new SystemConfiguration(), res);
          this.keyConfig = record?.keyConfig != null ? record.keyConfig : '';
          this.valueConfig = record?.valueConfig != null ? record.valueConfig : '';
        },
        error: (err) => {
          console.error(err);
          this.message = 'Gửi thất bại.';
        }
      });
  }

  submitForm() {
    if (!this.keyConfig) {
      this.message = 'Vui lòng nhập khóa cấu hình.';
      return;
    }

    if (!this.valueConfig) {
      this.message = 'Vui lòng nhập giá trị cấu hình.';
      return;
    }

    const payload: SystemConfiguration = {
      keyConfig: this.keyConfig,
      valueConfig: this.valueConfig
    };

    if (this.id > 0) {
      this.http.put(`${environment.apiBaseUrl}/UpdateSystemConfigurationById/${this.id}`, payload)
        .subscribe({
          next: () => {
            this.dialogRef.close('saved');
          },
          error: (err) => {
            console.error(err);
            this.message = 'Cập nhật thất bại.';
          }
        });
    } else {
      this.http.post(`${environment.apiBaseUrl}/SystemConfiguration`, payload)
        .subscribe({
          next: () => {
            this.dialogRef.close('saved');
          },
          error: (err) => {
            console.error(err);
            this.message = 'Tạo mới thất bại.';
          }
        });
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
