/**
 * @fileoverview A test-only package for pretty-printing TraceViz frontend
 * response types.
 */
import { Timestamp } from '../timestamp/timestamp.js';
import { endKey, startKey } from '../trace/trace.js';
const INDENT = '  ';
function prettyPrintProperties(properties, prefix = '') {
    if (properties.size === 0) {
        return ``;
    }
    const ret = new Array();
    for (const [k, v] of properties.entries()) {
        ret.push(`${k}: ${v.toString()}`);
    }
    return `${prefix}with [${ret.join(', ')}]
`;
}
function prettyPrintNode(node, prefix = '') {
    let ret = `${prefix}Payload node:
`;
    ret = ret + prettyPrintProperties(node.properties, prefix + INDENT);
    for (const child of node.children) {
        ret = ret + prettyPrintNode(child, prefix + INDENT);
    }
    return ret;
}
/** Returns a Timestamp at the specified seconds after epoch. */
export function sec(sec) {
    return new Timestamp(sec, 0);
}
function toString(val) {
    if (val instanceof Timestamp) {
        return `${val.sub(sec(0)).toString()}`;
    }
    return `${val}`;
}
function prettyPrintSubspan(axis, subspan, prefix = '') {
    let ret = `${prefix}Subspan:
${prefix}${INDENT}${toString(subspan.start())} to ${toString(subspan.end())}
`;
    ret = ret +
        prettyPrintProperties(subspan.properties.without(startKey, endKey), prefix + INDENT);
    for (const [, payloads] of subspan.payloads) {
        for (const payload of payloads) {
            ret = ret + prettyPrintNode(payload, prefix + INDENT);
        }
    }
    return ret;
}
function prettyPrintSpan(axis, span, prefix = '') {
    let ret = `${prefix}Span (height ${span.height}):
${prefix}${INDENT}${toString(span.start())} to ${toString(span.end())}
`;
    ret = ret +
        prettyPrintProperties(span.properties.without(startKey, endKey), prefix + INDENT);
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
function prettyPrintTraceCategory(axis, tracecat, prefix = '') {
    let ret = `${prefix}Category ${prettyPrintCategory(tracecat.category)}:
`;
    ret = ret +
        `${prefix}${INDENT}span-height self:${tracecat.selfSpanHeight} total:${tracecat.totalSpanHeight}
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
export function prettyPrintCategory(category) {
    return `${category.id} '${category.displayName}' (${category.description})`;
}
/** Pretty-prints the provided axis for testing. */
export function prettyPrintAxis(axis) {
    const ret = `Axis ${prettyPrintCategory(axis.category)} `;
    return ret + `(domain ${toString(axis.min)}, ${toString(axis.max)})`;
}
/** Pretty-prints the provided trace for testing. */
export function prettyPrintTrace(trace, prefix = '') {
    let ret = `${prefix}Trace:
${prefix}${INDENT}${prettyPrintAxis(trace.axis)}
`;
    for (const cat of trace.categories) {
        ret += prettyPrintTraceCategory(trace.axis, cat, prefix + INDENT);
    }
    return ret;
}
//# sourceMappingURL=prettyprint.js.map