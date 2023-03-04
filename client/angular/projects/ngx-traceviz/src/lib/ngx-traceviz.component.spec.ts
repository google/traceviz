import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxTracevizComponent } from './ngx-traceviz.component';

describe('NgxTracevizComponent', () => {
  let component: NgxTracevizComponent;
  let fixture: ComponentFixture<NgxTracevizComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NgxTracevizComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgxTracevizComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
