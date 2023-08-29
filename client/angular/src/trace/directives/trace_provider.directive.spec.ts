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

import {Component, Input, ViewChild} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {GLOBAL_TEST_DATA_FETCHER, ResponseNode, StringValue, Trace, Duration, str, dur, int, valueMap, prettyPrintTrace, node} from 'traceviz-client-core';
import {AppCoreService, CoreModule, TestCoreModule} from 'traceviz-angular-core';
import {TraceModule} from '../trace.module';
import {UnionTracesDirective} from './trace_provider.directive';

function d(sec: number): Duration {
  return new Duration(sec * 1E9);
}

function buildTrace(layer: number): ResponseNode {
  return node(
      valueMap(
          {key: 'category_defined_id', val: str('x_axis')},
          {key: 'category_display_name', val: str('time from start')},
          {key: 'category_description', val: str('Time from start')},
          {key: 'axis_type', val: str('duration')},
          {key: 'axis_min', val: dur(d(0))},
          {key: 'axis_max', val: dur(d(300))},
          ),
      node(
          valueMap(
              {key: 'trace_node_type', val: int(0)},
              {key: 'category_defined_id', val: str(`cat ${layer}`)},
              {key: 'category_display_name', val: str(`Cat. ${layer}`)},
              {key: 'category_description', val: str(`Category ${layer}`)},
              ),
          node(
              valueMap(
                  {key: 'trace_node_type', val: int(1)},
                  {key: 'trace_start', val: dur(d(layer * 10))},
                  {key: 'trace_end', val: dur(d(layer * 20))},
                  ),
              ),
          ),
  );
}

@Component({
  template: `
    <app-core>
      <global-state>
        <value-map>
          <value *ngFor="let layerName of layerNames"
            [key]="'trace_name_'+layerName"><string></string></value>
        </value-map>
      </global-state>
      <test-data-query>
      </test-data-query>
    </app-core>
    <union-traces>
      <trace *ngFor="let layerName of layerNames">
        <data-series>
          <query><value><string>foo</string></value></query>
          <interactions>
            <reaction type="fetch" target="data-series">
              <and>
                <not><equals>
                  <global-ref [key]="'trace_name_'+layerName"></global-ref>
                  <string></string>
                </equals></not>
                <changed><global-ref [key]="'trace_name_'+layerName"></global-ref></changed>
              </and>
            </reaction>
          </interactions>
          <parameters></parameters>
        </data-series>
      </trace>
    </union-traces>`
})
class TraceTestComponent {
  @Input() layerNames: string[] = [];
  @ViewChild(UnionTracesDirective) unionedTrace!: UnionTracesDirective;
}

describe('trace data test', () => {
  let fixture: ComponentFixture<TraceTestComponent>;
  const appCoreService = new AppCoreService();
  appCoreService.appCore.configurationErrors.subscribe((err) => {
    fail(err);
  });

  beforeEach(async () => {
    appCoreService.appCore.reset();
    await TestBed
        .configureTestingModule({
          declarations: [TraceTestComponent],
          imports: [
            CoreModule, TestCoreModule, TraceModule,
            NoopAnimationsModule
          ],
          providers: [{provide: AppCoreService, useValue: appCoreService}]
        })
        .compileComponents();
    fixture = TestBed.createComponent(TraceTestComponent);
    await fixture.whenStable();
  });

  it('handles one layer properly', () => {
    GLOBAL_TEST_DATA_FETCHER.reset();
    fixture.componentInstance.layerNames = ['a'];
    fixture.detectChanges();
    const t = fixture.componentInstance;
    const collectionName =
        appCoreService.appCore.globalState.get('trace_name_a') as StringValue;
    t.unionedTrace.uniqueSeriesNames.subscribe((uniqueSeriesNames: string[]) => {
      GLOBAL_TEST_DATA_FETCHER.responseChannel.next({
        series: new Map<string, ResponseNode>(
            uniqueSeriesNames.map((seriesName: string, idx: number) => {
              return [seriesName, buildTrace(idx)];
            })),
      });
    });
    collectionName.val = 'coll';
    const traces = new Array<Trace<unknown>>();
    t.unionedTrace.trace.subscribe((trace: Trace<unknown>) => {
      traces.push(trace);
    });
    expect(traces.map(trace => prettyPrintTrace(trace))).toEqual([`Trace:
  Axis x_axis 'time from start' (Time from start) (domain 0ns, 5.000m)
  Category cat 0 'Cat. 0' (Category 0):
    span-height self:1 total:1
    cat-height 1
    Span (height 1):
      0ns to 0ns
`]);
  });

  it('unions layer properly', () => {
    GLOBAL_TEST_DATA_FETCHER.reset();
    fixture.componentInstance.layerNames = ['a', 'b'];
    fixture.detectChanges();
    const t = fixture.componentInstance;
    const collectionAName =
        appCoreService.appCore.globalState.get('trace_name_a') as StringValue;
    const collectionBName =
        appCoreService.appCore.globalState.get('trace_name_b') as StringValue;
    t.unionedTrace.uniqueSeriesNames.subscribe((uniqueSeriesNames: string[]) => {
      GLOBAL_TEST_DATA_FETCHER.responseChannel.next({
        series: new Map<string, ResponseNode>(
            uniqueSeriesNames.map((seriesName: string, idx: number) => {
              return [seriesName, buildTrace(idx)];
            })),
      });
    });
    const traces = new Array<Trace<unknown>>();
    t.unionedTrace.trace.subscribe((trace: Trace<unknown>) => {
      traces.push(trace);
    });
    collectionAName.val = 'coll';
    expect(traces.length).toBe(0);
    collectionBName.val = 'coll';
    expect(traces.length).toBe(1);
    expect(traces.map(trace => prettyPrintTrace(trace))).toEqual([`Trace:
  Axis x_axis 'time from start' (Time from start) (domain 0ns, 5.000m)
  Category cat 0 'Cat. 0' (Category 0):
    span-height self:1 total:1
    cat-height 1
    Span (height 1):
      0ns to 0ns
  Category cat 1 'Cat. 1' (Category 1):
    span-height self:1 total:1
    cat-height 1
    Span (height 1):
      10.000s to 20.000s
`]);
  });
});
