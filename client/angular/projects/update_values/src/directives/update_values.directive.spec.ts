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

import {Component, ViewChild} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {AppCoreService, CoreModule, TestCoreModule} from '@google/traceviz-angular-core';
import {GLOBAL_TEST_DATA_FETCHER, int, IntegerValue, node, ResponseNode, str, StringValue, valueMap} from '@traceviz/client-core';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {UpdateValuesModule} from './update_values.module';
import {UpdateValues} from './update_values.directive';

/** A test trace view including a TestTraceComponent */
@Component({
  standalone: false,
  template: `
    <app-core>
      <global-state>
        <value-map>
          <value key="collection_name"><string></string></value>
          <value key="string_out"><string></string></value>
          <value key="int_out"><int></int></value>
        </value-map>
      </global-state>
      <test-data-query>
      </test-data-query>
    </app-core>
    <update-values>
      <data-series>
        <query><string>q</string></query>
        <interactions>
          <reaction type="fetch" target="data-series">
            <and>
              <not><equals>
                <global-ref key="collection_name"></global-ref>
                <string></string>
              </equals></not>
              <changed noDebounce="true"><global-ref key="collection_name"></global-ref></changed>
            </and>
          </reaction>
        </interactions>
        <parameters></parameters>
      </data-series>
      <interactions>
        <action type="update" target="response">
          <set>
            <global-ref key="string_out"></global-ref>
            <local-ref key="a_string"></local-ref>
          </set>
          <set-if-empty>
            <global-ref key="int_out"></global-ref>
            <local-ref key="an_int"></local-ref>
          </set-if-empty>
        </action>
      </interactions>
    </update-values>`,
  // TODO: Make this AOT compatible. See b/352713444
  jit: true,

})
class UpdateValuesTestComponent {
  @ViewChild(UpdateValues) updateValues!: UpdateValues;
}

describe('update-values test', () => {
  let fixture: ComponentFixture<UpdateValuesTestComponent>;
  const appCoreService = new AppCoreService();
  appCoreService.appCore.configurationErrors.subscribe((err) => {
    fail(err);
  });

  beforeEach(async () => {
    appCoreService.appCore.reset();
    await TestBed
        .configureTestingModule({
          declarations: [UpdateValuesTestComponent],
          imports: [
            CoreModule, TestCoreModule, UpdateValuesModule, NoopAnimationsModule
          ],
          providers: [{provide: AppCoreService, useValue: appCoreService}]
        })
        .compileComponents();
    fixture = TestBed.createComponent(UpdateValuesTestComponent);
    await fixture.whenStable();
  });

  it('performs actions on load', async () => {
    fixture.detectChanges();
    const uv = fixture.componentInstance;
    const collectionName = appCoreService.appCore.globalState.get(
                               'collection_name') as StringValue;
    const stringOutput =
        appCoreService.appCore.globalState.get('string_out') as StringValue;
    const integerOutput =
        appCoreService.appCore.globalState.get('int_out') as IntegerValue;
    GLOBAL_TEST_DATA_FETCHER.responseChannel.next({
      series: new Map<string, ResponseNode>([
        [
          uv.updateValues.dataSeries!.dataSeriesQuery!.uniqueSeriesName,
          node(valueMap(
              {key: 'a_string', val: str('hello')},
              {key: 'an_int', val: int(3)},
              )),
        ],
      ]),
    });
    collectionName.val = 'coll';
    expect(stringOutput.val).toEqual('hello');
    expect(integerOutput.val).toEqual(3);
    GLOBAL_TEST_DATA_FETCHER.responseChannel.next({
      series: new Map<string, ResponseNode>([
        [
          uv.updateValues.dataSeries!.dataSeriesQuery!.uniqueSeriesName,
          node(valueMap(
              {key: 'a_string', val: str('goodbye')},
              {key: 'an_int', val: int(6)},
              )),
        ],
      ]),
    });
    collectionName.val = 'coll2';
    expect(stringOutput.val).toEqual('goodbye');
    expect(integerOutput.val).toEqual(3);
  });
});
