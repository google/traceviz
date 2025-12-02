/**
 * @fileoverview Tools for working with graph data in DOT format, as defined in
 * .../traceviz/server/go/dot/dot.got.  See that file for more information
 * about the format.
 */
import { Coloring, hex } from '../color/color.js';
import { ConfigurationError, Severity } from '../errors/errors.js';
import { getLabel } from '../label/label.js';
import { StringValue } from '../value/value.js';
const SOURCE = 'dot';
var Key;
(function (Key) {
    Key["STRICTNESS"] = "dot_strictness";
    Key["DIRECTIONALITY"] = "dot_directionality";
    Key["LAYOUT_ENGINE"] = "dot_layout_engine";
    Key["STATEMENT_TYPE"] = "dot_statement_type";
    Key["ATTR_STATEMENT_TARGET"] = "dot_attr_statement_target";
    Key["ATTRIBUTES"] = "dot_attributes";
    Key["SUBGRAPH_ID"] = "dot_subgraph_id";
    Key["NODE_ID"] = "dot_node_id";
    Key["EDGE_ID"] = "dot_edge_id";
    Key["START_NODE_ID"] = "dot_start_node_id";
    Key["END_NODE_ID"] = "dot_end_node_id";
    Key["DETAIL_FORMAT"] = "detail_format";
    Key["TOOLTIP"] = "tooltip";
})(Key || (Key = {}));
const STRICT = 'strict';
const NONSTRICT = 'nonstrict';
const DIRECTED = 'directed';
const UNDIRECTED = 'undirected';
var StatementType;
(function (StatementType) {
    StatementType["EDGE"] = "edge";
    StatementType["NODE"] = "node";
    StatementType["SUBGRAPH"] = "subgraph";
    StatementType["ATTR"] = "attr";
})(StatementType || (StatementType = {}));
/**
 * A graph supporting dot output and providing per-node and -edge properties.
 */
export class Graph {
    // A mapping from node ID to the corresponding node's properties.
    nodePropertiesByID = new Map();
    // A mapping from edge ID to the corresponding edge's properties.
    edgePropertiesByID = new Map();
    // The graph in dot format.
    dot = '';
    // The coloring defined in the graph data's root ResponseNode.
    coloring;
    // The requested layout engine.
    layoutEngine = 'dot';
    constructor(node) {
        this.coloring = new Coloring(node.properties);
        if (!node.properties.has(Key.STRICTNESS) ||
            !node.properties.has(Key.DIRECTIONALITY) ||
            !node.properties.has(Key.LAYOUT_ENGINE)) {
            return;
        }
        let strictness = '';
        switch (node.properties.expectString(Key.STRICTNESS)) {
            case STRICT:
                strictness = 'strict';
                break;
            case NONSTRICT:
                strictness = '';
                break;
            default:
                throw new ConfigurationError(`unrecognized strictness '${node.properties.expectString(Key.STRICTNESS)}'`)
                    .from(SOURCE)
                    .at(Severity.ERROR);
        }
        let graphType = '';
        switch (node.properties.expectString(Key.DIRECTIONALITY)) {
            case UNDIRECTED:
                graphType = 'graph';
                break;
            case DIRECTED:
                graphType = 'digraph';
                break;
            default:
                throw new ConfigurationError(`unrecognized directionality '${node.properties.expectString(Key.DIRECTIONALITY)}'`)
                    .from(SOURCE)
                    .at(Severity.ERROR);
        }
        this.dot = `${strictness} ${graphType} {
${this.toDot(node, strictness === STRICT, '  ')}
}`;
        this.layoutEngine = node.properties.expectString(Key.LAYOUT_ENGINE);
    }
    // Converts the graph or subgraph in the provided ResponseNode to dot format,
    // and returns that dot string.
    toDot(node, strict, indent) {
        const ret = [];
        for (const attr of this.getAttributes(node.properties, StatementType.SUBGRAPH)) {
            ret.push(`${attr};`);
        }
        for (const child of node.children) {
            const childStatementType = child.properties.expectString(Key.STATEMENT_TYPE);
            switch (childStatementType) {
                case StatementType.NODE:
                    const nodeID = child.properties.expectString(Key.NODE_ID);
                    let tooltipText = '';
                    if (child.properties.has(Key.DETAIL_FORMAT)) {
                        tooltipText = child.properties.format(child.properties.expectString(Key.DETAIL_FORMAT));
                    }
                    this.nodePropertiesByID.set(nodeID, child.properties.without(Key.ATTRIBUTES).with([
                        Key.TOOLTIP, new StringValue(tooltipText)
                    ]));
                    ret.push(`${indent}"${child.properties.expectString(Key.NODE_ID)}" ${this.getAttributesString(child.properties, childStatementType)}`);
                    break;
                case StatementType.EDGE:
                    const edgeID = child.properties.expectString(Key.EDGE_ID);
                    this.edgePropertiesByID.set(edgeID, child.properties.without(Key.ATTRIBUTES));
                    ret.push(`${indent}"${child.properties.expectString(Key.START_NODE_ID)}" ${strict ? '->' : '--'} "${child.properties.expectString(Key.END_NODE_ID)}" ${this.getAttributesString(child.properties, childStatementType)}`);
                    break;
                case StatementType.SUBGRAPH:
                    ret.push(`${indent}subgraph ${child.properties.expectString(Key.SUBGRAPH_ID)} {
  ${this.toDot(child, strict, indent + '  ')}
  }`);
                    break;
                case StatementType.ATTR:
                    const statementType = child.properties.expectString(Key.ATTR_STATEMENT_TARGET);
                    ret.push(`${indent}${statementType} ${this.getAttributesString(child.properties, statementType)}`);
                    break;
                default:
                    throw new ConfigurationError(`unexpected statement type ${child.properties.expectString(Key.STATEMENT_TYPE)}`)
                        .from(SOURCE)
                        .at(Severity.ERROR);
            }
        }
        return ret.join(`
  `);
    }
    // Returns the dot attributes defined in the provided ValueMap as a string
    // list.  Each defined attribute appears in the return value as a single dot
    // definition string, of the format `<attr>=<value>`.
    getAttributes(properties, statementType) {
        let attrs = [];
        if (properties.has(Key.ATTRIBUTES)) {
            attrs = properties.expectStringList(Key.ATTRIBUTES);
        }
        if (attrs.length % 2 !== 0) {
            throw new ConfigurationError(`${Key.ATTRIBUTES} defines key/value pairs in sequence and so must have even length`)
                .from(SOURCE)
                .at(Severity.ERROR);
        }
        const ret = [];
        for (let idx = 0; idx < attrs.length; idx += 2) {
            ret.push(`${attrs[idx]}=${attrs[idx + 1]}`);
        }
        if (properties.has(Key.NODE_ID)) {
            ret.push(`id="${properties.expectString(Key.NODE_ID)}"`);
        }
        if (properties.has(Key.EDGE_ID)) {
            ret.push(`id="${properties.expectString(Key.EDGE_ID)}"`);
        }
        const label = getLabel(properties);
        if (label !== '') {
            ret.push(`label="${label}"`);
        }
        const cols = this.coloring.colors(properties);
        if (cols) {
            switch (statementType) {
                case StatementType.EDGE:
                    if (cols.primary) {
                        ret.push(`color="${hex(cols.primary)}"`);
                    }
                    if (cols.stroke) {
                        ret.push(`fontcolor="${hex(cols.stroke)}"`);
                    }
                    break;
                default:
                    if (cols.primary) {
                        ret.push(`fillcolor="${hex(cols.primary)}"`);
                    }
                    if (cols.stroke) {
                        ret.push(`fontcolor="${hex(cols.stroke)}"`);
                    }
                    break;
            }
        }
        return ret;
    }
    // Returns the attributes defined in the provided ValueMap as a single dot
    // definition string.
    getAttributesString(properties, statementType) {
        return `[${this.getAttributes(properties, statementType).join(',')}]`;
    }
}
//# sourceMappingURL=dot.js.map