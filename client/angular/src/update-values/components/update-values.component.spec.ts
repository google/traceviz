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
import {AppCoreService, CoreModule, TestCoreModule} from 'traceviz-angular-core';
import {GLOBAL_TEST_DATA_FETCHER, node, ResponseNode, str, StringListValue, StringSetValue, StringValue, strs, valueMap} from 'traceviz-client-core';

import {UpdateValuesDirective} from './update-values.component';
import {UpdateValuesModule} from './update-values.module';


@Component({
  template: `
    <app-core>
        <global-state>
            <value-map>
                <value key="collection_name"><string></string></value>
                <value key="ui_features"><string-set></string-set></value>
                <value key="available_metrics"><string-list></string-list></value>
                <value key="default_metric"><string></string></value>
            </value-map>
        </global-state>
        <test-data-query>
            <value-map> <!-- Global filters, provided with each request. -->
                <global-ref key="collection_name"></global-ref>
            </value-map>
        </test-data-query>
    </app-core>
    <update-values>
        <interactions>
            <action target="response" type="update">
                <set>
                    <global-ref key="ui_features"></global-ref>
                    <local-ref key="ui_features"></local-ref>
                </set>
                <set>
                    <global-ref key="available_metrics"></global-ref>
                    <local-ref key="available_metrics"></local-ref>
                </set>
                <set>
                    <global-ref key="default_metric"></global-ref>
                    <local-ref key="default_metric"></local-ref>
                </set>
            </action>
        </interactions>
        <data-series>
            <query><string>get_collection_settings</string></query>
            <interactions>
                <reaction type="fetch" target="data-series">
                    <and>
                        <not><equals>
                            <global-ref key="collection_name"></global-ref>
                            <string></string>
                        </equals></not>
                        <changed>
                            <global-ref key="collection_name"></global-ref>
                        </changed>
                    </and>
                </reaction>
            </interactions>
        </data-series>
    </update-values>
`
})
class UpdateValuesTestComponent {
  @ViewChild(UpdateValuesDirective) updateValuesDir!: UpdateValuesDirective;
}

describe('update-values test', () => {
  let fixture: ComponentFixture<UpdateValuesTestComponent>;
  const appCoreService = new AppCoreService();
  appCoreService.appCore.configurationErrors.subscribe((err) => {
    fail(err);
  });

  beforeEach(async () => {
    TestBed.configureTestingModule({
      declarations: [UpdateValuesTestComponent],
      imports: [CoreModule, TestCoreModule, UpdateValuesModule],
      providers: [{provide: AppCoreService, useValue: appCoreService}]
    });
    fixture = TestBed.createComponent(UpdateValuesTestComponent);
  });

  it('updates from data series', () => {
    fixture.detectChanges();
    const tc = fixture.componentInstance;
    const collectionName = appCoreService.appCore.globalState.get(
                               'collection_name') as StringValue;
    const uiFeatures =
        appCoreService.appCore.globalState.get('ui_features') as StringSetValue;
    const availableMetrics = appCoreService.appCore.globalState.get(
                                 'available_metrics') as StringListValue;
    const defaultMetric =
        appCoreService.appCore.globalState.get('default_metric') as StringValue;
    GLOBAL_TEST_DATA_FETCHER.responseChannel.next({
      series: new Map<string, ResponseNode>([
        [
          tc.updateValuesDir.dataSeriesQueryDir!.dataSeriesQuery!
              .uniqueSeriesName,
          node(valueMap(
              {key: 'ui_features', val: strs('sparkles', 'lights')},
              {key: 'available_metrics', val: strs('height', 'width', 'depth')},
              {key: 'default_metric', val: str('height')},
              ))
        ],
      ]),
    });
    expect(tc.updateValuesDir.appCoreService).toEqual(appCoreService);
    expect(uiFeatures.val).toEqual(new Set());
    expect(availableMetrics.val).toEqual([]);
    expect(defaultMetric.val).toEqual('');
    collectionName.val = 'coll';
    expect(uiFeatures.val).toEqual(new Set(['lights', 'sparkles']));
    expect(availableMetrics.val).toEqual(['height', 'width', 'depth']);
    expect(defaultMetric.val).toEqual('height');
  });
});
