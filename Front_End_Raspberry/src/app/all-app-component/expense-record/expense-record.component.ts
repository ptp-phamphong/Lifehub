import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
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

  constructor(private http: HttpClient) { }

  submitForm() {
    if (!this.reason || this.amount === null) {
      this.message = '⚠️ Vui lòng nhập đầy đủ thông tin.';
      return;
    }

    const payload = {
      reason: this.reason,
      amount: this.amount
    };

    this.http.post(`${environment.apiBaseUrl}/ExpenseNote`, payload)
      .subscribe({
        next: (res) => {
          this.message = '✅ Gửi thành công!';
          this.reason = '';
          this.amount = 0;
        },
        error: (err) => {
          console.error(err);
          this.message = '❌ Gửi thất bại!';
        }
      });
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
}
