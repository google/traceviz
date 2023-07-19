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
 * @fileoverview Defines a class mediating all TraceViz data series requests.
 */

import {debounce, Subject, take, timer} from 'rxjs';
import {Request, SeriesRequest} from '../protocol/request_interface.js';
import {ResponseNode} from '../protocol/response_interface.js';
import {ConfigurationError, Severity} from '../errors/errors.js';
import {ValueMap} from '../value/value_map.js';
import {DataFetcherInterface} from './data_fetcher_interface.js';
import {DataSeriesFetcher} from '../data_series_query/data_series_fetcher.js';

const SOURCE='data_query';

interface PendingQuery {
  req: SeriesRequest;
  onResponse: (resp: ResponseNode) => void;
  cancel: () => void;
}

/**
 * DataQuery is a permanent singleton type managing backend Data queries.  It
 * accepts new DataSeriesRequestProtos via the fetchDataSeries method, which
 * also requires a callback to invoke upon receiving the response.  DataQuery
 * batches these requests together, and debounces them, then issues a backend
 * DataRequest including the global filters provided by setGlobalFilters and
 * all batched DataSeriesRequests.  Upon the response, DataQuery invokes the
 * provided callbacks for each registered DataSeriesRequest.
 */
export class DataQuery implements DataSeriesFetcher {
  // updateRequested is advanced whenever an update has been requested.
  protected updateRequested=new Subject<null>();
  // globalFilters is a key/Value mapping provided with DataRequests.
  private globalFilters=new ValueMap(new Map());
  // pendingQueriesBySeriesName tracks pending data series queries, indexed by
  // their unique series name.  For each pending query, the
  // DataSeriesRequestProto and the response callback is stored.
  private pendingQueriesBySeriesName=new Map<string, PendingQuery>();

  private fetcher: DataFetcherInterface|undefined;

  constructor(private readonly errorReporter: (err: unknown) => void) { }

  connect(fetcher: DataFetcherInterface) {
    this.fetcher=fetcher;
  }

  setGlobalFilters(globalFilters: ValueMap) {
    this.globalFilters=globalFilters;
  }

  // Returns a callback that immediately issues outstanding queries.  For test
  // use only.
  triggerUpdates(): () => void {
    return () => {
      this.issueQuery();
    };
  }

  // Issues queries after a specified debounce interval.  If the interval is 0,
  // queries are issued synchronously.
  debounceUpdates(debounceMs: number) {
    if (debounceMs===0) {
      this.updateRequested.subscribe(() => {
        this.issueQuery();
      });
      return;
    }
    // Each event on the debounced 'updateRequested' channel results in a
    // new fetch, as long as at least one series wants an update.  Just before
    // the fetch, the set of ready series names is cleared.
    this.updateRequested.pipe(debounce(() => timer(debounceMs)))
      .subscribe(() => {
        this.issueQuery();
      });
  }

  fetchDataSeries(
    req: SeriesRequest, onResponse: (resp: ResponseNode) => void,
    cancel: () => void) {
    const seriesName=req.seriesName;
    if (seriesName===undefined) {
      this.errorReporter(
        new ConfigurationError(`DataSeriesRequest lacks required series name`)
          .from(SOURCE)
          .at(Severity.FATAL));
      return;
    }
    // Place this request in the set of pending queries, overwriting any already
    // present for this series.
    this.pendingQueriesBySeriesName.set(seriesName, {req, onResponse, cancel});
    // Bump this.updateRequested for debouncing.
    this.updateRequested.next(null);
  }

  cancelDataSeries(seriesName: string|undefined) {
    if (seriesName!==undefined) {
      this.pendingQueriesBySeriesName.delete(seriesName);
    }
  }

  protected issueQuery() {
    if (!this.fetcher) {
      this.errorReporter(
        new ConfigurationError(`issueQuery() called before connect().`)
          .from(SOURCE)
          .at(Severity.FATAL));
      return;
    }
    // Save a copy of the pending queries so that we can find and invoke the
    // response callbacks, then clear the pending queries map in preparation for
    // the next DataQuery train.
    const queriesInFlightBySeriesName=this.pendingQueriesBySeriesName;
    this.pendingQueriesBySeriesName=new Map();
    // Assemble a DataRequestProto with all requested DataSeriesRequests and the
    // global filters.
    const seriesRequests: SeriesRequest[]=[];
    for (const queryInFlight of queriesInFlightBySeriesName.values()) {
      seriesRequests.push(queryInFlight.req);
    }
    const req: Request={filters: this.globalFilters, seriesRequests};
    // Submit the request via the fetcher.
    this.fetcher.fetch(req).pipe(take(1)).subscribe({
      next: (data) => {
        for (const [seriesName, series] of data.series.entries()) {
          const queryInFlight=queriesInFlightBySeriesName.get(seriesName);
          if (queryInFlight===undefined) {
            continue;
          }
          // Invoke the registered callback for this dataSeries.
          queryInFlight.onResponse(series);
        }
      },
      error: (err) => {
        for (const queryInFlight of queriesInFlightBySeriesName.values()) {
          queryInFlight.cancel();
        }
      }
    });
  }
}
