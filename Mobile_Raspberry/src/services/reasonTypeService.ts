import { apiGet } from './apiClient';
import { ReasonType } from '../models/reasonType.model';

/** Lấy tất cả loại lý do */
export async function getAllReasonTypes(): Promise<ReasonType[]> {
  return apiGet<ReasonType[]>('/GetAllReasonType');
}
