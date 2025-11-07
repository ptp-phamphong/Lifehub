import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CallApiComponent } from './call-api.component';

describe('CallApiComponent', () => {
  let component: CallApiComponent;
  let fixture: ComponentFixture<CallApiComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CallApiComponent]
    });
    fixture = TestBed.createComponent(CallApiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
