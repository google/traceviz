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

import { Request, Response, ResponseNode, SeriesRequest } from "../core.js";
import { node, response } from "../protocol/test_response.js";
import { DataQuery } from "./data_query.js";
import { DataSeriesQuery } from "../data_series_query/data_series_query.js";
import { TestDataFetcher } from "./test_data_fetcher.js";
import { int, str, valueMap } from '../value/test_value.js';
import { BehaviorSubject, of, throwError } from "rxjs";

function buildEmptyResponse(...seriesRequests: SeriesRequest[]): Response {
  const responses = new Array<{ name: string, series: ResponseNode }>();
  for (const seriesRequest of seriesRequests) {
    responses.push({ name: seriesRequest.seriesName, series: node() });
  }
  return response(...responses);
}

describe('data query test', () => {
  // Build a TestDataQuery (a DataQuery with its debouncing behavior overridden
  // to support explicit fetch.  It will use a TestDataFetcher which serves
  // canned data.
  const tdf = new TestDataFetcher();
  const tdq = new DataQuery((err) => fail(err));
  tdq.connect(tdf);
  const sendRequest = tdq.triggerUpdates();
  // Set up global filters, and provide them to the TestDataQuery
  const gf1 = int(1);
  const gf2 = str('hello');
  const globalFilters =
    valueMap({ key: 'count', val: gf1 }, { key: 'greetings', val: gf2 });
  // A helper to build DataRequests.
  function dataRequest(...seriesRequests: SeriesRequest[]): Request {
    return {
      filters: globalFilters,
      seriesRequests,
    };
  }
  let fetchedSeries: string[] = [];
  let wantFetchedSeries: string[] = [];
  let fetchedQueries: string[] = [];
  let wantFetchedQueries: string[] = [];
  let cancellations: number = 0;
  let wantCancellations: number = 0;
  // An onResponse callback to provide to fetches expected to be performed.
  const onResponse: (queryName: string, seriesName: string) =>
    (resp: ResponseNode) => void = (queryName: string, seriesName: string) =>
      () => {
        fetchedSeries.push(seriesName);
        fetchedQueries.push(queryName);
      };
  // A cancel callback to provide to fetches.
  function cancel() {
    cancellations++;
  }

  // An onResponse callback to provide to fetches expected not to be performed.
  const failResponse: (resp: ResponseNode) => void = () => {
    fail();
  };
  // A helper preparingTestDataFetcher and testcase expectations for a
  // successful backend response.  The fetcher sends empty responses.
  function prepareResponse(...seriesRequests: SeriesRequest[]) {
    fetchedSeries = [];
    wantFetchedSeries = [];
    fetchedQueries = [];
    wantFetchedQueries = [];
    cancellations = 0;
    wantCancellations = 0;
    for (const req of seriesRequests.values()) {
      wantFetchedSeries.push(req.seriesName);
      wantFetchedQueries.push(req.queryName);
    }
    tdf.expectReq = dataRequest(...seriesRequests);
    tdf.onFetch = of(buildEmptyResponse(...seriesRequests));
  }
  // A helper preparingTestDataFetcher and testcase expectations for an
  // unsuccessful backend response.  The fetcher sends an error.
  function prepareCancelledResponse(...seriesRequests: SeriesRequest[]) {
    fetchedSeries = [];
    wantFetchedSeries = [];
    fetchedQueries = [];
    wantFetchedQueries = [];
    cancellations = 0;
    wantCancellations = seriesRequests.length;
    tdf.expectReq = dataRequest(...seriesRequests);
    tdf.onFetch = throwError(() => new Error());
  }

  beforeEach(() => {
    tdq.setGlobalFilters(globalFilters);
  });

  it('does not fetch when there is nothing to fetch', (() => {
    // Expect a 'debounce timeout' now to do nothing.  The TestDataFetcher's
    // expected request is undefined, so tdf.fetch() would fail if invoked.
    sendRequest();
  }));

  it('issues a request with a single DataSeriesRequest, expecting success',
    (() => {
      // Issue a fetchDataSeries request, expect it to return.
      const seriesReq1: SeriesRequest = {
        queryName: 'query1',
        seriesName: 'series1',
        parameters: valueMap(),
      };
      prepareResponse(seriesReq1);
      tdq.fetchDataSeries(seriesReq1, onResponse('query1', 'series1'), cancel);
      sendRequest();
      expect(fetchedSeries).toEqual(wantFetchedSeries);
      expect(fetchedQueries).toEqual(wantFetchedQueries);
      expect(cancellations).toEqual(wantCancellations);
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
      prepareResponse(seriesReq2);
      tdq.fetchDataSeries(seriesReq1, failResponse, cancel);
      tdq.fetchDataSeries(seriesReq2, onResponse('query2', 'series1'), cancel);
      sendRequest();
      expect(fetchedSeries).toEqual(wantFetchedSeries);
      expect(fetchedQueries).toEqual(wantFetchedQueries);
      expect(cancellations).toEqual(wantCancellations);
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
    prepareResponse(seriesReq1, seriesReq2);
    tdq.fetchDataSeries(seriesReq1, onResponse('query1', 'series1'), cancel);
    tdq.fetchDataSeries(seriesReq2, onResponse('query2', 'series2'), cancel);
    sendRequest();
    expect(fetchedSeries).toEqual(wantFetchedSeries);
    expect(fetchedQueries).toEqual(wantFetchedQueries);
    expect(cancellations).toEqual(wantCancellations);
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
    prepareCancelledResponse(seriesReq1, seriesReq2);
    tdq.fetchDataSeries(seriesReq1, onResponse('query1', 'series1'), cancel);
    tdq.fetchDataSeries(seriesReq2, onResponse('query2', 'series2'), cancel);
    sendRequest();
    expect(fetchedSeries).toEqual(wantFetchedSeries);
    expect(fetchedQueries).toEqual(wantFetchedQueries);
    expect(cancellations).toEqual(wantCancellations);
  }));
});

describe('DataQuery integration with DataSeriesQuery', () => {
  const gf1 = int(1);
  const tdf = new TestDataFetcher();
  const tdq = new DataQuery((err) => fail(err));
  tdq.connect(tdf);
  const sendRequest = tdq.triggerUpdates();
  const filters = valueMap({ key: 'numThings', val: gf1 });
  tdq.setGlobalFilters(filters);
  // dataRequest returns the expected DataRequestProto for tdf, with the
  // specified series requests, at the moment of invocation.
  function dataRequest(...seriesRequests: SeriesRequest[]): Request {
    return {
      filters,
      seriesRequests,
    };
  }
  // prepareResponse prepares tdf to receive the supplied set of seriesrequests,
  // and to provide a suitable fetch response.
  function prepareResponse(...seriesRequests: SeriesRequest[]) {
    tdf.expectReq = dataRequest(...seriesRequests);
    tdf.onFetch = of(buildEmptyResponse(...seriesRequests));
  }

  beforeEach(() => {
    prepareResponse();
  });

  it('performs initial query', (() => {
    let fetched = 0;
    const dsq = new DataSeriesQuery(tdq, str('stuff'), valueMap(), of(true));
    function seriesRequest(): SeriesRequest {
      return {
        queryName: 'stuff',
        seriesName: dsq.uniqueSeriesName,
        parameters: valueMap(),
      };
    }
    dsq.response.subscribe(() => {
      fetched++;
    });

    // Expect nothing to be fetched until the 'debounce tick'.
    expect(fetched).toEqual(0);
    prepareResponse(seriesRequest());
    // 'debounce' tick
    sendRequest();
    expect(fetched).toEqual(1);
    // Another fetch should see no further updates of series0
    prepareResponse();
    sendRequest();
    expect(fetched).toEqual(1);
    dsq.dispose();
  }));

  it('reissues update on params change', (() => {
    let fetched = 0;
    const v1 = int(2);
    const parameters = valueMap({ key: 'widgets', val: v1 });
    const dsq = new DataSeriesQuery(tdq, str('stuff'), parameters, of(true));
    function seriesRequest(): SeriesRequest {
      return {
        queryName: 'stuff',
        seriesName: dsq.uniqueSeriesName,
        parameters,
      };
    }
    dsq.response.subscribe(() => {
      fetched++;
    });

    // Perform the initial fetch
    prepareResponse(seriesRequest());
    sendRequest();
    // Changing the 'widgets' argument should induce a fetch.
    v1.val = 3;
    expect(fetched).toEqual(1);
    prepareResponse(seriesRequest());
    sendRequest();
    expect(fetched).toEqual(2);
    dsq.dispose();
  }));

  it('reissues update on observable', (() => {
    let fetched = 0;
    const fetch = new BehaviorSubject<boolean>(true);
    const dsq = new DataSeriesQuery(tdq, str('things'), valueMap(), fetch);
    function seriesRequest(): SeriesRequest {
      return {
        queryName: 'things',
        seriesName: dsq.uniqueSeriesName,
        parameters: valueMap(),
      };
    }
    dsq.response.subscribe(() => {
      fetched++;
    });

    // Perform the initial fetch
    prepareResponse(seriesRequest());
    sendRequest();
    expect(fetched).toEqual(1);
    fetch.next(true);
    prepareResponse(seriesRequest());
    sendRequest();
    expect(fetched).toEqual(2);
    dsq.dispose();
  }));

  it('supports multiple simultaneous queries', (() => {
    const fetch = new BehaviorSubject<boolean>(true);
    let fetched1 = 0;
    const dsq1 = new DataSeriesQuery(
      tdq, str('things'), valueMap(), fetch);
    function seriesRequest1(): SeriesRequest {
      return {
        queryName: 'things',
        seriesName: dsq1.uniqueSeriesName,
        parameters: valueMap(),
      };
    }
    dsq1.response.subscribe(() => {
      fetched1++;
    });

    // Perform the initial fetch after dsq1 has been registered.
    prepareResponse(seriesRequest1());
    sendRequest();
    expect(fetched1).toBe(1);

    let fetched2 = 0;
    const dsq2 =
      new DataSeriesQuery(tdq, str('stuff'), valueMap(), fetch);
    function seriesRequest2(): SeriesRequest {
      return {
        queryName: 'stuff',
        seriesName: dsq2.uniqueSeriesName,
        parameters: valueMap(),
      };
    }
    dsq2.response.subscribe(() => {
      fetched2++;
    });

    // After dsq1 is registered and we 'debounce', we should see one fetch on
    // each series.
    prepareResponse(seriesRequest2());
    sendRequest();
    expect(fetched1).toBe(1);
    expect(fetched2).toBe(1);

    // An update to the collection name should refetch both.
    fetch.next(true);
    prepareResponse(seriesRequest1(), seriesRequest2());
    sendRequest();
    expect(fetched1).toBe(2);
    expect(fetched2).toBe(2);

    dsq1.dispose();
    dsq2.dispose();
  }));
});
