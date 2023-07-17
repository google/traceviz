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