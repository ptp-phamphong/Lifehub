import { HttpClient } from '@angular/common/http';
import { Component, ViewContainerRef } from '@angular/core';
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
      error: (err) => console.error('Loi khi tai du lieu:', err)
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
    const confirmed = window.confirm(`Ban co chac chan muon xoa user "${user.username}" khong?`);
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
