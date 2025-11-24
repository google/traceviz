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
import {ConfigurationError, GLOBAL_TEST_DATA_FETCHER, IntegerValue, Request, ResponseNode, str, StringValue, valueMap} from 'traceviz-client-core';

import {CoreModule} from '../core.module';
import {AppCoreService} from '../services/app_core.service';
import {TestCoreModule} from '../test_core.module';

import {DataSeriesDirective} from './data_series_query.directive';

@Component({
  template: `
    <app-core>
      <global-state>
        <value-map>
          <value key="collection_name"><string></string></value>
          <value key="count"><int></int></value>
        </value-map>
      </global-state>
      <test-data-query>
        <value-map> <!-- Global filters, provided with each request. -->
          <global-ref key="collection_name"></global-ref>
        </value-map>
      </test-data-query>
    </app-core>
    <data-series>
      <query><string>my_query</string></query>
      <parameters>
        <value-map>
        </value-map>
      </parameters>
      <interactions>
        <reaction type="fetch" target="data-series">
          <and>
            <not><equals>
              <global-ref key="collection_name"></global-ref>
              <string></string>
            </equals></not>
            <or>
              <changed noDebounce=true><global-ref key="collection_name"></global-ref></changed>
              <changed noDebounce=true><global-ref key="count"></global-ref></changed>
            </or>
          </and>
        </reaction>
      </interactions>
    </data-series>
`
})
class DataSeriesQueryTestComponent {
  @ViewChild(DataSeriesDirective) dataSeriesQueryDir!: DataSeriesDirective;
}

describe('data series directive test', () => {
  let fixture: ComponentFixture<DataSeriesQueryTestComponent>;
  const appCoreService = new AppCoreService();
  appCoreService.appCore.configurationErrors.subscribe(
      (err: ConfigurationError) => {
        fail(err);
      });

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DataSeriesQueryTestComponent],
      imports: [CoreModule, TestCoreModule],
      providers: [{
        provide: AppCoreService,
        useValue: appCoreService,
      }]
    });
    fixture = TestBed.createComponent(DataSeriesQueryTestComponent);
  });

  it('handles data series integration and querying', () => {
    fixture.detectChanges();
    const tc = fixture.componentInstance;
    const appCore = appCoreService.appCore;
    const dataSeriesQuery = tc.dataSeriesQueryDir.dataSeriesQuery;
    expect(dataSeriesQuery).toBeDefined();
    const requests: Request[] = [];
    GLOBAL_TEST_DATA_FETCHER.requestChannel.subscribe((request) => {
      requests.push(request);
    });
    const series: ResponseNode[] = [];
    dataSeriesQuery?.response.subscribe((responseNode: ResponseNode) => {
      series.push(responseNode);
    });
    let loading = false;
    dataSeriesQuery?.loading.subscribe((isLoading: boolean) => {
      loading = isLoading;
    });

    expect(requests.length).toBe(0);
    expect(series.length).toBe(0);
    expect(loading).toBeFalse();
    appCoreService.appCore.configurationErrors.subscribe((err) => {
      fail(err);
    });

    // Change the collection name, forcing an initial fetch.
    (appCore.globalState.get('collection_name') as StringValue).val = 'coll';
    expect(requests.length).toBe(1);
    expect(series.length).toBe(0);
    expect(loading).toBeTrue();

    GLOBAL_TEST_DATA_FETCHER.responseChannel.next({
      series: new Map<string, ResponseNode>([[
        dataSeriesQuery!.uniqueSeriesName, {
          properties: valueMap(
              {key: 'greeting', val: str('hello')},
              ),
          children: [],
        }
      ]]),
    });
    expect(series.length).toBe(1);
    expect(loading).toBeFalse();

    // Change `count`, forcing a refetch.
    (appCore.globalState.get('count') as IntegerValue).val = 10;
    expect(requests.length).toBe(2);
    expect(series.length).toBe(2);
    expect(loading).toBeFalse();
  });
});
