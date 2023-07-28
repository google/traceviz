import {Component, ViewChild} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';

import {CoreModule} from '../core.module';
import {AppCoreDirective} from '../directives/app_core.directive';
import {TestCoreModule} from '../test_core.module';

import {AppCoreService} from './app_core.service';

@Component({
  template: `
  <app-core>
    <global-state>
      <value-map>
      </value-map>
    </global-state>
    <test-data-query></test-data-query>
  </app-core>`
})
class TestComponent {
  @ViewChild(AppCoreDirective) appCore!: AppCoreDirective;
  constructor(readonly appCoreService: AppCoreService) {}
}

@Component({
  template: `
  <app-core>
    <test-data-query></test-data-query>
  </app-core>`
})
class MissingGlobalStateComponent {
  @ViewChild(AppCoreDirective) appCore!: AppCoreDirective;
  constructor(readonly appCoreService: AppCoreService) {}
}

@Component({
  template: `
  <app-core>
    <global-state>
      <value-map>
      </value-map>
    </global-state>
  </app-core>`
})
class MissingDataQueryComponent {
  @ViewChild(AppCoreDirective) appCore!: AppCoreDirective;
  constructor(readonly appCoreService: AppCoreService) {}
}

describe('app-core test', () => {
  it('constructs', () => {
    const appCoreService = new AppCoreService();
    let fixture: ComponentFixture<TestComponent>;
    TestBed.configureTestingModule({
      declarations: [TestComponent],
      imports: [CoreModule, TestCoreModule],
      providers: [{
        provide: AppCoreService,
        useValue: appCoreService,
      }]
    });
    fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();
    const itc = fixture.componentInstance;
    expect(itc.appCoreService.appCore).toBeDefined();
  });

  it('fails with missing global-state', () => {
    const appCoreService = new AppCoreService();
    TestBed.configureTestingModule({
      declarations: [MissingGlobalStateComponent],
      imports: [CoreModule, TestCoreModule],
      providers: [{
        provide: AppCoreService,
        useValue: appCoreService,
      }]
    });
    expect(() => {
      let fixture: ComponentFixture<MissingGlobalStateComponent>;
      fixture = TestBed.createComponent(MissingGlobalStateComponent);
      fixture.detectChanges();
    }).toThrow();
  });

  it('fails with missing data-query', () => {
    const appCoreService = new AppCoreService();
    TestBed.configureTestingModule({
      declarations: [MissingDataQueryComponent],
      imports: [CoreModule, TestCoreModule],
      providers: [{
        provide: AppCoreService,
        useValue: appCoreService,
      }]
    });
    expect(() => {
      let fixture: ComponentFixture<MissingDataQueryComponent>;
      fixture = TestBed.createComponent(MissingDataQueryComponent);
      fixture.detectChanges();
    }).toThrow();
  });
});
