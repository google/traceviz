/*
        Copyright 2023 Google Inc.
        Licensed under the Apache License, Version 2.0 (the "License");
        you may not use this file except in compliance with the License.
        You may obtain a copy of the License at
                https://www.apache.org/licenses/LICENSE-2.0
        Unless required by applicable law or agreed to in writing, software
        distributed under the License is distributed on an "AS IS" BASIS,
        WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
        See the License for the specific language governing permissions and
        limitations under the License.
*/

import {HarnessLoader} from '@angular/cdk/testing';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {Component, ViewChild} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatSelectHarness} from '@angular/material/select/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {AppCoreService, CoreModule, TestCoreModule} from '@google/traceviz-angular-core';
import {IntegerListValue, IntegerValue, StringListValue, StringValue} from '@google/traceviz-client-core';

import {Dropdown} from './dropdown.component';
import {DropdownModule} from './dropdown.module';

let loader: HarnessLoader;

/*
    <dropdown>
      <interactions>
        <action type="select" target="dropdown">
          <set>
            <global-ref key="string_out"></global-ref>
            <local-ref key="selected_item"></local-ref>
          </set>
        </action>
        <watch type="update_options">
          <value-map>
            <value key="options">
              <global-ref key="string_opts"></global-ref>
            </value>
          </value-map>
        </watch>
        <watch type="update_selection">
          <value-map>
            <value key="selection">
              <global-ref key="string_out"></global-ref>
            </value>
          </value-map>
        </watch>
      </interactions>
    </dropdown>
*/

@Component({
  standalone: false,
  template: `
    <app-core>
      <global-state>
        <value-map>
          <value key="string_opts">
            <string-list>
            <string>a</string>
            <string>b</string>
            <string>c</string>
            </string-list>
          </value>
          <value key="string_out">
            <string>z</string>
          </value>
        </value-map>
      </global-state>
      <test-data-query></test-data-query>
    </app-core>
    <dropdown>
      <interactions>
        <action type="select" target="dropdown">
          <set>
            <global-ref key="string_out"></global-ref>
            <local-ref key="selected_item"></local-ref>
          </set>
        </action>
        <watch type="update_options">
          <value-map>
            <value key="options">
              <global-ref key="string_opts"></global-ref>
            </value>
          </value-map>
        </watch>
        <watch type="update_selection">
          <value-map>
            <value key="selection">
              <global-ref key="string_out"></global-ref>
            </value>
          </value-map>
        </watch>
      </interactions>
    </dropdown>
`,
  jit: true,
})
class StringDropdownTestComponent {
  @ViewChild(Dropdown) dropdown!: Dropdown;
}

describe('string dropdown test', () => {
  let fixture: ComponentFixture<StringDropdownTestComponent>;
  const appCoreService = new AppCoreService();
  appCoreService.appCore.configurationErrors.subscribe((err) => {
    fail(err);
  });

  beforeEach(async () => {
    appCoreService.appCore.reset();
    await TestBed
        .configureTestingModule({
          declarations: [StringDropdownTestComponent],
          imports: [
            CoreModule,
            TestCoreModule,
            DropdownModule,
            NoopAnimationsModule,
          ],
          providers: [{provide: AppCoreService, useValue: appCoreService}]
        })
        .compileComponents();
    fixture = TestBed.createComponent(StringDropdownTestComponent);
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  it('handles string options', async () => {
    fixture.detectChanges();
    const stringOut =
        appCoreService.appCore.globalState.get('string_out') as StringValue;
    const selects = await loader.getAllHarnesses(MatSelectHarness);
    expect(selects.length).toBe(1);
    const select = selects[0];
    await select.open();
    const opts = await select.getOptions();
    const gotOpts: Array<string> = [];
    for (const o of opts) {
      const opt = await o.getText();
      gotOpts.push(opt);
    }
    expect(gotOpts).toEqual(['a', 'b', 'c']);
    expect(stringOut.val).toEqual('z');
    await select.clickOptions({text: 'b'});
    expect(stringOut.val).toEqual('b');
  });
});

@Component({
  standalone: false,
  template: `
    <app-core>
      <global-state>
        <value-map>
          <value
          key="int_opts"><int-list><int>1</int><int>2</int><int>3</int></int-list></value>
          <value key="int_out"><int>10</int></value>
        </value-map>
      </global-state>
      <test-data-query>
      </test-data-query>
    </app-core>
    <dropdown>
      <interactions>
        <action type="select" target="dropdown">
          <set>
            <global-ref key="int_out"></global-ref>
            <local-ref key="selected_item"></local-ref>
          </set>
        </action>
        <watch type="update_options">
          <value-map>
            <value key="options"><global-ref
            key="int_opts"></global-ref></value>
          </value-map>
        </watch>
        <watch type="update_selection">
          <value-map>
            <value key="selection"><global-ref
            key="int_out"></global-ref></value>
          </value-map>
        </watch>
      </interactions>
    </dropdown>
`,
  jit: true,
})
class IntDropdownTestComponent {
  @ViewChild(Dropdown) dropdown!: Dropdown;
}

describe('integer dropdown test', () => {
  let fixture: ComponentFixture<IntDropdownTestComponent>;
  const appCoreService = new AppCoreService();
  appCoreService.appCore.configurationErrors.subscribe((err) => {
    fail(err);
  });

  beforeEach(async () => {
    appCoreService.appCore.reset();
    await TestBed
        .configureTestingModule({
          declarations: [IntDropdownTestComponent],
          imports: [
            CoreModule,
            TestCoreModule,
            DropdownModule,
            NoopAnimationsModule,
          ],
          providers: [{provide: AppCoreService, useValue: appCoreService}]
        })
        .compileComponents();
    fixture = TestBed.createComponent(IntDropdownTestComponent);
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  it('handles integer options', async () => {
    fixture.detectChanges();
    const intOut =
        appCoreService.appCore.globalState.get('int_out') as IntegerValue;
    const selects = await loader.getAllHarnesses(MatSelectHarness);
    expect(selects.length).toBe(1);
    const select = selects[0];
    await select.open();
    const opts = await select.getOptions();
    const gotOpts: Array<string> = [];
    for (const o of opts) {
      const opt = await o.getText();
      gotOpts.push(opt);
    }
    expect(gotOpts).toEqual(['1', '2', '3']);
    expect(intOut.val).toEqual(10);
    await select.clickOptions({text: '2'});
    expect(intOut.val).toEqual(2);
  });
});

@Component({
  standalone: false,
  template: `
    <app-core>
      <global-state>
        <value-map>
          <value key="int_out"><int>10</int></value>
        </value-map>
      </global-state>
      <test-data-query>
      </test-data-query>
    </app-core>
    <dropdown>
      <interactions>
        <watch type="update_options">
          <value-map>
            <value key="options"><global-ref
            key="int_out"></global-ref></value>
          </value-map>
        </watch>
      </interactions>
    </dropdown>
`,
  jit: true,
})
class NonRepeatedDropdownTestComponent {
  @ViewChild(Dropdown) dropdown!: Dropdown;
}

describe('non-repeated dropdown test', () => {
  let fixture: ComponentFixture<NonRepeatedDropdownTestComponent>;
  const appCoreService = new AppCoreService();
  let errCount = 0;
  appCoreService.appCore.configurationErrors.subscribe((err) => {
    errCount++;
  });

  beforeEach(async () => {
    appCoreService.appCore.reset();
    await TestBed
        .configureTestingModule({
          declarations: [NonRepeatedDropdownTestComponent],
          imports: [
            CoreModule,
            TestCoreModule,
            DropdownModule,
            NoopAnimationsModule,
          ],
          providers: [{provide: AppCoreService, useValue: appCoreService}]
        })
        .compileComponents();
    fixture = TestBed.createComponent(NonRepeatedDropdownTestComponent);
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  it('does not support non-repeated values', async () => {
    fixture.detectChanges();
    expect(errCount).toBe(1);
  });
});

@Component({
  standalone: false,
  template: `
    <app-core>
      <global-state>
        <value-map>
          <value
          key="string_opts"><string-list><string>a</string><string>b</string><string>c</string></string-list></value>
          <value key="int_out"><int>10</int></value>
        </value-map>
      </global-state>
      <test-data-query>
      </test-data-query>
    </app-core>
    <dropdown>
      <interactions>
        <action type="select" target="dropdown">
          <set>
            <global-ref key="int_out"></global-ref>
            <local-ref key="selected_item"></local-ref>
          </set>
        </action>
        <watch type="update_options">
          <value-map>
            <value key="options"><global-ref
            key="string_opts"></global-ref></value>
          </value-map>
        </watch>
        <watch type="update_selection">
          <value-map>
            <value key="selection"><global-ref
            key="int_out"></global-ref></value>
          </value-map>
        </watch>
      </interactions>
    </dropdown>
`,
  jit: true,
})
class IncompatibleDropdownTestComponent {
  @ViewChild(Dropdown) dropdown!: Dropdown;
}

describe('incompatible dropdown test', () => {
  let fixture: ComponentFixture<IncompatibleDropdownTestComponent>;
  const appCoreService = new AppCoreService();
  let errCount = 0;
  appCoreService.appCore.configurationErrors.subscribe((err) => {
    errCount++;
  });

  beforeEach(async () => {
    appCoreService.appCore.reset();
    await TestBed
        .configureTestingModule({
          declarations: [IncompatibleDropdownTestComponent],
          imports: [
            CoreModule,
            TestCoreModule,
            DropdownModule,
            NoopAnimationsModule,
          ],
          providers: [{provide: AppCoreService, useValue: appCoreService}]
        })
        .compileComponents();
    fixture = TestBed.createComponent(IncompatibleDropdownTestComponent);
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  it('does not support incompatible option and selection types', async () => {
    fixture.detectChanges();
    const selects = await loader.getAllHarnesses(MatSelectHarness);
    expect(selects.length).toBe(1);
    const select = selects[0];
    await select.open();
    const opts = await select.getOptions();
    const gotOpts: Array<string> = [];
    for (const o of opts) {
      const opt = await o.getText();
      gotOpts.push(opt);
    }
    await select.clickOptions({text: 'b'});
  });
});
