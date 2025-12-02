import { Duration } from '../duration/duration.js';
/** Returns a Duration of the specified seconds. */
export declare function d(sec: number): Duration;
/**
 * A response node encoding an example SchedViz running-thread trace response.
 */
export declare const schedvizRunningNode: import("../protocol/test_response.js").TestResponseNode;
/**
 * A response node encoding an example SchedViz waiting-thread trace response.
 */
export declare const schedvizWaitingNode: import("../protocol/test_response.js").TestResponseNode;
/**
 * A response node encoding an example RPC trace.
 */
export declare const rpcNode: import("../protocol/test_response.js").TestResponseNode;
/**
 * A response node encoding an example user-code instrumentation thread/scope
 * trace.
 */
export declare const userInstrumentationNode: import("../protocol/test_response.js").TestResponseNode;
/**
 * A response node encoding an example process/thread trace with embedded
 * binned data at the process level.
 */
export declare const embeddedNode: import("../protocol/test_response.js").TestResponseNode;
