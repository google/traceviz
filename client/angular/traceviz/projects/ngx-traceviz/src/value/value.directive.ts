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

import { AppCoreService } from '../app_core_service/app_core_service';

import { AfterContentInit, ContentChild, ContentChildren, Directive, ElementRef, forwardRef, Input, QueryList } from '@angular/core';
import { ConfigurationError, Severity } from 'traceviz-client-core';
import { Timestamp } from 'traceviz-client-core';
import { DoubleValue, EmptyValue, IntegerListValue, IntegerSetValue, IntegerValue, StringListValue, StringSetValue, StringValue, TimestampValue, Value } from 'traceviz-client-core';
import { ValueRef } from 'traceviz-client-core';
import { ValueMap } from 'traceviz-client-core';
import { AppCore } from 'traceviz-client-core';

const SOURCE = 'directives/value';

/** A base class for directives specifying Values. */
export abstract class ValueDirective implements ValueRef {
  abstract get(
    localState: ValueMap | undefined): Value | undefined;
  abstract label(): string;
}

/** An EmptyValue literal in a TraceViz template. */
@Directive({
  selector: 'empty',
  providers: [{
    provide: ValueDirective,
    useExisting: forwardRef(() => EmptyLiteralDirective)
  }],
})
export class EmptyLiteralDirective extends ValueDirective {
  constructor() {
    super();
  }

  get(unusedLocalState: ValueMap | undefined): Value | undefined {
    return new EmptyValue();
  }

  label(): string {
    return `literal empty Value`;
  }
}

/** A string literal in a TraceViz template. */
@Directive({
  selector: 'string',
  providers: [{
    provide: ValueDirective,
    useExisting: forwardRef(() => StringLiteralDirective)
  }],
})
export class StringLiteralDirective extends ValueDirective implements
  AfterContentInit {
  val: string = '';

  constructor(readonly elementRef?: ElementRef) {
    super();
  }

  ngAfterContentInit() {
    if (this.elementRef != null) {
      this.val = this.elementRef.nativeElement.innerText;
      // Clear out the innerText so that it doesn't get rendered.
      this.elementRef.nativeElement.innerText = '';
    }
  }

  get(unusedLocalState: ValueMap | undefined): Value | undefined {
    return new StringValue(this.val);
  }

  label(): string {
    return `literal '${this.val.toString()}'`;
  }
}

/** An ordered list of string literals in a TraceViz template. */
@Directive({
  selector: 'string-list',
  providers: [{
    provide: ValueDirective,
    useExisting: forwardRef(() => StringLiteralListDirective)
  }],
})
export class StringLiteralListDirective extends ValueDirective implements
  AfterContentInit {
  val: string[] = [];
  @ContentChildren(StringLiteralDirective)
  strs = new QueryList<StringLiteralDirective>();

  ngAfterContentInit() {
    for (const str of this.strs) {
      this.val.push(str.val);
    }
  }

  get(unusedLocalState: ValueMap | undefined): Value | undefined {
    return new StringListValue(this.val);
  }

  label(): string {
    return `literal ${this.val.toString()}`;
  }
}

/** An unordered set of unique string literals in a TraceViz template. */
@Directive({
  selector: 'string-set',
  providers: [{
    provide: ValueDirective,
    useExisting: forwardRef(() => StringLiteralSetDirective)
  }],
})
export class StringLiteralSetDirective extends ValueDirective implements
  AfterContentInit {
  val = new Set<string>([]);

  @ContentChildren(StringLiteralDirective)
  strs = new QueryList<StringLiteralDirective>();

  ngAfterContentInit() {
    for (const str of this.strs) {
      this.val.add(str.val);
    }
  }

  get(unusedLocalState: ValueMap | undefined): Value | undefined {
    return new StringSetValue(this.val);
  }

  label(): string {
    return `literal ${this.val.toString()}`;
  }
}

/** An integer literal in a TraceViz template. */
@Directive({
  selector: 'int',
  providers: [{
    provide: ValueDirective,
    useExisting: forwardRef(() => IntLiteralDirective)
  }],
})
export class IntLiteralDirective extends ValueDirective implements
  AfterContentInit {
  val: number = NaN;

  constructor(readonly elementRef?: ElementRef) {
    super();
  }

  ngAfterContentInit() {
    if (this.elementRef != null) {
      this.val = Math.floor(Number(this.elementRef.nativeElement.innerText));
      this.elementRef.nativeElement.innerText = '';
    }
  }

  get(unusedLocalState: ValueMap | undefined): Value | undefined {
    return new IntegerValue(this.val);
  }

  label(): string {
    return `literal ${this.val.toString()}`;
  }
}

/** An ordered list of string literals in a TraceViz template. */
@Directive({
  selector: 'int-list',
  providers: [{
    provide: ValueDirective,
    useExisting: forwardRef(() => IntLiteralListDirective)
  }],
})
export class IntLiteralListDirective extends ValueDirective implements
  AfterContentInit {
  val: number[] = [];
  @ContentChildren(IntLiteralDirective)
  ints = new QueryList<IntLiteralDirective>();

  ngAfterContentInit() {
    for (const int of this.ints) {
      this.val.push(int.val);
    }
  }

  get(unusedLocalState: ValueMap | undefined): Value | undefined {
    return new IntegerListValue(this.val);
  }

  label(): string {
    return `literal ${this.val.toString()}`;
  }
}

/** An unordered set of unique string literals in a TraceViz template. */
@Directive({
  selector: 'int-set',
  providers: [{
    provide: ValueDirective,
    useExisting: forwardRef(() => IntLiteralSetDirective)
  }],
})
export class IntLiteralSetDirective extends ValueDirective implements
  AfterContentInit {
  val = new Set<number>([]);

  @ContentChildren(IntLiteralDirective)
  ints = new QueryList<IntLiteralDirective>();

  ngAfterContentInit() {
    for (const int of this.ints) {
      this.val.add(int.val);
    }
  }

  get(unusedLocalState: ValueMap | undefined): Value | undefined {
    return new IntegerSetValue(this.val);
  }

  label(): string {
    return `literal ${this.val.toString()}`;
  }
}

/** A double literal in a TraceViz template. */
@Directive({
  selector: 'dbl',
  providers: [{
    provide: ValueDirective,
    useExisting: forwardRef(() => DblLiteralDirective)
  }],
})
export class DblLiteralDirective extends ValueDirective implements
  AfterContentInit {
  val: number = NaN;

  constructor(readonly elementRef?: ElementRef) {
    super();
  }

  ngAfterContentInit() {
    if (this.elementRef != null) {
      this.val = Number(this.elementRef.nativeElement.innerText);
      this.elementRef.nativeElement.innerText = '';
    }
  }

  get(unusedLocalState: ValueMap | undefined): Value | undefined {
    return new DoubleValue(this.val);
  }

  label(): string {
    return `literal ${this.val.toString()}`;
  }
}

/** A timestamp, initially the zero time. */
@Directive({
  selector: 'timestamp',
  providers: [
    { provide: ValueDirective, useExisting: forwardRef(() => TimestampDirective) }
  ],
})
export class TimestampDirective extends ValueDirective {
  val = new Timestamp(0, 0);

  get(unusedLocalState: ValueMap | undefined): Value | undefined {
    return new TimestampValue(this.val);
  }

  label(): string {
    return `literal ${this.val.toString()}`;
  }
}

/** A reference to a Value in the calling component. */
@Directive({
  selector: 'local-ref',
  providers: [
    { provide: ValueDirective, useExisting: forwardRef(() => LocalRefDirective) }
  ],
})
export class LocalRefDirective extends ValueDirective {
  @Input() key: string = '';

  get(localState: ValueMap | undefined): Value | undefined {
    if (localState == null) {
      throw new ConfigurationError(
        `Can't look up local reference with no local ValueMap`)
        .at(Severity.FATAL)
        .from(SOURCE);
    }
    if (!localState.has(this.key)) {
      return undefined;
    }
    return localState.get(this.key);
  }

  label(): string {
    return `local value '${this.key}'`;
  }
}

/** A reference, by key, to a global Value. */
@Directive({
  selector: 'global-ref',
  providers: [
    { provide: ValueDirective, useExisting: forwardRef(() => GlobalRefDirective) }
  ],
})
export class GlobalRefDirective extends ValueDirective implements AfterContentInit {
  @Input() key: string = '';
  private val: Value | undefined;

  constructor(private readonly appCoreService: AppCoreService) {
    super();
  }

  ngAfterContentInit() {
    const key = this.key;
    this.appCoreService.appCore.onPublish(
      (appCore: AppCore) => {
        this.val = appCore.globalState.get(this.key);
      }
    );
  }

  get(unusedLocalState: ValueMap | undefined): Value | undefined {
    if (this.val == null) {
      throw new ConfigurationError(`No global value has the key '${this.key}'`)
        .at(Severity.FATAL)
        .from(SOURCE);
    }
    return this.val;
  }

  label(): string {
    if (this.val == null) {
      return `global undefined value '${this.key}'`;
    }
    return `global ${this.val.typeName()} '${this.key}'`;
  }
}

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
