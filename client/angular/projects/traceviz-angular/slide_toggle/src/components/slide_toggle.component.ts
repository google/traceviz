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
 * @fileoverview A slide toggle knob.
 */

import {AfterContentInit, Component, ContentChild, Input, OnDestroy} from '@angular/core';
import {AppCoreService, ValueMapDirective} from '@traceviz/angular/core';
import {ConfigurationError, EmptyValue, Severity, Value} from '@traceviz/client-core';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

const SOURCE = 'slide_toggle';

const UNCHECKED_VALUE_KEY = 'unchecked_value';
const CHECKED_VALUE_KEY = 'checked_value';
const OUTPUT_VALUE_KEY = 'output_value';

/**
 * A slide-toggle component.  Expects a <value-map> with three entries:
 *  * 'output_value': the value to update when toggled.
 *  * 'unchecked_value': the value to set 'output_value' to when unchecked.
 *  * 'checked_value': the value to set 'output_value' to when checked.
 *
 * All three entries must be present, and must all be of compatible types;
 * failure yields a ConfigurationError.
 *
 * The slide-toggle also monitors 'output_value' and sets its toggle state
 * accordingly.  If 'output_value' is set to a value that is neither of
 * 'unchecked_value', a ConfigurationError is yielded.
 */
@Component({
  standalone: false,
  selector: 'slide-toggle',
  template: `
    <mat-slide-toggle
        [checked]="isChecked"
        (toggleChange)="toggle()"
        [disabled]="disabled"
        [matTooltip]="tooltip"
        matTooltipPosition="above">
      <ng-content></ng-content>
    </mat-slide-toggle>
  `,
})
export class SlideToggle implements AfterContentInit, OnDestroy {
  @Input() disabled = false;
  @Input() tooltip = '';
  @ContentChild(ValueMapDirective) valueMap: ValueMapDirective|undefined;

  isChecked = true;

  private uncheckedValue: Value = new EmptyValue();
  private checkedValue: Value = new EmptyValue();
  private outputValue: Value = new EmptyValue();
  private readonly unsubscribe = new Subject<void>();

  constructor(private readonly appCoreService: AppCoreService) {}

  ngAfterContentInit() {
    this.appCoreService.appCore.onPublish((appCore) => {
      if (this.valueMap == null) {
        appCore.err(
            new ConfigurationError(
                'slide-toggle must include a <value-map> defining unchecked value, checked value, and output value')
                .from(SOURCE)
                .at(Severity.ERROR));
        return;
      }
      const vm = this.valueMap.getValueMap();
      if (!vm.has(UNCHECKED_VALUE_KEY) || !vm.has(CHECKED_VALUE_KEY) ||
          !vm.has(OUTPUT_VALUE_KEY)) {
        appCore.err(
            new ConfigurationError(
                'slide-toggle must include a <value-map> defining unchecked value, checked value, and output value')
                .from(SOURCE)
                .at(Severity.ERROR));
      }
      this.uncheckedValue = vm.get(UNCHECKED_VALUE_KEY);
      this.checkedValue = vm.get(CHECKED_VALUE_KEY);
      this.outputValue = vm.get(OUTPUT_VALUE_KEY);
      if (this.uncheckedValue.typeName() !== this.checkedValue.typeName() ||
          this.uncheckedValue.typeName() !== this.outputValue.typeName()) {
        appCore.err(
            new ConfigurationError(
                'slide-toggle unchecked value, checked value, and output value must all have the same type')
                .from(SOURCE)
                .at(Severity.ERROR));
      }

      // Monitor the output value.  If it changes, adjust the state of the
      // slide toggle accordingly.
      this.outputValue.pipe(takeUntil(this.unsubscribe)).subscribe(() => {
        if (this.outputValue.compare(this.checkedValue) === 0) {
          this.isChecked = true;
        } else {
          this.isChecked = false;
        }
      });
    });
  }

  toggle() {
    this.isChecked = !this.isChecked;
    try {
      if (this.isChecked) {
        this.outputValue.fold(this.checkedValue, false, true);
      } else {
        this.outputValue.fold(this.uncheckedValue, false, true);
      }
    } catch (err: unknown) {
      this.appCoreService.appCore.err(err);
    }
  }

  ngOnDestroy() {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }
}
