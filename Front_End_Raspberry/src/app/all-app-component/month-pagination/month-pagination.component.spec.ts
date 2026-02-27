import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthPaginationComponent } from './month-pagination.component';

describe('MonthPaginationComponent', () => {
  let component: MonthPaginationComponent;
  let fixture: ComponentFixture<MonthPaginationComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MonthPaginationComponent]
    });
    fixture = TestBed.createComponent(MonthPaginationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
