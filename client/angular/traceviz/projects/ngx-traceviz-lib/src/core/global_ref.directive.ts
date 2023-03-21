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
 * @fileoverview A global reference directive.
 */

import { AppCoreService } from '../app_core_service/app_core.service';
import { AppCore } from 'traceviz-client-core';
import { AfterContentInit, Directive, Input, forwardRef } from '@angular/core';
import { ValueDirective } from './value.directive';
import { Value, ValueMap } from 'traceviz-client-core';
import { ConfigurationError, Severity } from 'traceviz-client-core';

const SOURCE = 'global_ref.directives';

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

