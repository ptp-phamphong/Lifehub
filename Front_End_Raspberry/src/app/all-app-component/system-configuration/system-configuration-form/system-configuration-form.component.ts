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
  // Lưu KEY, không lưu chuỗi đã dịch (§4.1 kế hoạch i18n).
  messageKey: string = '';
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
          this.messageKey = 'systemConfig.loadFailed';
        }
      });
  }

  submitForm() {
    if (!this.keyConfig) {
      this.messageKey = 'systemConfig.missingKey';
      return;
    }

    if (!this.valueConfig) {
      this.messageKey = 'systemConfig.missingValue';
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
            this.messageKey = 'systemConfig.updateFailed';
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
            this.messageKey = 'systemConfig.createFailed';
          }
        });
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
