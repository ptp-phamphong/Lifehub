import { API_BASE_URL } from '../config';
import { ReasonType } from '../models/reasonType.model';

/** Lấy tất cả loại lý do */
export async function getAllReasonTypes(): Promise<ReasonType[]> {
  const res = await fetch(`${API_BASE_URL}/GetAllReasonType`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}
