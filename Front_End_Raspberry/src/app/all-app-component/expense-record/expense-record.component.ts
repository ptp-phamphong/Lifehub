import { HttpClient } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ExpenseRecord } from 'src/app/model/expense.model';
import { ReasonType } from 'src/app/model/reason-type.model';
import { environment } from 'src/environments/environment';

interface AiExpenseResponse {
  success: boolean;
  expenseId?: number;
  message: string;
  parsedExpense?: ExpenseRecord;
}

@Component({
  selector: 'app-expense-record',
  templateUrl: './expense-record.component.html',
  styleUrls: ['./expense-record.component.scss']
})
export class ExpenseRecordComponent {
  reason: string = '';
  amount: number = 0;
  message: string = '';
  // Trước đây trạng thái thành công/thất bại chỉ nằm ở emoji đầu chuỗi (✅/❌/⚠️),
  // còn khung thông báo thì luôn một màu xám. Bỏ emoji thì phải có trường này,
  // nếu không người dùng không phân biệt được báo thành công với báo lỗi.
  messageType: 'success' | 'error' | 'warning' = 'success';
  id: number = 0;
  flowType: 'expense' | 'income' = 'expense';
  reasonTypes: ReasonType[] = [];
  reasonTypeId?: number = null;
  expenseDate: Date = new Date();

  // AI mode
  aiMode: boolean = false;
  aiPrompt: string = '';
  aiLoading: boolean = false;

  constructor(private http: HttpClient,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<ExpenseRecordComponent>
  ) { }


  ngOnInit() {
    this.id = this.data.id;
    this.flowType = this.data.flowType === 'income' ? 'income' : 'expense';
    if (this.isExpenseMode) {
      this.loadAllReasonType();
    }

    if(this.id > 0){
      this.loadExpense();
    }
  }

  get isEditMode(): boolean {
    return this.id > 0;
  }

  get isExpenseMode(): boolean {
    return this.flowType === 'expense';
  }

  get formTitle(): string {
    if (this.isExpenseMode) {
      return this.isEditMode ? 'Chỉnh sửa chi tiêu' : 'Thêm ghi chú chi tiêu';
    }

    return this.isEditMode ? 'Chỉnh sửa thu vào' : 'Thêm ghi chú thu vào';
  }

  get dateLabel(): string {
    return this.isExpenseMode ? 'Ngày chi tiêu' : 'Ngày thu vào';
  }

  private getRoute(routeType: 'getById' | 'add' | 'update'): string {
    if (this.isExpenseMode) {
      return {
        getById: 'GetExpenseById',
        add: 'ExpenseNote',
        update: 'UpdateById',
      }[routeType];
    }

    return {
      getById: 'GetIncomeById',
      add: 'IncomeNote',
      update: 'UpdateIncomeById',
    }[routeType];
  }

  private isReasonTypeActive(reasonType: ReasonType): boolean {
    return reasonType.active !== false;
  }

  private toReasonTypeOption(reasonType: ReasonType): ReasonType {
    return {
      ...reasonType,
      displayName: reasonType.reasonName ?? ''
    };
  }

  loadAllReasonType(){
    this.http.get<ReasonType[]>(`${environment.apiBaseUrl}/GetAllReasonType`).subscribe({
        next: (data) => {
          this.reasonTypes = data
            .filter(reasonType => this.isReasonTypeActive(reasonType))
            .map(reasonType => this.toReasonTypeOption(reasonType));
        },
        error: (err) => console.error('Lỗi khi tải dữ liệu:', err)
      });
  }

  loadExpense(){
    this.http.get(`${environment.apiBaseUrl}/${this.getRoute('getById')}/${this.id}`)
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
          this.messageType = 'error';
          this.message = 'Gửi thất bại!';
        }
      });
  }


  submitForm() {
    if (!this.reason || this.amount === null) {
      this.messageType = 'warning';
      this.message = 'Vui lòng nhập đầy đủ thông tin.';
      return;
    }

    const payload: any = {
      reason: this.reason,
      amount: this.amount,
      createdDate: this.formatLocalDate(this.expenseDate)
    };

    if (this.isExpenseMode) {
      payload.reasonTypeId = this.reasonTypeId;
    }

    if(this.id > 0){


      this.http.put(`${environment.apiBaseUrl}/${this.getRoute('update')}/${this.id}`, payload)
        .subscribe({
          next: (res) => {
            this.messageType = 'success';
            this.message = 'Gửi thành công!';
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

      this.http.post(`${environment.apiBaseUrl}/${this.getRoute('add')}`, payload)
        .subscribe({
          next: (res) => {
            this.messageType = 'success';
            this.message = 'Gửi thành công!';
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

  submitAi() {
    if (!this.isExpenseMode) {
      return;
    }

    if (!this.aiPrompt.trim()) {
      this.messageType = 'warning';
      this.message = 'Vui lòng nhập mô tả chi tiêu.';
      return;
    }

    this.aiLoading = true;
    this.message = '';

    this.http.post<AiExpenseResponse>(`${environment.apiBaseUrl}/AiExpense`, { prompt: this.aiPrompt })
      .subscribe({
        next: (res) => {
          this.aiLoading = false;
          if (res.success && res.expenseId) {
            this.messageType = 'success';
            this.message = res.message;
            this.aiPrompt = '';
            this.aiMode = false;
            // Switch to edit mode with new ID
            this.id = res.expenseId;
            this.loadExpense();
          } else {
            this.messageType = 'error';
            this.message = (res.message || 'AI không thể xử lý.');
          }
        },
        error: (err) => {
          this.aiLoading = false;
          console.error(err);
          this.messageType = 'error';
          this.message = 'Lỗi khi gọi AI.';
        }
      });
  }
}
