import {HarnessLoader} from '@angular/cdk/testing';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {Component, ViewChild} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatInputHarness} from '@angular/material/input/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {AppCoreService, CoreModule, TestCoreModule} from 'traceviz-angular-core';
import {StringValue} from 'traceviz-client-core';

import {TextFieldModule} from '../text_field.module';

import {TextFieldComponent} from './text_field.component';

@Component({
  template: `
    <app-core>
      <global-state>
        <value-map>
          <value key="my_string"><string></string></value>
        </value-map>
      </global-state>
      <test-data-query>
      </test-data-query>
    </app-core>
    <text-field [updateOnEnter]="updateOnEnter">
      <interactions>
        <action type="update" target="text_field">
            <set>
                <global-ref key="my_string"></global-ref>
                <local-ref key="contents"></local-ref>
            </set>
        </action>
        <watch type="update_contents">
          <value-map>
            <value key="contents">
                <global-ref key="my_string"></global-ref>
            </value>
          </value-map>
        </watch>
      </interactions>
    </text-field>
`
})
class TextFieldTestComponent {
  updateOnEnter = false;
  @ViewChild(TextFieldComponent) textFieldComp!: TextFieldComponent;
}

describe('TextFieldComponent', () => {
  let fixture: ComponentFixture<TextFieldTestComponent>;
  let loader: HarnessLoader;
  const appCoreService = new AppCoreService();
  appCoreService.appCore.configurationErrors.subscribe((err) => {
    fail(err);
  });

  beforeEach(async () => {
    TestBed.configureTestingModule({
      declarations: [TextFieldTestComponent],
      imports:
          [CoreModule, TestCoreModule, TextFieldModule, NoopAnimationsModule],
      providers: [{provide: AppCoreService, useValue: appCoreService}]
    });
    fixture = TestBed.createComponent(TextFieldTestComponent);
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  it('updates to and from globals', async () => {
    fixture.detectChanges();
    const tc = fixture.componentInstance;
    const input = await loader.getHarness(MatInputHarness);
    expect(await input.getValue()).toEqual('');
    const myString =
        appCoreService.appCore.globalState.get('my_string') as StringValue;
    tc.textFieldComp.onText('wow');
    fixture.detectChanges();
    expect(await input.getValue()).toEqual('wow');
    await input.setValue('yow');
    fixture.detectChanges();
    expect(myString.val).toEqual('yow');
  });
});
