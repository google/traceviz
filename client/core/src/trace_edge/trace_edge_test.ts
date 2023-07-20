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

import {Duration} from '../duration/duration.js';
import {node} from '../protocol/test_response.js';
import {Timestamp} from '../timestamp/timestamp.js';
import {Span, Subspan, Trace, TraceCategory} from '../trace/trace.js';

import {Node} from './trace_edge.js';

import {dur, int, str, strs, ts, valueMap} from '../value/test_value.js';

/** Returns a Timestamp at the specified seconds after epoch. */
export function sec(sec: number): Timestamp {
  return new Timestamp(sec, 0);
}

/** Returns a Duration of the specified seconds. */
export function d(sec: number): Duration {
  return new Duration(sec * 1E9);
}

function findAllEdges(
    parent: Trace|TraceCategory|Span|Subspan, nodesByID: Map<string, Node>) {
  if (parent instanceof Trace) {
    for (const category of parent.categories) {
      findAllEdges(category, nodesByID);
    }
  } else if (parent instanceof TraceCategory) {
    for (const span of parent.spans) {
      findAllEdges(span, nodesByID);
    }
    for (const category of parent.categories) {
      findAllEdges(category, nodesByID);
    }
  } else if (parent instanceof Span) {
    for (const node of Node.fromSpan(parent)) {
      nodesByID.set(parent.properties.expectString('id'), node);
    }
    for (const subspan of parent.subspans) {
      findAllEdges(subspan, nodesByID);
    }
  } else if (parent instanceof Subspan) {
    for (const node of Node.fromSpan(parent)) {
      nodesByID.set(parent.properties.expectString('id'), node);
    }
  }
}

describe('trace edge test', () => {
  it('loads from trace', () => {
    const response = node(
        valueMap(
            {key: 'category_defined_id', val: str('x_axis')},
            {key: 'category_display_name', val: str('time from start')},
            {key: 'category_description', val: str('Time from start')},
            {key: 'axis_type', val: str('timestamp')},
            {key: 'axis_min', val: ts(sec(0))},
            {key: 'axis_max', val: ts(sec(300))},
            ),
        node(
            // rpc a category
            valueMap(
                {key: 'trace_node_type', val: int(0)},
                {key: 'category_defined_id', val: str('rpc a')},
                {key: 'category_display_name', val: str('RPC a')},
                {key: 'category_description', val: str('RPC a')},
                {key: 'id', val: str('a')},
                ),
            node(
                // rpc a span
                valueMap(
                    {key: 'trace_node_type', val: int(1)},
                    {key: 'trace_offset', val: dur(d(0))},
                    {key: 'trace_duration', val: dur(d(100))},
                    {key: 'id', val: str('a:0')},
                    ),
                // Traceedge node "A"
                node(
                    valueMap(
                        {key: 'trace_node_type', val: int(3)},
                        {key: 'payload_type', val: str('trace_edge_payload')},
                        {key: 'trace_edge_node_id', val: str('A')},
                        {key: 'trace_edge_offset', val: dur(d(100))},
                        {key: 'trace_edge_endpoint_node_ids', val: strs('B')},
                        ),
                    ),
                ),
            ),
        node(
            // rpc b category
            valueMap(
                {key: 'trace_node_type', val: int(0)},
                {key: 'category_defined_id', val: str('rpc b')},
                {key: 'category_display_name', val: str('RPC b')},
                {key: 'category_description', val: str('RPC b')},
                {key: 'id', val: str('b')},
                ),
            node(
                // rpc b span
                valueMap(
                    {key: 'trace_node_type', val: int(1)},
                    {key: 'trace_offset', val: dur(d(100))},
                    {key: 'trace_duration', val: dur(d(300))},
                    {key: 'id', val: str('b:0')},
                    ),
                // Traceedge node "A"
                node(
                    valueMap(
                        {key: 'trace_node_type', val: int(3)},
                        {key: 'payload_type', val: str('trace_edge_payload')},
                        {key: 'trace_edge_node_id', val: str('B')},
                        {key: 'trace_edge_offset', val: dur(d(100))},
                        {key: 'trace_edge_endpoint_node_ids', val: strs()},
                        ),
                    ),
                ),
            ),
    );
    const trace = Trace.fromNode(response);
    const nodesByID = new Map<string, Node>();
    findAllEdges(trace, nodesByID);
    expect(nodesByID).toEqual(new Map<string, Node>([
      [
        'a:0',
        new Node(node(valueMap(
            {key: 'trace_node_type', val: int(3)},
            {key: 'payload_type', val: str('trace_edge_payload')},
            {key: 'trace_edge_node_id', val: str('A')},
            {key: 'trace_edge_offset', val: dur(d(100))},
            {key: 'trace_edge_endpoint_node_ids', val: strs('B')},
            )))
      ],
      [
        'b:0',
        new Node(node(valueMap(
            {key: 'trace_node_type', val: int(3)},
            {key: 'payload_type', val: str('trace_edge_payload')},
            {key: 'trace_edge_node_id', val: str('B')},
            {key: 'trace_edge_offset', val: dur(d(100))},
            {key: 'trace_edge_endpoint_node_ids', val: strs()},
            )))
      ],
    ]));
  });
});
