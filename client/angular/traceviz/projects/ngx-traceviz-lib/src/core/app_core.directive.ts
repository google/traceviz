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
 * @fileoverview Directives used to define the app core.
 */

import { ContentChild, Directive, AfterContentInit } from '@angular/core';
import { ConfigurationError, Severity } from 'traceviz-client-core';
import { AppCoreService } from '../app_core_service/app_core.service';
import { GlobalStateDirective } from './global_state.directive';

const SOURCE = 'app_core.directive';

@Directive({ selector: 'app-core' })
export class AppCoreDirective implements AfterContentInit {
    @ContentChild(GlobalStateDirective) globalState: GlobalStateDirective | undefined;

    constructor(readonly appCoreService: AppCoreService) { }

    ngAfterContentInit() {
        if (this.globalState === undefined) {
            this.appCoreService.appCore.err(new ConfigurationError(`app-core is missing required 'global-state' directive`)
                .from(SOURCE)
                .at(Severity.ERROR));
            return;
        }
        this.globalState.populate(this.appCoreService.appCore);
        this.appCoreService.appCore.publish();
    }
}