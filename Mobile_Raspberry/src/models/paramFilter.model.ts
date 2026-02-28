export interface ParamFilter {
  month?: number;
  year?: number;
  reasonTypeIdsFilterIn?: number[];
  reasonTypeIdsFilterOut?: number[];
  sortColumn?: string;
  sortDirection?: string;
}
