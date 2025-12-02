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
import {AppCoreService, InteractionsDirective} from '@google/traceviz-angular-core';
import {ConfigurationError, Severity, StringValue, Value, ValueMap} from '@traceviz/client-core';
import {Subject} from 'rxjs';

/**
 * @fileoverview A text entry box supporting TraceViz interactions.
 *
 * It populates its default contents with the 'update_contents' watch type,
 * which expects a string Value with the key 'contents'.
 *
 * User input results in an 'update' action on the 'text_field' target, with
 * the selected value in the 'contents' target key.
 */

const SOURCE = 'text-field';

/** The set of supported action types. */
export enum ActionType {
  /** Invoked when the text field input is updated. */
  UPDATE = 'update',

  /**
     Invoked when there is a keyup event for the Enter key if updateOnEnter is
     not set.
   */
  ENTER_KEY_UP = 'enter_key_up',

  /** Invoked when the action button in clicked. */
  ACTION_BUTTON_CLICK = 'action_button_click',
}

const UPDATE_CONTENTS = 'update_contents';

/** The set of supported action and reaction targets. */
export enum InteractionTarget {
  /** The contents of the text field. */
  TEXT_FIELD = 'text_field',

  /** The button to trigger an action (e.g. clear) on the text field. */
  ACTION_BUTTON = 'action_button',
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
  selector: 'text-field',
  template: `
  <mat-form-field
        appearance="outline"
        [floatLabel]="placeholder.length ? 'always': 'auto'">
    <mat-label>{{label}}</mat-label>
    <input matInput type="text"
        [disabled]="disabled"
        (focusout)="onFocusOut()"
        (keyup.enter)="onEnterKeyUp()"
        [ngModel]="contents.val"
        (ngModelChange)="onText($event)"
        [placeholder]="placeholder">
    <mat-chip *ngFor="let chipText of chipsTexts; index as i" disabled matSuffix
        class="tv-text-field-chip"
        [ngStyle]="{'background-color': chipsColors[i]}">
      {{chipText}}
    </mat-chip>
    <button matSuffix mat-icon-button *ngIf="actionButtonIcon.length > 0"
        (click)="onActionButtonClick()"
        [disabled]="disabled">
      <mat-icon>{{actionButtonIcon}}</mat-icon>
    </button>
  </mat-form-field>
  `,
  styles: [`
    mat-form-field {
      width: 100%;
    }
    :host ::ng-deep .tv-text-field-chip {
      margin: 0 4px;
      opacity: 1 !important;
      vertical-align: super;
    }
    :host ::ng-deep .tv-text-field-chip:last-child {
      margin-right: 8px;
    }
    :host ::ng-deep .mat-form-field-infix {
      width: auto !important;
    }
  `]
})
export class TextField implements AfterContentInit, OnDestroy {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() chipsTexts: string[] = [];
  @Input() chipsColors: string[] = [];
  @Input() actionButtonIcon = '';

  @Input() disabled = false;

  @Input() updateOnEnter = false;
  @Input() updateOnFocusOut = false;

  @ContentChild(InteractionsDirective)
  interactionsDirective?: InteractionsDirective;

  contents = new StringValue('');
  model = new Subject<string>();

  private readonly unsubscribe = new Subject<void>();

  constructor(private readonly appCoreService: AppCoreService) {}

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
                      `text-field only supports string contents`)
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
    this.contents.val = text;
    if (!this.updateOnEnter) {
      this.update(this.contents.val);
    }
  }

  onEnterKeyUp() {
    if (this.updateOnEnter) {
      this.update(this.contents.val);
    } else {
      this.interactionsDirective?.get().update(
          InteractionTarget.TEXT_FIELD, ActionType.ENTER_KEY_UP,
          new ValueMap(new Map<string, Value>([
            [InteractionItemKey.CONTENTS, this.contents],
          ])));
    }
  }

  onFocusOut() {
    if (this.updateOnFocusOut) {
      this.update(this.contents.val);
    }
  }

  onActionButtonClick() {
    this.interactionsDirective?.get().update(
        InteractionTarget.ACTION_BUTTON, ActionType.ACTION_BUTTON_CLICK,
        new ValueMap(new Map<string, Value>([
          [InteractionItemKey.CONTENTS, this.contents],
        ])));
  }

  private update(value: string) {
    this.interactionsDirective?.get().update(
        InteractionTarget.TEXT_FIELD, ActionType.UPDATE,
        new ValueMap(new Map<string, Value>([
          [InteractionItemKey.CONTENTS, this.contents],
        ])));
  }

  ngOnDestroy() {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }
}
