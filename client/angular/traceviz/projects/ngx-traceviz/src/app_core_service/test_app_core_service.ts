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

import { AppCoreService } from "../app_core/app_core.service";

/**
 * @fileoverview Utilities for tests that require an AppCoreService..
 */

/** Returns a pre-published AppCoreService. */
export function testAppCoreService(): AppCoreService {
        const ret = new AppCoreService();
        ret.appCore.publish();
        return ret;
}