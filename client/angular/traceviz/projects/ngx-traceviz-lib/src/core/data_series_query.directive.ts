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
 * @fileoverview Directives used to define a data series.
 */

import { AfterContentInit, ContentChild, Directive } from "@angular/core";
import { ValueDirective } from "./value.directive";
import { ValueMapDirective } from "./value_map.directive";
import { InteractionsDirective } from "./interactions.directive";
import { ConfigurationError, DataSeriesQuery, Severity, StringValue, ValueMap } from "traceviz-client-core";
import { AppCoreService } from "../app_core_service/app_core.service";

const SOURCE = 'data_series_query.directive';

@Directive({ selector: 'query' })
export class QueryDirective {
    @ContentChild(ValueDirective) queryName: ValueDirective | undefined;
}

@Directive({ selector: 'parameters' })
export class ParametersDirective {
    @ContentChild(ValueMapDirective) parameters: ValueMapDirective | undefined;
}

const DATASERIES = "data-series";
const FETCH = "fetch";

const supportedReactions = new Array<[string, string]>(
    // The data series is fetched or refetched.
    [DATASERIES, FETCH],
);

@Directive({ selector: 'data-series' })
export class DataSeriesQueryDirective implements AfterContentInit {
    @ContentChild(QueryDirective) query: QueryDirective | undefined;
    @ContentChild(ParametersDirective) parameters: ParametersDirective | undefined;
    @ContentChild(InteractionsDirective) interactions: InteractionsDirective | undefined;
    dataSeriesQuery: DataSeriesQuery | undefined;

    constructor(private readonly appCoreService: AppCoreService) { }

    ngAfterContentInit(): void {
        this.appCoreService.appCore.onPublish((appCore) => {
            if (this.query === undefined) {
                const err = new ConfigurationError(`data-series is missing required 'query' child.`)
                    .from(SOURCE)
                    .at(Severity.ERROR);
                appCore.err(err);
                return;
            }
            if (this.query.queryName === undefined ||
                this.query.queryName.get() === undefined ||
                !(this.query.queryName.get() instanceof StringValue)) {
                const err = new ConfigurationError(`query takes a single string child.`)
                    .from(SOURCE)
                    .at(Severity.ERROR);
                appCore.err(err);
                return;
            }
            if (this.interactions === undefined) {
                const err = new ConfigurationError(`data-series is missing required 'interactions' child.`)
                    .from(SOURCE)
                    .at(Severity.ERROR);
                appCore.err(err);
                return;
            }
            const interactions = this.interactions.get();
            const err = interactions.checkForSupportedReactions(supportedReactions);
            if (err !== undefined) {
                appCore.err(err);
            }

            let parameters: ValueMap | undefined;
            if (this.parameters !== undefined) {
                parameters = this.parameters.parameters?.getValueMap();
            }
            if (parameters === undefined) {
                parameters = new ValueMap();
            }
            this.dataSeriesQuery = new DataSeriesQuery(
                appCore.dataQuery,
                this.query.queryName.get() as StringValue,
                parameters,
                interactions.match(DATASERIES, FETCH)());
        });
    }
}