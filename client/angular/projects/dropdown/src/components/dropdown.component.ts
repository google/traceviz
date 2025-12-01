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
 * @fileoverview A dropdown select knob.
 *
 * Dropdown populates its set of options with the `update_options` watch type,
 * which expects a string list, string set, integer list, or integer set Value
 * with the key 'options', and populates its default selection with the
 * `update_selection` watch type, which expects a string or integer Value with
 * the key 'selection'.
 *
 * A user selection results in a 'select' action on the 'dropdown' target,
 * with the selected value in the `selected_item` target key.
 */

import {AfterContentInit, Component, ContentChild, ElementRef, Input, OnDestroy, ViewChild} from '@angular/core';
import type {MatFormFieldAppearance} from '@angular/material/form-field';
import {Subject} from 'rxjs';
import {AppCoreService, InteractionsDirective} from '@google/traceviz-angular-core';
import {ConfigurationError, IntegerListValue, IntegerSetValue, IntegerValue, Severity, StringListValue, StringSetValue, StringValue, Value, ValueMap} from '@google/traceviz-client-core';

/**
 * SOURCE is the 'source' provided to ConfigurationErrors generated from this
 * file.
 */
const SOURCE = 'dropdown';

/** The set of supported action types. */
export enum ActionType {
  /** Invoked when a dropdown element is selected. */
  SELECT = 'select',
}

const UPDATE_OPTIONS = 'update_options';
const UPDATE_SELECTION = 'update_selection';

/** The set of keys for watch ValueMaps. */
export enum WatchKey {
  OPTIONS = 'options',
  SELECTION = 'selection',
}

/** The set of supported action and reaction targets. */
export enum InteractionTarget {
  /** The contents of the dropdown. */
  DROPDOWN = 'dropdown',
}

/** The set of ValueMap keys for interaction items. */
export enum InteractionItemKey {
  SELECTED_ITEM = 'selected_item',
}

/**
 * Dropdown is a selection dropdown setting a specified output Value from a
 * specified set of options.  Dropdown options must be repeated Values --
 * StringSet, StringList, IntegerSet, or IntegerList -- and output must be a
 * compatible scalar Value -- String or Integer.
 */
@Component({
  standalone: false,
  selector: 'dropdown',
  templateUrl: 'dropdown.component.html',
  styleUrls: ['dropdown.component.css'],
})
export class Dropdown implements AfterContentInit, OnDestroy {
  @Input() label = '';
  @Input() appearance: MatFormFieldAppearance = 'fill';
  @Input() disabled = false;
  @Input() tooltip = '';
  @ContentChild(InteractionsDirective)
  interactionsDirective?: InteractionsDirective;
  @ViewChild('container', {static: true}) container!: ElementRef;

  options: StringListValue|StringSetValue|IntegerListValue|IntegerSetValue|
      undefined;

  optionValues: Array<string|number> = [];
  selectedValue: string|number = '';

  private readonly unsubscribe = new Subject<void>();

  constructor(private readonly appCoreService: AppCoreService) {}

  err(err: unknown) {
    this.appCoreService.appCore.err(err);
  }

  ngAfterContentInit() {
    this.appCoreService.appCore.onPublish(() => {
      const watchActions = new Map([
        [
          UPDATE_OPTIONS,
          (vm: ValueMap) => {
            const optVal = vm.get(WatchKey.OPTIONS);
            if (optVal instanceof StringListValue ||
                optVal instanceof IntegerListValue) {
              this.optionValues = optVal.val;
            } else if (
                optVal instanceof StringSetValue ||
                optVal instanceof IntegerSetValue) {
              this.optionValues = [...optVal.val];
            } else {
              this.err(
                  new ConfigurationError(
                      `dropdown only supports string list, string set, integer list, or integer set options`)
                      .from(SOURCE)
                      .at(Severity.ERROR));
            }
          }
        ],
        [
          UPDATE_SELECTION,
          (vm: ValueMap) => {
            const selectedVal = vm.get(WatchKey.SELECTION);
            if (selectedVal instanceof StringValue ||
                selectedVal instanceof IntegerValue) {
              if (this.selectedValue === '') {
                this.selectedValue = selectedVal.val;
                this.onSelectionChange();
              }
            } else {
              this.err(
                  new ConfigurationError(
                      `dropdown only supports string or integer selections`)
                      .from(SOURCE)
                      .at(Severity.ERROR));
            }
          }
        ],
      ]);
      this.interactionsDirective?.get()
          .watchAll(watchActions, this.unsubscribe)
          .subscribe((err) => {
            this.err(err);
          });
    });
  }

  onSelectionChange() {
    if (this.interactionsDirective) {
      const val = (typeof this.selectedValue === 'string') ?
          new StringValue(this.selectedValue) :
          new IntegerValue(this.selectedValue);
      try {
        this.interactionsDirective.get().update(
            InteractionTarget.DROPDOWN, ActionType.SELECT,
            new ValueMap(new Map<string, Value>([
              [InteractionItemKey.SELECTED_ITEM, val],
            ])));
      } catch (err: unknown) {
        this.err(err);
      }
    }
  }

  ngOnDestroy() {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }
}
