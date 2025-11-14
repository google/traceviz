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

import {AfterContentInit, Component, ContentChild, Input, OnDestroy} from '@angular/core';
import {Subject} from 'rxjs';
import {debounceTime, distinctUntilChanged} from 'rxjs/operators';
import {AppCoreService, InteractionsDirective} from 'traceviz-angular-core';
import {ConfigurationError, Severity, StringValue, Value, ValueMap} from 'traceviz-client-core';

/**
 * @fileoverview A text area input knob.
 *
 * TextArea populates its default contents with the 'update_contents' watch
 * type, which expects a string Value with the key 'contents'.
 *
 * User input results in an 'update' action on the 'text_area' target, with the
 * selected value in the `contents` target key.
 */

/**
 * SOURCE is the 'source' provided to ConfigurationErrors generated from this
 * file.
 */
const SOURCE = 'text-area';

/** The set of supported action types. */
export enum ActionType {
  /** Invoked when the text area input is updated. */
  UPDATE = 'update',
}

const UPDATE_CONTENTS = 'update_contents';

/** The set of supported action and reaction targets. */
export enum InteractionTarget {
  /** The contents of the text area. */
  TEXT_AREA = 'text_area',
}

/** The set of keys for watch ValueMaps. */
export enum WatchKey {
  CONTENTS = 'contents',
}

/** The set of ValueMap keys for interaction items. */
export enum InteractionItemKey {
  CONTENTS = 'contents',
}

/**
 * Text is an input box that sets a specified output value to the text stored
 * in the box. The output must be a String Value.
 */
@Component({
  standalone: false,
  selector: 'text-area',
  template: `
  <mat-form-field
      appearance="outline"
      [floatLabel]="placeholder.length ? 'always': 'auto'"
      subscriptSizing="dynamic">
    <mat-label *ngIf="label.length">{{label}}</mat-label>
    <textarea matInput type="text"
        [rows]="rows"
        [disabled]="disabled"
        (focusout)="onFocusOut()"
        (keyup.enter)="onEnter()"
        [ngModel]="contents.val"
        (ngModelChange)="onText($event)"
        [placeholder]="placeholder">
    </textarea>
  </mat-form-field>
  `,
  styles: [`
    mat-form-field {
      width: 100%;
    }
    :host ::ng-deep .mat-form-field-infix {
      width: auto !important;
    }
  `]
})
export class TextAreaComponent implements AfterContentInit, OnDestroy {
  /** The label field specifies a label for the text area. */
  @Input() label = '';

  /**
   * The placeholder attribute specifies text that is displayed in the text area
   * before the user enters a value. This text typically describes the expected
   * value of a text area.
   */
  @Input() placeholder = '';

  /**
   * The rows attribute specifies the visible height of a text area, in lines.
   */
  @Input() rows = '3';

  /**
   * The disabled attribute specifies whether or not the text area is disabled.
   */
  @Input() disabled = false;

  /**
   * The updateOnEnter attribute determines if this text area should trigger
   * the update action when the Enter key is pressed.
   */
  @Input() updateOnEnter = false;

  /**
   * The updateOnFocusOut attribute determines if this text area should trigger
   * the update action when focus leaves the text area.
   */
  @Input() updateOnFocusOut = false;

  @ContentChild(InteractionsDirective)
  interactionsDirective?: InteractionsDirective;

  contents = new StringValue('');
  model = new Subject<string>();

  private readonly unsubscribe = new Subject<void>();

  constructor(private readonly appCoreService: AppCoreService) {
    this.model.pipe(debounceTime(250), distinctUntilChanged())
        .subscribe((value) => {
          this.contents.val = value;
          this.update(value);
        });
  }

  ngAfterContentInit() {
    this.appCoreService.appCore.onPublish(() => {
      const watchActions = new Map([
        [
          UPDATE_CONTENTS,
          (vm: ValueMap) => {
            const contentsVal = vm.get(WatchKey.CONTENTS);
            if (contentsVal instanceof StringValue) {
              this.contents.val = contentsVal.val;
            } else {
              this.appCoreService.appCore.err(
                  new ConfigurationError(
                      `text-area only supports string contents`)
                      .from(SOURCE)
                      .at(Severity.ERROR));
            }
          }
        ],
      ]);
      this.interactionsDirective?.get()
          .watchAll(watchActions, this.unsubscribe)
          .subscribe((err) => {
            this.appCoreService.appCore.err(err);
          });
    });
  }

  onText(text: string) {
    if (!this.updateOnEnter) {
      this.model.next(text);
    } else {
      this.contents.val = text;
    }
  }

  onEnter() {
    if (this.updateOnEnter) {
      this.model.next(this.contents.val);
    }
  }

  onFocusOut() {
    if (this.updateOnFocusOut) {
      this.model.next(this.contents.val);
    }
  }

  private update(value: string) {
    this.interactionsDirective?.get().update(
        InteractionTarget.TEXT_AREA, ActionType.UPDATE,
        new ValueMap(new Map<string, Value>([
          [InteractionItemKey.CONTENTS, this.contents],
        ])));
  }

  ngOnDestroy() {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }
}
