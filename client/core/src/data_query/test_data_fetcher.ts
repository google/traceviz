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

import { Request } from '../protocol/request_interface.js';
import { Response } from '../protocol/response_interface.js';
import { Observable, throwError } from 'rxjs';
import { DataFetcherInterface } from './data_fetcher_interface.js';

/** Implements DataFetcher for fake data. */
export class TestDataFetcher implements DataFetcherInterface {
  // expectReq should equal incoming DataRequests.
  expectReq: Request | undefined;
  // onFetch should be returned upon a fetch.
  onFetch: Observable<Response> = throwError(() => new Error(`undefined`));

  fetch(req: Request): Observable<Response> {
    if (this.expectReq) {
      expect(this.expectReq).toBeDefined();
      const sortSeriesRequests = (req: Request) => {
        req.seriesRequests.sort(
          (a, b) => (a.seriesName < b.seriesName) ? -1 : 1);
      };
      sortSeriesRequests(req);
      sortSeriesRequests(this.expectReq);
      expect(req).toEqual(this.expectReq);
    }
    return this.onFetch;
  }
}