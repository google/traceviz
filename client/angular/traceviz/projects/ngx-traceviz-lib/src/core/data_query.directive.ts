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
import { AppCore, ConfigurationError, Severity, ValueMap } from 'traceviz-client-core';
import { AppCoreService } from '../app_core_service/app_core.service';
import { GlobalStateDirective } from './global_state.directive';
import { HttpDataFetcher } from './http_data_fetcher';
import { DataFetcherInterface } from 'traceviz-client-core/src/data_query/data_fetcher_interface';
import { TestDataFetcher } from './test_data_fetcher';

const SOURCE = 'data_query.directive';

export abstract class DataQueryDirectiveBase {
    constructor(
        protected readonly appCoreService: AppCoreService,
        protected readonly fetcher: DataFetcherInterface) { }

    abstract filters(): ValueMap;
    abstract debounceMs: number;

    init() {
        this.appCoreService.appCore.onPublish((appCore: AppCore) => {

            appCore.dataQuery.connect(this.fetcher);
            appCore.dataQuery.setGlobalFilters(this.filters());
            if (this.debounceMs > 0) {
                appCore.dataQuery.debounceUpdates(this.debounceMs);
            }
        });
    }
}

@Directive({
    selector: 'data-query',
    providers: [{
        provide: DataQueryDirectiveBase,
        useExisting: forwardRef(() => DataQueryDirective)
    }],
})
export class DataQueryDirective extends DataQueryDirectiveBase implements AfterContentInit {
    @Input() debounceMs: number = 50;
    @ContentChild(GlobalStateDirective) filtersDir: GlobalStateDirective | undefined;

    constructor(
        appCoreService: AppCoreService,
        httpDataFetcher: HttpDataFetcher) {
        super(appCoreService, httpDataFetcher);
    }

    override filters(): ValueMap {
        if (this.filtersDir === undefined) {
            throw new ConfigurationError('global-state lacks a value-map')
                .from(SOURCE)
                .at(Severity.FATAL);
        }
        let filters = this.filtersDir.values?.getValueMap();
        if (filters === undefined) {
            filters = new ValueMap();
        }
        return filters;
    }

    ngAfterContentInit(): void {
        this.init();
    }
}
