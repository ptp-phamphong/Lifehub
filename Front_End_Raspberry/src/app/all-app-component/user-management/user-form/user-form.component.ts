import { HttpClient } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.scss']
})
export class UserFormComponent {
  mode: 'create' | 'edit' | 'password' = 'create';
  id: number = 0;
  username: string = '';
  name: string = '';
  email: string = '';
  active: boolean = true;
  password: string = '';
  confirmPassword: string = '';
  // Lưu KEY, không lưu chuỗi đã dịch (§4.1 kế hoạch i18n).
  messageKey: string = '';

  constructor(
    private http: HttpClient,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<UserFormComponent>
  ) {}

  ngOnInit() {
    this.id = this.data.id;
    this.mode = this.data.mode;

    if (this.mode === 'edit' && this.id > 0) {
      this.loadUser();
    }
  }

  loadUser() {
    this.http.get<any>(`${environment.apiBaseUrl}/User/GetById/${this.id}`)
      .subscribe({
        next: (res) => {
          this.username = res.username;
          this.name = res.name;
          this.email = res.email || '';
          this.active = res.active;
        },
        error: (err) => {
          console.error(err);
          this.messageKey = 'user.loadFailed';
        }
      });
  }

  // Getter nên được tính lại mỗi chu kỳ change detection — trả KEY để template
  // dịch, đổi ngôn ngữ là tiêu đề đổi theo ngay.
  get dialogTitleKey(): string {
    switch (this.mode) {
      case 'create': return 'user.createTitle';
      case 'edit': return 'user.editTitle';
      case 'password': return 'user.passwordTitle';
    }
  }

  submitForm() {
    this.messageKey = '';

    if (this.mode === 'create') {
      if (!this.username || !this.name || !this.password) {
        this.messageKey = 'user.missingFields';
        return;
      }
      if (this.password !== this.confirmPassword) {
        this.messageKey = 'user.passwordMismatch';
        return;
      }

      const payload = {
        username: this.username,
        password: this.password,
        name: this.name,
        email: this.email
      };

      this.http.post(`${environment.apiBaseUrl}/User/Create`, payload)
        .subscribe({
          next: () => this.dialogRef.close('saved'),
          error: (err) => {
            console.error(err);
            this.messageKey = 'user.createFailed';
          }
        });

    } else if (this.mode === 'edit') {
      if (!this.name) {
        this.messageKey = 'user.missingName';
        return;
      }

      const payload = {
        name: this.name,
        email: this.email,
        active: this.active
      };

      this.http.put(`${environment.apiBaseUrl}/User/Update/${this.id}`, payload)
        .subscribe({
          next: () => this.dialogRef.close('saved'),
          error: (err) => {
            console.error(err);
            this.messageKey = 'user.updateFailed';
          }
        });

    } else if (this.mode === 'password') {
      if (!this.password) {
        this.messageKey = 'user.missingNewPassword';
        return;
      }
      if (this.password !== this.confirmPassword) {
        this.messageKey = 'user.passwordMismatch';
        return;
      }

      const payload = {
        newPassword: this.password
      };

      this.http.put(`${environment.apiBaseUrl}/User/ChangePassword/${this.id}`, payload)
        .subscribe({
          next: () => this.dialogRef.close('saved'),
          error: (err) => {
            console.error(err);
            this.messageKey = 'user.changePasswordFailed';
          }
        });
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
