import { ReasonType } from './reasonType.model';

export interface ExpenseRecord {
  id?: number;
  reason?: string;
  amount?: number;
  createdDate?: string;
  reasonTypeId?: number;
  reasonType?: ReasonType;
}
