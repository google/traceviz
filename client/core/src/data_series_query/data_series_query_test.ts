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

import 'jasmine';
import { DataSeriesFetcher } from './data_series_fetcher.js';
import { SeriesRequest } from '../protocol/request_interface.js';
import { ResponseNode } from '../protocol/response_interface.js';
import { int, str, valueMap } from '../value/test_value.js';
import { BehaviorSubject, Subject, distinctUntilChanged, takeUntil } from 'rxjs';
import { DataSeriesQuery } from './data_series_query.js';
import { node } from '../protocol/test_response.js';

class TestFetcher implements DataSeriesFetcher {
  // If specified, the series request we next want to see fetched.
  wantReq: SeriesRequest | undefined;
  // The onResponse callback provided with the most recent fetchDataSeries
  // call.
  onResponse: (resp: ResponseNode) => void = () => { };

  fetchDataSeries(req: SeriesRequest, onResponse: (resp: ResponseNode) => void):
    void {
    if (this.wantReq !== undefined) {
      expect(this.wantReq.queryName).toEqual(req.queryName);
      expect(this.wantReq.seriesName).toEqual(req.seriesName);
      expect(this.wantReq.parameters.entries())
        .toEqual(req.parameters.entries());
    }
    this.onResponse = onResponse;
  }

  cancelDataSeries(seriesName: string | undefined): void {
  }
}

describe('data series query test', () => {
  let fdq = new TestFetcher();
  const queryName = str('query');
  const param1 = int(1);
  const param2 = str('hello');
  const parameters =
    valueMap({ key: 'count', val: param1 }, { key: 'greetings', val: param2 });
  const fetch = new BehaviorSubject<boolean>(false);
  const dsq = new DataSeriesQuery(fdq, queryName, parameters, fetch);
  // An empty ResponseNode to send back.  Its contents are unimportant.
  const cannedResponse = node();
  // A string showing the loading history.  't' means 'loading'; 'f' means
  // 'loaded'.  The current state is reflected by the last character.
  let loadingHistory = '';
  // The last value of dsq.response's update.
  let responses: ResponseNode[] = [];
  let unsubscribe = new Subject<void>();

  beforeEach(() => {
    // An empty ResponseNode to send back.  Its contents are unimportant.
    // Track the ups and downs of dsq.loading.
    dsq.loading.pipe(
      takeUntil(unsubscribe),
      distinctUntilChanged())
      .subscribe((loading: boolean) => {
        loadingHistory += loading ? 't' : 'f';
      });
    // Also track the number of times response has updated, and its last update
    // value.
    dsq.response.pipe(takeUntil(unsubscribe)).subscribe((response: ResponseNode) => {
      responses.push(response);
    });
    fdq.wantReq = {
      queryName: 'query',
      seriesName: dsq.uniqueSeriesName,
      parameters,
    };
    queryName.val = 'query';
  });

  afterEach(() => {
    unsubscribe.next();
    unsubscribe.complete();
    unsubscribe = new Subject<void>();
    responses = [];
    loadingHistory = '';
  });

  it('tests initial fetch', () => {
    fetch.next(true);
    // Expect the initial fetch to be loading.
    expect(responses).toEqual([]);
    expect(loadingHistory).toEqual('ft');

    // Finish the fetch by explicitly invoking fdq.onResponse.
    fdq.onResponse(cannedResponse);
    expect(responses.length).toBe(1);
    expect(loadingHistory).toEqual('ftf');
    expect(responses.at(-1)).toEqual(cannedResponse);
    // Reset fetch's state to false.
    fetch.next(false);
  });

  it('tests fetch when signalled', () => {
    // Complete the initial fetch.
    fdq.onResponse(cannedResponse);
    expect(loadingHistory).toEqual('f');

    // Tickle fetch, expect a refetch.  Note that the request we issue does
    // not change.
    fdq.wantReq = {
      queryName: 'query',
      seriesName: dsq.uniqueSeriesName,
      parameters,
    };
    fetch.next(true);
    fetch.next(false);
    expect(loadingHistory).toEqual('ft');

    fdq.onResponse(cannedResponse);
    expect(responses.at(-1)).toEqual(cannedResponse);
    expect(loadingHistory).toEqual('ftf');
  });
});
