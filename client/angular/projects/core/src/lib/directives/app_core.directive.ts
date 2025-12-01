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

import {AfterContentInit, ContentChild, ContentChildren, Directive, QueryList} from '@angular/core';
import {ConfigurationError, Severity} from '@google/traceviz-client-core';

import {AppCoreService} from '../services/app_core.service';

import {DataQueryDirectiveBase} from './data_query.directive';
import {GlobalStateDirective} from './global_state.directive';

const SOURCE = 'app_core.directive';

/**
 * Specifies the application's core state -- its global state initial
 * definition and its data-query component.
 */
@Directive({standalone: false, selector: 'app-core'})
export class AppCoreDirective implements AfterContentInit {
  @ContentChild(GlobalStateDirective)
  globalState: GlobalStateDirective|undefined;
  @ContentChildren(DataQueryDirectiveBase)
  dataQueries = new QueryList<DataQueryDirectiveBase>();

  constructor(readonly appCoreService: AppCoreService) {}

  ngAfterContentInit() {
    const appCore = this.appCoreService.appCore;
    if (this.globalState === undefined) {
      const err = new ConfigurationError(
                      `app-core is missing required 'global-state' child.`)
                      .from(SOURCE)
                      .at(Severity.ERROR);
      appCore.err(err);
      throw err;
    }
    if (this.dataQueries.length === 0) {
      const err =
          new ConfigurationError(
              `app-core must define at least one 'data-query' directive`)
              .from(SOURCE)
              .at(Severity.ERROR);
      appCore.err(err);
      throw err;
    }
    for (const dqd of this.dataQueries) {
      const dq = appCore.addDataQuery(dqd.id);
      dq.connect(dqd.fetcher);
      dq.debounceUpdates(dqd.debounceMs);
    }
    this.globalState.init(appCore);
    appCore.publish();
  }
}
