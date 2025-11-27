import { Component, OnInit, ViewContainerRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { MatDialog } from '@angular/material/dialog';
import { ExpenseRecordComponent } from '../expense-record/expense-record.component';
import { ExpenseRecord } from 'src/app/model/expense.model';
import { ReasonType } from 'src/app/model/reason-type.model';
import { ParamFilter } from 'src/app/model/paramFilter.model';

@Component({
  selector: 'app-expense-record-list',
  templateUrl: './expense-record-list.component.html',
  styleUrls: ['./expense-record-list.component.scss']
})
export class ExpenseRecordListComponent implements OnInit {
  expenseRecords: ExpenseRecord[] = [];
  apiUrl = `${environment.apiBaseUrl}/GetAllExpenseNote`;
  sumThisMonthUrl = `${environment.apiBaseUrl}/SumByCurrentMonth`;
  sumThisMonth: number = 0;
  sumThisWeekUrl = `${environment.apiBaseUrl}/SumByCurrentWeek`;
  sumThisWeek: number = 0;

  reasonTypes: ReasonType[] = [];
  reasonTypeIdsFilterIn?: number[] = [];
  reasonTypeIdsFilterOut?: number[] = [];
  
  constructor(private http: HttpClient,
    private dialog: MatDialog,
    private viewContainerRef: ViewContainerRef
  ) {}

  ngOnInit() {
    this.loadExpenses();
    this.loadAllReasonType();
  }

  loadExpenses() {
    var paramFilter: ParamFilter = {
      reasonTypeIdsFilterIn: this.reasonTypeIdsFilterIn,
      reasonTypeIdsFilterOut: this.reasonTypeIdsFilterOut,
    };
    this.http.post<ExpenseRecord[]>(this.apiUrl, paramFilter).subscribe({
      next: (data) => {
        this.expenseRecords = data;
      },
      error: (err) => console.error('Lỗi khi tải dữ liệu:', err)
    });

    
    this.http.post<number>(this.sumThisMonthUrl, paramFilter).subscribe({
      next: (data) => {
        this.sumThisMonth = data;
      },
      error: (err) => console.error('Lỗi khi tải dữ liệu:', err)
    });
    
    this.http.post<number>(this.sumThisWeekUrl, paramFilter).subscribe({
      next: (data) => {
        this.sumThisWeek = data;
      },
      error: (err) => console.error('Lỗi khi tải dữ liệu:', err)
    });
  }

  loadAllReasonType(){
    this.http.get<ReasonType[]>(`${environment.apiBaseUrl}/GetAllReasonType`).subscribe({
        next: (data) => {
          this.reasonTypes = data;
        },
        error: (err) => console.error('Lỗi khi tải dữ liệu:', err)
      });
  }

  formatCurrency(amount?: number): string {
    if(!amount){
      return '0 VNĐ';
    }
    return amount.toLocaleString('vi-VN') + ' VNĐ';
  }

  openEditDialog(id: number): void {
    const dialogRef = this.dialog.open(ExpenseRecordComponent, {
      width: '500px',
      height: '800px',
      data: { id },
      viewContainerRef: this.viewContainerRef 
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'saved') {
        this.loadExpenses();
      }
    });
  }

  deleteRecord(record: ExpenseRecord) {
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa ghi chú "${record.reason}" không?`);
    if (!confirmed) {
      return; 
    }

    this.http.delete(`${environment.apiBaseUrl}/DeleteById/${record.id}`)
      .subscribe({
        next: (res) => {
          this.loadExpenses();
          console.log(res);
        },
        error: (err) => {
          console.error(err);
        }
      });
  }


  onChangeReasonTypeIn(event: ReasonType[]){
    this.reasonTypeIdsFilterOut = this.reasonTypeIdsFilterOut.filter(r => this.reasonTypeIdsFilterIn.indexOf(r) < 0);
    this.loadExpenses();
  }

  onChangeReasonTypeOut(event: ReasonType[]){
    this.reasonTypeIdsFilterIn = this.reasonTypeIdsFilterIn.filter(r => this.reasonTypeIdsFilterOut.indexOf(r) < 0);
    this.loadExpenses();
  }
}
