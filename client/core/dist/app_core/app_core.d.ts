/**
 * @fileoverview The global state of a TraceViz application.
 */
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { DataQuery } from '../data_query/data_query.js';
import { ConfigurationError } from '../errors/errors.js';
import { GlobalState } from '../global_state/global_state.js';
/** The default data query ID. */
export declare const DEFAULT_DATA_QUERY_ID = "default";
/**
 * A collection of global state for a TraceViz application, such as global
 * Values, the DataQuery responsible for backend communication, and error
 * handling and reporting.  Each app must have exactly one AppCore.
 *
 * Application code can access the AppCore, but since there may be a span of
 * time at application startup during which the AppCore exists but is not yet
 * complete, AppCore users must wait until it is published.  When application
 * code is ready for full AppCore access (for instance, when a UI component has
 * fully loaded), it may invoke `onPublish()`, providing a callback which will
 * be invoked when the AppCore has been published.
 *
 * The AppCore should be published exactly once, when its state is completely
 * known and ready to serve queries (for instance, when a directive defining
 * it has been fully loaded).
 */
export declare class AppCore {
    readonly configurationErrors: ReplaySubject<ConfigurationError>;
    readonly globalState: GlobalState;
    readonly anyDataQueryLoading: BehaviorSubject<boolean>;
    private published;
    private readonly pendingCallbacks;
    private readonly dataQueriesByID;
    addDataQuery(id?: string): DataQuery;
    getDataQuery(id?: string): DataQuery;
    /** Resets the receiver.  Only for use in tests. */
    reset(): void;
    /** To be invoked once, when the AppCore is populated. */
    publish(): void;
    /**
     * To be invoked by AppCore users.  The provided callback is guaranteed
     * to be invoked after the AppCore is published.
     */
    onPublish(callback: (appCore: AppCore) => void): void;
    /**
     * To be invoked on any errors generated or caught within application code.
     * Configuration errors are broadcast to anything that subscribed to
     * `configurationErrors`.
     *
     * `err()` may be invoked before the AppCore is published.
     */
    err(error: unknown): void;
}
