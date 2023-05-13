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
import { ValueDirective } from './value.directive';
import {
  ConfigurationError,
  KeyedValueRef,
  Severity,
  Value,
  ValueMap,
  ValueRefMap
} from 'traceviz-client-core';

const SOURCE = 'value_map.directives';

/**
 * A wrapper for a value specifier -- a literal, LocalRef, or GlobalRef -- that
 * produces a Value representing the wrapped item: a new Value if wrapping a
 * literal, or the referenced Value for local and global refs.
 * It may specify a string key, for example for building a value map.
 */
@Directive({selector: 'value'})
export class ValueWrapperDirective implements KeyedValueRef {
  // If specified, a key to associate with this Value.
  @Input() key: string = '';

  @ContentChild(ValueDirective) val: ValueDirective | undefined;

  private checkVal() {
    if (!this.val) {
      throw new ConfigurationError(
        `<value> does not define a valid ValueDirective for key '${this.key}'`)
        .at(Severity.FATAL)
        .from(SOURCE);
    }
  }

  label(): string {
    this.checkVal();
    return this.val!.label();
  }

  get(localState: ValueMap | undefined): Value | undefined {
    this.checkVal();
    return this.val!.get(localState);
  }
}

/** A mapping from string keys to Values. */
@Directive({selector: 'value-map'})
export class ValueMapDirective {
  @ContentChildren(ValueWrapperDirective)
  valueWrappers = new QueryList<ValueWrapperDirective>();

  getValueRefMap(): ValueRefMap {
    return new ValueRefMap(Array.from(this.valueWrappers));
  }

  getValueMap(localState?: ValueMap | undefined): ValueMap {
    const vm = this.getValueRefMap().get(localState);
    if (vm === undefined) {
      return new ValueMap();
    }
    return vm;
  }
}
