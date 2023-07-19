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

import {Request, SeriesRequest} from '../protocol/request_interface.js';
import {Response, ResponseNode} from '../protocol/response_interface.js';
import {node, response} from '../protocol/test_response.js';
import {GLOBAL_TEST_DATA_FETCHER} from './test_data_fetcher.js';
import {int, str, valueMap} from '../value/test_value.js';
import {DataQuery} from './data_query.js';

function buildEmptyResponse(...seriesRequests: SeriesRequest[]): Response {
  const responses = new Array<{name: string, series: ResponseNode}>();
  for (const seriesRequest of seriesRequests) {
    responses.push({name: seriesRequest.seriesName, series: node()});
  }
  return response(...responses);
}

describe('data query test', () => {
  // Build a test DataQuery (a DataQuery with its debouncing behavior overridden
  // to support explicit fetch.  It will use a TestDataFetcher which serves
  // canned data.
  const tdq = new DataQuery((err: unknown) => {
    fail(err);
  });
  // Set up global filters, and provide them to the TestDataQuery
  const gf1 = int(1);
  const gf2 = str('hello');
  const globalFilters =
    valueMap({key: 'count', val: gf1}, {key: 'greetings', val: gf2});
  // A helper to build DataRequests.
  function dataRequest(...seriesRequests: SeriesRequest[]): Request {
    return {
      filters: globalFilters,
      seriesRequests,
    };
  }

  beforeEach(() => {
    tdq.connect(GLOBAL_TEST_DATA_FETCHER);
    tdq.setGlobalFilters(globalFilters);
    GLOBAL_TEST_DATA_FETCHER.reset();
  });

  it('does not fetch when there is nothing to fetch', (() => {
    // Expect a 'debounce timeout' now to do nothing.  The TestDataFetcher's
    // expected request is undefined, so tdf.fetch() would fail if invoked.
    tdq.triggerUpdates()();
  }));

  it('issues a request with a single DataSeriesRequest, expecting success',
    (() => {
      // Issue a fetchDataSeries request, expect it to return.
      const seriesReq1: SeriesRequest = {
        queryName: 'query1',
        seriesName: 'series1',
        parameters: valueMap(),
      };
      GLOBAL_TEST_DATA_FETCHER.requestChannel.next(dataRequest(seriesReq1));
      GLOBAL_TEST_DATA_FETCHER.responseChannel.next(
        buildEmptyResponse(seriesReq1));
      let response: ResponseNode | undefined;
      tdq.fetchDataSeries(
        seriesReq1,
        (r) => {
          response = r;
        },
        () => {
          fail('unexpected cancellation');
        });
      expect(response).toBeUndefined();
      tdq.triggerUpdates()();
      expect(response).toBeDefined();
    }));

  it('deduplicates multiple DataSeriesRequests with the same series name',
    (() => {
      // The same series issues two requests; we want the latter to be used.
      const seriesReq1: SeriesRequest = {
        queryName: 'query1',
        seriesName: 'series1',
        parameters: valueMap(),
      };
      const seriesReq2: SeriesRequest = {
        queryName: 'query2',
        seriesName: 'series1',
        parameters: valueMap(),
      };
      GLOBAL_TEST_DATA_FETCHER.requestChannel.next(dataRequest(seriesReq2));
      GLOBAL_TEST_DATA_FETCHER.responseChannel.next(
        buildEmptyResponse(seriesReq2));
      let response: ResponseNode | undefined;
      tdq.fetchDataSeries(
        seriesReq1,
        (r) => {
          response = r;
        },
        () => {
          fail('unexpected cancellation');
        });
      expect(response).toBeUndefined();
      tdq.triggerUpdates()();
      expect(response).toBeDefined();
    }));

  it('issues a request with two DataSeriesRequests, expecting success', (() => {
    // Expect two different queries to both be satisfied.
    const seriesReq1: SeriesRequest = {
      queryName: 'query1',
      seriesName: 'series1',
      parameters: valueMap(),
    };
    const seriesReq2: SeriesRequest = {
      queryName: 'query2',
      seriesName: 'series2',
      parameters: valueMap(),
    };
    GLOBAL_TEST_DATA_FETCHER.requestChannel.next(
      dataRequest(seriesReq1, seriesReq2));
    GLOBAL_TEST_DATA_FETCHER.responseChannel.next(
      buildEmptyResponse(seriesReq1, seriesReq2));
    let response1: ResponseNode | undefined;
    let response2: ResponseNode | undefined;
    tdq.fetchDataSeries(
      seriesReq1,
      (r) => {
        response1 = r;
      },
      () => {
        fail('unexpected cancellation');
      });
    tdq.fetchDataSeries(
      seriesReq2,
      (r) => {
        response2 = r;
      },
      () => {
        fail('unexpected cancellation');
      });
    expect(response1).toBeUndefined();
    expect(response2).toBeUndefined();
    tdq.triggerUpdates()();
    expect(response1).toBeDefined();
    expect(response2).toBeDefined();
  }));

  it('Cancels two DataSeriesRequests', (() => {
    // Expect two different queries to both be satisfied.
    const seriesReq1: SeriesRequest = {
      queryName: 'query1',
      seriesName: 'series1',
      parameters: valueMap(),
    };
    const seriesReq2: SeriesRequest = {
      queryName: 'query2',
      seriesName: 'series2',
      parameters: valueMap(),
    };
    GLOBAL_TEST_DATA_FETCHER.requestChannel.next(
      dataRequest(seriesReq1, seriesReq2));
    GLOBAL_TEST_DATA_FETCHER.responseChannel.error('oops');
    let responses = 0;
    let cancellations = 0;
    tdq.fetchDataSeries(
      seriesReq1,
      (r) => {
        responses++;
      },
      () => {
        cancellations++;
      });
    tdq.fetchDataSeries(
      seriesReq2,
      (r) => {
        responses++;
      },
      () => {
        cancellations++;
      });
    tdq.triggerUpdates()();
    expect(responses).toEqual(0);
    expect(cancellations).toEqual(2);
  }));
});
