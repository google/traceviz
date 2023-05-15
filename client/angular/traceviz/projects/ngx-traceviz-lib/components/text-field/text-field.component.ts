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

import { AfterContentInit, Component, ContentChild, Input, OnDestroy } from "@angular/core";
import { AppCoreService } from '../../src/app_core_service/app_core.service';
import { InteractionsDirective } from '../../src/core/interactions.directive';
import { Subject, pipe } from "rxjs";
import { debounceTime, distinctUntilChanged, takeUntil } from "rxjs/operators";
import { ConfigurationError, Severity, StringValue, Value, ValueMap } from "traceviz-client-core";

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

export const enum ActionType {
    /** Invoked when the text field input is updated. */
    UPDATE = 'update',
}

export const enum WatchType {
    UPDATE_CONTENTS = 'update_contents',
}

export const enum Target {
    /** The contents of the text field. */
    TEXT_FIELD = 'text_field',
}

export const enum Key {
    CONTENTS = 'contents',
}

/**
 * TextField is a text entry box that sets a specified output Value to the
 * contents of the box.  The output must be a String value.
 */
@Component({
    selector: 'text-field',
    template: `
    <mat-form-field appearance="outline" [floatLabel]="placeholder.length ? 'always': 'auto'">
        <mat-label>{{label}}</mat-label>
        <input matInput type="text" [ngModel]="contents.val" [placeholder]="placeholder" (keyup.enter)="onEnter()" (ngModelChange)="onText($event)">
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
export class TextFieldComponent implements AfterContentInit, OnDestroy {
    @Input() debounceMs = 250;
    @Input() label = '';
    @Input() placeholder = '';
    @Input() updateOnEnter = false;
    @ContentChild(InteractionsDirective) interactionsDirective?: InteractionsDirective;

    contents = new StringValue('');
    model = new Subject<string>();

    private readonly unsubscribe = new Subject<void>();

    constructor(private readonly appCoreService: AppCoreService) {
    }

    ngAfterContentInit(): void {
        const ops = (this.debounceMs > 0) ? pipe(
            debounceTime(250),
            distinctUntilChanged(),
        ) : pipe(
            distinctUntilChanged(),
        );
        this.model.pipe(ops)
            .subscribe((value) => {
                if (value !== undefined) {
                    this.contents.val = value as string;
                    this.update(value as string);
                }
            });

        const interactions = this.interactionsDirective?.get();
        interactions?.checkForSupportedWatches([WatchType.UPDATE_CONTENTS]);
        interactions?.checkForSupportedActions([[Target.TEXT_FIELD, ActionType.UPDATE]]);

        this.appCoreService.appCore.onPublish((appCore) => {
            interactions?.watch(WatchType.UPDATE_CONTENTS,
                new ValueMap(new Map([[Key.CONTENTS, this.contents]])),
                (vm: ValueMap) => {
                    const contentsVal = vm.get(Key.CONTENTS);
                    if (contentsVal instanceof StringValue) {
                        this.contents.val = contentsVal.val;
                    } else {
                        appCore.err(
                            new ConfigurationError(`text - field only supports string contents`)
                                .from(SOURCE)
                                .at(Severity.ERROR));
                    }
                }).pipe(
                    takeUntil(this.unsubscribe),
                ).subscribe((err) => {
                    appCore.err(err);
                });
        });
    }

    // Invoked when the text box contents change.
    onText(text: string) {
        if (!this.updateOnEnter) {
            this.model.next(text);
        } else {
            this.contents.val = text;
        }
    }

    // Invoked when 'enter' is pressed within the text box.
    onEnter() {
        if (this.updateOnEnter) {
            this.model.next(this.contents.val);
        }
    }

    private update(value: string) {
        this.interactionsDirective?.get().update(Target.TEXT_FIELD, ActionType.UPDATE, new ValueMap(new Map<string, Value>([
            [Key.CONTENTS, this.contents],
        ])));
    }

    ngOnDestroy(): void {
        this.unsubscribe.next();
        this.unsubscribe.complete();
    }
}

