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
 * @fileoverview Provides directives for specifying literal and reference values
 * in TraceViz templates.
 */

import { ContentChild, ContentChildren, Directive, Input, QueryList } from '@angular/core';
import { ValueDirective } from './literal_value.directive';
import { ConfigurationError, Severity, Value } from 'traceviz-client-core';
import { ValueMap } from 'traceviz-client-core';

const SOURCE = 'value_map.directives';

/**
 * A wrapper for a value specifier -- a literal, LocalRef, or GlobalRef -- that
 * produces a Value representing the wrapped item: a new Value if wrapping a
 * literal, or the referenced Value for local and global refs.
 * It may specify a string key, for example for building a value map.
 */
@Directive({ selector: 'value' })
export class ValueWrapperDirective {
    // If specified, a key to associate with this Value.
    @Input() key: string | undefined;

    @ContentChild(ValueDirective) val: ValueDirective | undefined;

    get(localState: ValueMap | undefined): Value | undefined {
        if (!this.val) {
            throw new ConfigurationError(
                `<value> does not define a valid ValueDirective for key '${this.key}'`)
                .at(Severity.FATAL)
                .from(SOURCE);
        }
        return this.val.get(localState);
    }

    label(): string {
        if (this.val) {
            return this.val.label();
        }
        return 'unspecified value';
    }
}

/** A mapping from string keys to Values. */
@Directive({ selector: 'value-map' })
export class ValueMapDirective {
    @ContentChildren(ValueWrapperDirective)
    valueWrappers = new QueryList<ValueWrapperDirective>();

    getValueMap(localState?: ValueMap):
        ValueMap {
        const ret = new Map<string, Value>();
        for (const valueWrapper of this.valueWrappers) {
            if (valueWrapper.key == null) {
                throw new ConfigurationError(`values within a value-map must have keys`)
                    .at(Severity.FATAL)
                    .from(SOURCE);
            }
            if (ret.has(valueWrapper.key)) {
                throw new ConfigurationError(
                    `values within a value-map must have unique keys`)
                    .at(Severity.FATAL)
                    .from(SOURCE);
            }
            const val = valueWrapper.get(localState);
            if (val != null) {
                ret.set(valueWrapper.key, val);
            }
        }
        return new ValueMap(ret);
    }
}
