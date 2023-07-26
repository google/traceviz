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
 * @fileoverview Directives used to define the TraceViz data query.
 */

import {AfterContentInit, ContentChild, Directive, forwardRef, Input} from '@angular/core';
import {GLOBAL_TEST_DATA_FETCHER, ValueMap} from 'traceviz-client-core';

import {AppCoreService} from '../services/app_core.service';

import {DataQueryDirectiveBase} from '../directives/data_query.directive';
import {GlobalStateDirective} from '../directives/global_state.directive';

/**
 * A data query for use in tests.  It forces the debounce interval to 0,
 * making all requests synchronous, and uses the global test data fetcher
 * instead of an actual HTTP fetcher, making it easy to examine requests and
 * provide responses.
 */
@Directive({
  selector: 'test-data-query',
  providers: [{
    provide: DataQueryDirectiveBase,
    useExisting: forwardRef(() => TestDataQueryDirective)
  }],
})
export class TestDataQueryDirective extends DataQueryDirectiveBase implements
    AfterContentInit {
  @Input() debounceMs = 50;
  @ContentChild(GlobalStateDirective)
  filtersDir: GlobalStateDirective|undefined;
  constructor(appCoreService: AppCoreService) {
    super(appCoreService, GLOBAL_TEST_DATA_FETCHER);
    this.debounceMs = 0;
    // Clear out any previous test data fetcher state.
    GLOBAL_TEST_DATA_FETCHER.reset();
  }
  override filters(): ValueMap {
    if (this.filtersDir === undefined) {
      return new ValueMap();
    }
    const filters = this.filtersDir.values?.getValueMap();
    if (filters === undefined) {
      return new ValueMap();
    }
    return filters;
  }
  ngAfterContentInit(): void {
    this.appCoreService.appCore.onPublish((appCore) => {
      this.init(appCore);
    });
  }
}
