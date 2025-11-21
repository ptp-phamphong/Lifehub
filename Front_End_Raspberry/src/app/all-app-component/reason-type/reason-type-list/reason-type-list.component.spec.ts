import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReasonTypeListComponent } from './reason-type-list.component';

describe('ReasonTypeListComponent', () => {
  let component: ReasonTypeListComponent;
  let fixture: ComponentFixture<ReasonTypeListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ReasonTypeListComponent]
    });
    fixture = TestBed.createComponent(ReasonTypeListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
