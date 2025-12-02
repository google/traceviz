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
 * @fileoverview Defines a class mediating a single TraceViz data series
 * request.
 */
import { BehaviorSubject, Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
/**
 * Each data series request includes a string series_name which the backend
 * does not examine and instead passes directly through to the data response.
 * A DataQuery uses this identifier to route individual data series responses
 * to the right place.
 *
 * Each unique frontend data series has a unique series_name generated at its
 * creation.  This is included with every data series request it generates, and
 * is used by the DataQuery component to route data series responses to their
 * proper consumers.
 */
let nextID = 0;
function getUniqueSeriesName() {
    if (nextID >= Number.MAX_SAFE_INTEGER) {
        // If we've generated 90 quadrillion unique names, we deserve a prize: this
        // error.
        throw new Error(`Too many series IDs generated.`);
    }
    nextID++;
    return nextID.toString();
}
/**
 * DataSeriesQuery handles on-demand fetching for a single query for a TraceViz
 * component.  These queries are satisfied by the backend in response to
 * requests that include global filter values and parameters; whenever these
 * change, the component should receive a fresh response.  DataSeriesQuery is
 * responsible for monitoring changes its parameter Values and on a 'fetch'
 * boolean observable.  When a parameter changes, or upon a rising edge on
 * 'fetch', DataSeriesQuery requests a new response from the backend; then, when
 * that response arrives, it makes it available to the TraceViz component.
 *
 * Users of DataSeriesQuery must call its dispose method when done with it.
 */
export class DataSeriesQuery {
    dataQuery;
    queryName;
    parameters;
    unsubscribe = new Subject();
    // loading emits true when the data series is being fetched, and emits false
    // when a response is handled.
    loading = new BehaviorSubject(false);
    // response emits a root ResponseNode populated with the series query response
    // each time such a response is available.
    response = new Subject();
    // This series' unique name, for routing.  Nothing should depend on this
    // member having any particular value, but it will be unique to each
    // DataSeriesQuery instance and will remain stable throughout its lifetime.
    uniqueSeriesName;
    constructor(dataQuery, queryName, parameters, fetch) {
        this.dataQuery = dataQuery;
        this.queryName = queryName;
        this.parameters = parameters;
        this.uniqueSeriesName = getUniqueSeriesName();
        fetch
            .pipe(distinctUntilChanged(), takeUntil(this.unsubscribe))
            .subscribe((fetch) => {
            fetch && this.fetch();
        });
    }
    fetch() {
        const req = {
            queryName: this.queryName.val,
            seriesName: this.uniqueSeriesName,
            parameters: this.parameters,
        };
        // Publish the fact that a query is pending.
        this.loading.next(true);
        this.dataQuery.fetchDataSeries(req, (resp) => {
            // Upon receiving the response, broadcast the response and publish
            // the fact that no query is pending.
            this.response.next(resp);
            this.loading.next(false);
        }, () => {
            this.loading.next(false);
        });
    }
    dispose() {
        this.dataQuery.cancelDataSeries(this.uniqueSeriesName);
        this.unsubscribe.next();
        this.unsubscribe.complete();
    }
}
//# sourceMappingURL=data_series_query.js.map