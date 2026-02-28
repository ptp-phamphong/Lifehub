import { API_BASE_URL } from '../config';
import { ExpenseRecord } from '../models/expense.model';
import { ParamFilter } from '../models/paramFilter.model';

// POST helper
async function postJson<T>(endpoint: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

async function getJson<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

/** Lấy danh sách chi tiêu theo filter */
export async function getAllExpenseNotes(filter: ParamFilter): Promise<ExpenseRecord[]> {
  return postJson<ExpenseRecord[]>('/GetAllExpenseNote', filter);
}

/** Tổng chi tiêu tháng hiện tại (theo filter) */
export async function sumByCurrentMonth(filter: ParamFilter): Promise<number> {
  return postJson<number>('/SumByCurrentMonth', filter);
}

/** Tổng chi tiêu tuần hiện tại (theo filter) */
export async function sumByCurrentWeek(filter: ParamFilter): Promise<number> {
  return postJson<number>('/SumByCurrentWeek', filter);
}

/** Tổng toàn bộ chi tiêu */
export async function sumAll(): Promise<number> {
  return getJson<number>('/SumAll');
}

/** Tổng toàn bộ chi tiêu theo filter */
export async function sumAllWithFilter(filter: ParamFilter): Promise<number> {
  return postJson<number>('/SumAllWithFilter', filter);
}

/** Lấy chi tiêu theo Id */
export async function getExpenseById(id: number): Promise<ExpenseRecord> {
  return getJson<ExpenseRecord>(`/GetExpenseById/${id}`);
}

/** Thêm mới chi tiêu */
export async function addExpense(record: ExpenseRecord): Promise<boolean> {
  return postJson<boolean>('/ExpenseNote', record);
}

/** Cập nhật chi tiêu */
export async function updateExpense(id: number, record: ExpenseRecord): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/UpdateById/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

/** Xoá chi tiêu theo Id */
export async function deleteExpenseById(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/DeleteById/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
}
