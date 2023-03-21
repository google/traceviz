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

import { BehaviorSubject, combineLatest, filter, Observable, Subject, takeUntil } from "rxjs";
import { StringValue, Value } from "../value/value.js";
import { ResponseNode } from "../protocol/response_interface.js";
import { DataSeriesFetcher } from "./data_series_fetcher.js";
import { ValueMap } from "../value/value_map.js";
import { SeriesRequest } from "../protocol/request_interface.js";

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
function getUniqueSeriesName(): string {
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
  readonly unsubscribe = new Subject<void>();
  // loading emits true when the data series is being fetched, and emits false
  // when a response is handled.
  readonly loading = new BehaviorSubject<boolean>(false);
  // response emits a root ResponseNode populated with the series query response
  // each time such a response is available.
  readonly response = new Subject<ResponseNode>();
  // This series' unique name, for routing.  Nothing should depend on this
  // member having any particular value, but it will be unique to each
  // DataSeriesQuery instance and will remain stable throughout its lifetime.
  readonly uniqueSeriesName: string;

  constructor(
    readonly dataQuery: DataSeriesFetcher, readonly queryName: StringValue,
    readonly parameters: ValueMap, fetch: Observable<boolean>) {
    this.uniqueSeriesName = getUniqueSeriesName();
    const onChange: Value[] = [queryName];
    for (const value of parameters.values()) {
      onChange.push(value);
    }
    // On a change to the query name or any parameter, and the 'fetch' reaction
    // is true, fetch the series.
    combineLatest([fetch, ...onChange])
      .pipe(filter(v => (v[0] as boolean)), takeUntil(this.unsubscribe))
      .subscribe(() => {
        this.fetch();
      });
  }

  private fetch() {
    const req: SeriesRequest = {
      queryName: this.queryName.val,
      seriesName: this.uniqueSeriesName,
      parameters: this.parameters,
    };
    // Publish the fact that a query is pending.
    this.loading.next(true);
    this.dataQuery.fetchDataSeries(
      req,
      (resp: ResponseNode) => {
        // Upon receiving the response, broadcast the response and publish
        // the fact that no query is pending.
        this.response.next(resp);
        this.loading.next(false);
      },
      () => {
        this.loading.next(false);
      });
  }

  dispose() {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }
}
