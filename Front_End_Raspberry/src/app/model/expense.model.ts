import { ReasonType } from "./reason-type.model";

export class ExpenseRecord{
    id?: number;
    reason?: string;
    amount?: number;
    createdDate?: Date | string;
    reasonTypeId?: number;
    reasonType?: ReasonType;
}