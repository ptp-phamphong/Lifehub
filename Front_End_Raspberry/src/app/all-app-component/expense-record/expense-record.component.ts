import { HttpClient } from '@angular/common/http';
import { Component, Inject, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from 'src/app/services/language.service';
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
  // Lỗi sinh ở client lưu KEY; message do backend (AI) trả về lưu NGUYÊN VĂN.
  // Hai trường tách nhau vì chỉ cái đầu mới dịch được (§4.1 kế hoạch i18n).
  messageKey: string = '';
  messageRaw: string = '';
  // Trước đây trạng thái thành công/thất bại chỉ nằm ở emoji đầu chuỗi (✅/❌/⚠️),
  // còn khung thông báo thì luôn một màu xám. Bỏ emoji thì phải có trường này,
  // nếu không người dùng không phân biệt được báo thành công với báo lỗi.
  messageType: 'success' | 'error' | 'warning' = 'success';
  id: number = 0;
  flowType: 'expense' | 'income' = 'expense';
  reasonTypes: ReasonType[] = [];

  private readonly translate = inject(TranslateService);
  // Locale cho định dạng số — xem §4.2 kế hoạch i18n.
  private readonly locale = inject(LanguageService).locale;
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

  get formTitleKey(): string {
    if (this.isExpenseMode) {
      return this.isEditMode ? 'expense.formTitleEditExpense' : 'expense.formTitleAddExpense';
    }

    return this.isEditMode ? 'expense.formTitleEditIncome' : 'expense.formTitleAddIncome';
  }

  get dateLabelKey(): string {
    return this.isExpenseMode ? 'expense.dateExpense' : 'expense.dateIncome';
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
          this.messageKey = 'expense.saveFailed';
        }
      });
  }


  submitForm() {
    if (!this.reason || this.amount === null) {
      this.messageType = 'warning';
      this.messageKey = 'expense.missingFields';
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
            this.messageKey = 'expense.saveSuccess';
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
            this.messageKey = 'expense.saveSuccess';
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
    return amount.toLocaleString(this.locale());
  }

  onAmountInput(event: any) {
    const rawValue = event.target.value.replace(/[^0-9]/g, ''); // chỉ giữ số
    this.amount = Number(rawValue);
    event.target.value = this.formatCurrency(this.amount);
  }

  private clearMessage(): void {
    this.messageKey = '';
    this.messageRaw = '';
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
      this.messageKey = 'expense.missingFields';
      return;
    }

    this.aiLoading = true;
    this.clearMessage();

    this.http.post<AiExpenseResponse>(`${environment.apiBaseUrl}/AiExpense`, { prompt: this.aiPrompt })
      .subscribe({
        next: (res) => {
          this.aiLoading = false;
          if (res.success && res.expenseId) {
            this.messageType = 'success';
            this.messageRaw = res.message;
            this.aiPrompt = '';
            this.aiMode = false;
            // Switch to edit mode with new ID
            this.id = res.expenseId;
            this.loadExpense();
          } else {
            this.messageType = 'error';
            if (res.message) {
            this.messageRaw = res.message;
          } else {
            this.messageKey = 'expense.aiFailed';
          }
          }
        },
        error: (err) => {
          this.aiLoading = false;
          console.error(err);
          this.messageType = 'error';
          this.messageKey = 'expense.aiError';
        }
      });
  }
}
