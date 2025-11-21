import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReasonTypeFormComponent } from './reason-type-form.component';

describe('ReasonTypeFormComponent', () => {
  let component: ReasonTypeFormComponent;
  let fixture: ComponentFixture<ReasonTypeFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ReasonTypeFormComponent]
    });
    fixture = TestBed.createComponent(ReasonTypeFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
