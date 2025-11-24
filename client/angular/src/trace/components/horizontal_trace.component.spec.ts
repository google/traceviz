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
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {AppCoreService, CoreModule, TestCoreModule} from 'traceviz-angular-core';

import {TraceModule} from '../trace.module';

import {HorizontalTraceComponent} from './horizontal_trace.component';

import {GLOBAL_TEST_DATA_FETCHER, StringValue, TimestampValue, Timestamp, ResponseNode, node, ts, int, str, strs, valueMap} from 'traceviz-client-core';

function sec(sec: number): Timestamp {
  return new Timestamp(sec, 0);
}

const testTrace = node(
    valueMap(
        // Define the trace x-axis.
        {key: 'category_defined_id', val: str('x_axis')},
        {key: 'category_display_name', val: str('time from start')},
        {key: 'category_description', val: str('Time from start')},
        {key: 'axis_type', val: str('timestamp')},
        {key: 'axis_min', val: ts(sec(0))},
        {key: 'axis_max', val: ts(sec(300))},
        // Provide trace display settings.
        {key: 'span_width_cat_px', val: int(10)},
        {key: 'span_padding_cat_px', val: int(1)},
        {key: 'category_header_cat_px', val: int(0)},
        {key: 'category_handle_val_px', val: int(5)},
        {key: 'category_padding_cat_px', val: int(2)},
        {key: 'category_margin_val_px', val: int(5)},
        {key: 'category_min_width_cat_px', val: int(20)},
        {key: 'category_base_width_val_px', val: int(100)},
        ),
    node(
        valueMap(
            {key: 'trace_node_type', val: int(0)},
            {key: 'category_defined_id', val: str('rpc a')},
            {key: 'category_display_name', val: str('RPC a')},
            {key: 'category_description', val: str('RPC a')},
            {key: 'cat_id', val: str('a')},
            ),
        node(
            valueMap(
                {key: 'trace_node_type', val: int(1)},
                {key: 'trace_start', val: ts(sec(0))},
                {key: 'trace_end', val: ts(sec(300))},
                {key: 'label_format', val: str('a')},
                ),
            node(
                valueMap(
                    {key: 'payload_type', val: str('trace_edge_payload')},
                    {key: 'trace_edge_node_id', val: str('a->a/b')},
                    {key: 'trace_edge_start', val: ts(sec(0))},
                    {key: 'trace_edge_endpoint_node_ids', val: strs('a/b')},
                    ),
                ),
            ),
        node(
            valueMap(
                {key: 'trace_node_type', val: int(0)},
                {key: 'category_defined_id', val: str('rpc b')},
                {key: 'category_display_name', val: str('RPC a/b')},
                {key: 'category_description', val: str('RPC a/b')},
                {key: 'cat_id', val: str('a/b')},
                ),
            node(
                valueMap(
                    {key: 'trace_node_type', val: int(1)},
                    {key: 'trace_start', val: ts(sec(0))},
                    {key: 'trace_end', val: ts(sec(150))},
                    {key: 'label_format', val: str('a/b')},
                    ),
                node(
                    valueMap(
                        {key: 'payload_type', val: str('trace_edge_payload')},
                        {key: 'trace_edge_node_id', val: str('a/b')},
                        {key: 'trace_edge_start', val: ts(sec(0))},
                        {key: 'trace_edge_endpoint_node_ids', val: strs()},
                        ),
                    ),
                ),
            ),
        ),
    node(
        valueMap(
            {key: 'trace_node_type', val: int(0)},
            {key: 'category_defined_id', val: str('rpc c')},
            {key: 'category_display_name', val: str('RPC c')},
            {key: 'category_description', val: str('RPC c')},
            {key: 'cat_id', val: str('c')},
            ),
        node(
            valueMap(
                {key: 'trace_node_type', val: int(1)},
                {key: 'trace_start', val: ts(sec(150))},
                {key: 'trace_end', val: ts(sec(300))},
                {key: 'label_format', val: str('c')},
                ),
            node(
                valueMap(
                    {key: 'payload_type', val: str('trace_edge_payload')},
                    {key: 'trace_edge_node_id', val: str('c->c/d')},
                    {key: 'trace_edge_start', val: ts(sec(225))},
                    {key: 'trace_edge_endpoint_node_ids', val: strs('c/d')},
                    ),
                ),
            ),
        node(
            valueMap(
                {key: 'trace_node_type', val: int(0)},
                {key: 'category_defined_id', val: str('rpc d')},
                {key: 'category_display_name', val: str('RPC c/d')},
                {key: 'category_description', val: str('RPC c/d')},
                {key: 'cat_id', val: str('c/d')},
                ),
            node(
                valueMap(
                    {key: 'trace_node_type', val: int(1)},
                    {key: 'trace_start', val: ts(sec(225))},
                    {key: 'trace_end', val: ts(sec(300))},
                    {key: 'rpc', val: str('d')},
                    {key: 'label_format', val: str('c/d')},
                    ),
                node(
                    valueMap(
                        {key: 'payload_type', val: str('trace_edge_payload')},
                        {key: 'trace_edge_node_id', val: str('c/d')},
                        {key: 'trace_edge_start', val: ts(sec(225))},
                        {key: 'trace_edge_endpoint_node_ids', val: strs()},
                        ),
                    ),
                ),
            ),
        ),
);

@Component({
  standalone: false,
  template: `
    <app-core>
      <global-state>
        <value-map>
          <value key="collection_name"><string></string></value>
          <value key="called_out_category_id"><string></string></value>
          <value key="start_timestamp"><timestamp></timestamp></value>
          <value key="end_timestamp"><timestamp></timestamp></value>
        </value-map>
      </global-state>
      <test-data-query>
      </test-data-query>
    </app-core>
    <horizontal-trace>
      <trace>
        <data-series>
          <query><value><string>q</string></value></query>
          <interactions>
            <reaction type="fetch" target="data-series">
              <and>
                <not><equals>
                  <global-ref key="collection_name"></global-ref>
                  <string></string>
                </equals></not>
                <changed><global-ref key="collection_name"></global-ref></changed>
              </and>
            </reaction>
          </interactions>
          <parameters></parameters>
        </data-series>
      </trace>

      <interactions>
        <action target="chart" type="brush">
          <set>
            <global-ref key="start_timestamp"></global-ref>
            <local-ref key="zoom_start"></local-ref>
          </set>
          <set>
            <global-ref key="end_timestamp"></global-ref>
            <local-ref key="zoom_end"></local-ref>
          </set>
        </action>
        <watch type="update_called_out_category">
          <value-map>
            <value key="called_out_category_id"><global-ref key="called_out_category_id"></global-ref></value>
            <value key="category_id_key"><string>cat_id</string></value>
          </value-map>
        </watch>
      </interactions>
    </horizontal-trace>`,
jit: true,

})
class TraceTestComponent {
  @ViewChild(HorizontalTraceComponent) htc!: HorizontalTraceComponent;
}

describe('horizontal trace test', () => {
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
            CoreModule, TestCoreModule, TraceModule, NoopAnimationsModule,
          ],
          providers: [{provide: AppCoreService, useValue: appCoreService}]
        })
        .compileComponents();
    fixture = TestBed.createComponent(TraceTestComponent);
    await fixture.whenStable();
  });

  it('renders trace, calls out category, handles brush', () => {
    fixture.detectChanges();
    const ht = fixture.componentInstance;
    const collectionName = appCoreService.appCore.globalState.get(
                               'collection_name') as StringValue;
    const calledOutCatID = appCoreService.appCore.globalState.get(
                               'called_out_category_id') as StringValue;
    const startTimestamp = appCoreService.appCore.globalState.get(
                               'start_timestamp') as TimestampValue;
    const endTimestamp = appCoreService.appCore.globalState.get(
                             'end_timestamp') as TimestampValue;
    // Set up a data response each time the traces change.
    ht.htc.traceDirective!.uniqueSeriesNames.subscribe((uniqueSeriesNames) => {
      GLOBAL_TEST_DATA_FETCHER.responseChannel.next({
        series: new Map<string, ResponseNode>(uniqueSeriesNames.map(
            (seriesName: string) => [seriesName, testTrace])),
      });
    });
    collectionName.val = 'coll';
    ht.htc.redraw();  // we can't wait for the debouncer.

    const chartWidth = ht.htc.chart.nativeElement.width.baseVal.value;
    const spans: SVGRectElement[] = Array.from(
        ht.htc.chart.nativeElement.querySelectorAll('g.spans > svg'));
    const spanDimensions = spans.map(span => {
      return {
        xPct: Math.round(100 * span.x.baseVal.value / chartWidth),
        y: span.y.baseVal.value,
        widthPct: Math.round(100 * span.width.baseVal.value / chartWidth),
        height: span.height.baseVal.value,
        label: span.querySelector('text')!.textContent,
      };
    });
    expect(spanDimensions).toEqual([
      {
        xPct: 0,
        y: 0,
        widthPct: 100,
        height: 10,
        label: 'a',
      },
      {
        xPct: 0,
        y: 12,  // 10 + 2
        widthPct: 50,
        height: 10,
        label: 'a/b',
      },
      {
        xPct: 50,
        y: 32,  // 10 + 2 + 20
        widthPct: 50,
        height: 10,
        label: 'c',
      },
      {
        xPct: 75,
        y: 44,  // 32 + 10 + 2
        widthPct: 25,
        height: 10,
        label: 'c/d',
      },
    ]);

    // Expect the proper edges to be drawn.
    const lines: SVGLineElement[] = Array.from(
        ht.htc.chart.nativeElement.querySelectorAll('g.edges > line'));
    const lineDimensions = lines.map(line => {
      return {
        x0Pct: Math.round(100 * line.x1.baseVal.value / chartWidth),
        y0: line.y1.baseVal.value,
        x1Pct: Math.round(100 * line.x2.baseVal.value / chartWidth),
        y1: line.y2.baseVal.value,
      };
    });
    expect(lineDimensions).toEqual([
      {
        x0Pct: 0,
        y0: 5,
        x1Pct: 0,
        y1: 17,
      },
      {
        x0Pct: 75,
        y0: 37,
        x1Pct: 75,
        y1: 49,
      },
    ]);

    // Check that the called out band works as expected.

    // Nothing's called out yet.
    expect(ht.htc.chart.nativeElement.querySelector(
               'g.called-out-category-band > rect'))
        .toBeNull();

    // Call out a couple of categories and expect the proper highlighting.
    calledOutCatID.val = 'c/d';
    ht.htc.redraw();  // we can't wait for the debouncer.
    let calledOutCatBand = ht.htc.chart.nativeElement.querySelector(
        'g.called-out-category-band > rect');
    expect(100 * calledOutCatBand.x.baseVal.value / chartWidth).toEqual(0);
    expect(calledOutCatBand.y.baseVal.value).toEqual(44);  // 2*10 + 2*2 + 20
    expect(calledOutCatBand.width.baseVal.value).toEqual(chartWidth);
    expect(calledOutCatBand.height.baseVal.value).toEqual(20);

    calledOutCatID.val = 'a';
    ht.htc.redraw();  // we can't wait for the debouncer.
    calledOutCatBand = ht.htc.chart.nativeElement.querySelector(
        'g.called-out-category-band > rect');
    expect(100 * calledOutCatBand.x.baseVal.value / chartWidth).toEqual(0);
    expect(calledOutCatBand.y.baseVal.value).toEqual(0);
    expect(calledOutCatBand.width.baseVal.value).toEqual(chartWidth);
    expect(calledOutCatBand.height.baseVal.value).toEqual(32);  // 10 + 2 + 20

    expect(startTimestamp.val).toEqual(sec(0));
    expect(endTimestamp.val).toEqual(sec(0));
    ht.htc.brush([chartWidth * .25, chartWidth * .75], () => {});
    expect(startTimestamp.val).toEqual(sec(75));
    expect(endTimestamp.val).toEqual(sec(225));
  });
});