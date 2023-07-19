/**
 * @fileoverview Tools for working with graph data in DOT format, as defined in
 * .../traceviz/server/go/dot/dot.got.  See that file for more information
 * about the format.
 */

import {Coloring, hex} from '../color/color.js';
import {getLabel} from '../label/label.js';
import {ConfigurationError, Severity} from '../errors/errors.js';
import {ResponseNode} from '../protocol/response_interface.js';
import {StringValue} from '../value/value.js';
import {ValueMap} from '../value/value_map.js';

const SOURCE = 'dot';

enum Key {
  STRICTNESS = 'dot_strictness',
  DIRECTIONALITY = 'dot_directionality',
  LAYOUT_ENGINE = 'dot_layout_engine',
  STATEMENT_TYPE = 'dot_statement_type',
  ATTR_STATEMENT_TARGET = 'dot_attr_statement_target',
  ATTRIBUTES = 'dot_attributes',

  SUBGRAPH_ID = 'dot_subgraph_id',
  NODE_ID = 'dot_node_id',
  EDGE_ID = 'dot_edge_id',
  START_NODE_ID = 'dot_start_node_id',
  END_NODE_ID = 'dot_end_node_id',

  DETAIL_FORMAT = 'detail_format',
  TOOLTIP = 'tooltip',
}

const STRICT = 'strict';
const NONSTRICT = 'nonstrict';
const DIRECTED = 'directed';
const UNDIRECTED = 'undirected';

enum StatementType {
  EDGE = 'edge',
  NODE = 'node',
  SUBGRAPH = 'subgraph',
  ATTR = 'attr',
}

/**
 * A graph supporting dot output and providing per-node and -edge properties.
 */
export class Graph {
  // A mapping from node ID to the corresponding node's properties.
  readonly nodePropertiesByID = new Map<string, ValueMap>();
  // A mapping from edge ID to the corresponding edge's properties.
  readonly edgePropertiesByID = new Map<string, ValueMap>();
  // The graph in dot format.
  readonly dot: string = '';
  // The coloring defined in the graph data's root ResponseNode.
  readonly coloring: Coloring;
  // The requested layout engine.
  readonly layoutEngine: string = 'dot';

  constructor(node: ResponseNode) {
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
        throw new ConfigurationError(
          `unrecognized strictness '${node.properties.expectString(Key.STRICTNESS)}'`)
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
        throw new ConfigurationError(
          `unrecognized directionality '${node.properties.expectString(Key.DIRECTIONALITY)}'`)
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
  private toDot(node: ResponseNode, strict: boolean, indent: string): string {
    const ret: string[] = [];
    for (const attr of this.getAttributes(
      node.properties, StatementType.SUBGRAPH)) {
      ret.push(`${attr};`);
    }
    for (const child of node.children) {
      const childStatementType =
        child.properties.expectString(Key.STATEMENT_TYPE) as StatementType;
      switch (childStatementType) {
        case StatementType.NODE:
          const nodeID = child.properties.expectString(Key.NODE_ID);

          let tooltipText = '';
          if (child.properties.has(Key.DETAIL_FORMAT)) {
            tooltipText = child.properties.format(
              child.properties.expectString(Key.DETAIL_FORMAT));
          }
          this.nodePropertiesByID.set(
            nodeID, child.properties.without(Key.ATTRIBUTES).with([
              Key.TOOLTIP, new StringValue(tooltipText)
            ]));

          ret.push(`${indent}"${child.properties.expectString(Key.NODE_ID)}" ${this.getAttributesString(child.properties, childStatementType)}`);
          break;
        case StatementType.EDGE:
          const edgeID = child.properties.expectString(Key.EDGE_ID);
          this.edgePropertiesByID.set(
            edgeID, child.properties.without(Key.ATTRIBUTES));
          ret.push(`${indent}"${child.properties.expectString(
            Key.START_NODE_ID)}" ${strict ? '->' : '--'} "${child.properties.expectString(Key.END_NODE_ID)}" ${this.getAttributesString(child.properties, childStatementType)}`);
          break;
        case StatementType.SUBGRAPH:
          ret.push(`${indent}subgraph ${child.properties.expectString(Key.SUBGRAPH_ID)} {
  ${this.toDot(child, strict, indent + '  ')}
  }`);
          break;
        case StatementType.ATTR:
          const statementType = child.properties.expectString(
            Key.ATTR_STATEMENT_TARGET) as StatementType;
          ret.push(`${indent}${statementType} ${this.getAttributesString(child.properties, statementType)}`);
          break;
        default:
          throw new ConfigurationError(
            `unexpected statement type ${child.properties.expectString(Key.STATEMENT_TYPE)}`)
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
  private getAttributes(properties: ValueMap, statementType: StatementType):
    string[] {
    let attrs: string[] = [];
    if (properties.has(Key.ATTRIBUTES)) {
      attrs = properties.expectStringList(Key.ATTRIBUTES);
    }
    if (attrs.length % 2 !== 0) {
      throw new ConfigurationError(
        `${Key.ATTRIBUTES} defines key/value pairs in sequence and so must have even length`)
        .from(SOURCE)
        .at(Severity.ERROR);
    }
    const ret: string[] = [];
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
  private getAttributesString(
    properties: ValueMap, statementType: StatementType): string {
    return `[${this.getAttributes(properties, statementType).join(',')}]`;
  }
}
