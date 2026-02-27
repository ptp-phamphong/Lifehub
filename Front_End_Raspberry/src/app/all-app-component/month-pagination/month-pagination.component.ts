// timeline-month.component.ts
import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-month-pagination',
  templateUrl: './month-pagination.component.html',
  styleUrls: ['./month-pagination.component.scss']
})
export class MonthPaginationComponent {

  monthsToShow = 5; // số tháng hiển thị
  centerDate = new Date(); // tháng đang được focus
  monthList: { month: number, year: number }[] = [];

  @Output() monthChanged = new EventEmitter<{ month: number, year: number }>();

  constructor() {
    this.buildMonths();
  }

  emitSelected() {
    this.monthChanged.emit({
      month: this.centerDate.getMonth() + 1,
      year: this.centerDate.getFullYear()
    });
  }

  buildMonths() {
    const half = Math.floor(this.monthsToShow / 2);
    this.monthList = [];

    for (let i = -half; i <= half; i++) {
      const d = new Date(this.centerDate.getFullYear(), this.centerDate.getMonth() + i, 1);
      this.monthList.push({
        month: d.getMonth() + 1,
        year: d.getFullYear()
      });
    }
  }

  next() {
    this.centerDate = new Date(this.centerDate.getFullYear(), this.centerDate.getMonth() + 1, 1);
    this.buildMonths();
    this.emitSelected();
  }

  prev() {
    this.centerDate = new Date(this.centerDate.getFullYear(), this.centerDate.getMonth() - 1, 1);
    this.buildMonths();
    this.emitSelected();
  }

  select(monthObj: any) {
    this.centerDate = new Date(monthObj.year, monthObj.month - 1, 1);
    this.buildMonths();
    this.emitSelected();
  }
}
