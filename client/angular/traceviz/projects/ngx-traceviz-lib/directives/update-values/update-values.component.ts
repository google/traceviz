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

import { AfterContentInit, ContentChild, Directive, OnDestroy } from "@angular/core";
import { AppCoreService, DataSeriesQueryDirective, InteractionsDirective } from "projects/ngx-traceviz-lib/public-api";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { ConfigurationError, DataSeriesQuery, Interactions, Severity } from "traceviz-client-core";

const SOURCE = 'update-values';

// Valid interaction targets
const RESPONSE = 'response';

// Valid action types
const UPDATE = 'update';

const supportedActions = new Array<[string, string]>(
    [RESPONSE, UPDATE],
);

/**
 * A directive updating frontend values from backend responses.
 * 
 * Its data-series response should be a single ResponseNode whose properties
 * maps keys in the nested <value-map> to frontend Values.
 * 
 * Upon a new data-series response, all UPDATE actions targeting
 * RESPONSE are performed.  The ResponseNode's properties are used as the
 * target properties.
 */
@Directive({ selector: 'update-values' })
export class UpdateValuesDirective implements AfterContentInit, OnDestroy {
    @ContentChild(DataSeriesQueryDirective) dataSeriesQueryDir: DataSeriesQueryDirective | undefined;
    @ContentChild(InteractionsDirective) interactionsDir: InteractionsDirective | undefined;

    private unsubscribe = new Subject<void>();

    // Fields available after ngAfterContentInit.
    private interactions: Interactions | undefined;
    dataSeriesQuery: DataSeriesQuery | undefined;

    constructor(readonly appCoreService: AppCoreService) { }

    ngAfterContentInit(): void {
        this.interactions = this.interactionsDir?.get();
        this.dataSeriesQuery = this.dataSeriesQueryDir?.dataSeriesQuery;
        this.appCoreService.appCore.onPublish((appCore) => {
            if (this.dataSeriesQueryDir == undefined) {
                appCore.err(new ConfigurationError(`data-table is missing required 'data-series' child.`)
                    .from(SOURCE)
                    .at(Severity.ERROR));
                return;
            }
            try {
                this.interactions?.checkForSupportedActions(supportedActions);
            } catch (err) {
                appCore.err(err);
            }
            // Handle new data series.
            this.dataSeriesQuery?.response
                .pipe(takeUntil(this.unsubscribe))
                .subscribe((response) => {
                    this.interactions?.update(RESPONSE, UPDATE, response.properties);
                });
        });
    }

    ngOnDestroy(): void {
        this.unsubscribe.next();
        this.unsubscribe.complete();
    }
}
