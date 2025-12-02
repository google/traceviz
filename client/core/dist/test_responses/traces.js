/*
    Copyright 2023 Google Inc.
    Licensed under the Apache License, Version 2.0 (the 'License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
        https://www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
import { ts, dur, int, ints, str, strs, valueMap } from '../value/test_value.js';
import { node } from '../protocol/test_response.js';
import { sec } from './prettyprint.js';
import { Duration } from '../duration/duration.js';
/** Returns a Duration of the specified seconds. */
export function d(sec) {
    return new Duration(sec * 1E9);
}
/**
 * A response node encoding an example SchedViz running-thread trace response.
 */
export const schedvizRunningNode = node(valueMap({ key: 'category_defined_id', val: str('x_axis') }, { key: 'category_display_name', val: str('time from start') }, { key: 'category_description', val: str('Time from start') }, { key: 'axis_type', val: str('duration') }, { key: 'axis_min', val: dur(d(0)) }, { key: 'axis_max', val: dur(d(300)) }), node(
// cpu0 category
valueMap({ key: 'trace_node_type', val: int(0) }, { key: 'category_defined_id', val: str('cpu0') }, { key: 'category_display_name', val: str('CPU 0') }, { key: 'category_description', val: str('CPU 0') }), node(
// running category
valueMap({ key: 'trace_node_type', val: int(0) }, { key: 'category_defined_id', val: str('running') }, { key: 'category_display_name', val: str('Running') }, { key: 'category_description', val: str('Running threads') }), node(
// CPU 0, PID 100 running 0-100
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: dur(d(0)) }, { key: 'trace_end', val: dur(d(100)) }, { key: 'pid', val: int(100) })), node(
// CPU 0, PID 200 running 100-150
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: dur(d(100)) }, { key: 'trace_end', val: dur(d(150)) }, { key: 'pid', val: int(200) })), node(
// CPU 0, PID 100 running 150-300
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: dur(d(150)) }, { key: 'trace_end', val: dur(d(300)) }, { key: 'pid', val: int(100) })))));
/**
 * A response node encoding an example SchedViz waiting-thread trace response.
 */
export const schedvizWaitingNode = node(valueMap({ key: 'category_defined_id', val: str('x_axis') }, { key: 'category_display_name', val: str('time from start') }, { key: 'category_description', val: str('Time from start') }, { key: 'axis_type', val: str('duration') }, { key: 'axis_min', val: dur(d(0)) }, { key: 'axis_max', val: dur(d(300)) }), node(
// cpu0 category
valueMap({ key: 'trace_node_type', val: int(0) }, { key: 'category_defined_id', val: str('cpu0') }, { key: 'category_display_name', val: str('CPU 0') }, { key: 'category_description', val: str('CPU 0') }), node(
// waiting category
valueMap({ key: 'trace_node_type', val: int(0) }, { key: 'category_defined_id', val: str('waiting') }, { key: 'category_display_name', val: str('Waiting') }, { key: 'category_description', val: str('Waiting threads') }), node(
// CPU 0, no pids waiting 0-100
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: dur(d(0)) }, { key: 'trace_end', val: dur(d(100)) })), node(
// CPU 0, pid 100 waiting 100-150
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: dur(d(100)) }, { key: 'trace_end', val: dur(d(150)) }, { key: 'pids', val: ints(100) })), node(
// CPU 0, pid 200 waiting 150-200
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: dur(d(150)) }, { key: 'trace_end', val: dur(d(200)) }, { key: 'pids', val: ints(200) })), node(
// CPU 0, pids 100 and 300 waiting 200-300
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: dur(d(200)) }, { key: 'trace_end', val: dur(d(300)) }, { key: 'pids', val: ints(100, 300) })))));
/**
 * A response node encoding an example RPC trace.
 */
export const rpcNode = node(valueMap({ key: 'category_defined_id', val: str('x_axis') }, { key: 'category_display_name', val: str('time from start') }, { key: 'category_description', val: str('Time from start') }, { key: 'axis_type', val: str('timestamp') }, { key: 'axis_min', val: ts(sec(0)) }, { key: 'axis_max', val: ts(sec(300)) }), node(
// rpc a category
valueMap({ key: 'trace_node_type', val: int(0) }, { key: 'category_defined_id', val: str('rpc a') }, { key: 'category_display_name', val: str('RPC a') }, { key: 'category_description', val: str('RPC a') }, { key: 'label_format', val: str('a') }), node(
// rpc a span
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(0)) }, { key: 'trace_end', val: ts(sec(300)) }, { key: 'rpc', val: str('a') }), node(valueMap({ key: 'payload_type', val: str('trace_edge_payload') }, { key: 'trace_edge_node_id', val: str('a->a/b') }, { key: 'trace_edge_start', val: ts(sec(0)) }, { key: 'trace_edge_endpoint_node_ids', val: strs('a/b') })), node(valueMap({ key: 'payload_type', val: str('trace_edge_payload') }, { key: 'trace_edge_node_id', val: str('a->a/e') }, { key: 'trace_edge_start', val: ts(sec(220)) }, { key: 'trace_edge_endpoint_node_ids', val: strs('a/e') }))), node(
// rpc a/b category
valueMap({ key: 'trace_node_type', val: int(0) }, { key: 'category_defined_id', val: str('rpc b') }, { key: 'category_display_name', val: str('RPC a/b') }, { key: 'category_description', val: str('RPC a/b') }, { key: 'label_format', val: str('a/b') }), node(
// rpc b span
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(0)) }, { key: 'trace_end', val: ts(sec(180)) }, { key: 'rpc', val: str('b') }), node(valueMap({ key: 'payload_type', val: str('trace_edge_payload') }, { key: 'trace_edge_node_id', val: str('a/b') }, { key: 'trace_edge_start', val: ts(sec(0)) }, { key: 'trace_edge_endpoint_node_ids', val: strs() })), node(valueMap({ key: 'payload_type', val: str('trace_edge_payload') }, { key: 'trace_edge_node_id', val: str('a/b->a/b/c') }, { key: 'trace_edge_start', val: ts(sec(20)) }, {
    key: 'trace_edge_endpoint_node_ids',
    val: strs('a/b/c')
})), node(valueMap({ key: 'payload_type', val: str('trace_edge_payload') }, { key: 'trace_edge_node_id', val: str('a/b->a/b/d') }, { key: 'trace_edge_start', val: ts(sec(140)) }, {
    key: 'trace_edge_endpoint_node_ids',
    val: strs('a/b/d')
}))), node(
// rpc a/b/c category
valueMap({ key: 'trace_node_type', val: int(0) }, { key: 'category_defined_id', val: str('rpc c') }, { key: 'category_display_name', val: str('RPC a/b/c') }, { key: 'category_description', val: str('RPC a/b/c') }, { key: 'label_format', val: str('a/b/c') }), node(
// rpc c span
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(20)) }, { key: 'trace_end', val: ts(sec(120)) }, { key: 'rpc', val: str('c') }), node(valueMap({
    key: 'payload_type',
    val: str('trace_edge_payload')
}, { key: 'trace_edge_node_id', val: str('a/b/c') }, { key: 'trace_edge_start', val: ts(sec(20)) }, { key: 'trace_edge_endpoint_node_ids', val: strs() })))), node(
// rpc a/b/d category
valueMap({ key: 'trace_node_type', val: int(0) }, { key: 'category_defined_id', val: str('rpc d') }, { key: 'category_display_name', val: str('RPC a/b/d') }, { key: 'category_description', val: str('RPC a/b/d') }, { key: 'label_format', val: str('a/b/d') }), node(
// rpc d span
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(140)) }, { key: 'trace_end', val: ts(sec(160)) }, { key: 'rpc', val: str('d') }), node(valueMap({
    key: 'payload_type',
    val: str('trace_edge_payload')
}, { key: 'trace_edge_node_id', val: str('a/b/d') }, { key: 'trace_edge_start', val: ts(sec(140)) }, { key: 'trace_edge_endpoint_node_ids', val: strs() }))))), node(
// rpc a/e category
valueMap({ key: 'trace_node_type', val: int(0) }, { key: 'category_defined_id', val: str('rpc e') }, { key: 'category_display_name', val: str('RPC a/e') }, { key: 'category_description', val: str('RPC a/e') }, { key: 'label_format', val: str('a/e') }), node(
// rpc e span
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(220)) }, { key: 'trace_end', val: ts(sec(280)) }, { key: 'rpc', val: str('e') }), node(valueMap({ key: 'payload_type', val: str('trace_edge_payload') }, { key: 'trace_edge_node_id', val: str('a/e') }, { key: 'trace_edge_start', val: ts(sec(220)) }, { key: 'trace_edge_endpoint_node_ids', val: strs() })), node(valueMap({ key: 'payload_type', val: str('trace_edge_payload') }, { key: 'trace_edge_node_id', val: str('a/e->a/e/a') }, { key: 'trace_edge_start', val: ts(sec(240)) }, {
    key: 'trace_edge_endpoint_node_ids',
    val: strs('a/e/a')
}))), node(
// rpc a/e/a category
valueMap({ key: 'trace_node_type', val: int(0) }, { key: 'category_defined_id', val: str('rpc a') }, { key: 'category_display_name', val: str('RPC a/e/a') }, { key: 'category_description', val: str('RPC a/e/a') }, { key: 'label_format', val: str('a/e/a') }), node(
// rpc a span
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(240)) }, { key: 'trace_end', val: ts(sec(250)) }, { key: 'rpc', val: str('a') }), node(valueMap({
    key: 'payload_type',
    val: str('trace_edge_payload')
}, { key: 'trace_edge_node_id', val: str('a/e/a') }, { key: 'trace_edge_start', val: ts(sec(240)) }, { key: 'trace_edge_endpoint_node_ids', val: strs() })), node(
// rpc f subspan
valueMap({ key: 'trace_node_type', val: int(2) }, { key: 'trace_start', val: ts(sec(240)) }, { key: 'trace_end', val: ts(sec(250)) }, { key: 'state', val: str('local') })))))));
/**
 * A response node encoding an example user-code instrumentation thread/scope
 * trace.
 */
export const userInstrumentationNode = node(valueMap({ key: 'category_defined_id', val: str('x_axis') }, { key: 'category_display_name', val: str('time from start') }, { key: 'category_description', val: str('Time from start') }, { key: 'axis_type', val: str('timestamp') }, { key: 'axis_min', val: ts(sec(0)) }, { key: 'axis_max', val: ts(sec(300)) }), node(
// pid 100 category
valueMap({ key: 'trace_node_type', val: int(0) }, { key: 'category_defined_id', val: str('pid 100') }, { key: 'category_display_name', val: str('PID 100') }, { key: 'category_description', val: str('PID 100') }), node(
// first foo span
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(0)) }, { key: 'trace_end', val: ts(sec(90)) }, { key: 'function', val: str('foo') }), node(
// first bar span
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(10)) }, { key: 'trace_end', val: ts(sec(40)) }, { key: 'function', val: str('bar') }), node(
// first baz span
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(15)) }, { key: 'trace_end', val: ts(sec(25)) }, { key: 'function', val: str('baz') }))), node(
// second bar span
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(50)) }, { key: 'trace_end', val: ts(sec(80)) }, { key: 'function', val: str('bar') }), node(
// second baz span
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(55)) }, { key: 'trace_end', val: ts(sec(65)) }, { key: 'function', val: str('baz') })))), node(
// second foo span
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(100)) }, { key: 'trace_end', val: ts(sec(190)) }, { key: 'function', val: str('foo') }), node(
// third bar span
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(110)) }, { key: 'trace_end', val: ts(sec(140)) }, { key: 'function', val: str('bar') }), node(
// third baz span
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(115)) }, { key: 'trace_end', val: ts(sec(125)) }, { key: 'function', val: str('baz') }))), node(
// fourth bar span
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(150)) }, { key: 'trace_end', val: ts(sec(180)) }, { key: 'function', val: str('bar') }), node(
// fourth baz span
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(155)) }, { key: 'trace_end', val: ts(sec(165)) }, { key: 'function', val: str('baz') }))))));
/**
 * A response node encoding an example process/thread trace with embedded
 * binned data at the process level.
 */
export const embeddedNode = node(valueMap({ key: 'category_defined_id', val: str('x_axis') }, { key: 'category_display_name', val: str('time from start') }, { key: 'category_description', val: str('Time from start') }, { key: 'axis_type', val: str('timestamp') }, { key: 'axis_min', val: ts(sec(0)) }, { key: 'axis_max', val: ts(sec(500)) }), node(
// pid 100 category
valueMap({ key: 'trace_node_type', val: int(0) }, { key: 'category_defined_id', val: str('pid 100') }, { key: 'category_display_name', val: str('PID 100') }, { key: 'category_description', val: str('PID 100') }), node(
// PID 100 span
valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(0)) }, { key: 'trace_end', val: ts(sec(500)) }), node(
// embedded binned data series in payload
valueMap({ key: 'payload_type', val: str('thumbnail') }, { key: 'normalized_cpu_time', val: ints(1, 1, 2, 1, 1) }))), node(
// tid 110 category
valueMap({ key: 'trace_node_type', val: int(0) }, { key: 'category_defined_id', val: str('pid 110') }, { key: 'category_display_name', val: str('PID 110') }, { key: 'category_description', val: str('PID 110') }), node(valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(0)) }, { key: 'trace_end', val: ts(sec(100)) })), node(valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(200)) }, { key: 'trace_end', val: ts(sec(300)) })), node(valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(400)) }, { key: 'trace_end', val: ts(sec(500)) }))), node(
// tid 120 category
valueMap({ key: 'trace_node_type', val: int(0) }, { key: 'category_defined_id', val: str('pid 120') }, { key: 'category_display_name', val: str('PID 120') }, { key: 'category_description', val: str('PID 120') }), node(valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(100)) }, { key: 'trace_end', val: ts(sec(200)) })), node(valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(300)) }, { key: 'trace_end', val: ts(sec(400)) }))), node(
// tid 130 category
valueMap({ key: 'trace_node_type', val: int(0) }, { key: 'category_defined_id', val: str('pid 130') }, { key: 'category_display_name', val: str('PID 130') }, { key: 'category_description', val: str('PID 130') }), node(valueMap({ key: 'trace_node_type', val: int(1) }, { key: 'trace_start', val: ts(sec(200)) }, { key: 'trace_end', val: ts(sec(300)) })))));
//# sourceMappingURL=traces.js.map