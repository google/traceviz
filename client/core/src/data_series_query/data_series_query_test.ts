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
import { BehaviorSubject } from 'rxjs';
import { DataSeriesQuery } from './data_series_query.js';
import { IntegerValue } from '../value/value.js';
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
}

describe('data series query test', () => {
  let fdq = new TestFetcher();
  const queryName = str('query');
  const param1 = int(1);
  const param2 = str('hello');
  const parameters =
    valueMap({ key: 'count', val: param1 }, { key: 'greetings', val: param2 });
  let fetch = new BehaviorSubject<boolean>(true);
  const dsq = new DataSeriesQuery(fdq, queryName, parameters, fetch);
  // An empty ResponseNode to send back.  Its contents are unimportant.
  const cannedResponse = node();
  // A string showing the loading history.  't' means 'loading'; 'f' means
  // 'loaded'.  The current state is reflected by the last character.
  let loadingHistory = '';
  // The last value of dsq.response's update.
  let responses: ResponseNode[] = [];

  // Track the ups and downs of dsq.loading.
  dsq.loading.pipe().subscribe((loading: boolean) => {
    loadingHistory += loading ? 't' : 'f';
  });
  // Also track the number of times response has updated, and its last update
  // value.
  dsq.response.subscribe((response: ResponseNode) => {
    responses.push(response);
  });

  beforeEach(() => {
    fdq.wantReq = {
      queryName: 'query',
      seriesName: dsq.uniqueSeriesName,
      parameters,
    };
    queryName.val = 'query';
    responses = [];
    loadingHistory = '';
    fetch.next(true);
  });

  it('tests initial fetch', () => {
    // Expect the initial fetch to be loading.
    expect(responses).toEqual([]);
    expect(loadingHistory).toEqual('t');

    // Finish the fetch by explicitly invoking fdq.onResponse.
    fdq.onResponse(cannedResponse);
    expect(responses.length).toBe(1);
    expect(loadingHistory).toEqual('tf');
    expect(responses.at(-1)).toEqual(cannedResponse);
  });

  it('tests fetch-on-param-change', () => {
    // Complete the initial fetch.
    fdq.onResponse(cannedResponse);
    expect(loadingHistory).toEqual('tf');

    // Increment the 'count' param, expect a refetch.
    fdq.wantReq = {
      queryName: 'query',
      seriesName: dsq.uniqueSeriesName,
      parameters: valueMap(
        { key: 'count', val: int(2) }, { key: 'greetings', val: str('hello') }),
    };
    (parameters.get('count') as IntegerValue).val++;
    expect(loadingHistory).toEqual('tft');

    fdq.onResponse(cannedResponse);
    expect(responses.at(-1)).toEqual(cannedResponse);
    expect(loadingHistory).toEqual('tftf');
  });

  it('tests fetch-on-watch-change', () => {
    fetch.next(false);
    // Complete the initial fetch.
    fdq.onResponse(cannedResponse);
    expect(loadingHistory).toEqual('tf');

    // Tickle fetch, expect a refetch.  Note that the request we issue does
    // not change.
    fdq.wantReq = {
      queryName: 'query',
      seriesName: dsq.uniqueSeriesName,
      parameters,
    };
    fetch.next(true);
    fetch.next(false);
    expect(loadingHistory).toEqual('tft');

    fdq.onResponse(cannedResponse);
    expect(responses.at(-1)).toEqual(cannedResponse);
    expect(loadingHistory).toEqual('tftf');
  });

  it('tests fetch-on-query-name-change', () => {
    // Complete the initial fetch.
    fdq.onResponse(cannedResponse);
    expect(loadingHistory).toEqual('tf');

    // Change the query name, expect a refetch.
    fdq.wantReq = {
      queryName: 'newquery',
      seriesName: dsq.uniqueSeriesName,
      parameters,
    };
    queryName.val = 'newquery';
    expect(loadingHistory).toEqual('tft');

    fdq.onResponse(cannedResponse);
    expect(responses.at(-1)).toEqual(cannedResponse);
    expect(loadingHistory).toEqual('tftf');
  });
});