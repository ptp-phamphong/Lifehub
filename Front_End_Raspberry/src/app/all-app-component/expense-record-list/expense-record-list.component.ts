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
  sumThisMonth: number = 0;
  sumThisWeek: number = 0;
  sumAll: number = 0;
  sumAllFiltered: number = 0;
  selectedMonth: number = new Date().getMonth() + 1;
  selectedYear: number = new Date().getFullYear();
  showAll: boolean = false;

  reasonTypes: ReasonType[] = [];
  reasonTypeIdsFilterIn?: number[] = [];
  reasonTypeIdsFilterOut?: number[] = [];

  sortColumn: string = 'createdDate';
  sortDirection: string = 'desc';
  activeTab: 'expense' | 'income' = 'expense';
  
  constructor(private http: HttpClient,
    private dialog: MatDialog,
    private viewContainerRef: ViewContainerRef
  ) {}

  ngOnInit() {
    this.loadExpensesByMonth(this.selectedMonth, this.selectedYear);
    this.loadAllReasonType();
  }

  get isExpenseTab(): boolean {
    return this.activeTab === 'expense';
  }

  get pageTitle(): string {
    return this.isExpenseTab ? 'Danh sách chi tiêu' : 'Danh sách thu vào';
  }

  get sumThisMonthLabel(): string {
    return this.isExpenseTab ? 'Tổng chi tháng' : 'Tổng thu tháng';
  }

  get sumAllLabel(): string {
    return this.isExpenseTab ? 'Tổng chi toàn bộ' : 'Tổng thu toàn bộ';
  }

  get sumAllFilteredLabel(): string {
    return this.isExpenseTab ? 'Lịch sử chi theo filter' : 'Lịch sử thu theo filter';
  }

  get sumThisWeekLabel(): string {
    return this.isExpenseTab ? 'Tổng chi tuần hiện tại' : 'Tổng thu tuần hiện tại';
  }

  get dateLabel(): string {
    return this.isExpenseTab ? 'Ngày chi tiêu' : 'Ngày thu vào';
  }

  get addButtonLabel(): string {
    return this.isExpenseTab ? '+ Thêm mới chi tiêu' : '+ Thêm mới thu vào';
  }

  private isReasonTypeActive(reasonType?: ReasonType): boolean {
    return reasonType?.active !== false;
  }

  private toReasonTypeOption(reasonType: ReasonType): ReasonType {
    return {
      ...reasonType,
      displayName: this.getReasonTypeLabel(reasonType)
    };
  }

  getReasonTypeLabel(reasonType?: ReasonType): string {
    if (!reasonType?.reasonName) {
      return '—';
    }

    return this.isReasonTypeActive(reasonType)
      ? reasonType.reasonName
      : `${reasonType.reasonName} (inactive)`;
  }

  onTabChange(tab: 'expense' | 'income') {
    if (this.activeTab === tab) {
      return;
    }

    this.activeTab = tab;
    this.expenseRecords = [];
    this.sumThisMonth = 0;
    this.sumThisWeek = 0;
    this.sumAll = 0;
    this.sumAllFiltered = 0;

    if (tab === 'income') {
      this.showAll = true;
      this.loadAllExpenses();
    } else {
      this.showAll = false;
      this.loadExpensesByMonth(this.selectedMonth, this.selectedYear);
    }
  }

  onMonthChanged(event: { month: number, year: number }) {
    this.selectedMonth = event.month;
    this.selectedYear = event.year;
    this.loadExpensesByMonth(event.month, event.year);
  }

  private buildParamFilter(month?: number, year?: number): ParamFilter {
    return {
      month: month,
      year: year,
      reasonTypeIdsFilterIn: this.reasonTypeIdsFilterIn,
      reasonTypeIdsFilterOut: this.reasonTypeIdsFilterOut,
      sortColumn: this.sortColumn,
      sortDirection: this.sortDirection,
    };
  }

  onSort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.loadExpenses();
  }

  private getApiRoute(routeType: 'getAll' | 'sumCurrentMonth' | 'sumCurrentWeek' | 'sumAll' | 'sumAllWithFilter' | 'deleteById'): string {
    if (this.isExpenseTab) {
      return {
        getAll: 'GetAllExpenseNote',
        sumCurrentMonth: 'SumByCurrentMonth',
        sumCurrentWeek: 'SumByCurrentWeek',
        sumAll: 'SumAll',
        sumAllWithFilter: 'SumAllWithFilter',
        deleteById: 'DeleteById',
      }[routeType];
    }

    return {
      getAll: 'GetAllIncomeNote',
      sumCurrentMonth: 'SumIncomeByCurrentMonth',
      sumCurrentWeek: 'SumIncomeByCurrentWeek',
      sumAll: 'SumAllIncome',
      sumAllWithFilter: 'SumAllIncomeWithFilter',
      deleteById: 'DeleteIncomeById',
    }[routeType];
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return '';
    return this.sortDirection === 'asc' ? '▲' : '▼';
  }

  loadExpensesByMonth(month: number, year: number) {
    var paramFilter = this.buildParamFilter(month, year);
    this.http.post<ExpenseRecord[]>(`${environment.apiBaseUrl}/${this.getApiRoute('getAll')}`, paramFilter).subscribe({
      next: (data) => {
        this.expenseRecords = data;
      },
      error: (err) => console.error('Lỗi khi tải dữ liệu:', err)
    });

    this.http.post<number>(`${environment.apiBaseUrl}/${this.getApiRoute('sumCurrentMonth')}`, paramFilter).subscribe({
      next: (data) => {
        this.sumThisMonth = data;
      },
      error: (err) => console.error('Lỗi khi tải dữ liệu:', err)
    });

    this.http.post<number>(`${environment.apiBaseUrl}/${this.getApiRoute('sumCurrentWeek')}`, paramFilter).subscribe({
      next: (data) => {
        this.sumThisWeek = data;
      },
      error: (err) => console.error('Lỗi khi tải dữ liệu:', err)
    });
  }

  toggleShowAll() {
    this.showAll = !this.showAll;
    if (this.showAll) {
      this.loadAllExpenses();
    } else {
      this.loadExpensesByMonth(this.selectedMonth, this.selectedYear);
    }
  }

  loadAllExpenses() {
    var paramFilter = this.buildParamFilter();
    this.http.post<ExpenseRecord[]>(`${environment.apiBaseUrl}/${this.getApiRoute('getAll')}`, paramFilter).subscribe({
      next: (data) => {
        this.expenseRecords = data;
      },
      error: (err) => console.error('Lỗi khi tải dữ liệu:', err)
    });

    this.http.get<number>(`${environment.apiBaseUrl}/${this.getApiRoute('sumAll')}`).subscribe({
      next: (data) => {
        this.sumAll = data;
      },
      error: (err) => console.error('Lỗi khi tải dữ liệu:', err)
    });

    this.http.post<number>(`${environment.apiBaseUrl}/${this.getApiRoute('sumAllWithFilter')}`, paramFilter).subscribe({
      next: (data) => {
        this.sumAllFiltered = data;
      },
      error: (err) => console.error('Lỗi khi tải dữ liệu:', err)
    });
  }

  loadExpenses() {
    if (this.showAll) {
      this.loadAllExpenses();
    } else {
      this.loadExpensesByMonth(this.selectedMonth, this.selectedYear);
    }
  }

  loadAllReasonType(){
    this.http.get<ReasonType[]>(`${environment.apiBaseUrl}/GetAllReasonType`).subscribe({
        next: (data) => {
          this.reasonTypes = data.map(reasonType => this.toReasonTypeOption(reasonType));
          this.applyDefaultFilters(data);
        },
        error: (err) => console.error('Lỗi khi tải dữ liệu:', err)
      });
  }

  private applyDefaultFilters(reasonTypes: ReasonType[]) {
    const defaultIn = reasonTypes
      .filter(r => r.defaultFilterType === 2)
      .map(r => r.id!);
    const defaultOut = reasonTypes
      .filter(r => r.defaultFilterType === 3)
      .map(r => r.id!);

    if (defaultIn.length > 0) {
      this.reasonTypeIdsFilterIn = defaultIn;
    }
    if (defaultOut.length > 0) {
      this.reasonTypeIdsFilterOut = defaultOut;
    }
    if (defaultIn.length > 0 || defaultOut.length > 0) {
      this.loadExpenses();
    }
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
      data: { id, flowType: this.activeTab },
      viewContainerRef: this.viewContainerRef 
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'saved') {
        this.loadExpenses();
      }
    });
  }

  deleteRecord(record: ExpenseRecord) {
    const itemLabel = this.isExpenseTab ? 'chi tiêu' : 'thu vào';
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa ghi chú ${itemLabel} "${record.reason}" không?`);
    if (!confirmed) {
      return; 
    }

    this.http.delete(`${environment.apiBaseUrl}/${this.getApiRoute('deleteById')}/${record.id}`)
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
    if (!this.isExpenseTab) {
      return;
    }

    this.reasonTypeIdsFilterOut = this.reasonTypeIdsFilterOut.filter(r => this.reasonTypeIdsFilterIn.indexOf(r) < 0);
    this.loadExpenses();
  }

  onChangeReasonTypeOut(event: ReasonType[]){
    if (!this.isExpenseTab) {
      return;
    }

    this.reasonTypeIdsFilterIn = this.reasonTypeIdsFilterIn.filter(r => this.reasonTypeIdsFilterOut.indexOf(r) < 0);
    this.loadExpenses();
  }
}
