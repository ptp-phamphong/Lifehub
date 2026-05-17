import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import { ExpenseRecord } from '../models/expense.model';
import { ParamFilter } from '../models/paramFilter.model';

/** Lấy danh sách chi tiêu theo filter */
export async function getAllExpenseNotes(filter: ParamFilter): Promise<ExpenseRecord[]> {
  return apiPost<ExpenseRecord[]>('/GetAllExpenseNote', filter);
}

/** Tổng chi tiêu tháng hiện tại (theo filter) */
export async function sumByCurrentMonth(filter: ParamFilter): Promise<number> {
  return apiPost<number>('/SumByCurrentMonth', filter);
}

/** Tổng chi tiêu tuần hiện tại (theo filter) */
export async function sumByCurrentWeek(filter: ParamFilter): Promise<number> {
  return apiPost<number>('/SumByCurrentWeek', filter);
}

/** Tổng toàn bộ chi tiêu */
export async function sumAll(): Promise<number> {
  return apiGet<number>('/SumAll');
}

/** Tổng toàn bộ chi tiêu theo filter */
export async function sumAllWithFilter(filter: ParamFilter): Promise<number> {
  return apiPost<number>('/SumAllWithFilter', filter);
}

/** Lấy chi tiêu theo Id */
export async function getExpenseById(id: number): Promise<ExpenseRecord> {
  return apiGet<ExpenseRecord>(`/GetExpenseById/${id}`);
}

/** Thêm mới chi tiêu */
export async function addExpense(record: ExpenseRecord): Promise<boolean> {
  return apiPost<boolean>('/ExpenseNote', record);
}

/** Cập nhật chi tiêu */
export async function updateExpense(id: number, record: ExpenseRecord): Promise<boolean> {
  return apiPut<boolean>(`/UpdateById/${id}`, record);
}

/** Xoá chi tiêu theo Id */
export async function deleteExpenseById(id: number): Promise<void> {
  await apiDelete(`/DeleteById/${id}`);
}

/** Lấy danh sách chi tiêu theo tháng/năm */
export async function getExpensesByMonth(month: number, year: number): Promise<ExpenseRecord[]> {
  return apiGet<ExpenseRecord[]>(`/GetExpensesByMonth/${month}/${year}`);
}
