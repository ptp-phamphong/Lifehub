import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

interface ExpenseRecord {
  id: number;
  reason: string;
  amount: number;
  createdDate: string;
}
@Component({
  selector: 'app-expense-record-list',
  templateUrl: './expense-record-list.component.html',
  styleUrls: ['./expense-record-list.component.scss']
})
export class ExpenseRecordListComponent implements OnInit {
  expenseRecords: ExpenseRecord[] = [];
  apiUrl = `${environment.apiBaseUrl}/GetAllExpenseNote`;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadExpenses();
  }

  loadExpenses() {
    this.http.get<ExpenseRecord[]>(this.apiUrl).subscribe({
      next: (data) => this.expenseRecords = data,
      error: (err) => console.error('Lỗi khi tải dữ liệu:', err)
    });
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('vi-VN') + ' VNĐ';
  }

  editRecord(record: ExpenseRecord) {
    console.log('Edit:', record);
  }

  deleteRecord(record: ExpenseRecord) {
    console.log('Delete:', record);
  }
}
