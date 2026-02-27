import { HttpClient } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ExpenseRecord } from 'src/app/model/expense.model';
import { ReasonType } from 'src/app/model/reason-type.model';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-expense-record',
  templateUrl: './expense-record.component.html',
  styleUrls: ['./expense-record.component.scss']
})
export class ExpenseRecordComponent {
  reason: string = '';
  amount: number = 0;
  message: string = '';
  id: number = 0;
  reasonTypes: ReasonType[] = [];
  reasonTypeId?: number = null;
  expenseDate: Date = new Date();

  constructor(private http: HttpClient,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<ExpenseRecordComponent>
  ) { }


  ngOnInit() {
    this.id = this.data.id;
    this.loadAllReasonType();
    if(this.id > 0){
      this.loadExpense();
    }
  }

  loadAllReasonType(){
    this.http.get<ReasonType[]>(`${environment.apiBaseUrl}/GetAllReasonType`).subscribe({
        next: (data) => {
          this.reasonTypes = data;
        },
        error: (err) => console.error('Lỗi khi tải dữ liệu:', err)
      });
  }

  loadExpense(){
    this.http.get(`${environment.apiBaseUrl}/GetExpenseById/${this.id}`)
      .subscribe({
        next: (res) => {
          const record = Object.assign(new ExpenseRecord(), res);
          this.reason = record?.reason != null ? record.reason : '';
          this.amount = record?.amount != null ? record.amount : 0;
          this.reasonTypeId = record?.reasonTypeId;
          this.expenseDate = record?.createdDate != null ? new Date(record.createdDate) : new Date();
          console.log(res);
        },
        error: (err) => {
          console.error(err);
          this.message = '❌ Gửi thất bại!';
        }
      });
  }


  submitForm() {
    if (!this.reason || this.amount === null) {
      this.message = '⚠️ Vui lòng nhập đầy đủ thông tin.';
      return;
    }

    const payload: ExpenseRecord = {
      reason: this.reason,
      amount: this.amount,
      reasonTypeId: this.reasonTypeId,
      createdDate: this.formatLocalDate(this.expenseDate)
    };

    if(this.id > 0){


      this.http.put(`${environment.apiBaseUrl}/UpdateById/${this.id}`, payload)
        .subscribe({
          next: (res) => {
            this.message = '✅ Gửi thành công!';
            this.reason = '';
            this.amount = 0;
            this.dialogRef.close('saved');
          },
          error: (err) => {
            console.error(err);
          }
        });
    }
    else{

      this.http.post(`${environment.apiBaseUrl}/ExpenseNote`, payload)
        .subscribe({
          next: (res) => {
            this.message = '✅ Gửi thành công!';
            this.reason = '';
            this.amount = 0;
            this.dialogRef.close('saved');
          },
          error: (err) => {
            console.error(err);
          }
        });
    }
  }

  formatCurrency(amount: number): string {
    if (!amount && amount !== 0) return '';
    return amount.toLocaleString('vi-VN');
  }

  onAmountInput(event: any) {
    const rawValue = event.target.value.replace(/[^0-9]/g, ''); // chỉ giữ số
    this.amount = Number(rawValue);
    event.target.value = this.formatCurrency(this.amount);
  }

  cancel() {
    this.dialogRef.close();
  }

  formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T00:00:00`;
  }
}
