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
 * @fileoverview Interfaces to be implemented by self-documenting TraceViz
 * entities.
 */
/** Supported types of documenters. */
export var DocumenterType;
(function (DocumenterType) {
    /** Documents an update in response to some user action. */
    DocumenterType[DocumenterType["UPDATE"] = 0] = "UPDATE";
    /** Documents a predicate controlling some reaction. */
    DocumenterType[DocumenterType["PREDICATE"] = 1] = "PREDICATE";
    /** Documents a watch on a set of Values. */
    DocumenterType[DocumenterType["WATCH"] = 2] = "WATCH";
    /** Documents some user action and its resulting updates. */
    DocumenterType[DocumenterType["ACTION"] = 3] = "ACTION";
    /** Documents some reaction and the predicates that control it. */
    DocumenterType[DocumenterType["REACTION"] = 4] = "REACTION";
    /** Documents a set of interactions: Watches, Actions, and Reactions. */
    DocumenterType[DocumenterType["INTERACTIONS"] = 5] = "INTERACTIONS";
    /** Documents a tool component. */
    DocumenterType[DocumenterType["COMPONENT"] = 6] = "COMPONENT";
    /** Documents a tool. */
    DocumenterType[DocumenterType["TOOL"] = 7] = "TOOL";
})(DocumenterType || (DocumenterType = {}));
//# sourceMappingURL=documentation.js.map