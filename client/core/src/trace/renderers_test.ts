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

import 'jasmine';

import {rpcNode, schedvizRunningNode, schedvizWaitingNode} from '../test_responses/traces.js';
import {Timestamp} from '../timestamp/timestamp.js';
import {Trace} from '../trace/trace.js';

import {str, ts, int, ints, valueMap} from '../value/test_value.js';

import {renderCategoryHierarchyForHorizontalSpans, RenderedTraceEdge, RenderedTraceSpan, RenderedTraceSpans, renderHorizontalTraceSpans} from './renderers.js';

describe('renderers test', () => {
  it('renders dapper on a horizontal timeline', () => {
    const trace = Trace.union(
      Trace.fromNode(rpcNode.with(valueMap(
        {key: 'span_width_cat_px', val: int(10)},
        {key: 'span_padding_cat_px', val: int(2)},
        {key: 'category_header_cat_px', val: int(0)},
        {key: 'category_handle_temp_px', val: int(5)},
        {key: 'category_padding_cat_px', val: int(3)},
        {key: 'category_margin_temp_px', val: int(5)},
        {key: 'category_min_width_cat_px', val: int(0)},
        {key: 'category_base_width_temp_px', val: int(0)},
      ))),
    );
    expect(renderHorizontalTraceSpans(trace, 300))
      .toEqual(new RenderedTraceSpans(
        [
          // rpc a span
          new RenderedTraceSpan(
            valueMap({key: 'rpc', val: str('a')}), 0, 0, 300, 10),
          // rpc b span
          new RenderedTraceSpan(
            valueMap({key: 'rpc', val: str('b')}), 0, 13, 180, 23),
          // rpc c span
          new RenderedTraceSpan(
            valueMap({key: 'rpc', val: str('c')}), 20, 26, 120, 36),
          // rpc d span
          new RenderedTraceSpan(
            valueMap({key: 'rpc', val: str('d')}), 140, 39, 160, 49),
          // rpc e span
          new RenderedTraceSpan(
            valueMap({key: 'rpc', val: str('e')}), 220, 52, 280, 62),
          // rpc a span
          new RenderedTraceSpan(
            valueMap({key: 'rpc', val: str('a')}), 240, 65, 250, 75),
          // rpc a subspan
          new RenderedTraceSpan(
            valueMap({key: 'state', val: str('local')}), 240, 65, 250,
            75),
        ],
        [
          new RenderedTraceEdge(valueMap(), 0, 5, 0, 18),       // a->b
          new RenderedTraceEdge(valueMap(), 220, 5, 220, 57),   // a->e
          new RenderedTraceEdge(valueMap(), 20, 18, 20, 31),    // b->c
          new RenderedTraceEdge(valueMap(), 140, 18, 140, 44),  // b->d
          new RenderedTraceEdge(valueMap(), 240, 57, 240, 70),  // e->a
        ]));
    const gotRenderedTraceCategoryHierarchy =
      renderCategoryHierarchyForHorizontalSpans(trace);
    expect(gotRenderedTraceCategoryHierarchy.widthPx).toEqual(15);
    expect(gotRenderedTraceCategoryHierarchy.heightPx).toEqual(75);
    expect(gotRenderedTraceCategoryHierarchy.properties)
      .toEqual(valueMap(
        {key: 'category_defined_id', val: str('x_axis')},
        {key: 'category_display_name', val: str('time from start')},
        {key: 'category_description', val: str('Time from start')},
        {key: 'axis_type', val: str('timestamp')},
        {key: 'axis_min', val: ts(new Timestamp(0, 0))},
        {key: 'axis_max', val: ts(new Timestamp(300, 0))},
        // Trace render settings.
        {key: 'span_width_cat_px', val: int(10)},
        {key: 'span_padding_cat_px', val: int(2)},
        {key: 'category_header_cat_px', val: int(0)},
        {key: 'category_handle_temp_px', val: int(5)},
        {key: 'category_padding_cat_px', val: int(3)},
        {key: 'category_margin_temp_px', val: int(5)},
        {key: 'category_min_width_cat_px', val: int(0)},
        {key: 'category_base_width_temp_px', val: int(0)},
      ));
    expect(gotRenderedTraceCategoryHierarchy.rootCategories.map(
      (cat) => [cat.x0Px, cat.y0Px, cat.x1Px, cat.y1Px]))
      .toEqual([
        [0, 0, 15, 75],
        [5, 13, 15, 49],
        [10, 26, 15, 36],
        [10, 39, 15, 49],
        [5, 52, 15, 75],
        [10, 65, 15, 75],
      ]);
  });

  it('renders schedviz on a horizontal timeline', () => {
    const rp = valueMap(
      {key: 'span_width_cat_px', val: int(10)},
      {key: 'span_padding_cat_px', val: int(2)},
      {key: 'category_header_cat_px', val: int(0)},
      {key: 'category_handle_temp_px', val: int(5)},
      {key: 'category_padding_cat_px', val: int(3)},
      {key: 'category_margin_temp_px', val: int(5)},
      {key: 'category_min_width_cat_px', val: int(0)},
      {key: 'category_base_width_temp_px', val: int(0)},
    );
    const trace = Trace.union(
      Trace.fromNode(schedvizRunningNode.with(rp)),
      Trace.fromNode(schedvizWaitingNode.with(rp)));
    expect(renderHorizontalTraceSpans(trace, 300))
      .toEqual(new RenderedTraceSpans(
        [
          new RenderedTraceSpan(
            valueMap({key: 'pid', val: int(100)}), 0, 3, 100, 13),
          new RenderedTraceSpan(
            valueMap({key: 'pid', val: int(200)}), 100, 3, 150, 13),
          new RenderedTraceSpan(
            valueMap({key: 'pid', val: int(100)}), 150, 3, 300, 13),
          new RenderedTraceSpan(valueMap(), 0, 16, 100, 26),
          new RenderedTraceSpan(
            valueMap({key: 'pids', val: ints(100)}), 100, 16, 150, 26),
          new RenderedTraceSpan(
            valueMap({key: 'pids', val: ints(200)}), 150, 16, 200, 26),
          new RenderedTraceSpan(
            valueMap({key: 'pids', val: ints(100, 300)}), 200, 16, 300,
            26),
        ],
        []));
    const gotRenderedTraceCategoryHierarchy =
      renderCategoryHierarchyForHorizontalSpans(trace);
    expect(gotRenderedTraceCategoryHierarchy.widthPx).toEqual(10);
    expect(gotRenderedTraceCategoryHierarchy.heightPx).toEqual(26);
    expect(gotRenderedTraceCategoryHierarchy.properties)
      .toEqual(valueMap(
        // Trace render settings.
        {key: 'span_width_cat_px', val: int(10)},
        {key: 'span_padding_cat_px', val: int(2)},
        {key: 'category_header_cat_px', val: int(0)},
        {key: 'category_handle_temp_px', val: int(5)},
        {key: 'category_padding_cat_px', val: int(3)},
        {key: 'category_margin_temp_px', val: int(5)},
        {key: 'category_min_width_cat_px', val: int(0)},
        {key: 'category_base_width_temp_px', val: int(0)},
      ));
    expect(gotRenderedTraceCategoryHierarchy.rootCategories.map(
      (cat) => [cat.x0Px, cat.y0Px, cat.x1Px, cat.y1Px]))
      .toEqual([
        [0, 0, 10, 26],
        [5, 3, 10, 13],
        [5, 16, 10, 26],
      ]);
  });
});
