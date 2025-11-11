import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SystemInfoTabComponent } from './system-info-tab.component';

describe('SystemInfoTabComponent', () => {
  let component: SystemInfoTabComponent;
  let fixture: ComponentFixture<SystemInfoTabComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SystemInfoTabComponent]
    });
    fixture = TestBed.createComponent(SystemInfoTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
