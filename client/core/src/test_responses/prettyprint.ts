/**
 * @fileoverview A test-only package for pretty-printing TraceViz frontend
 * response types.
 */

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

import {Category} from '../category/category.js';
import {Axis} from '../continuous_axis/continuous_axis.js';
import {ResponseNode} from '../protocol/response_interface.js';
import {Timestamp} from '../timestamp/timestamp.js';
import {endKey, Span, startKey, Subspan, Trace, TraceCategory} from '../trace/trace.js';
import {ValueMap} from '../value/value_map.js';

const INDENT = '  ';

function prettyPrintProperties(
    properties: ValueMap,
    prefix = '',
    ): string {
  if (properties.size === 0) {
    return ``;
  }
  const ret = new Array<string>();
  for (const [k, v] of properties.entries()) {
    ret.push(`${k}: ${v.toString()}`);
  }
  return `${prefix}with [${ret.join(', ')}]
`;
}

function prettyPrintNode(node: ResponseNode, prefix = ''): string {
  let ret = `${prefix}Payload node:
`;
  ret = ret + prettyPrintProperties(node.properties, prefix + INDENT);
  for (const child of node.children) {
    ret = ret + prettyPrintNode(child, prefix + INDENT);
  }
  return ret;
}
/** Returns a Timestamp at the specified seconds after epoch. */
export function sec(sec: number): Timestamp {
  return new Timestamp(sec, 0);
}

function toString<T>(val: T): string {
  if (val instanceof Timestamp) {
    return `${val.sub(sec(0)).toString()}`;
  }
  return `${val}`;
}

function prettyPrintSubspan<T>(
    axis: Axis<T>, subspan: Subspan<T>, prefix = ''): string {
  let ret = `${prefix}Subspan:
${prefix}${INDENT}${toString(subspan.start())} to ${toString(subspan.end())}
`;
  ret = ret +
      prettyPrintProperties(
            subspan.properties.without(startKey, endKey), prefix + INDENT);
  for (const [, payloads] of subspan.payloads) {
    for (const payload of payloads) {
      ret = ret + prettyPrintNode(payload, prefix + INDENT);
    }
  }
  return ret;
}

function prettyPrintSpan<T>(axis: Axis<T>, span: Span<T>, prefix = ''): string {
  let ret = `${prefix}Span (height ${span.height}):
${prefix}${INDENT}${toString(span.start())} to ${toString(span.end())}
`;
  ret = ret +
      prettyPrintProperties(
            span.properties.without(startKey, endKey), prefix + INDENT);
  for (const [, payloads] of span.payloads) {
    for (const payload of payloads) {
      ret = ret + prettyPrintNode(payload, prefix + INDENT);
    }
  }
  for (const child of span.children) {
    ret += prettyPrintSpan(axis, child, prefix + INDENT);
  }
  for (const subspan of span.subspans) {
    ret += prettyPrintSubspan(axis, subspan, prefix + INDENT);
  }
  return ret;
}

function prettyPrintTraceCategory<T>(
    axis: Axis<T>, tracecat: TraceCategory<T>, prefix = ''): string {
  let ret = `${prefix}Category ${prettyPrintCategory(tracecat.category)}:
`;
  ret = ret +
      `${prefix}${INDENT}span-height self:${tracecat.selfSpanHeight} total:${
            tracecat.totalSpanHeight}
${prefix}${INDENT}cat-height ${tracecat.categoryHeight}
`;
  ret = ret + prettyPrintProperties(tracecat.properties, prefix + INDENT);
  for (const span of tracecat.spans) {
    ret += prettyPrintSpan(axis, span, prefix + INDENT);
  }
  for (const subcat of tracecat.categories) {
    ret += prettyPrintTraceCategory(axis, subcat, prefix + INDENT);
  }
  return ret;
}

/** Pretty-prints the provided category for testing. */
export function prettyPrintCategory(category: Category): string {
  return `${category.id} '${category.displayName}' (${category.description})`;
}

/** Pretty-prints the provided axis for testing. */
export function prettyPrintAxis<T>(axis: Axis<T>): string {
  const ret = `Axis ${prettyPrintCategory(axis.category)} `;
  return ret + `(domain ${toString(axis.min)}, ${toString(axis.max)})`;
}

/** Pretty-prints the provided trace for testing. */
export function prettyPrintTrace<T>(trace: Trace<T>, prefix = ''): string {
  let ret = `${prefix}Trace:
${prefix}${INDENT}${prettyPrintAxis(trace.axis)}
`;
  for (const cat of trace.categories) {
    ret += prettyPrintTraceCategory(trace.axis, cat, prefix + INDENT);
  }
  return ret;
}
