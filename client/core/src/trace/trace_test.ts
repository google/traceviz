/*
        Copyright 2023 Google Inc.
        Licensed under the Apache License, Version 2.0 (the "License");
        you may not use this file except in compliance with the License.
        You may obtain a copy of the License at
                https://www.apache.org/licenses/LICENSE-2.0
        Unless required by applicable law or agreed to in writing, software
        distributed under the License is distributed on an "AS IS" BASIS,
        WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
        See the License to the specific language governing permissions and
        limitations under the License.
*/ 

import 'jasmine';

import {dur, int, str, ts, valueMap} from '../value/test_value.js';
import {node} from '../protocol/test_response.js';
import {prettyPrintTrace} from '../test_responses/prettyprint.js';
import {Trace} from './trace.js';
import {sec, d, schedvizRunningNode, schedvizWaitingNode, userInstrumentationNode, embeddedNode, rpcNode} from '../test_responses/traces.js';

describe('trace test', () => {
  it('merges fixed time-base traces properly', () => {
    expect(
        prettyPrintTrace(Trace.union(
            Trace.fromNode(
                node(
                    valueMap(
                        {key: 'category_defined_id', val: str('x_axis')},
                        {
                          key: 'category_display_name',
                          val: str('time from start')
                        },
                        {
                          key: 'category_description',
                          val: str('Time from start')
                        },
                        {key: 'axis_type', val: str('timestamp')},
                        {key: 'axis_min', val: ts(sec(100))},
                        {key: 'axis_max', val: ts(sec(300))},
                        ),
                    node(
                        valueMap(
                            {key: 'trace_node_type', val: int(0)},
                            {key: 'category_defined_id', val: str('stuff')},
                            {key: 'category_display_name', val: str('Stuff')},
                            {key: 'category_description', val: str('Stuff')},
                            ),
                        node(
                            valueMap(
                                {key: 'trace_node_type', val: int(1)},
                                {key: 'trace_start', val: ts(sec(100))},
                                {key: 'trace_end', val: ts(sec(200))},
                                ),
                            ),
                        ),
                    node(
                        valueMap(
                            {key: 'trace_node_type', val: int(0)},
                            {key: 'category_defined_id', val: str('things')},
                            {key: 'category_display_name', val: str('Things')},
                            {key: 'category_description', val: str('Things')},
                            ),
                        node(
                            valueMap(
                                {key: 'trace_node_type', val: int(1)},
                                {key: 'trace_start', val: ts(sec(150))},
                                {key: 'trace_end', val: ts(sec(300))},
                                ),
                            ),
                        ),
                    ),
                ),
            Trace.fromNode(
                node(
                    valueMap(
                        {key: 'category_defined_id', val: str('x_axis')},
                        {
                          key: 'category_display_name',
                          val: str('time from start')
                        },
                        {
                          key: 'category_description',
                          val: str('Time from start')
                        },
                        {key: 'axis_type', val: str('timestamp')},
                        {key: 'axis_min', val: ts(sec(0))},
                        {key: 'axis_max', val: ts(sec(220))},
                        ),
                    node(
                        valueMap(
                            {key: 'trace_node_type', val: int(0)},
                            {key: 'category_defined_id', val: str('stuff')},
                            {key: 'category_display_name', val: str('Stuff')},
                            {key: 'category_description', val: str('Stuff')},
                            ),
                        node(
                            valueMap(
                                {key: 'trace_node_type', val: int(1)},
                                {key: 'trace_start', val: ts(sec(0))},
                                {key: 'trace_end', val: ts(sec(100))},
                                ),
                            ),
                        ),
                    node(
                        valueMap(
                            {key: 'trace_node_type', val: int(0)},
                            {key: 'category_defined_id', val: str('things')},
                            {key: 'category_display_name', val: str('Things')},
                            {key: 'category_description', val: str('Things')},
                            ),
                        node(
                            valueMap(
                                {key: 'trace_node_type', val: int(1)},
                                {key: 'trace_start', val: ts(sec(50))},
                                {key: 'trace_end', val: ts(sec(120))},
                                ),
                            ),
                        ),
                    ),
                ),
            )))
        .toEqual(`Trace:
  Axis x_axis 'time from start' (Time from start) (domain 0ns, 5.000m)
  Category stuff 'Stuff' (Stuff):
    span-height self:1 total:1
    cat-height 1
    Span (height 1):
      1.667m to 3.333m
    Span (height 1):
      0ns to 1.667m
  Category things 'Things' (Things):
    span-height self:1 total:1
    cat-height 1
    Span (height 1):
      2.500m to 5.000m
    Span (height 1):
      50.000s to 2.000m
`);
  });

  it('refuses to merge traces with incompatible time bases', () => {
    expect(() => {
      Trace.union(
          Trace.fromNode(
              node(
                  valueMap(
                      {key: 'category_defined_id', val: str('x_axis')},
                      {
                        key: 'category_display_name',
                        val: str('time from start')
                      },
                      {
                        key: 'category_description',
                        val: str('Time from start')
                      },
                      {key: 'axis_type', val: str('duration')},
                      {key: 'axis_min', val: dur(d(100))},
                      {key: 'axis_max', val: dur(d(300))},
                      ),
                  ),
              ),
          Trace.fromNode(
              node(
                  valueMap(
                      {key: 'trace_time_basis', val: ts(sec(0))},
                      {key: 'trace_end', val: dur(d(300))},
                      {key: 'category_defined_id', val: str('x_axis')},
                      {
                        key: 'category_display_name',
                        val: str('time from start')
                      },
                      {
                        key: 'category_description',
                        val: str('Time from start')
                      },
                      {key: 'axis_type', val: str('timestamp')},
                      {key: 'axis_min', val: ts(sec(100))},
                      {key: 'axis_max', val: ts(sec(300))},
                      ),
                  ),
              ),
      );
    }).toThrow();
  });

  it('refuses to merge traces with incompatible categories', () => {
    expect(() => {
      Trace.union(
          Trace.fromNode(
              node(
                  valueMap(
                      {key: 'trace_end', val: dur(d(300))},
                      {key: 'category_defined_id', val: str('x_axis')},
                      {
                        key: 'category_display_name',
                        val: str('time from start')
                      },
                      {
                        key: 'category_description',
                        val: str('Time from start')
                      },
                      {key: 'axis_type', val: str('timestamp')},
                      {key: 'axis_min', val: ts(sec(100))},
                      {key: 'axis_max', val: ts(sec(300))},
                      ),
                  node(
                      valueMap(
                          {key: 'trace_node_type', val: int(0)},
                          {key: 'category_defined_id', val: str('c1')},
                          {
                            key: 'category_display_name',
                            val: str('Category 1')
                          },
                          {key: 'category_description', val: str('Category 1')},
                          ),
                      ),
                  ),
              ),
          Trace.fromNode(
              node(
                  valueMap(
                      {key: 'trace_end', val: dur(d(300))},
                      {key: 'category_defined_id', val: str('x_axis')},
                      {
                        key: 'category_display_name',
                        val: str('time from start')
                      },
                      {
                        key: 'category_description',
                        val: str('Time from start')
                      },
                      {key: 'axis_type', val: str('timestamp')},
                      {key: 'axis_min', val: ts(sec(100))},
                      {key: 'axis_max', val: ts(sec(300))},
                      ),
                  node(
                      valueMap(
                          {key: 'trace_node_type', val: int(0)},
                          {key: 'category_defined_id', val: str('c1')},
                          {key: 'category_display_name', val: str('Cat. 1')},
                          {key: 'category_description', val: str('Category 1')},
                          ),
                      ),
                  ),
              ),
      );
    }).toThrow();
  });

  it('gets render settings properly', () => {
    expect(Trace
               .fromNode(
                   node(
                       valueMap(
                           {key: 'category_defined_id', val: str('x_axis')},
                           {
                             key: 'category_display_name',
                             val: str('time from start')
                           },
                           {
                             key: 'category_description',
                             val: str('Time from start')
                           },
                           {key: 'axis_type', val: str('timestamp')},
                           {key: 'axis_min', val: ts(sec(100))},
                           {key: 'axis_max', val: ts(sec(300))},

                           {key: 'span_width_cat_px', val: int(15)},
                           {key: 'span_padding_cat_px', val: int(1)},
                           {key: 'category_header_cat_px', val: int(15)},
                           {key: 'category_handle_temp_px', val: int(10)},
                           {key: 'category_padding_cat_px', val: int(1)},
                           {key: 'category_margin_temp_px', val: int(10)},
                           {key: 'category_min_width_cat_px', val: int(16)},
                           {key: 'category_base_width_temp_px', val: int(400)},
                           ),
                       ),
                   )
               .renderSettings())
        .toEqual({
          spanWidthCatPx: 15,
          spanPaddingCatPx: 1,
          categoryHeaderCatPx: 15,
          categoryHandleTempPx: 10,
          categoryPaddingCatPx: 1,
          categoryMarginTempPx: 10,
          categoryMinWidthCatPx: 16,
          categoryBaseWidthTempPx: 400,
        });
  });

  it('gets schedviz-like trace by merging two traces.', () => {
    const trace = Trace.union(
        Trace.fromNode(schedvizRunningNode),
        Trace.fromNode(schedvizWaitingNode));
    expect(prettyPrintTrace(trace)).toBe(`Trace:
  Axis x_axis 'time from start' (Time from start) (domain 0ns, 5.000m)
  Category cpu0 'CPU 0' (CPU 0):
    span-height self:0 total:2
    cat-height 2
    Category running 'Running' (Running threads):
      span-height self:1 total:1
      cat-height 1
      Span (height 1):
        0ns to 1.667m
        with [pid: 100]
      Span (height 1):
        1.667m to 2.500m
        with [pid: 200]
      Span (height 1):
        2.500m to 5.000m
        with [pid: 100]
    Category waiting 'Waiting' (Waiting threads):
      span-height self:1 total:1
      cat-height 1
      Span (height 1):
        0ns to 1.667m
      Span (height 1):
        1.667m to 2.500m
        with [pids: [100]]
      Span (height 1):
        2.500m to 3.333m
        with [pids: [200]]
      Span (height 1):
        3.333m to 5.000m
        with [pids: [100, 300]]
`);
  });

  it('gets RPC trace', () => {
    expect(prettyPrintTrace(Trace.fromNode(rpcNode)))
        .toBe(`Trace:
  Axis x_axis 'time from start' (Time from start) (domain 0ns, 5.000m)
  Category rpc a 'RPC a' (RPC a):
    span-height self:1 total:6
    cat-height 3
    with [label_format: a]
    Span (height 1):
      0ns to 5.000m
      with [rpc: a]
      Payload node:
        with [payload_type: trace_edge_payload, trace_edge_node_id: a->a/b, trace_edge_start: 1970-01-01T00:00:00.000Z, trace_edge_endpoint_node_ids: [a/b]]
      Payload node:
        with [payload_type: trace_edge_payload, trace_edge_node_id: a->a/e, trace_edge_start: 1970-01-01T00:03:40.000Z, trace_edge_endpoint_node_ids: [a/e]]
    Category rpc b 'RPC a/b' (RPC a/b):
      span-height self:1 total:3
      cat-height 2
      with [label_format: a/b]
      Span (height 1):
        0ns to 3.000m
        with [rpc: b]
        Payload node:
          with [payload_type: trace_edge_payload, trace_edge_node_id: a/b, trace_edge_start: 1970-01-01T00:00:00.000Z, trace_edge_endpoint_node_ids: []]
        Payload node:
          with [payload_type: trace_edge_payload, trace_edge_node_id: a/b->a/b/c, trace_edge_start: 1970-01-01T00:00:20.000Z, trace_edge_endpoint_node_ids: [a/b/c]]
        Payload node:
          with [payload_type: trace_edge_payload, trace_edge_node_id: a/b->a/b/d, trace_edge_start: 1970-01-01T00:02:20.000Z, trace_edge_endpoint_node_ids: [a/b/d]]
      Category rpc c 'RPC a/b/c' (RPC a/b/c):
        span-height self:1 total:1
        cat-height 1
        with [label_format: a/b/c]
        Span (height 1):
          20.000s to 2.000m
          with [rpc: c]
          Payload node:
            with [payload_type: trace_edge_payload, trace_edge_node_id: a/b/c, trace_edge_start: 1970-01-01T00:00:20.000Z, trace_edge_endpoint_node_ids: []]
      Category rpc d 'RPC a/b/d' (RPC a/b/d):
        span-height self:1 total:1
        cat-height 1
        with [label_format: a/b/d]
        Span (height 1):
          2.333m to 2.667m
          with [rpc: d]
          Payload node:
            with [payload_type: trace_edge_payload, trace_edge_node_id: a/b/d, trace_edge_start: 1970-01-01T00:02:20.000Z, trace_edge_endpoint_node_ids: []]
    Category rpc e 'RPC a/e' (RPC a/e):
      span-height self:1 total:2
      cat-height 2
      with [label_format: a/e]
      Span (height 1):
        3.667m to 4.667m
        with [rpc: e]
        Payload node:
          with [payload_type: trace_edge_payload, trace_edge_node_id: a/e, trace_edge_start: 1970-01-01T00:03:40.000Z, trace_edge_endpoint_node_ids: []]
        Payload node:
          with [payload_type: trace_edge_payload, trace_edge_node_id: a/e->a/e/a, trace_edge_start: 1970-01-01T00:04:00.000Z, trace_edge_endpoint_node_ids: [a/e/a]]
      Category rpc a 'RPC a/e/a' (RPC a/e/a):
        span-height self:1 total:1
        cat-height 1
        with [label_format: a/e/a]
        Span (height 1):
          4.000m to 4.167m
          with [rpc: a]
          Payload node:
            with [payload_type: trace_edge_payload, trace_edge_node_id: a/e/a, trace_edge_start: 1970-01-01T00:04:00.000Z, trace_edge_endpoint_node_ids: []]
          Subspan:
            4.000m to 4.167m
            with [state: local]
`);
  });

  it('gets user-code instrumentation trace', () => {
    expect(prettyPrintTrace(Trace.fromNode(userInstrumentationNode)))
        .toBe(`Trace:
  Axis x_axis 'time from start' (Time from start) (domain 0ns, 5.000m)
  Category pid 100 'PID 100' (PID 100):
    span-height self:3 total:3
    cat-height 1
    Span (height 3):
      0ns to 1.500m
      with [function: foo]
      Span (height 2):
        10.000s to 40.000s
        with [function: bar]
        Span (height 1):
          15.000s to 25.000s
          with [function: baz]
      Span (height 2):
        50.000s to 1.333m
        with [function: bar]
        Span (height 1):
          55.000s to 1.083m
          with [function: baz]
    Span (height 3):
      1.667m to 3.167m
      with [function: foo]
      Span (height 2):
        1.833m to 2.333m
        with [function: bar]
        Span (height 1):
          1.917m to 2.083m
          with [function: baz]
      Span (height 2):
        2.500m to 3.000m
        with [function: bar]
        Span (height 1):
          2.583m to 2.750m
          with [function: baz]
`);
  });

  it('gets trace with embedded data', () => {
    expect(prettyPrintTrace(Trace.fromNode(embeddedNode)))
        .toBe(`Trace:
  Axis x_axis 'time from start' (Time from start) (domain 0ns, 8.333m)
  Category pid 100 'PID 100' (PID 100):
    span-height self:1 total:4
    cat-height 2
    Span (height 1):
      0ns to 8.333m
      Payload node:
        with [payload_type: thumbnail, normalized_cpu_time: [1, 1, 2, 1, 1]]
    Category pid 110 'PID 110' (PID 110):
      span-height self:1 total:1
      cat-height 1
      Span (height 1):
        0ns to 1.667m
      Span (height 1):
        3.333m to 5.000m
      Span (height 1):
        6.667m to 8.333m
    Category pid 120 'PID 120' (PID 120):
      span-height self:1 total:1
      cat-height 1
      Span (height 1):
        1.667m to 3.333m
      Span (height 1):
        5.000m to 6.667m
    Category pid 130 'PID 130' (PID 130):
      span-height self:1 total:1
      cat-height 1
      Span (height 1):
        3.333m to 5.000m
`);
  });
});
