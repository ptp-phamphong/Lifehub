import { HttpClient } from '@angular/common/http';
import { Component, ViewContainerRef, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { UserModel } from 'src/app/model/user.model';
import { environment } from 'src/environments/environment';
import { UserFormComponent } from '../user-form/user-form.component';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent {
  users: UserModel[] = [];

  // `window.confirm` cần chuỗi ngay tại chỗ gọi — một trong số ít nơi dùng
  // `instant()`. Không lưu kết quả vào field.
  private readonly translate = inject(TranslateService);

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private viewContainerRef: ViewContainerRef
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.http.get<UserModel[]>(`${environment.apiBaseUrl}/User/GetAll`).subscribe({
      next: (data) => {
        this.users = data;
      },
      error: (err) => console.error('Lỗi khi tải dữ liệu:', err)
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(UserFormComponent, {
      width: '440px',
      data: { id: 0, mode: 'create' },
      viewContainerRef: this.viewContainerRef
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'saved') {
        this.loadUsers();
      }
    });
  }

  openEditDialog(user: UserModel): void {
    const dialogRef = this.dialog.open(UserFormComponent, {
      width: '440px',
      data: { id: user.id, mode: 'edit' },
      viewContainerRef: this.viewContainerRef
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'saved') {
        this.loadUsers();
      }
    });
  }

  openChangePasswordDialog(user: UserModel): void {
    const dialogRef = this.dialog.open(UserFormComponent, {
      width: '440px',
      data: { id: user.id, mode: 'password' },
      viewContainerRef: this.viewContainerRef
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'saved') {
        this.loadUsers();
      }
    });
  }

  deleteUser(user: UserModel) {
    // Tên đăng nhập chèn nguyên văn từ DB — chỉ câu chữ quanh nó mới dịch.
    const confirmed = window.confirm(
      this.translate.instant('user.confirmDelete', { name: user.username })
    );
    if (!confirmed) return;

    this.http.delete(`${environment.apiBaseUrl}/User/Delete/${user.id}`)
      .subscribe({
        next: () => {
          this.loadUsers();
        },
        error: (err) => {
          console.error(err);
        }
      });
  }
}
