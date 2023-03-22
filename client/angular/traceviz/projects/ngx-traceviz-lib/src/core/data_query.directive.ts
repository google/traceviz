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
import { HttpDataFetcher } from './http_data_fetcher';
import { DataFetcherInterface } from 'traceviz-client-core/src/data_query/data_fetcher_interface';
import { ValueMapDirective } from './value_map.directive';

const SOURCE = 'data_query.directive';

/**
 * A base class of all data query directives.
 */
export abstract class DataQueryDirectiveBase {
    constructor(
        protected readonly appCoreService: AppCoreService,
        protected readonly fetcher: DataFetcherInterface) { }

    abstract filters(): ValueMap;
    abstract debounceMs: number;

    init(appCore: AppCore) {
        appCore.dataQuery.connect(this.fetcher);
        appCore.dataQuery.setGlobalFilters(this.filters());
        appCore.dataQuery.debounceUpdates(this.debounceMs);
    }
}

/**
 * Describes how data requests are sent to the backend.
 */
@Directive({
    selector: 'data-query',
    providers: [{
        provide: DataQueryDirectiveBase,
        useExisting: forwardRef(() => DataQueryDirective)
    }],
})
export class DataQueryDirective extends DataQueryDirectiveBase implements AfterContentInit {
    // The backend query debouncing interval: the DataQuery will wait this long
    // after an initial series request, then will issue that request and any
    // others that arrived in that interval.  This allows the TraceViz backend
    // to handle multiple requests at once, and to reuse intermediate results.
    @Input() debounceMs: number = 50;
    // The set of filters sent to the backend with each query.  Carefully
    // selecting these values allows the backend to precompute expensive
    // intermediate results once per data query, then reuse those results in
    // handling multiple series queries.
    @ContentChild(ValueMapDirective) filtersDir: ValueMapDirective | undefined;

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
        let filters = this.filtersDir.getValueMap();
        if (filters === undefined) {
            filters = new ValueMap();
        }
        return filters;
    }

    ngAfterContentInit(): void {
        this.appCoreService.appCore.onPublish((appCore) => {
            this.init(appCore);
        });
    }
}
