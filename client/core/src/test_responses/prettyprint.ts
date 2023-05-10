/**
 * @fileoverview A test-only package for pretty-printing TraceViz frontend
 * response types.
 */

import { ResponseNode } from '../protocol/response_interface.js';
import { ValueMap } from '../value/value_map.js';
import { Category } from '../category/category.js';
import { DurationAxis, NumberAxis, TimestampAxis } from '../continuous_axis/continuous_axis.js';
import { Duration } from '../duration/duration.js';
import { Timestamp } from '../timestamp/timestamp.js';
import { Span, Subspan, Trace, TraceCategory } from '../trace/trace.js';

const INDENT = '  ';

function prettyPrintProperties(
  properties: ValueMap,
  prefix: string = '',
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

function prettyPrintNode(node: ResponseNode, prefix: string = ''): string {
  let ret = `${prefix}Payload node:
`;
  ret = ret + prettyPrintProperties(node.properties, prefix + INDENT);
  for (const child of node.children) {
    ret = ret + prettyPrintNode(child, prefix + INDENT);
  }
  return ret;
}

function prettyPrintSubspan(subspan: Subspan, prefix: string = ''): string {
  let ret = `${prefix}Subspan:
${prefix}${INDENT}at ${subspan.offset.toString()} for ${subspan.duration.toString()}
`;
  ret = ret + prettyPrintProperties(subspan.properties, prefix + INDENT);
  for (const [, payloads] of subspan.payloads) {
    for (const payload of payloads) {
      ret = ret + prettyPrintNode(payload, prefix + INDENT);
    }
  }
  return ret;
}

function prettyPrintSpan(span: Span, prefix: string = ''): string {
  let ret = `${prefix}Span (height ${span.height}):
${prefix}${INDENT}at ${span.offset.toString()} for ${span.duration.toString()}
`;
  ret = ret + prettyPrintProperties(span.properties, prefix + INDENT);
  for (const [, payloads] of span.payloads) {
    for (const payload of payloads) {
      ret = ret + prettyPrintNode(payload, prefix + INDENT);
    }
  }
  for (const child of span.children) {
    ret += prettyPrintSpan(child, prefix + INDENT);
  }
  for (const subspan of span.subspans) {
    ret += prettyPrintSubspan(subspan, prefix + INDENT);
  }
  return ret;
}

function prettyPrintTraceCategory(
  tracecat: TraceCategory, prefix: string = ''): string {
  let ret = `${prefix}Category ${prettyPrintCategory(tracecat.category)}:
`;
  ret = ret +
    `${prefix}${INDENT}span-height self:${tracecat.selfSpanHeight} total:${tracecat.totalSpanHeight}
${prefix}${INDENT}cat-height ${tracecat.categoryHeight}
`;
  ret = ret + prettyPrintProperties(tracecat.properties, prefix + INDENT);
  for (const span of tracecat.spans) {
    ret += prettyPrintSpan(span, prefix + INDENT);
  }
  for (const subcat of tracecat.categories) {
    ret += prettyPrintTraceCategory(subcat, prefix + INDENT);
  }
  return ret;
}

/** Pretty-prints the provided category for testing. */
export function prettyPrintCategory(category: Category): string {
  return `${category.id} '${category.displayName}' (${category.description})`;
}

/** Pretty-prints the provided axis for testing. */
export function prettyPrintAxis(axis: TimestampAxis | DurationAxis |
  NumberAxis): string {
  const ret = `Axis ${prettyPrintCategory(axis.category)} `;
  if (axis.min instanceof Timestamp && axis.max instanceof Timestamp) {
    return ret +
      `(domain ${axis.min.toDate().toString()}, ${axis.max.toDate().toString()})`;
  }
  if (axis.min instanceof Duration && axis.max instanceof Duration) {
    return ret + `(domain ${axis.min.toString()}, ${axis.max.toString()})`;
  }
  return ret + `(domain ${axis.min}, ${axis.max})`;
}

/** Pretty-prints the provided trace for testing. */
export function prettyPrintTrace(trace: Trace, prefix: string = ''): string {
  let ret = `${prefix}Trace:
${prefix}${INDENT}${prettyPrintAxis(trace.axis)}
`;
  for (const cat of trace.categories) {
    ret += prettyPrintTraceCategory(cat, prefix + INDENT);
  }
  return ret;
}
