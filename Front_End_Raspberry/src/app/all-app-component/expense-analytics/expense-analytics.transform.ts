// Tầng biến đổi cho trang Phân tích chi tiêu: raw records -> dataset của từng biểu đồ.
//
// Cố ý là HÀM THUẦN, không @Injectable: test được mà không cần DI, service chỉ lo
// I/O, còn component trang chỉ lo điều phối.
//
// Backend không có phép gộp nào (mọi Sum đều là scalar) và không lọc theo khoảng
// ngày, nên toàn bộ việc gộp nằm ở đây. Xem Information_AI/19_feature-expense-analytics.md.

import { ExpenseRecord } from '../../model/expense.model';
import { ReasonType } from '../../model/reason-type.model';
import { toDayKey, toMonthKey } from '../../utils/date-key';
import {
  AnalyticsFilter,
  AnalyticsRawData,
  CumulativePoint,
  CumulativeSeries,
  DatedRecord,
  HeatCell,
  HeatmapModel,
  KHONG_PHAN_LOAI,
  KpiTile,
  MonthlyPair,
  RankRow,
  StackColumn,
  StackLegendItem,
  StackModel,
  StackSegment,
  WeekdayRow
} from '../../model/expense-analytics.model';

/** Số slot màu phân loại có trong styles.scss (--color-series-1..8). */
const SO_SLOT_MAU = 8;
/** Số loại được giữ màu riêng ở biểu đồ cột chồng; phần đuôi gộp lại. */
const SO_LOAI_GIU_MAU = 6;
const NHAN_GOP_MAC_DINH = 'Khác';
const TEN_THU = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// ─── Khóa thời gian ───────────────────────────────────────────────────
//
// Dùng chung utils/date-key.ts (giờ địa phương). Lý do KHÔNG được dùng
// toISOString() nằm trong file đó - đọc trước khi đụng vào.
//
// Backend trả DateTime.Now không kèm timezone nên new Date(...) đã parse ra giờ
// địa phương; cứ đọc thẳng bằng getter địa phương là khớp.

export const monthKey = toMonthKey;
export const dayKey = toDayKey;

/** 'T7/26' - đủ ngắn cho nhãn trục X. */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `T${Number(m)}/${y.slice(2)}`;
}

/** 'Tháng 7/2026' - dùng cho tiêu đề, nơi có chỗ. */
export function monthLabelDai(key: string): string {
  const [y, m] = key.split('-');
  return `Tháng ${Number(m)}/${y}`;
}

/**
 * Sinh dãy tháng LIÊN TỤC giữa 2 mốc.
 *
 * Đây là thứ chống lại cái bẫy lớn nhất của biểu đồ thời gian: nếu chỉ group by
 * các tháng có bản ghi thì tháng trống bị bỏ hẳn khỏi trục, khiến một khoảng
 * ngưng chi trông y hệt như chi liên tục. Có trục dày rồi mới zero-fill được.
 *
 * setMonth() tự xử lý tràn năm (giống month-pagination.component.ts:33).
 */
export function enumerateMonths(fromKey: string, toKey: string): string[] {
  const [fy, fm] = fromKey.split('-').map(Number);
  const [ty, tm] = toKey.split('-').map(Number);
  const out: string[] = [];
  const end = new Date(ty, tm - 1, 1);
  const cur = new Date(fy, fm - 1, 1);
  while (cur <= end) {
    out.push(monthKey(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

/** Lùi n tháng từ một khóa tháng. */
export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

// ─── Chuẩn hóa ────────────────────────────────────────────────────────

/**
 * Đổi DTO thô thành DatedRecord, loại bản ghi không có ngày (schema cho phép
 * createdDate null) và ĐẾM lại số bị loại.
 *
 * Loại ở đúng một chỗ này, để mọi biểu đồ phía sau khỏi phải tự phòng thủ.
 * Số đếm phải hiện ra UI: tiền không được biến mất trong im lặng.
 */
export function normalizeRaw(
  expenses: ExpenseRecord[],
  incomes: ExpenseRecord[],
  reasonTypes: ReasonType[]
): AnalyticsRawData {
  const ex = toDatedRecords(expenses);
  const inc = toDatedRecords(incomes);

  return {
    expenses: ex.rows,
    incomes: inc.rows,
    reasonTypes: reasonTypes || [],
    skippedExpenseCount: ex.skipped,
    skippedIncomeCount: inc.skipped,
    loadedAt: new Date()
  };
}

function toDatedRecords(rows: ExpenseRecord[]): { rows: DatedRecord[]; skipped: number } {
  const out: DatedRecord[] = [];
  let skipped = 0;

  for (const r of rows || []) {
    const d = r.createdDate ? new Date(r.createdDate) : null;
    if (!d || isNaN(d.getTime())) {
      skipped++;
      continue;
    }
    out.push({
      id: r.id,
      reason: r.reason || '',
      amount: r.amount || 0,
      date: d,
      monthKey: monthKey(d),
      dayKey: dayKey(d),
      reasonTypeId: r.reasonTypeId == null ? null : r.reasonTypeId,
      reasonName: r.reasonType?.reasonName || KHONG_PHAN_LOAI
    });
  }

  return { rows: out, skipped };
}

// ─── Lọc ──────────────────────────────────────────────────────────────

/**
 * Lọc loại CHỈ áp cho chi - thu không có loại, áp vào sẽ thành 0 hết.
 *
 * Có cả IN và OUT để khớp đúng ExpenseRepository.GetAllExpenses: lọc theo loại
 * VÀ loại trừ loại. Thiếu một trong hai thì tổng của trang này sẽ không bao giờ
 * khớp với "Tổng chi tháng" của trang Chi tiêu.
 */
export function filterExpenses(rows: DatedRecord[], f: AnalyticsFilter): DatedRecord[] {
  let out = rows;

  if (f.reasonTypeIds?.length) {
    const keep = new Set(f.reasonTypeIds);
    out = out.filter(r => r.reasonTypeId != null && keep.has(r.reasonTypeId));
  }

  if (f.reasonTypeIdsOut?.length) {
    const drop = new Set(f.reasonTypeIdsOut);
    out = out.filter(r => r.reasonTypeId == null || !drop.has(r.reasonTypeId));
  }

  return out;
}

/**
 * Trục tháng hiển thị: luôn liên tục, luôn kết thúc ở tháng neo (kể cả khi tháng
 * neo chưa có bản ghi nào - nó vẫn phải hiện ra dưới dạng cột 0).
 */
export function visibleMonths(rows: DatedRecord[], f: AnalyticsFilter): string[] {
  const to = f.anchorMonth;

  if (f.monthsBack > 0) {
    return enumerateMonths(shiftMonth(to, -(f.monthsBack - 1)), to);
  }

  // Toàn bộ lịch sử: lấy từ tháng cũ nhất có dữ liệu.
  let min = to;
  for (const r of rows) {
    if (r.monthKey < min) min = r.monthKey;
  }
  return enumerateMonths(min, to);
}

// ─── #1 KPI ───────────────────────────────────────────────────────────

export function buildKpis(
  expenses: DatedRecord[],
  incomes: DatedRecord[],
  anchor: string
): KpiTile[] {
  const prev = shiftMonth(anchor, -1);

  const chiNay = sumIn(expenses, anchor);
  const chiTruoc = sumIn(expenses, prev);
  const thuNay = sumIn(incomes, anchor);
  const thuTruoc = sumIn(incomes, prev);

  const soNgay = daysElapsed(anchor);

  return [
    {
      label: 'Tổng chi',
      value: chiNay,
      deltaPercent: deltaPercent(chiNay, chiTruoc),
      higherIsBetter: false,
      hint: `so với ${monthLabelDai(prev).toLowerCase()}`
    },
    {
      label: 'Tổng thu',
      value: thuNay,
      deltaPercent: deltaPercent(thuNay, thuTruoc),
      higherIsBetter: true,
      hint: `so với ${monthLabelDai(prev).toLowerCase()}`
    },
    {
      label: 'Số dư',
      value: thuNay - chiNay,
      deltaPercent: null,
      higherIsBetter: true,
      hint: 'tổng thu trừ tổng chi'
    },
    {
      label: 'Trung bình mỗi ngày',
      value: Math.round(chiNay / Math.max(soNgay, 1)),
      deltaPercent: null,
      higherIsBetter: false,
      hint: `chi chia cho ${soNgay} ngày`
    }
  ];
}

/**
 * null khi mốc so sánh bằng 0: không có phần trăm nào đúng ở đây.
 * Trả 100% hay Infinity đều là bịa - UI sẽ hiện dấu gạch.
 */
function deltaPercent(now: number, before: number): number | null {
  if (!before) return null;
  return ((now - before) / before) * 100;
}

/** Tháng đang diễn ra thì chỉ tính tới hôm nay, tháng đã qua thì tính trọn. */
function daysElapsed(anchor: string): number {
  const now = new Date();
  if (anchor === monthKey(now)) return now.getDate();
  return daysInMonth(anchor);
}

function daysInMonth(key: string): number {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function sumIn(rows: DatedRecord[], mKey: string): number {
  let s = 0;
  for (const r of rows) {
    if (r.monthKey === mKey) s += r.amount;
  }
  return s;
}

// ─── #2 Thu vs Chi theo tháng ─────────────────────────────────────────

export function buildIncomeExpense(
  expenses: DatedRecord[],
  incomes: DatedRecord[],
  months: string[]
): MonthlyPair[] {
  const chi = sumByMonth(expenses);
  const thu = sumByMonth(incomes);

  // months đã liên tục -> tháng trống tự nhận 0 chứ không biến mất.
  return months.map(m => ({
    monthKey: m,
    label: monthLabel(m),
    expense: chi.get(m) || 0,
    income: thu.get(m) || 0
  }));
}

function sumByMonth(rows: DatedRecord[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.monthKey, (map.get(r.monthKey) || 0) + r.amount);
  }
  return map;
}

// ─── #3 Chi theo loại ─────────────────────────────────────────────────

/**
 * Xếp hạng theo tổng. Mọi thanh dùng CHUNG một màu: loại chi là danh định
 * (đổi thứ tự không đổi nghĩa), nên tô đậm dần theo giá trị sẽ tiêu kênh màu
 * để mã hóa lại đúng cái mà độ dài thanh đã nói rồi.
 */
export function buildCategoryRank(expenses: DatedRecord[]): RankRow[] {
  const totals = new Map<string, { total: number; count: number }>();

  for (const r of expenses) {
    const cur = totals.get(r.reasonName) || { total: 0, count: 0 };
    cur.total += r.amount;
    cur.count++;
    totals.set(r.reasonName, cur);
  }

  const rows = Array.from(totals.entries())
    .map(([label, v]) => ({ label, total: v.total, count: v.count, percent: 0, isMuted: label === KHONG_PHAN_LOAI }))
    .sort((a, b) => b.total - a.total);

  const max = Math.max(...rows.map(r => r.total), 1);
  for (const r of rows) {
    r.percent = (r.total / max) * 100;
  }

  return rows;
}

// ─── #4 Cơ cấu loại qua các tháng ─────────────────────────────────────

/**
 * Cột chồng, top N loại giữ màu riêng, phần đuôi gộp lại.
 *
 * Hai điểm dễ làm sai:
 * 1. Slot màu phải tính MỘT LẦN trên cả cửa sổ, không phải từng cột. Nếu xếp
 *    hạng lại theo từng tháng thì một loại sẽ đổi màu giữa các cột -> vô nghĩa.
 * 2. Nhãn nhóm gộp có thể trùng tên loại có thật (người dùng tự đặt tên, và
 *    "Khác" là cái tên rất dễ có). Trùng thì hai thứ khác hẳn nhau sẽ nằm chung
 *    một đoạn mà không ai biết -> phải dò và đổi nhãn.
 */
export function buildCategoryStack(
  expenses: DatedRecord[],
  months: string[],
  topN = SO_LOAI_GIU_MAU
): StackModel {
  const rank = buildCategoryRank(expenses);
  const named = rank.filter(r => !r.isMuted);

  const keep = named.slice(0, topN).map(r => r.label);
  const keepSet = new Set(keep);

  const coDuoi = named.length > topN;
  const coChuaPhanLoai = rank.some(r => r.isMuted);
  const canGop = coDuoi || coChuaPhanLoai;

  const otherLabel = canGop
    ? nhanGopKhongTrung(new Set(rank.map(r => r.label)))
    : NHAN_GOP_MAC_DINH;

  const slotOf = new Map<string, number>();
  keep.forEach((label, i) => slotOf.set(label, (i % SO_SLOT_MAU) + 1));

  // Gộp: [tháng][nhãn] -> tiền
  const grid = new Map<string, Map<string, number>>();
  for (const r of expenses) {
    const label = keepSet.has(r.reasonName) ? r.reasonName : otherLabel;
    let row = grid.get(r.monthKey);
    if (!row) {
      row = new Map<string, number>();
      grid.set(r.monthKey, row);
    }
    row.set(label, (row.get(label) || 0) + r.amount);
  }

  const thuTuNhan = canGop ? [...keep, otherLabel] : keep;

  const columns: StackColumn[] = months.map(m => {
    const row = grid.get(m);
    const segments: StackSegment[] = [];
    let total = 0;

    for (const label of thuTuNhan) {
      const value = row?.get(label) || 0;
      if (value <= 0) continue;
      segments.push({ label, value, slot: slotOf.get(label) || 0 });
      total += value;
    }

    return { monthKey: m, label: monthLabel(m), total, segments };
  });

  const legend: StackLegendItem[] = thuTuNhan
    .map(label => ({
      label,
      slot: slotOf.get(label) || 0,
      total: columns.reduce((s, c) => s + (c.segments.find(x => x.label === label)?.value || 0), 0)
    }))
    .filter(x => x.total > 0);

  return { columns, legend, otherLabel };
}

/** Tìm nhãn gộp không đụng tên loại nào đang có thật. */
function nhanGopKhongTrung(daDung: Set<string>): string {
  if (!daDung.has(NHAN_GOP_MAC_DINH)) return NHAN_GOP_MAC_DINH;
  for (const ungVien of ['Các loại còn lại', 'Loại khác', 'Nhóm còn lại']) {
    if (!daDung.has(ungVien)) return ungVien;
  }
  let i = 2;
  while (daDung.has(`Các loại còn lại (${i})`)) i++;
  return `Các loại còn lại (${i})`;
}

// ─── #5 Chi theo thứ trong tuần ───────────────────────────────────────

/** getDay() trả 0 = Chủ nhật, phải xoay về thứ tự T2..CN kiểu Việt Nam. */
export function buildWeekday(expenses: DatedRecord[]): WeekdayRow[] {
  const rows: WeekdayRow[] = TEN_THU.map(label => ({ label, total: 0, count: 0 }));

  for (const r of expenses) {
    const idx = (r.date.getDay() + 6) % 7;
    rows[idx].total += r.amount;
    rows[idx].count++;
  }

  return rows;
}

// ─── #6 Heatmap chi theo ngày ─────────────────────────────────────────

/**
 * Lưới lịch của tháng neo, tô theo mức chi.
 *
 * Thang kẹp ở p95 chứ không phải max: chỉ cần một khoản Tết là linear 0..max sẽ
 * ép cả tháng còn lại về bậc 1. Ngày không chi dùng bậc 0 (ô rỗng) chứ không
 * phải bậc 1 - "không chi" không được trông như "chi ít".
 */
export function buildHeatmap(expenses: DatedRecord[], anchor: string): HeatmapModel {
  const [y, m] = anchor.split('-').map(Number);
  const soNgay = daysInMonth(anchor);

  const perDay = new Map<string, { total: number; count: number }>();
  for (const r of expenses) {
    if (r.monthKey !== anchor) continue;
    const cur = perDay.get(r.dayKey) || { total: 0, count: 0 };
    cur.total += r.amount;
    cur.count++;
    perDay.set(r.dayKey, cur);
  }

  const values = Array.from(perDay.values()).map(v => v.total).filter(v => v > 0);
  const clampMax = Math.max(percentile(values, 95), 1);
  const hasClamped = values.some(v => v > clampMax);

  const cells: HeatCell[] = [];
  const oDem = (): HeatCell =>
    ({ dayKey: '', day: 0, total: 0, count: 0, level: 0, isPadding: true, isFuture: false });

  // Ô đệm đầu tháng để ngày 1 rơi đúng cột thứ của nó.
  const dauThang = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  for (let i = 0; i < dauThang; i++) cells.push(oDem());

  // Tháng đang diễn ra: ngày sau hôm nay là ngày CHƯA TỚI, không phải ngày
  // không chi - cùng lý do đường lũy kế phải dừng ở hôm nay.
  const now = new Date();
  const homNay = anchor === monthKey(now) ? now.getDate() : soNgay;

  for (let d = 1; d <= soNgay; d++) {
    const key = dayKey(new Date(y, m - 1, d));
    const hit = perDay.get(key);
    const total = hit?.total || 0;
    cells.push({
      dayKey: key,
      day: d,
      total,
      count: hit?.count || 0,
      level: heatLevel(total, clampMax),
      isPadding: false,
      isFuture: d > homNay
    });
  }

  while (cells.length % 7 !== 0) cells.push(oDem());

  const weeks: HeatCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return { weeks, clampMax, hasClamped, monthLabel: monthLabelDai(anchor) };
}

/** 0 = không chi; 1..6 = bậc ramp (--color-ramp-1..6). */
function heatLevel(total: number, clampMax: number): number {
  if (total <= 0) return 0;
  const ratio = Math.min(total / clampMax, 1);
  return Math.max(1, Math.ceil(ratio * 6));
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

// ─── #7 Chi lũy kế trong tháng ────────────────────────────────────────

/**
 * So tháng neo với tháng liền trước. Dạng nhấn mạnh: tháng neo là câu chuyện,
 * tháng trước chỉ là bối cảnh (màu xám), không phải 2 chuỗi ngang hàng.
 *
 * Tháng đang diễn ra thì đường dừng ở HÔM NAY. Kéo phẳng tới ngày cuối tháng sẽ
 * đọc thành "đã ngừng chi" - một lời nói dối.
 */
export function buildCumulative(expenses: DatedRecord[], anchor: string): CumulativeSeries {
  const prev = shiftMonth(anchor, -1);
  const now = new Date();
  const isPartial = anchor === monthKey(now);

  const denNgay = isPartial ? now.getDate() : daysInMonth(anchor);

  return {
    current: cumulativeFor(expenses, anchor, denNgay),
    previous: cumulativeFor(expenses, prev, daysInMonth(prev)),
    currentLabel: monthLabelDai(anchor),
    previousLabel: monthLabelDai(prev),
    daysInMonth: Math.max(daysInMonth(anchor), daysInMonth(prev)),
    isPartial
  };
}

function cumulativeFor(rows: DatedRecord[], mKey: string, denNgay: number): CumulativePoint[] {
  const perDay = new Array<number>(32).fill(0);
  for (const r of rows) {
    if (r.monthKey === mKey) perDay[r.date.getDate()] += r.amount;
  }

  const out: CumulativePoint[] = [];
  let run = 0;
  for (let d = 1; d <= denNgay; d++) {
    run += perDay[d];
    out.push({ day: d, total: run });
  }
  return out;
}

// ─── Định dạng tiền ───────────────────────────────────────────────────

/** Giống hệt formatCurrency() của trang Chi tiêu -> hai trang khớp nhau. */
export function formatCurrencyFull(amount?: number): string {
  if (!amount) return '0 VNĐ';
  return amount.toLocaleString('vi-VN') + ' VNĐ';
}

/**
 * Bản rút gọn cho nhãn trục, nơi chuỗi đầy đủ quá dài.
 * vi-VN dùng dấu PHẨY làm phân cách thập phân: '12,5 tr'.
 */
export function formatCurrencyCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return trimZero(amount / 1_000_000_000) + ' tỷ';
  if (abs >= 1_000_000) return trimZero(amount / 1_000_000) + ' tr';
  if (abs >= 1_000) return trimZero(amount / 1_000) + ' N';
  return `${amount}`;
}

function trimZero(v: number): string {
  return v.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
}
