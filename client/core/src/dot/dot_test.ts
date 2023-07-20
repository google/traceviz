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

import {node} from '../protocol/test_response.js';

import {Graph} from './dot.js';

import {str, int, strs, valueMap} from '../value/test_value.js';

describe('dot test', () => {
  it('generates expected simple dot and property mappings', () => {
    const graph = new Graph(
        node(
            // strict digraph {
            valueMap(
                {key: 'dot_directionality', val: str('directed')},
                {key: 'dot_layout_engine', val: str('dot')},
                {key: 'dot_strictness', val: str('strict')},
                ),
            // node [color=blue,label="\N"]
            node(
                valueMap(
                    {key: 'dot_statement_type', val: str('attr')},
                    {key: 'dot_attr_statement_target', val: str('node')},
                    {
                      key: 'dot_attributes',
                      val: strs('color', 'blue', 'label', '"\\N"')
                    },
                    ),
                ),
            // "A" [id="A"]
            node(
                valueMap(
                    {key: 'dot_statement_type', val: str('node')},
                    {key: 'dot_node_id', val: str('A')},
                    {key: 'node_id', val: int(0)},
                    ),
                ),
            // "B" [id="B"]
            node(
                valueMap(
                    {key: 'dot_statement_type', val: str('node')},
                    {key: 'dot_node_id', val: str('B')},
                    {key: 'node_id', val: int(1)},
                    ),
                ),
            // "C" [id="C"]
            node(
                valueMap(
                    {key: 'dot_statement_type', val: str('node')},
                    {key: 'dot_node_id', val: str('C')},
                    {key: 'node_id', val: int(2)},
                    ),
                ),
            // "A" -> "B" [id="A:B"]
            node(
                valueMap(
                    {key: 'dot_statement_type', val: str('edge')},
                    {key: 'dot_edge_id', val: str('A:B')},
                    {key: 'dot_start_node_id', val: str('A')},
                    {key: 'dot_end_node_id', val: str('B')},
                    ),
                ),
            // "A" -> "C" [id="A:C"]
            node(
                valueMap(
                    {key: 'dot_statement_type', val: str('edge')},
                    {key: 'dot_edge_id', val: str('A:C')},
                    {key: 'dot_start_node_id', val: str('A')},
                    {key: 'dot_end_node_id', val: str('C')},
                    ),
                ),
            ),
    );
    expect(graph.dot).toEqual(`strict digraph {
  node [color=blue,label="\\N"]
    "A" [id="A"]
    "B" [id="B"]
    "C" [id="C"]
    "A" -> "B" [id="A:B"]
    "A" -> "C" [id="A:C"]
}`);
  });
});
