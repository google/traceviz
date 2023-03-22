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

/**
 * @fileoverview The global state of a TraceViz application.
 */

import { DataQuery } from '../data_query/data_query.js';
import { ConfigurationError, Severity } from '../errors/errors.js';
import { GlobalState } from '../global_state/global_state.js';
import { ReplaySubject } from 'rxjs';

const SOURCE = 'app_core';

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
export class AppCore {
    // An Observable which may be subscribed to receive the most recent
    // ConfigurationError, for example by error-reporting components.  This
    // may be subscribed before the AppCore is published.
    readonly configurationErrors = new ReplaySubject<ConfigurationError>(1);
    // The shared DataQuery component, responsible for issuing all backend
    // DataSeries requests and handling their responses.  This should not be
    // examined until the AppCore is published.
    readonly dataQuery = new DataQuery((err) => this.err(err));
    // The shared global state; a key-value mapping of Values available
    // throughout the application.  This should not be examined until the
    // AppCore is published.
    readonly globalState = new GlobalState();

    private published = false;
    private readonly pendingCallbacks: Array<(appCore: AppCore) => void> = [];

    /** To be invoked once, when the AppCore is populated. */
    publish() {
        if (this.published) {
            const err = new ConfigurationError(`Only one AppCore may be defined, and it may only be published once.`)
                .from(SOURCE)
                .at(Severity.FATAL);
            this.err(err);
            throw err;
        }
        this.published = true;
        this.pendingCallbacks.forEach((cb) => cb(this));
        this.pendingCallbacks.length = 0;
    }

    /**
     * To be invoked by AppCore users.  The provided callback is guaranteed
     * to be invoked after the AppCore is published.
     */
    onPublish(callback: (appCore: AppCore) => void) {
        if (this.published) {
            callback(this);
        } else {
            this.pendingCallbacks.push(callback);
        }
    }

    /**
     * To be invoked on any errors generated or caught within application code.
     * Configuration errors are broadcast to anything that subscribed to
     * `configurationErrors`.
     * 
     * `err()` may be invoked before the AppCore is published.
     */
    err(error: unknown) {
        if (error instanceof ConfigurationError) {
            this.configurationErrors.next(error);
        } else {
            throw error;
        }
    }
}