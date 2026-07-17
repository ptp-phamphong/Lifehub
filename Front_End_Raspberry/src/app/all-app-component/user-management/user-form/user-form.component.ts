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
  message: string = '';

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
          this.message = 'Không thể tải thông tin người dùng.';
        }
      });
  }

  get dialogTitle(): string {
    switch (this.mode) {
      case 'create': return 'Thêm người dùng mới';
      case 'edit': return 'Chỉnh sửa người dùng';
      case 'password': return 'Đổi mật khẩu';
    }
  }

  submitForm() {
    this.message = '';

    if (this.mode === 'create') {
      if (!this.username || !this.name || !this.password) {
        this.message = 'Vui lòng nhập đầy đủ thông tin.';
        return;
      }
      if (this.password !== this.confirmPassword) {
        this.message = 'Mật khẩu xác nhận không khớp.';
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
            this.message = 'Tạo người dùng thất bại.';
          }
        });

    } else if (this.mode === 'edit') {
      if (!this.name) {
        this.message = 'Vui lòng nhập tên.';
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
            this.message = 'Cập nhật thất bại.';
          }
        });

    } else if (this.mode === 'password') {
      if (!this.password) {
        this.message = 'Vui lòng nhập mật khẩu mới.';
        return;
      }
      if (this.password !== this.confirmPassword) {
        this.message = 'Mật khẩu xác nhận không khớp.';
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
            this.message = 'Đổi mật khẩu thất bại.';
          }
        });
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
