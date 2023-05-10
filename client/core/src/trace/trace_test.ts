import 'jasmine';

import { dur, int, str, ts, valueMap } from "../value/test_value.js";
import { node } from "../protocol/test_response.js";
import { prettyPrintTrace } from '../test_responses/prettyprint.js';
import { Trace } from './trace.js';
import { sec, d, schedvizRunningNode, schedvizWaitingNode, userInstrumentationNode, embeddedNode, rpcNode } from '../test_responses/traces.js';

describe('trace test', () => {
    it('merges fixed time-base traces properly', () => {
        expect(
            prettyPrintTrace(Trace.union(
                Trace.fromNode(
                    node(
                        valueMap(
                            { key: 'category_defined_id', val: str('x_axis') },
                            {
                                key: 'category_display_name',
                                val: str('time from start')
                            },
                            {
                                key: 'category_description',
                                val: str('Time from start')
                            },
                            { key: 'axis_type', val: str('timestamp') },
                            { key: 'axis_min', val: ts(sec(100)) },
                            { key: 'axis_max', val: ts(sec(300)) },
                        ),
                        node(
                            valueMap(
                                { key: 'trace_node_type', val: int(0) },
                                { key: 'category_defined_id', val: str('stuff') },
                                { key: 'category_display_name', val: str('Stuff') },
                                { key: 'category_description', val: str('Stuff') },
                            ),
                            node(
                                valueMap(
                                    { key: 'trace_node_type', val: int(1) },
                                    { key: 'trace_offset', val: dur(d(0)) },
                                    { key: 'trace_duration', val: dur(d(100)) },
                                ),
                            ),
                        ),
                        node(
                            valueMap(
                                { key: 'trace_node_type', val: int(0) },
                                { key: 'category_defined_id', val: str('things') },
                                { key: 'category_display_name', val: str('Things') },
                                { key: 'category_description', val: str('Things') },
                            ),
                            node(
                                valueMap(
                                    { key: 'trace_node_type', val: int(1) },
                                    { key: 'trace_offset', val: dur(d(50)) },
                                    { key: 'trace_duration', val: dur(d(150)) },
                                ),
                            ),
                        ),
                    ),
                ),
                Trace.fromNode(
                    node(
                        valueMap(
                            { key: 'category_defined_id', val: str('x_axis') },
                            {
                                key: 'category_display_name',
                                val: str('time from start')
                            },
                            {
                                key: 'category_description',
                                val: str('Time from start')
                            },
                            { key: 'axis_type', val: str('timestamp') },
                            { key: 'axis_min', val: ts(sec(0)) },
                            { key: 'axis_max', val: ts(sec(220)) },
                            { key: 'trace_time_basis', val: ts(sec(0)) },
                            { key: 'trace_duration', val: dur(d(220)) },
                        ),
                        node(
                            valueMap(
                                { key: 'trace_node_type', val: int(0) },
                                { key: 'category_defined_id', val: str('stuff') },
                                { key: 'category_display_name', val: str('Stuff') },
                                { key: 'category_description', val: str('Stuff') },
                            ),
                            node(
                                valueMap(
                                    { key: 'trace_node_type', val: int(1) },
                                    { key: 'trace_offset', val: dur(d(0)) },
                                    { key: 'trace_duration', val: dur(d(100)) },
                                ),
                            ),
                        ),
                        node(
                            valueMap(
                                { key: 'trace_node_type', val: int(0) },
                                { key: 'category_defined_id', val: str('things') },
                                { key: 'category_display_name', val: str('Things') },
                                { key: 'category_description', val: str('Things') },
                            ),
                            node(
                                valueMap(
                                    { key: 'trace_node_type', val: int(1) },
                                    { key: 'trace_offset', val: dur(d(50)) },
                                    { key: 'trace_duration', val: dur(d(70)) },
                                ),
                            ),
                        ),
                    ),
                ),
            )))
            .toEqual(`Trace:
  Axis x_axis 'time from start' (Time from start) (domain ${sec(0).toDate().toString()}, ${sec(300).toDate().toString()})
  Category stuff 'Stuff' (Stuff):
    span-height self:1 total:1
    cat-height 1
    Span (height 1):
      at 1.667m for 1.667m
    Span (height 1):
      at 0ns for 1.667m
  Category things 'Things' (Things):
    span-height self:1 total:1
    cat-height 1
    Span (height 1):
      at 2.500m for 2.500m
    Span (height 1):
      at 50.000s for 1.167m
`);
    });

    it('refuses to merge traces with incompatible time bases', () => {
        expect(() => {
            Trace.union(
                Trace.fromNode(
                    node(
                        valueMap(
                            { key: 'category_defined_id', val: str('x_axis') },
                            {
                                key: 'category_display_name',
                                val: str('time from start')
                            },
                            {
                                key: 'category_description',
                                val: str('Time from start')
                            },
                            { key: 'axis_type', val: str('duration') },
                            { key: 'axis_min', val: dur(d(100)) },
                            { key: 'axis_max', val: dur(d(300)) },
                        ),
                    ),
                ),
                Trace.fromNode(
                    node(
                        valueMap(
                            { key: 'trace_time_basis', val: ts(sec(0)) },
                            { key: 'trace_duration', val: dur(d(300)) },
                            { key: 'category_defined_id', val: str('x_axis') },
                            {
                                key: 'category_display_name',
                                val: str('time from start')
                            },
                            {
                                key: 'category_description',
                                val: str('Time from start')
                            },
                            { key: 'axis_type', val: str('timestamp') },
                            { key: 'axis_min', val: ts(sec(100)) },
                            { key: 'axis_max', val: ts(sec(300)) },
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
                            { key: 'trace_duration', val: dur(d(300)) },
                            { key: 'category_defined_id', val: str('x_axis') },
                            {
                                key: 'category_display_name',
                                val: str('time from start')
                            },
                            {
                                key: 'category_description',
                                val: str('Time from start')
                            },
                            { key: 'axis_type', val: str('timestamp') },
                            { key: 'axis_min', val: ts(sec(100)) },
                            { key: 'axis_max', val: ts(sec(300)) },
                        ),
                        node(
                            valueMap(
                                { key: 'trace_node_type', val: int(0) },
                                { key: 'category_defined_id', val: str('cat 1') },
                                {
                                    key: 'category_display_name',
                                    val: str('Category 1')
                                },
                                { key: 'category_description', val: str('Category 1') },
                            ),
                        ),
                    ),
                ),
                Trace.fromNode(
                    node(
                        valueMap(
                            { key: 'trace_duration', val: dur(d(300)) },
                            { key: 'category_defined_id', val: str('x_axis') },
                            {
                                key: 'category_display_name',
                                val: str('time from start')
                            },
                            {
                                key: 'category_description',
                                val: str('Time from start')
                            },
                            { key: 'axis_type', val: str('timestamp') },
                            { key: 'axis_min', val: ts(sec(100)) },
                            { key: 'axis_max', val: ts(sec(300)) },
                        ),
                        node(
                            valueMap(
                                { key: 'trace_node_type', val: int(0) },
                                { key: 'category_defined_id', val: str('cat 1') },
                                { key: 'category_display_name', val: str('Cat. 1') },
                                { key: 'category_description', val: str('Category 1') },
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
                        { key: 'category_defined_id', val: str('x_axis') },
                        {
                            key: 'category_display_name',
                            val: str('time from start')
                        },
                        {
                            key: 'category_description',
                            val: str('Time from start')
                        },
                        { key: 'axis_type', val: str('timestamp') },
                        { key: 'axis_min', val: ts(sec(100)) },
                        { key: 'axis_max', val: ts(sec(300)) },

                        { key: 'trace_span_width_cat_px', val: int(15) },
                        { key: 'trace_span_padding_cat_px', val: int(1) },
                        { key: 'trace_category_header_cat_px', val: int(15) },
                        { key: 'trace_category_padding_cat_px', val: int(1) },
                        { key: 'trace_category_margin_temp_px', val: int(10) },
                        { key: 'trace_category_min_width_cat_px', val: int(16) },
                        { key: 'trace_category_base_width_temp_px', val: int(400) },
                    ),
                ),
            )
            .renderSettings())
            .toEqual({
                spanWidthCatPx: 15,
                spanPaddingCatPx: 1,
                categoryHeaderCatPx: 15,
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
        at 0ns for 1.667m
        with [pid: 100]
      Span (height 1):
        at 1.667m for 50.000s
        with [pid: 200]
      Span (height 1):
        at 2.500m for 2.500m
        with [pid: 100]
    Category waiting 'Waiting' (Waiting threads):
      span-height self:1 total:1
      cat-height 1
      Span (height 1):
        at 0ns for 1.667m
      Span (height 1):
        at 1.667m for 50.000s
        with [pids: [100]]
      Span (height 1):
        at 2.500m for 50.000s
        with [pids: [200]]
      Span (height 1):
        at 3.333m for 1.667m
        with [pids: [100, 300]]
`);
    });

    it('gets RPC trace', () => {
        expect(prettyPrintTrace(Trace.fromNode(rpcNode)))
            .toBe(`Trace:
  Axis x_axis 'time from start' (Time from start) (domain ${sec(0).toDate().toString()}, ${sec(300).toDate().toString()})
  Category rpc a 'RPC a' (RPC a):
    span-height self:1 total:6
    cat-height 3
    with [label_format: a]
    Span (height 1):
      at 0ns for 5.000m
      with [rpc: a]
      Payload node:
        with [trace_node_type: 3, trace_payload_type: trace_edge_payload, trace_edge_node_id: a->a/b, trace_edge_offset: 0ns, trace_edge_endpoint_node_ids: [a/b]]
      Payload node:
        with [trace_node_type: 3, trace_payload_type: trace_edge_payload, trace_edge_node_id: a->a/e, trace_edge_offset: 3.667m, trace_edge_endpoint_node_ids: [a/e]]
    Category rpc b 'RPC a/b' (RPC a/b):
      span-height self:1 total:3
      cat-height 2
      with [label_format: a/b]
      Span (height 1):
        at 0ns for 3.000m
        with [rpc: b]
        Payload node:
          with [trace_node_type: 3, trace_payload_type: trace_edge_payload, trace_edge_node_id: a/b, trace_edge_offset: 0ns, trace_edge_endpoint_node_ids: []]
        Payload node:
          with [trace_node_type: 3, trace_payload_type: trace_edge_payload, trace_edge_node_id: a/b->a/b/c, trace_edge_offset: 20.000s, trace_edge_endpoint_node_ids: [a/b/c]]
        Payload node:
          with [trace_node_type: 3, trace_payload_type: trace_edge_payload, trace_edge_node_id: a/b->a/b/d, trace_edge_offset: 2.333m, trace_edge_endpoint_node_ids: [a/b/d]]
      Category rpc c 'RPC a/b/c' (RPC a/b/c):
        span-height self:1 total:1
        cat-height 1
        with [label_format: a/b/c]
        Span (height 1):
          at 20.000s for 1.667m
          with [rpc: c]
          Payload node:
            with [trace_node_type: 3, trace_payload_type: trace_edge_payload, trace_edge_node_id: a/b/c, trace_edge_offset: 20.000s, trace_edge_endpoint_node_ids: []]
      Category rpc d 'RPC a/b/d' (RPC a/b/d):
        span-height self:1 total:1
        cat-height 1
        with [label_format: a/b/d]
        Span (height 1):
          at 2.333m for 20.000s
          with [rpc: d]
          Payload node:
            with [trace_node_type: 3, trace_payload_type: trace_edge_payload, trace_edge_node_id: a/b/d, trace_edge_offset: 2.333m, trace_edge_endpoint_node_ids: []]
    Category rpc e 'RPC a/e' (RPC a/e):
      span-height self:1 total:2
      cat-height 2
      with [label_format: a/e]
      Span (height 1):
        at 3.667m for 1.000m
        with [rpc: e]
        Payload node:
          with [trace_node_type: 3, trace_payload_type: trace_edge_payload, trace_edge_node_id: a/e, trace_edge_offset: 3.667m, trace_edge_endpoint_node_ids: []]
        Payload node:
          with [trace_node_type: 3, trace_payload_type: trace_edge_payload, trace_edge_node_id: a/e->a/e/a, trace_edge_offset: 4.000m, trace_edge_endpoint_node_ids: [a/e/a]]
      Category rpc a 'RPC a/e/a' (RPC a/e/a):
        span-height self:1 total:1
        cat-height 1
        with [label_format: a/e/a]
        Span (height 1):
          at 4.000m for 10.000s
          with [rpc: a]
          Payload node:
            with [trace_node_type: 3, trace_payload_type: trace_edge_payload, trace_edge_node_id: a/e/a, trace_edge_offset: 4.000m, trace_edge_endpoint_node_ids: []]
          Subspan:
            at 4.000m for 10.000s
            with [state: local]
`);
    });

    it('gets user-code instrumentation trace', () => {
        expect(prettyPrintTrace(Trace.fromNode(userInstrumentationNode)))
            .toBe(`Trace:
  Axis x_axis 'time from start' (Time from start) (domain ${sec(0).toDate().toString()}, ${sec(300).toDate().toString()})
  Category pid 100 'PID 100' (PID 100):
    span-height self:3 total:3
    cat-height 1
    Span (height 3):
      at 0ns for 1.500m
      with [function: foo]
      Span (height 2):
        at 10.000s for 30.000s
        with [function: bar]
        Span (height 1):
          at 15.000s for 10.000s
          with [function: baz]
      Span (height 2):
        at 50.000s for 30.000s
        with [function: bar]
        Span (height 1):
          at 55.000s for 10.000s
          with [function: baz]
    Span (height 3):
      at 1.667m for 1.500m
      with [function: foo]
      Span (height 2):
        at 1.833m for 30.000s
        with [function: bar]
        Span (height 1):
          at 1.917m for 10.000s
          with [function: baz]
      Span (height 2):
        at 2.500m for 30.000s
        with [function: bar]
        Span (height 1):
          at 2.583m for 10.000s
          with [function: baz]
`);
    });

    it('gets trace with embedded data', () => {
        expect(prettyPrintTrace(Trace.fromNode(embeddedNode)))
            .toBe(`Trace:
  Axis x_axis 'time from start' (Time from start) (domain ${sec(0).toDate().toString()}, ${sec(500).toDate().toString()})
  Category pid 100 'PID 100' (PID 100):
    span-height self:1 total:4
    cat-height 2
    Span (height 1):
      at 0ns for 8.333m
      Payload node:
        with [trace_node_type: 3, trace_payload_type: thumbnail, normalized_cpu_time: [1, 1, 2, 1, 1]]
    Category pid 110 'PID 110' (PID 110):
      span-height self:1 total:1
      cat-height 1
      Span (height 1):
        at 0ns for 1.667m
      Span (height 1):
        at 3.333m for 1.667m
      Span (height 1):
        at 6.667m for 1.667m
    Category pid 120 'PID 120' (PID 120):
      span-height self:1 total:1
      cat-height 1
      Span (height 1):
        at 1.667m for 1.667m
      Span (height 1):
        at 5.000m for 1.667m
    Category pid 130 'PID 130' (PID 130):
      span-height self:1 total:1
      cat-height 1
      Span (height 1):
        at 3.333m for 1.667m
`);
    });
});
