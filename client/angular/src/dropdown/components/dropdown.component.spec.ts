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

import {beforeEach, bootstrapTemplate, describe, flush, it, setupModule} from 'google3/javascript/angular2/testing/catalyst/fake_async';
import {AppCoreService, CoreModule, TestCoreModule} from 'traceviz-angular-core';
import {int, ints, str, strs} from 'traceviz-client-core';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Dropdown} from './dropdown.component';
import {MatSelectHarness} from '@angular/material/select/testing';
import {getHarness} from '@angular/cdk/testing/catalyst';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

import {DropdownModule} from '../dropdown.module';

describe('dropdown test', () => {
  const appCoreService = new AppCoreService();
  const stringOptions = strs('a', 'b', 'c');
  const stringOutput = str('z');
  const integerOptions = ints(1, 2, 3);
  const integerOutput = int(10);
  let errCount = 0;
  const unsubscribe = new Subject<void>();

  beforeAll(() => {
    appCoreService.appCore.configurationErrors.pipe(takeUntil(unsubscribe))
        .subscribe(() => {
          errCount++;
        });
    appCoreService.appCore.globalState.set('string_opts', stringOptions);
    appCoreService.appCore.globalState.set('string_out', stringOutput);
    appCoreService.appCore.globalState.set('int_opts', integerOptions);
    appCoreService.appCore.globalState.set('int_out', integerOutput);
    appCoreService.appCore.publish();
  });

  afterAll(() => {
    unsubscribe.next();
    unsubscribe.complete();
  });

  beforeEach(() => {
    errCount = 0;
    setupModule({
      providers: [{
        provide: AppCoreService,
        useValue: appCoreService,
      }],
      declarations: [
        Dropdown,
      ],
      imports: [
        CoreModule,
        DropdownModule,
        NoopAnimationsModule,
      ],
    });
  });

  it('handles string options', async () => {
    bootstrapTemplate(`
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
                <value key="options"><global-ref key="string_opts"></global-ref></value>
              </value-map>
            </watch>
            <watch type="update_selection">
              <value-map>
                <value key="selection"><global-ref key="string_out"></global-ref></value>
              </value-map>
            </watch>
          </interactions>
        </dropdown>
      `);
    flush();
    const select = await getHarness(MatSelectHarness);
    await select.open();
    const opts = new Array<string>();
    for (const opt of await select.getOptions()) {
      opts.push(await opt.getText());
    }
    expect(opts).toEqual(['a', 'b', 'c']);
    expect(stringOutput.val).toEqual('z');
    await select.clickOptions({text: 'b'});
    expect(stringOutput.val).toEqual('b');
    expect(errCount).toBe(0);
  });

  it('handles integer options', async () => {
    bootstrapTemplate(`
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
                <value key="options"><global-ref key="int_opts"></global-ref></value>
              </value-map>
            </watch>
            <watch type="update_selection">
              <value-map>
                <value key="selection"><global-ref key="int_out"></global-ref></value>
              </value-map>
            </watch>
          </interactions>
        </dropdown>
      `);
    flush();
    const select = await getHarness(MatSelectHarness);
    await select.open();
    const opts = new Array<string>();
    for (const opt of await select.getOptions()) {
      opts.push(await opt.getText());
    }
    expect(opts).toEqual(['1', '2', '3']);
    expect(integerOutput.val).toEqual(10);
    await select.clickOptions({text: '2'});
    expect(integerOutput.val).toEqual(2);
    expect(errCount).toBe(0);
  });

  it('does not support non-repeated values', async () => {
    bootstrapTemplate(`
        <dropdown>
          <interactions>
            <watch type="update_options">
              <value-map>
                <value key="options"><global-ref key="int_out"></global-ref></value>
              </value-map>
            </watch>
          </interactions>
        </dropdown>
      `);
    flush();
    expect(errCount).toBe(1);
  });

  it('does not support incompatible option and selection types', async () => {
    bootstrapTemplate(`
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
                <value key="options"><global-ref key="string_opts"></global-ref></value>
              </value-map>
            </watch>
            <watch type="update_selection">
              <value-map>
                <value key="selection"><global-ref key="int_out"></global-ref></value>
              </value-map>
            </watch>
          </interactions>
        </dropdown>
      `);
    flush();
    const select = await getHarness(MatSelectHarness);
    await select.open();
    await select.clickOptions({text: 'b'});
    expect(errCount).toBe(1);
  });
});