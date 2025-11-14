import {HarnessLoader} from '@angular/cdk/testing';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {Component, ViewChild} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatInputHarness} from '@angular/material/input/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {AppCoreService, CoreModule, TestCoreModule} from 'traceviz-angular-core';

import {TextAreaModule} from '../text_area.module';
import {StringValue} from 'traceviz-client-core';
import {TextAreaComponent} from './text_area.component';

@Component({
  template: `
    <app-core>
      <global-state>
        <value-map>
          <value key="str_out"><string></string></value>
        </value-map>
      </global-state>
      <test-data-query>
      </test-data-query>
    </app-core>
    <text-area>
      <interactions>
        <action type="update" target="text_area">
          <set>
            <global-ref key="str_out"></global-ref>
            <local-ref key="contents"></local-ref>
          </set>
        </action>
        <watch type="update_contents">
          <value-map>
            <value key="contents"><global-ref key="str_out"></global-ref></value>
          </value-map>
        </watch>
      </interactions>
    </text-area>
`
})
class TextAreaTestComponent {
  updateOnEnter = false;
  @ViewChild(TextAreaComponent) textAreaComp!: TextAreaComponent;
}

describe('TextAreaComponent', () => {
  let fixture: ComponentFixture<TextAreaTestComponent>;
  let loader: HarnessLoader;
  const appCoreService = new AppCoreService();
  appCoreService.appCore.configurationErrors.subscribe((err) => {
    fail(err);
  });

  beforeEach(async () => {
    TestBed.configureTestingModule({
      declarations: [TextAreaTestComponent],
      imports:
          [CoreModule, TestCoreModule, TextAreaModule, NoopAnimationsModule],
      providers: [{provide: AppCoreService, useValue: appCoreService}]
    });
    fixture = TestBed.createComponent(TextAreaTestComponent);
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  it('handles string options', async () => {
    fixture.detectChanges();
    const tc = fixture.componentInstance;
    const strOut =
        appCoreService.appCore.globalState.get('str_out') as StringValue;
    tc.textAreaComp.onText('hi');
    fixture.detectChanges();
    expect(strOut.val).toEqual('hi');
  });

  it('handles updateOnEnter', async () => {
    // TODO
  });
});
