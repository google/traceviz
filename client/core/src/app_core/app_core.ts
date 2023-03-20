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

import { ConfigurationError } from '../errors/errors.js';
import { GlobalState } from '../global_state/global_state.js';
import { ReplaySubject } from 'rxjs';

export class AppCore {
    readonly configurationErrors = new ReplaySubject<ConfigurationError>(1);
    readonly globalState = new GlobalState();

    private published = false;
    private readonly pendingCallbacks: Array<(appCore: AppCore) => void> = [];

    /** To be invoked once, when the AppCore is populated. */
    publish() {
        if (this.published) {
            throw new Error(`An AppCore may only be published once.`);
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

    err(error: unknown) {
        if (error instanceof ConfigurationError) {
            this.configurationErrors.next(error);
        } else {
            throw error;
        }
    }
}