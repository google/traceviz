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

import {HttpClient, HttpParams} from '@angular/common/http';
import {Request, Response, ResponseNode, SeriesRequest, str, valueMap, ValueMap} from '@traceviz/client-core';
import {Observable, Observer} from 'rxjs';

import {AppCoreService} from '../services/app_core.service';

import {HttpDataFetcher} from './http_data_fetcher';

describe('http data fetcher test', () => {
  const appCoreService = new AppCoreService();
  const seriesReq: SeriesRequest = {
    queryName: 'query',
    seriesName: 'series1',
    parameters: new ValueMap(),
  };
  const dataReq: Request = {
    filters: new ValueMap(),
    seriesRequests: [seriesReq],
  };
  const dataReqStr = `{
        "GlobalFilters": {},
        "SeriesRequests": [
          {
            "QueryName": "query",
            "SeriesName": "series1",
            "Options": {}
          }
        ]
      }`.replace(/\s/g, '');

  it('performs a successful HTTP request', () => {
    const dataRespStr = `{
      "StringTable": ["name", "foo"],
      "DataSeries": [
        {
          "SeriesName": "series1",
          "Root": [
            [ [ 0, [ 2, 1 ] ] ],
            []
          ]
        }
      ]
    }`.replace(/\s/g, '');
    const dataResp: Response = {
      series: new Map<string, ResponseNode>([[
        'series1', {
          properties: valueMap({key: 'name', val: str('foo')}),
          children: [],
        }
      ]])
    };
    const fakeHttpClient: HttpClient = jasmine.createSpyObj('fakeHttpClient', {
      'get': new Observable<string>((observer: Observer<string>) => {
        observer.next(dataRespStr);
      })
    });

    const df = new HttpDataFetcher(fakeHttpClient, appCoreService);
    let gotCount = 0;
    let got: Response|undefined;
    df.fetch(dataReq).subscribe((resp: Response) => {
      gotCount++;
      got = resp;
    });
    expect(gotCount).toBe(1);
    expect(got).toEqual(dataResp);

    expect(fakeHttpClient.get).toHaveBeenCalledWith('/GetData', {
      params: new HttpParams().set('req', dataReqStr),
    });
  });

  it('performs an unsuccessful HTTP request', () => {
    const fakeHttpClient: HttpClient = jasmine.createSpyObj('fakeHttpClient', {
      'get': new Observable<string>((observer: Observer<string>) => {
        observer.error({error: 'root error', message: 'oops'});
      })
    });

    const df = new HttpDataFetcher(fakeHttpClient, appCoreService);
    let caughtError: Error|undefined;
    let publishedError: Error|undefined;
    appCoreService.appCore.configurationErrors.subscribe(err => {
      publishedError = err;
    });
    df.fetch(dataReq).subscribe({
      error(err) {
        caughtError = err;
      },
    });
    expect(publishedError).toBeDefined();
    expect(publishedError?.message).toBe('root error');
    expect(caughtError).toBeDefined();
    expect(caughtError?.message).toBe('oops');
  });
});
