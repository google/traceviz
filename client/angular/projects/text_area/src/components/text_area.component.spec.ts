import {HarnessLoader} from '@angular/cdk/testing';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {Component, ViewChild} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatInputHarness} from '@angular/material/input/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {AppCoreService, CoreModule, TestCoreModule} from '@google/traceviz-angular-core';
import {StringValue} from '@google/traceviz-client-core';

import {TextArea} from './text_area.component';
import {TextAreaModule} from './text_area.module';

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
  @ViewChild(TextArea) textAreaComp!: TextArea;
}

describe('TextArea', () => {
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
    const inputs = await loader.getAllHarnesses(MatInputHarness);
    expect(inputs.length).toBe(1);
    const input = inputs[0];
    const strOut =
        appCoreService.appCore.globalState.get('str_out') as StringValue;
    await input.setValue('hi');
    fixture.detectChanges();
    expect(strOut.val).toEqual('hi');
  });

  it('handles updateOnEnter',
     async () => {
         // TODO
     });
});
