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

import {AfterContentInit, ContentChild, Directive} from '@angular/core';
import {ConfigurationError, Severity} from 'traceviz-client-core';

import {AppCoreService} from '../services/app_core.service';

import {DataQueryDirectiveBase} from './data_query.directive';
import {GlobalStateDirective} from './global_state.directive';

const SOURCE = 'app_core.directive';

@Directive({selector: 'app-core'})
export class AppCoreDirective implements AfterContentInit {
  @ContentChild(GlobalStateDirective)
  globalState: GlobalStateDirective|undefined;
  @ContentChild(DataQueryDirectiveBase)
  dataQuery: DataQueryDirectiveBase|undefined;

  constructor(readonly appCoreService: AppCoreService) {}

  ngAfterContentInit() {
    if (this.globalState === undefined) {
      const err = new ConfigurationError(
                      `app-core is missing required 'global-state' child.`)
                      .from(SOURCE)
                      .at(Severity.ERROR);
      this.appCoreService.appCore.err(err);
      throw err;
    }
    if (this.dataQuery === undefined) {
      const err = new ConfigurationError(
                      `app-core is missing required 'data-query' directive`)
                      .from(SOURCE)
                      .at(Severity.ERROR);
      this.appCoreService.appCore.err(err);
      throw err;
    }
    this.appCoreService.appCore.publish();
  }
}
