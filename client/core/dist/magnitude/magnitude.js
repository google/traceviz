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
var Keys;
(function (Keys) {
    Keys["SELF_MAGNITUDE"] = "self_magnitude";
})(Keys || (Keys = {}));
/**
 * The set of property keys expected by this package.
 */
export const properties = [Keys.SELF_MAGNITUDE];
/**
 * Returns the self-magnitude in the provided ValueMap, or 0 if there is none.
 */
export function getSelfMagnitude(vm) {
    if (!vm.has(Keys.SELF_MAGNITUDE)) {
        return 0;
    }
    return vm.expectNumber(Keys.SELF_MAGNITUDE);
}
//# sourceMappingURL=magnitude.js.map