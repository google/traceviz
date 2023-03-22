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


import { AfterContentInit, ContentChildren, Directive, ElementRef, forwardRef, Input, QueryList } from '@angular/core';
import { Duration, DurationValue } from 'traceviz-client-core';
import { Timestamp } from 'traceviz-client-core';
import { DoubleValue, EmptyValue, IntegerListValue, IntegerSetValue, IntegerValue, StringListValue, StringSetValue, StringValue, TimestampValue, Value } from 'traceviz-client-core';
import { ValueMap } from 'traceviz-client-core';
import { ValueDirective } from './value.directive';

const SOURCE = 'value.directives';

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

  get(unusedLocalState?: ValueMap | undefined): Value | undefined {
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

  get(unusedLocalState?: ValueMap | undefined): Value | undefined {
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

  get(unusedLocalState?: ValueMap | undefined): Value | undefined {
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

  get(unusedLocalState?: ValueMap | undefined): Value | undefined {
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

  get(unusedLocalState?: ValueMap | undefined): Value | undefined {
    return new IntegerValue(this.val);
  }

  label(): string {
    return `literal ${this.val.toString()}`;
  }
}

/** An ordered list of integer literals in a TraceViz template. */
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

  get(unusedLocalState?: ValueMap | undefined): Value | undefined {
    return new IntegerListValue(this.val);
  }

  label(): string {
    return `literal ${this.val.toString()}`;
  }
}

/** An unordered set of unique integer literals in a TraceViz template. */
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

  get(unusedLocalState?: ValueMap | undefined): Value | undefined {
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

  get(unusedLocalState?: ValueMap | undefined): Value | undefined {
    return new DoubleValue(this.val);
  }

  label(): string {
    return `literal ${this.val.toString()}`;
  }
}

/** A duration, in nanos */
@Directive({
  selector: 'dur',
  providers: [
    { provide: ValueDirective, useExisting: forwardRef(() => DurationLiteralDirective) }
  ],
})
export class DurationLiteralDirective extends ValueDirective implements AfterContentInit {
  val = new Duration(0);

  constructor(readonly elementRef?: ElementRef) {
    super();
  }

  ngAfterContentInit() {
    if (this.elementRef != null) {
      this.val = new Duration(Number(this.elementRef.nativeElement.innerText));
      this.elementRef.nativeElement.innerText = '';
    }
  }

  get(unusedLocalState?: ValueMap | undefined): Value | undefined {
    return new DurationValue(this.val);
  }

  label(): string {
    return `literal ${this.val.toString()}`;
  }
}

/** A timestamp, initially the zero time. */
@Directive({
  selector: 'timestamp',
  providers: [
    { provide: ValueDirective, useExisting: forwardRef(() => TimestampLiteralDirective) }
  ],
})
export class TimestampLiteralDirective extends ValueDirective {
  val = new Timestamp(0, 0);

  get(unusedLocalState?: ValueMap | undefined): Value | undefined {
    return new TimestampValue(this.val);
  }

  label(): string {
    return `literal ${this.val.toString()}`;
  }
}
