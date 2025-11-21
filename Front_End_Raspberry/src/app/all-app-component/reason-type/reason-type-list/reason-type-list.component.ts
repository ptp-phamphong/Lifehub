import { HttpClient } from '@angular/common/http';
import { Component, ViewContainerRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';
import { ReasonType } from 'src/app/model/reason-type.model';
import { ReasonTypeFormComponent } from '../reason-type-form/reason-type-form.component';

@Component({
  selector: 'app-reason-type-list',
  templateUrl: './reason-type-list.component.html',
  styleUrls: ['./reason-type-list.component.scss']
})
export class ReasonTypeListComponent {
    reasonTypes: ReasonType[] = [];
    apiUrl = `${environment.apiBaseUrl}/GetAllReasonType`;
    sumThisMonth: number = 0;
    sumThisWeek: number = 0;
  
    constructor(private http: HttpClient,
      private dialog: MatDialog,
      private viewContainerRef: ViewContainerRef
    ) {}
  
    ngOnInit() {
      this.loadReasonType();
    }
  
    loadReasonType() {
      this.http.get<ReasonType[]>(this.apiUrl).subscribe({
        next: (data) => {
          this.reasonTypes = data;
        },
        error: (err) => console.error('Lỗi khi tải dữ liệu:', err)
      });
  
    }

    openEditDialog(id: number): void {
      const dialogRef = this.dialog.open(ReasonTypeFormComponent, {
        width: '420px',
        data: { id },
        viewContainerRef: this.viewContainerRef 
      });
  
      dialogRef.afterClosed().subscribe(result => {
        if (result === 'saved') {
          this.loadReasonType();
        }
      });
    }
  
    // deleteRecord(record: ExpenseRecord) {
    //   const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa ghi chú "${record.reason}" không?`);
    //   if (!confirmed) {
    //     return; 
    //   }
  
    //   this.http.delete(`${environment.apiBaseUrl}/DeleteById/${record.id}`)
    //     .subscribe({
    //       next: (res) => {
    //         this.loadExpenses();
    //         console.log(res);
    //       },
    //       error: (err) => {
    //         console.error(err);
    //       }
    //     });
    // }
}
