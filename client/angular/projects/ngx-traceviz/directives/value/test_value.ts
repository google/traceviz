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
 * @fileoverview Test helpers for building value directives.
 */

import {GlobalStateInterface} from '../../../../global_state/global_state_interface';

import {GlobalRefDirective, IntLiteralDirective, IntLiteralListDirective, IntLiteralSetDirective, LocalRefDirective, StringLiteralDirective, StringLiteralListDirective, StringLiteralSetDirective, ValueDirective, ValueMapDirective, ValueWrapperDirective} from './value';
import {Value} from '../../../../value/value';
import {ValueMap} from '../../../../value_map';

/** Wraps a Value as a ValueDirective for testing. */
export class WrapValue extends ValueDirective {
  constructor(readonly value: Value) {
    super();
  }

  override getValue(
      unusedGlobalState: GlobalStateInterface|undefined,
      unusedLocalState: ValueMap|undefined): Value|undefined {
    return this.value;
  }
  override description(
      unusedGlobalState: GlobalStateInterface|undefined,
      unusedLocalState: ValueMap|undefined): string {
    return `wrapped ${this.value.typeName()}`;
  }
}

/** Returns a new StringLiteral value specifier. */
export function strLit(val: string): StringLiteralDirective {
  const lit = new StringLiteralDirective();
  lit.val = val;
  return lit;
}

/** Returns a new StringLiteralList value specifier. */
export function strsLit(...val: string[]): StringLiteralListDirective {
  const lit = new StringLiteralListDirective();
  lit.val = val;
  return lit;
}

/** Returns a new StringLiteralSet value specifier. */
export function strSetLit(...val: string[]): StringLiteralSetDirective {
  const lit = new StringLiteralSetDirective();
  lit.val = new Set(val);
  return lit;
}

/** Returns a new IntLiteral value specifier. */
export function intLit(val: number): IntLiteralDirective {
  const lit = new IntLiteralDirective();
  lit.val = Math.floor(val);
  return lit;
}

/** Returns a new IntLiteralList value specifier. */
export function intsLit(...val: number[]): IntLiteralListDirective {
  const lit = new IntLiteralListDirective();
  lit.val = val;
  return lit;
}

/** Returns a new IntegerLiteralSet value specifier. */
export function intSetLit(...val: number[]): IntLiteralSetDirective {
  const lit = new IntLiteralSetDirective();
  lit.val = new Set(val);
  return lit;
}

/** Returns a new LocalRef value specifier. */
export function localRef(key: string): LocalRefDirective {
  const ref = new LocalRefDirective();
  ref.key = key;
  return ref;
}

/** Returns a new GlobalRef value specifier. */
export function globalRef(key: string): GlobalRefDirective {
  const ref = new GlobalRefDirective();
  ref.key = key;
  return ref;
}

/** Returns a new valueMap directive. */
export function valueMapDirective(valueMap: ValueMap): ValueMapDirective {
  class FakeValueMapDirective extends ValueMapDirective {
    override getValueMap(): ValueMap {
      return valueMap;
    }
  }
  return new FakeValueMapDirective();
}

/**
 * Returns a new ValueWrapper with the provided key and Value specifiers. Throws
 * if one of the specifiers is unrecognized.
 */
export function keyedValue(
    key: string, specifier: ValueDirective): ValueWrapperDirective {
  const val = new ValueWrapperDirective();
  val.key = key;
  val.val = specifier;
  return val;
}

/**
 * Returns a new ValueWrapper with the provided Value specifiers and an empty
 * key.  Throws if one of the specifiers is unrecognized.
 */
export function value(specifier: ValueDirective): ValueWrapperDirective {
  return keyedValue('', specifier);
}
