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

import { ContentChild, Directive, AfterContentInit, Input, forwardRef } from '@angular/core';
import { ValueMap } from 'traceviz-client-core';
import { AppCoreService } from '../app_core_service/app_core.service';
import { GlobalStateDirective } from './global_state.directive';
import { TestDataFetcher } from './test_data_fetcher';
import { DataQueryDirectiveBase } from './data_query.directive';

const SOURCE = 'test_data_query.directive';

export const GlobalTestDataFetcher = new TestDataFetcher();

@Directive({
    selector: 'test-data-query',
    providers: [{
        provide: DataQueryDirectiveBase,
        useExisting: forwardRef(() => TestDataQueryDirective)
    }],
})
export class TestDataQueryDirective extends DataQueryDirectiveBase implements AfterContentInit {
    @Input() debounceMs: number = 50;
    @ContentChild(GlobalStateDirective) filtersDir: GlobalStateDirective | undefined;

    constructor(
        appCoreService: AppCoreService) {
        super(appCoreService, GlobalTestDataFetcher);
    }

    override filters(): ValueMap {
        if (this.filtersDir === undefined) {
            return new ValueMap();
        }
        let filters = this.filtersDir.values?.getValueMap();
        if (filters === undefined) {
            return new ValueMap();
        }
        return filters;
    }

    ngAfterContentInit(): void {
        this.init();
    }
}